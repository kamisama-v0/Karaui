"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

// ── public types ───────────────────────────────────────────────────────────

/** 1–5 map to the theme's `--chart-N` tokens; any other string is used as a
 * CSS color as-is. */
export type CalendarEventColor = 1 | 2 | 3 | 4 | 5 | (string & {});

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  /** Exclusive end. An all-day event ending at midnight does not cover the
   * day that midnight starts. */
  end: Date;
  color?: CalendarEventColor;
  allDay?: boolean;
};

export type EventCalendarView = "month" | "week";

export type EventCalendarProps = {
  events: CalendarEvent[];
  /** Controlled visible period: any day inside the month or week shown. */
  date?: Date;
  /** Uncontrolled initial period. Default: today, read after mount. */
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  view?: EventCalendarView;
  defaultView?: EventCalendarView;
  onViewChange?: (view: EventCalendarView) => void;
  onEventClick?: (event: CalendarEvent) => void;
  /** An empty day (month view) or time slot (week view, 30-min precision)
   * was clicked. */
  onSlotClick?: (date: Date) => void;
  /** Enables dragging timed events in week view (mouse and pen) in 15-minute
   * steps, across days too. The calendar does not move the event itself:
   * apply `next` to your `events`. */
  onEventChange?: (event: CalendarEvent, next: { start: Date; end: Date }) => void;
  /** 0 = Sunday … 6 = Saturday. Default 0. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** BCP 47 locale for dates and times. Default "en-US" — a fixed default
   * keeps server and client output identical for hydration. */
  locale?: string;
  /** Height of the calendar body below the toolbar, in px. Default 520. */
  height?: number;
  /** Most event rows per month cell (fewer if the cell is short). An
   * overflowing day shows "+N more". Default 3. */
  maxEventsPerDay?: number;
  className?: string;
  "aria-label"?: string;
};

// ── date helpers (local time) ──────────────────────────────────────────────

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
function addMonths(d: Date, n: number) {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  target.setDate(Math.min(d.getDate(), last.getDate()));
  return target;
}
const startOfWeek = (d: Date, weekStartsOn: number) =>
  addDays(startOfDay(d), -((d.getDay() - weekStartsOn + 7) % 7));
const sameDay = (a?: Date | null, b?: Date | null) =>
  !!a && !!b && startOfDay(a).getTime() === startOfDay(b).getTime();
const sameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
/** Whole days from a to b; rounding absorbs DST hour shifts. */
const diffDays = (a: Date, b: Date) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 864e5);
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const firstDayOf = (e: CalendarEvent) => startOfDay(e.start);
/** Last day an event touches (its end is exclusive). */
const lastDayOf = (e: CalendarEvent) =>
  e.end > e.start ? startOfDay(new Date(e.end.getTime() - 1)) : firstDayOf(e);
const isMultiDay = (e: CalendarEvent) =>
  lastDayOf(e).getTime() !== firstDayOf(e).getTime();
/** Lives in the all-day lane of week view rather than the time grid. */
const isAllDayLane = (e: CalendarEvent) =>
  !!e.allDay || e.end.getTime() - e.start.getTime() >= 864e5;

const eventColor = (c?: CalendarEventColor) =>
  typeof c === "number" ? `var(--chart-${c})` : (c ?? "var(--chart-1)");
const tint = (color: string, pct: number) =>
  `color-mix(in oklab, ${color} ${pct}%, var(--card))`;

// ── layout helpers ─────────────────────────────────────────────────────────

type Seg = {
  event: CalendarEvent;
  c0: number;
  c1: number;
  lane: number;
  bar: boolean;
};
type Piece = Seg & { from: number; to: number };

/** Packs the events touching a 7-day row into lanes; longer spans first so
 * multi-day bars stay on top and straight. */
function layoutRow(rowStart: Date, events: CalendarEvent[]): Seg[] {
  const rowEnd = addDays(rowStart, 6);
  const segs: Seg[] = [];
  for (const event of events) {
    const f = firstDayOf(event);
    const l = lastDayOf(event);
    if (l < rowStart || f > rowEnd) continue;
    segs.push({
      event,
      c0: Math.max(0, diffDays(rowStart, f)),
      c1: Math.min(6, diffDays(rowStart, l)),
      lane: 0,
      bar: !!event.allDay || isMultiDay(event),
    });
  }
  segs.sort(
    (a, b) =>
      b.c1 - b.c0 - (a.c1 - a.c0) ||
      a.c0 - b.c0 ||
      Number(b.bar) - Number(a.bar) ||
      a.event.start.getTime() - b.event.start.getTime() ||
      a.event.id.localeCompare(b.event.id),
  );
  const used: boolean[][] = [];
  for (const s of segs) {
    let lane = 0;
    for (;;) {
      const row = used[lane] ?? [];
      let free = true;
      for (let c = s.c0; c <= s.c1; c++) if (row[c]) free = false;
      if (free) {
        for (let c = s.c0; c <= s.c1; c++) row[c] = true;
        used[lane] = row;
        break;
      }
      lane++;
    }
    s.lane = lane;
  }
  return segs;
}

/** Splits lane segments into the visible runs per day. A day that needs more
 * lanes than fit gives up its last lane to a "+N more" button. */
function fitRow(segs: Seg[], maxLanes: number) {
  const limit: number[] = [];
  const hidden: number[] = [];
  for (let c = 0; c < 7; c++) {
    const covering = segs.filter((s) => s.c0 <= c && c <= s.c1);
    const needed = covering.reduce((m, s) => Math.max(m, s.lane + 1), 0);
    limit[c] = needed <= maxLanes ? maxLanes : maxLanes - 1;
    hidden[c] = covering.filter((s) => s.lane >= limit[c]).length;
  }
  const pieces: Piece[] = [];
  for (const s of segs) {
    let from = -1;
    for (let c = s.c0; c <= s.c1 + 1; c++) {
      const visible = c <= s.c1 && s.lane < limit[c];
      if (visible && from < 0) from = c;
      if (!visible && from >= 0) {
        pieces.push({ ...s, from, to: c - 1 });
        from = -1;
      }
    }
  }
  return { pieces, hidden, limit };
}

type Block = {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  col: number;
  cols: number;
};

/** Timed events of one day, side by side where they overlap. */
function layoutDay(day: Date, events: CalendarEvent[]): Block[] {
  const dayEnd = addDays(day, 1);
  const blocks: Block[] = [];
  for (const event of events) {
    if (isAllDayLane(event)) continue;
    if (!(event.start < dayEnd && event.end > day)) continue;
    const startMin =
      event.start < day
        ? 0
        : event.start.getHours() * 60 + event.start.getMinutes();
    const endMin =
      event.end >= dayEnd
        ? 1440
        : event.end.getHours() * 60 + event.end.getMinutes();
    // A zero-length or tiny event still gets a readable 15-minute block.
    blocks.push({
      event,
      startMin,
      endMin: Math.min(1440, Math.max(endMin, startMin + 15)),
      col: 0,
      cols: 1,
    });
  }
  blocks.sort(
    (a, b) =>
      a.startMin - b.startMin ||
      b.endMin - a.endMin ||
      a.event.id.localeCompare(b.event.id),
  );
  let cluster: Block[] = [];
  let colEnds: number[] = [];
  let clusterEnd = 0;
  const close = () => {
    for (const b of cluster) b.cols = colEnds.length;
    cluster = [];
    colEnds = [];
  };
  for (const b of blocks) {
    if (cluster.length && b.startMin >= clusterEnd) close();
    let col = colEnds.findIndex((end) => end <= b.startMin);
    if (col < 0) {
      col = colEnds.length;
      colEnds.push(b.endMin);
    } else colEnds[col] = b.endMin;
    b.col = col;
    cluster.push(b);
    clusterEnd = cluster.length === 1 ? b.endMin : Math.max(clusterEnd, b.endMin);
  }
  close();
  return blocks;
}

// ── constants ──────────────────────────────────────────────────────────────

// Period swap is a short directional slide, as in Calendar; exits are quicker.
const PERIOD_ENTER = { duration: 0.26, ease: EASE_OUT } as const;
const PERIOD_EXIT = { duration: 0.16, ease: EASE_OUT } as const;
const POPOVER_ENTER = { duration: 0.18, ease: EASE_OUT } as const;
const POPOVER_EXIT = { duration: 0.12, ease: EASE_OUT } as const;

const WEEKDAY_ROW = 28; // month view weekday header
const DAY_HEAD = 22; // day number strip at the top of a month cell
const LANE = 18; // one event row in a month cell / all-day lane
const HOUR = 48; // px per hour in week view
const SNAP_MIN = 15; // drag step in week view
const WEEK_HEAD = 48;
const ALL_DAY_LANES = 2;
const GUTTER = "3rem";

type MoreState = {
  day: Date;
  style: CSSProperties;
  key: string;
};

/**
 * Month and week event calendar. Months lay events out in lanes so multi-day
 * events become bars across the week row, with "+N more" opening the full day
 * list; weeks place timed events on an hour grid, side by side where they
 * overlap, with a live "now" line and optional 15-minute drag to reschedule.
 * Periods slide in from the direction you travel and the view switcher pill
 * glides between Month and Week. Controlled/uncontrolled date and view,
 * arrow-key day navigation, reduced-motion safe.
 */
export function EventCalendar({
  events,
  date: controlledDate,
  defaultDate,
  onDateChange,
  view: controlledView,
  defaultView = "month",
  onViewChange,
  onEventClick,
  onSlotClick,
  onEventChange,
  weekStartsOn = 0,
  locale = "en-US",
  height = 520,
  maxEventsPerDay = 3,
  className,
  "aria-label": ariaLabel = "Event calendar",
}: EventCalendarProps) {
  const uid = useId();
  const reduce = !!useReducedMotion();

  // "Today" (and the default period) are read after mount: the server's clock
  // and timezone can disagree with the viewer's and would break hydration.
  const [today, setToday] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [internalDate, setInternalDate] = useState<Date | null>(
    defaultDate ? startOfDay(defaultDate) : null,
  );
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow(n);
      setToday(startOfDay(n));
    };
    tick();
    setInternalDate((d) => d ?? startOfDay(new Date()));
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const cursor = controlledDate ? startOfDay(controlledDate) : internalDate;
  const [internalView, setInternalView] = useState(defaultView);
  const view = controlledView ?? internalView;
  const [direction, setDirection] = useState(0);

  const periodStart = cursor
    ? view === "month"
      ? startOfMonth(cursor)
      : startOfWeek(cursor, weekStartsOn)
    : null;
  const periodKey = periodStart ? `${view}-${dayKey(periodStart)}` : "pending";

  // ── interaction state ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [more, setMore] = useState<MoreState | null>(null);
  const moreOpener = useRef<HTMLElement | null>(null);
  // Week view keeps the focused hour when arrow keys cross into another week.
  const slotHour = useRef(9);

  const clickEvent = (event: CalendarEvent) => {
    setSelectedId(event.id);
    onEventClick?.(event);
  };

  const goTo = useCallback(
    (next: Date) => {
      const d = startOfDay(next);
      if (cursor && sameDay(cursor, d)) return;
      if (cursor) setDirection(Math.sign(d.getTime() - cursor.getTime()));
      setMore(null);
      if (!controlledDate) setInternalDate(d);
      onDateChange?.(d);
    },
    [cursor, controlledDate, onDateChange],
  );

  const step = (dir: 1 | -1) => {
    if (!cursor) return;
    goTo(view === "month" ? addMonths(cursor, dir) : addDays(cursor, dir * 7));
  };

  const setView = (v: EventCalendarView) => {
    if (v === view) return;
    setDirection(0);
    setMore(null);
    if (!controlledView) setInternalView(v);
    onViewChange?.(v);
  };


  const closeMore = useCallback((restoreFocus: boolean) => {
    setMore(null);
    if (restoreFocus) moreOpener.current?.focus();
  }, []);

  const openMore = (
    e: ReactMouseEvent<HTMLElement>,
    day: Date,
    style: CSSProperties,
  ) => {
    const key = dayKey(day);
    if (more?.key === key) return closeMore(false);
    moreOpener.current = e.currentTarget;
    setMore({ day, style, key });
  };

  // ── labels ──
  const fmt = useMemo(
    () => ({
      month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
      range: new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      day: new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      time: new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
      }),
      hour: new Intl.DateTimeFormat(locale, { hour: "numeric" }),
      weekdayShort: new Intl.DateTimeFormat(locale, { weekday: "short" }),
      weekdayLong: new Intl.DateTimeFormat(locale, { weekday: "long" }),
    }),
    [locale],
  );
  const weekdays = useMemo(
    () =>
      // 2023-01-01 was a Sunday.
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(2023, 0, 1 + ((i + weekStartsOn) % 7));
        return {
          short: fmt.weekdayShort.format(d),
          long: fmt.weekdayLong.format(d),
        };
      }),
    [fmt, weekStartsOn],
  );

  const title = !periodStart
    ? ""
    : view === "month"
      ? fmt.month.format(periodStart)
      : // Not formatRange: its separators differ between ICU builds (server
        // vs browser), which would break hydration of the title.
        `${fmt.range.format(periodStart)} – ${fmt.range.format(addDays(periodStart, 6))}`;

  const timeLabel = useCallback(
    (e: CalendarEvent) =>
      e.allDay
        ? "All day"
        : sameDay(e.start, e.end)
          ? `${fmt.time.format(e.start)} – ${fmt.time.format(e.end)}`
          : `${fmt.time.format(e.start)} – ${fmt.range.format(e.end)} ${fmt.time.format(e.end)}`,
    [fmt],
  );
  const eventLabel = (e: CalendarEvent) =>
    `${e.title}, ${e.allDay ? "all day" : timeLabel(e)}`;

  const navButton =
    "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

  const shared: SharedProps = {
    events,
    periodStart: periodStart ?? new Date(0),
    periodKey,
    cursor: cursor ?? new Date(0),
    today,
    now,
    weekStartsOn,
    height,
    maxEventsPerDay,
    reduce,
    selectedId,
    hoveredId,
    setHoveredId,
    clickEvent,
    eventLabel,
    timeLabel,
    onSlotClick,
    goTo,
    openMore,
    fmt,
    weekdays,
    slotHour,
  };

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border bg-card text-foreground",
        className,
      )}
    >
      {/* toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <button
          type="button"
          disabled={!today}
          onClick={() => today && goTo(today)}
          className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          Today
        </button>
        <div className="flex items-center">
          <button
            type="button"
            aria-label={view === "month" ? "Previous month" : "Previous week"}
            disabled={!cursor}
            onClick={() => step(-1)}
            className={navButton}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={view === "month" ? "Next month" : "Next week"}
            disabled={!cursor}
            onClick={() => step(1)}
            className={navButton}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <h2
          aria-live="polite"
          className="min-w-0 flex-1 truncate text-sm font-semibold tabular-nums"
        >
          {title}
        </h2>
        <div className="relative inline-flex shrink-0 rounded-lg bg-muted p-0.5">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                "relative h-7 rounded-md px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                view === v
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {view === v && (
                <motion.span
                  aria-hidden
                  layoutId={`${uid}-view`}
                  transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                  className="absolute inset-0 rounded-md border border-border bg-card shadow-sm"
                />
              )}
              <span className="relative">{v === "month" ? "Month" : "Week"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* body */}
      <div className="relative overflow-hidden" style={{ height }}>
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={periodKey}
            custom={direction}
            variants={{
              enter: (dir: number) => ({
                opacity: 0,
                x: reduce ? 0 : dir * 28,
                filter: reduce || !dir ? "blur(0px)" : "blur(4px)",
              }),
              center: {
                opacity: 1,
                x: 0,
                filter: "blur(0px)",
                transition: PERIOD_ENTER,
              },
              exit: (dir: number) => ({
                opacity: 0,
                x: reduce ? 0 : dir * -28,
                filter: reduce || !dir ? "blur(0px)" : "blur(4px)",
                transition: PERIOD_EXIT,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            {!periodStart ? null : view === "month" ? (
              <MonthView {...shared} />
            ) : (
              <WeekView {...shared} onEventChange={onEventChange} />
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {more && (
            <DayPopover
              key={more.key}
              day={more.day}
              style={more.style}
              events={events
                .filter(
                  (e) => firstDayOf(e) <= more.day && lastDayOf(e) >= more.day,
                )
                .sort(
                  (a, b) =>
                    Number(!!b.allDay) - Number(!!a.allDay) ||
                    a.start.getTime() - b.start.getTime(),
                )}
              title={fmt.day.format(more.day)}
              reduce={reduce}
              timeLabel={timeLabel}
              eventLabel={eventLabel}
              onClose={closeMore}
              onEventClick={(e) => {
                closeMore(false);
                clickEvent(e);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ── shared bits ────────────────────────────────────────────────────────────

type Formats = {
  month: Intl.DateTimeFormat;
  range: Intl.DateTimeFormat;
  day: Intl.DateTimeFormat;
  time: Intl.DateTimeFormat;
  hour: Intl.DateTimeFormat;
  weekdayShort: Intl.DateTimeFormat;
  weekdayLong: Intl.DateTimeFormat;
};

type SharedProps = {
  events: CalendarEvent[];
  periodStart: Date;
  periodKey: string;
  cursor: Date;
  today: Date | null;
  now: Date | null;
  weekStartsOn: number;
  height: number;
  maxEventsPerDay: number;
  reduce: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  clickEvent: (e: CalendarEvent) => void;
  eventLabel: (e: CalendarEvent) => string;
  timeLabel: (e: CalendarEvent) => string;
  onSlotClick?: (date: Date) => void;
  goTo: (d: Date) => void;
  openMore: (
    e: ReactMouseEvent<HTMLElement>,
    day: Date,
    style: CSSProperties,
  ) => void;
  fmt: Formats;
  weekdays: { short: string; long: string }[];
  slotHour: { current: number };
};

/** Hover/focus/selection handlers that drive the lift. */
const liftHandlers = (
  id: string,
  setHoveredId: (id: string | null) => void,
) => ({
  onPointerEnter: () => setHoveredId(id),
  onPointerLeave: () => setHoveredId(null),
  onFocus: () => setHoveredId(id),
  onBlur: () => setHoveredId(null),
});

/** Popover position next to a cell: opens toward the free side. */
function popoverStyle(
  col: number,
  row: number,
  rows: number,
  topPx?: number,
): CSSProperties {
  const style: CSSProperties = { width: "max(13rem, calc(100% / 7))" };
  const right = col > 3;
  if (right) style.right = `${((6 - col) / 7) * 100}%`;
  else style.left = `${(col / 7) * 100}%`;
  const below = row < rows / 2;
  if (topPx !== undefined) style.top = topPx;
  else if (below) style.top = `calc(${WEEKDAY_ROW}px + (100% - ${WEEKDAY_ROW}px) * ${row / rows})`;
  else
    style.bottom = `calc((100% - ${WEEKDAY_ROW}px) * ${(rows - 1 - row) / rows})`;
  style.transformOrigin = `${right ? "right" : "left"} ${topPx !== undefined || below ? "top" : "bottom"}`;
  return style;
}

// ── month view ─────────────────────────────────────────────────────────────

function MonthView({
  events,
  periodStart,
  periodKey,
  cursor,
  today,
  weekStartsOn,
  height,
  maxEventsPerDay,
  reduce,
  selectedId,
  hoveredId,
  setHoveredId,
  clickEvent,
  eventLabel,
  onSlotClick,
  goTo,
  openMore,
  fmt,
  weekdays,
}: SharedProps) {
  const gridStart = startOfWeek(periodStart, weekStartsOn);
  const weeks = Array.from({ length: 6 }, (_, w) => addDays(gridStart, w * 7));
  const rowHeight = (height - WEEKDAY_ROW) / 6;
  const maxLanes = Math.max(
    1,
    Math.min(maxEventsPerDay, Math.floor((rowHeight - DAY_HEAD - 2) / LANE)),
  );

  // Roving tab stop: the cursor day if it is in this month, else the 1st.
  const [focusDay, setFocusDay] = useState(() =>
    sameMonth(cursor, periodStart) ? cursor : periodStart,
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${dayKey(focusDay)}"]`)
      ?.focus();
  }, [focusDay]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!(e.target as HTMLElement).dataset.date) return;
    const base = focusDay;
    const col = (base.getDay() - weekStartsOn + 7) % 7;
    const next =
      e.key === "ArrowLeft"
        ? addDays(base, -1)
        : e.key === "ArrowRight"
          ? addDays(base, 1)
          : e.key === "ArrowUp"
            ? addDays(base, -7)
            : e.key === "ArrowDown"
              ? addDays(base, 7)
              : e.key === "Home"
                ? addDays(base, -col)
                : e.key === "End"
                  ? addDays(base, 6 - col)
                  : e.key === "PageUp"
                    ? addMonths(base, -1)
                    : e.key === "PageDown"
                      ? addMonths(base, 1)
                      : null;
    if (!next) return;
    e.preventDefault();
    if (!sameMonth(next, periodStart)) {
      // The next grid mounts focused on that day (see the initial state).
      goTo(next);
      return;
    }
    shouldFocus.current = true;
    setFocusDay(next);
  };

  // A month change by keyboard remounts this view; focus the carried day.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount.
  useEffect(() => {
    if (
      document.activeElement &&
      gridRef.current &&
      !gridRef.current.contains(document.activeElement) &&
      document.activeElement.closest("[data-event-calendar-grid]")
    ) {
      gridRef.current
        .querySelector<HTMLButtonElement>(`[data-date="${dayKey(focusDay)}"]`)
        ?.focus();
    }
  }, []);

  return (
    <div
      ref={gridRef}
      data-event-calendar-grid
      data-period={periodKey}
      className="flex h-full flex-col"
    >
      <div
        className="grid shrink-0 grid-cols-7 border-b border-border"
        style={{ height: WEEKDAY_ROW }}
      >
        {weekdays.map((w) => (
          <abbr
            key={w.long}
            title={w.long}
            className="flex items-center px-2 text-[11px] font-medium text-muted-foreground no-underline"
          >
            {w.short}
          </abbr>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-6">
        {weeks.map((rowStart, r) => {
          const segs = layoutRow(rowStart, events);
          const { pieces, hidden, limit } = fitRow(segs, maxLanes);
          return (
            <div
              key={dayKey(rowStart)}
              className="relative grid grid-cols-7 border-b border-border last:border-b-0"
            >
              {Array.from({ length: 7 }, (_, c) => {
                const d = addDays(rowStart, c);
                const outside = !sameMonth(d, periodStart);
                const isToday = sameDay(d, today);
                const count = segs.filter(
                  (s) => s.c0 <= c && c <= s.c1,
                ).length;
                return (
                  <button
                    key={dayKey(d)}
                    type="button"
                    data-date={dayKey(d)}
                    onKeyDown={onKeyDown}
                    tabIndex={sameDay(d, focusDay) ? 0 : -1}
                    aria-label={`${fmt.day.format(d)}${count ? `, ${count} event${count > 1 ? "s" : ""}` : ""}`}
                    aria-current={isToday ? "date" : undefined}
                    onFocus={() => setFocusDay(d)}
                    onClick={() => {
                      setFocusDay(d);
                      onSlotClick?.(d);
                    }}
                    className={cn(
                      "flex flex-col items-start border-l border-border px-1 pt-1 text-left outline-none transition-colors first:border-l-0 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      outside && "bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-5 items-center justify-center rounded-full text-[11px] tabular-nums",
                        isToday
                          ? "bg-primary font-semibold text-primary-foreground"
                          : outside
                            ? "text-muted-foreground/60"
                            : "text-foreground",
                      )}
                    >
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}

              {pieces.map((p) => {
                const color = eventColor(p.event.color);
                const lifted =
                  hoveredId === p.event.id || selectedId === p.event.id;
                const left = p.from;
                const span = p.to - p.from + 1;
                const roundL = p.from === p.c0 && firstDayOf(p.event) >= rowStart;
                const roundR =
                  p.to === p.c1 && lastDayOf(p.event) <= addDays(rowStart, 6);
                return (
                  <motion.button
                    key={`${p.event.id}:${p.from}`}
                    type="button"
                    aria-label={eventLabel(p.event)}
                    layout="position"
                    initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                    animate={{ opacity: 1, y: lifted && !reduce ? -1.5 : 0 }}
                    transition={reduce ? { duration: 0.15 } : SPRING_PRESS}
                    onClick={() => clickEvent(p.event)}
                    {...liftHandlers(p.event.id, setHoveredId)}
                    className={cn(
                      "absolute z-10 flex items-center gap-1 overflow-hidden px-1.5 text-left text-[11px] leading-none outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring",
                      p.bar ? "font-medium" : "rounded-md hover:bg-muted",
                      p.bar && roundL && "rounded-l-md",
                      p.bar && roundR && "rounded-r-md",
                      lifted && "shadow-md",
                      selectedId === p.event.id && "ring-1 ring-foreground/20",
                    )}
                    style={{
                      left: `calc(${(left / 7) * 100}% + ${roundL || !p.bar ? 3 : 0}px)`,
                      width: `calc(${(span / 7) * 100}% - ${(roundL || !p.bar ? 3 : 0) + (roundR || !p.bar ? 3 : 0)}px)`,
                      top: DAY_HEAD + p.lane * LANE,
                      height: LANE - 2,
                      background: p.bar ? tint(color, 22) : undefined,
                    }}
                  >
                    {p.bar ? (
                      roundL && (
                        <span
                          aria-hidden
                          className="h-2.5 w-0.5 shrink-0 rounded-full"
                          style={{ background: color }}
                        />
                      )
                    ) : (
                      <span
                        aria-hidden
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: color }}
                      />
                    )}
                    {!p.bar && (
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {fmt.time
                          .format(p.event.start)
                          .replace(/:00(?=\s|$)/, "")}
                      </span>
                    )}
                    <span className="truncate">{p.event.title}</span>
                  </motion.button>
                );
              })}

              {hidden.map((n, c) =>
                n > 0 ? (
                  <button
                    // biome-ignore lint/suspicious/noArrayIndexKey: one slot per weekday column.
                    key={c}
                    type="button"
                    data-more-trigger
                    aria-label={`${n} more event${n > 1 ? "s" : ""} on ${fmt.day.format(addDays(rowStart, c))}`}
                    onClick={(e) =>
                      openMore(e, addDays(rowStart, c), popoverStyle(c, r, 6))
                    }
                    className="absolute z-10 rounded-md px-1.5 text-left text-[11px] font-medium leading-none text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    style={{
                      left: `calc(${(c / 7) * 100}% + 3px)`,
                      width: "calc(100% / 7 - 6px)",
                      top: DAY_HEAD + limit[c] * LANE,
                      height: LANE - 2,
                    }}
                  >
                    +{n} more
                  </button>
                ) : null,
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── week view ──────────────────────────────────────────────────────────────

type DragState = { id: string; steps: number; days: number; colWidth: number };

function WeekView({
  events,
  periodStart,
  cursor,
  today,
  now,
  reduce,
  selectedId,
  hoveredId,
  setHoveredId,
  clickEvent,
  eventLabel,
  timeLabel,
  onSlotClick,
  goTo,
  openMore,
  fmt,
  weekdays,
  slotHour,
  onEventChange,
}: SharedProps & {
  onEventChange?: EventCalendarProps["onEventChange"];
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(periodStart, i));
  const segs = layoutRow(periodStart, events.filter(isAllDayLane));
  const { pieces, hidden, limit } = fitRow(segs, ALL_DAY_LANES);
  const laneCount = Math.max(
    1,
    Math.min(
      ALL_DAY_LANES,
      segs.reduce((m, s) => Math.max(m, s.lane + 1), 0),
    ),
  );
  const allDayHeight = laneCount * LANE + 6;
  const blocksByDay = days.map((d) => layoutDay(d, events));

  // Keep the scroll offset across weeks; the first visit starts at 8:00.
  const scrollTop = useRef(8 * HOUR);
  const scrollRef = useCallback((el: HTMLDivElement | null) => {
    if (el) el.scrollTop = scrollTop.current;
  }, []);

  // Roving tab stop over the hour slots.
  const [focusSlot, setFocusSlot] = useState(() => ({
    day: Math.max(0, Math.min(6, diffDays(periodStart, cursor))),
    hour: slotHour.current,
  }));
  const columnsRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  useEffect(() => {
    slotHour.current = focusSlot.hour;
  }, [focusSlot, slotHour]);
  // A week change by keyboard remounts this view; focus the carried slot.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount.
  useEffect(() => {
    const active = document.activeElement;
    if (
      active &&
      columnsRef.current &&
      !columnsRef.current.contains(active) &&
      active.closest("[data-event-calendar-grid]")
    ) {
      columnsRef.current
        .querySelector<HTMLButtonElement>(
          `[data-slot="${focusSlot.day}-${focusSlot.hour}"]`,
        )
        ?.focus();
    }
  }, []);
  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    columnsRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-slot="${focusSlot.day}-${focusSlot.hour}"]`,
      )
      ?.focus();
  }, [focusSlot]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!(e.target as HTMLElement).dataset.slot) return;
    const { day, hour } = focusSlot;
    let next = { day, hour };
    if (e.key === "ArrowUp") next = { day, hour: Math.max(0, hour - 1) };
    else if (e.key === "ArrowDown") next = { day, hour: Math.min(23, hour + 1) };
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const nd = day + (e.key === "ArrowLeft" ? -1 : 1);
      if (nd < 0 || nd > 6) {
        e.preventDefault();
        goTo(addDays(periodStart, nd));
        return;
      }
      next = { day: nd, hour };
    } else return;
    e.preventDefault();
    shouldFocus.current = true;
    setFocusSlot(next);
  };

  // ── drag to reschedule (mouse/pen; touch keeps scrolling the grid) ──
  const [drag, setDrag] = useState<DragState | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const dragRef = useRef<{
    id: string;
    x0: number;
    y0: number;
    colWidth: number;
    moved: boolean;
    steps: number;
    days: number;
  } | null>(null);
  useEffect(() => {
    if (!settlingId) return;
    const raf = requestAnimationFrame(() => setSettlingId(null));
    return () => cancelAnimationFrame(raf);
  }, [settlingId]);

  const suppressNextClick = useRef(false);
  const onDragStart = (e: ReactPointerEvent<HTMLElement>, ev: CalendarEvent) => {
    if (!onEventChange || e.pointerType === "touch" || e.button !== 0) return;
    const width = columnsRef.current?.getBoundingClientRect().width ?? 700;
    dragRef.current = {
      id: ev.id,
      x0: e.clientX,
      y0: e.clientY,
      colWidth: width / 7,
      moved: false,
      steps: 0,
      days: 0,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    const steps = Math.round(dy / ((HOUR * SNAP_MIN) / 60));
    const dd = Math.round(dx / d.colWidth);
    if (steps !== d.steps || dd !== d.days || !drag) {
      d.steps = steps;
      d.days = dd;
      setDrag({ id: d.id, steps, days: dd, colWidth: d.colWidth });
    }
  };
  const onDragEnd = (ev: CalendarEvent, cancelled = false) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.moved) {
      // Swallow the click that ends the drag; cleared next tick in case the
      // event remounts in another column and never receives it.
      suppressNextClick.current = true;
      window.setTimeout(() => {
        suppressNextClick.current = false;
      }, 0);
    }
    setDrag(null);
    if (!d.moved || cancelled || (d.steps === 0 && d.days === 0)) return;
    const shift = (t: Date) => {
      const n = new Date(t);
      n.setDate(n.getDate() + d.days);
      n.setMinutes(n.getMinutes() + d.steps * SNAP_MIN);
      return n;
    };
    setSettlingId(ev.id);
    onEventChange?.(ev, { start: shift(ev.start), end: shift(ev.end) });
  };

  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : 0;
  const nowCol = now ? days.findIndex((d) => sameDay(d, now)) : -1;

  const rowClass =
    "grid shrink-0 overflow-hidden [scrollbar-gutter:stable] [scrollbar-width:thin]";
  const gridCols = { gridTemplateColumns: `${GUTTER} repeat(7, minmax(0, 1fr))` };

  return (
    <div className="flex h-full flex-col">
      {/* day headers */}
      <div
        className={cn(rowClass, "border-b border-border")}
        style={{ ...gridCols, height: WEEK_HEAD }}
      >
        <span aria-hidden />
        {days.map((d, i) => {
          const isToday = sameDay(d, today);
          return (
            <button
              key={dayKey(d)}
              type="button"
              aria-label={fmt.day.format(d)}
              aria-current={isToday ? "date" : undefined}
              onClick={() => onSlotClick?.(d)}
              className="flex flex-col items-center justify-center gap-0.5 border-l border-border outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {weekdays[i].short}
              </span>
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* all-day lane */}
      <div
        className={cn(rowClass, "relative border-b border-border")}
        style={{ ...gridCols, height: allDayHeight }}
      >
        <span className="flex items-start justify-end pr-1.5 pt-1.5 text-[10px] text-muted-foreground">
          all-day
        </span>
        {days.map((d) => (
          <span key={dayKey(d)} aria-hidden className="border-l border-border" />
        ))}
        <div
          className="pointer-events-none absolute inset-y-0 right-0"
          style={{ left: GUTTER }}
        >
          {pieces.map((p) => {
            const color = eventColor(p.event.color);
            const lifted = hoveredId === p.event.id || selectedId === p.event.id;
            const roundL = p.from === p.c0 && firstDayOf(p.event) >= periodStart;
            const roundR =
              p.to === p.c1 && lastDayOf(p.event) <= addDays(periodStart, 6);
            return (
              <motion.button
                key={`${p.event.id}:${p.from}`}
                type="button"
                aria-label={eventLabel(p.event)}
                layout="position"
                initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                animate={{ opacity: 1, y: lifted && !reduce ? -1.5 : 0 }}
                transition={reduce ? { duration: 0.15 } : SPRING_PRESS}
                onClick={() => clickEvent(p.event)}
                {...liftHandlers(p.event.id, setHoveredId)}
                className={cn(
                  "pointer-events-auto absolute flex items-center gap-1 overflow-hidden px-1.5 text-left text-[11px] font-medium leading-none outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring",
                  roundL && "rounded-l-md",
                  roundR && "rounded-r-md",
                  lifted && "shadow-md",
                  selectedId === p.event.id && "ring-1 ring-foreground/20",
                )}
                style={{
                  left: `calc(${(p.from / 7) * 100}% + ${roundL ? 3 : 0}px)`,
                  width: `calc(${((p.to - p.from + 1) / 7) * 100}% - ${(roundL ? 3 : 0) + (roundR ? 3 : 0)}px)`,
                  top: 3 + p.lane * LANE,
                  height: LANE - 2,
                  background: tint(color, 22),
                }}
              >
                {roundL && (
                  <span
                    aria-hidden
                    className="h-2.5 w-0.5 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                )}
                <span className="truncate">{p.event.title}</span>
              </motion.button>
            );
          })}
          {hidden.map((n, c) =>
            n > 0 ? (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: one slot per weekday column.
                key={c}
                type="button"
                data-more-trigger
                aria-label={`${n} more all-day event${n > 1 ? "s" : ""} on ${fmt.day.format(days[c])}`}
                onClick={(e) =>
                  openMore(
                    e,
                    days[c],
                    popoverStyle(c, 0, 1, WEEK_HEAD + allDayHeight),
                  )
                }
                className="pointer-events-auto absolute rounded-md px-1.5 text-left text-[11px] font-medium leading-none text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  left: `calc(${(c / 7) * 100}% + 3px)`,
                  width: "calc(100% / 7 - 6px)",
                  top: 3 + limit[c] * LANE,
                  height: LANE - 2,
                }}
              >
                +{n} more
              </button>
            ) : null,
          )}
        </div>
      </div>

      {/* time grid */}
      <motion.div
        ref={scrollRef}
        layoutScroll
        onScroll={(e) => {
          scrollTop.current = e.currentTarget.scrollTop;
        }}
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]"
      >
        <div className="relative grid" style={{ ...gridCols, height: 24 * HOUR }}>
          <div aria-hidden className="relative">
            {Array.from({ length: 23 }, (_, h) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: hour labels are positional.
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: (h + 1) * HOUR }}
              >
                {fmt.hour.format(new Date(2023, 0, 1, h + 1))}
              </span>
            ))}
          </div>
          <div
            ref={columnsRef}
            data-event-calendar-grid
            className="relative col-span-7 grid grid-cols-7"
          >
            {days.map((d, i) => (
              <div key={dayKey(d)} className="relative border-l border-border">
                {Array.from({ length: 24 }, (_, h) => (
                  <button
                    // biome-ignore lint/suspicious/noArrayIndexKey: hour slots are positional.
                    key={h}
                    type="button"
                    data-slot={`${i}-${h}`}
                    onKeyDown={onKeyDown}
                    tabIndex={focusSlot.day === i && focusSlot.hour === h ? 0 : -1}
                    aria-label={`${fmt.day.format(d)}, ${fmt.time.format(new Date(2023, 0, 1, h))}`}
                    onFocus={() => setFocusSlot({ day: i, hour: h })}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      // Keyboard clicks report no pointer; they pick the hour.
                      const half =
                        e.detail > 0 && e.clientY - rect.top > rect.height / 2;
                      onSlotClick?.(
                        new Date(
                          d.getFullYear(),
                          d.getMonth(),
                          d.getDate(),
                          h,
                          half ? 30 : 0,
                        ),
                      );
                    }}
                    className={cn(
                      "absolute inset-x-0 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      h > 0 && "border-t border-border/60",
                    )}
                    style={{ top: h * HOUR, height: HOUR }}
                  />
                ))}

                {blocksByDay[i].map((b) => {
                  const ev = b.event;
                  const color = eventColor(ev.color);
                  const dragging = drag?.id === ev.id;
                  const lifted =
                    dragging || hoveredId === ev.id || selectedId === ev.id;
                  const top = (b.startMin / 60) * HOUR;
                  const h = Math.max(
                    ((b.endMin - b.startMin) / 60) * HOUR - 2,
                    14,
                  );
                  const compact = h < 34;
                  const dx = dragging ? drag.days * drag.colWidth : 0;
                  const dy = dragging ? (drag.steps * HOUR * SNAP_MIN) / 60 : 0;
                  return (
                    <motion.button
                      key={`${ev.id}:${dayKey(d)}`}
                      type="button"
                      aria-label={eventLabel(ev)}
                      layout={settlingId === ev.id || dragging ? false : "position"}
                      initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        x: dx,
                        y: dy + (lifted && !reduce ? -1.5 : 0),
                      }}
                      transition={
                        reduce || settlingId === ev.id
                          ? { duration: reduce ? 0.15 : 0 }
                          : SPRING_PRESS
                      }
                      onClick={() => {
                        if (suppressNextClick.current) {
                          suppressNextClick.current = false;
                          return;
                        }
                        clickEvent(ev);
                      }}
                      onPointerDown={(e) => onDragStart(e, ev)}
                      onPointerMove={onDragMove}
                      onPointerUp={() => onDragEnd(ev)}
                      onPointerCancel={() => onDragEnd(ev, true)}
                      onLostPointerCapture={() => {
                        if (dragRef.current) onDragEnd(ev, true);
                      }}
                      {...liftHandlers(ev.id, setHoveredId)}
                      className={cn(
                        "absolute overflow-hidden rounded-md py-0.5 pl-2 pr-1 text-left text-[11px] leading-tight outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring",
                        lifted && "shadow-md",
                        dragging ? "z-30 cursor-grabbing" : "z-10",
                        onEventChange && !dragging && "cursor-grab",
                        selectedId === ev.id && "ring-1 ring-foreground/20",
                      )}
                      style={{
                        top: top + 1,
                        height: h,
                        left: `calc(${(b.col / b.cols) * 100}% + 2px)`,
                        width: `calc(${100 / b.cols}% - 4px)`,
                        background: tint(color, 22),
                      }}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-1 left-0.5 w-0.5 rounded-full"
                        style={{ background: color }}
                      />
                      <span
                        className={cn(
                          "block font-medium",
                          compact ? "truncate" : "line-clamp-2",
                        )}
                      >
                        {ev.title}
                        {compact && (
                          <span className="ml-1 font-normal text-muted-foreground">
                            {fmt.time.format(ev.start)}
                          </span>
                        )}
                      </span>
                      {!compact && (
                        <span className="block truncate text-[10px] text-muted-foreground tabular-nums">
                          {timeLabel(ev)}
                        </span>
                      )}
                    </motion.button>
                  );
                })}

                {i === nowCol && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                    style={{ top: (nowMin / 60) * HOUR }}
                  >
                    <span className="-ml-1 size-2 shrink-0 -translate-y-1/2 rounded-full bg-destructive" />
                    <span className="h-0.5 flex-1 -translate-y-1/2 bg-destructive" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── "+N more" day list ─────────────────────────────────────────────────────

function DayPopover({
  day,
  style,
  events,
  title,
  reduce,
  timeLabel,
  eventLabel,
  onClose,
  onEventClick,
}: {
  day: Date;
  style: CSSProperties;
  events: CalendarEvent[];
  title: string;
  reduce: boolean;
  timeLabel: (e: CalendarEvent) => string;
  eventLabel: (e: CalendarEvent) => string;
  onClose: (restoreFocus: boolean) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current?.contains(t) || t.closest?.("[data-more-trigger]")) return;
      onClose(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label={title}
      data-day={dayKey(day)}
      initial={{ opacity: 0, scale: reduce ? 1 : 0.94 }}
      animate={{ opacity: 1, scale: 1, transition: POPOVER_ENTER }}
      exit={{ opacity: 0, scale: reduce ? 1 : 0.96, transition: POPOVER_EXIT }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose(true);
        }
      }}
      className="absolute z-40 m-1 flex max-h-[70%] flex-col overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
      style={style}
    >
      <p className="px-1.5 pb-1.5 pt-0.5 text-xs font-semibold">{title}</p>
      <ul className="flex min-h-0 flex-col gap-0.5 overflow-y-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
        {events.map((ev) => {
          const color = eventColor(ev.color);
          return (
            <li key={ev.id}>
              <button
                type="button"
                aria-label={eventLabel(ev)}
                onClick={() => onEventClick(ev)}
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {ev.title}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {ev.allDay ? "All day" : timeLabel(ev)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
