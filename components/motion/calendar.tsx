"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type DateRange = { from: Date; to?: Date };
/** A whole week row: `from` is its first day, `to` its seventh. */
export type WeekRange = { from: Date; to: Date };

/** Per-day extras from `getDayMeta`. */
export type CalendarDayMeta = {
  /** Short text under the day number (a price, a count). Cells grow taller
   * when any day has meta; the label is also read after the date. */
  label?: string;
  /** "accent" tints the label (deals, highlights); "muted" fades it. */
  tone?: "muted" | "accent";
  /** Blocks the day and strikes it through, like `isDateDisabled`. */
  disabled?: boolean;
};

type CalendarBaseProps = {
  /** Earliest selectable day (inclusive). */
  minDate?: Date;
  /** Latest selectable day (inclusive). */
  maxDate?: Date;
  /** Extra per-day rule, e.g. weekends or booked dates. */
  isDateDisabled?: (date: Date) => boolean;
  /** 0 = Sunday … 6 = Saturday. Default 0. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** BCP 47 locale for month, weekday and day labels. Default "en-US" — a
   * fixed default keeps server and client output identical for hydration. */
  locale?: string;
  /** Controlled visible month (any day inside it). */
  month?: Date;
  /** Uncontrolled initial visible month. Default: the selection or today. */
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  /** Months shown side by side (stacked below `sm`). Default 1. With more
   * than one, days outside each month are left blank so none repeats. */
  numberOfMonths?: number;
  /** Adds an ISO 8601 week-number column ("Wk") before each row. */
  showWeekNumber?: boolean;
  /** Per-day label, tone and blocking, e.g. nightly prices or booked days.
   * Passing it switches the grid to taller cells that fit the label. */
  getDayMeta?: (date: Date) => CalendarDayMeta | null | undefined;
  className?: string;
  "aria-label"?: string;
};

export type CalendarSingleProps = CalendarBaseProps & {
  mode?: "single";
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (date: Date) => void;
};

export type CalendarRangeProps = CalendarBaseProps & {
  mode: "range";
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (range: DateRange) => void;
  /** Fewest nights (days between start and end) a finished range may span.
   * While the end is being chosen, days too close are blocked. */
  minNights?: number;
  /** Most nights a finished range may span; farther days are blocked. */
  maxNights?: number;
};

export type CalendarWeekProps = CalendarBaseProps & {
  mode: "week";
  value?: WeekRange | null;
  defaultValue?: WeekRange | null;
  /** Called with the picked day's whole row, honouring `weekStartsOn`. */
  onValueChange?: (week: WeekRange) => void;
};

export type CalendarMultipleProps = CalendarBaseProps & {
  mode: "multiple";
  value?: Date[] | null;
  defaultValue?: Date[] | null;
  /** Called with the selection sorted by date. */
  onValueChange?: (dates: Date[]) => void;
  /** Most days that can be picked; further picks are ignored. */
  max?: number;
};

export type CalendarProps =
  | CalendarSingleProps
  | CalendarRangeProps
  | CalendarWeekProps
  | CalendarMultipleProps;

// ── date helpers (local time, day precision) ──────────────────────────────

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Adds months, clamping the day so Jan 31 + 1 month lands on Feb 28/29. */
function addMonths(d: Date, n: number) {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return target;
}
const sameDay = (a?: Date | null, b?: Date | null) =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const sameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
/** Whole days from `a` to `b`; rounding absorbs DST hour shifts. */
const daysBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
/** ISO 8601 week number: weeks start Monday, week 1 holds Jan 4. */
function isoWeek(d: Date) {
  const thursday = addDays(d, 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(thursday.getFullYear(), 0, 4);
  const firstThursday = addDays(jan4, 3 - ((jan4.getDay() + 6) % 7));
  return 1 + Math.round(daysBetween(firstThursday, thursday) / 7);
}

/** Always 6 weeks, so the panel never changes height between months. */
function buildWeeks(month: Date, weekStartsOn: number) {
  const first = startOfMonth(month);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)),
  );
}

// Month swap is a short directional slide; the exit is quicker than the entry.
const MONTH_ENTER = { duration: 0.26, ease: EASE_OUT } as const;
const MONTH_EXIT = { duration: 0.16, ease: EASE_OUT } as const;

/**
 * Month-grid calendar for single dates, ranges, whole weeks or several
 * separate days, one or more months wide. The selected day is a pill that
 * glides between days on a shared-layout spring; a picked week is one pill
 * across its row; months slide in from the direction you travel. Optional ISO
 * week numbers, per-day labels (`getDayMeta`) and night limits for ranges.
 * Full keyboard grid navigation (arrows, Home/End, PageUp/PageDown,
 * Shift+Page for years). Controlled or uncontrolled for both the selection
 * and the visible month; reduced-motion safe.
 */
export function Calendar(props: CalendarProps) {
  const {
    minDate,
    maxDate,
    isDateDisabled,
    weekStartsOn = 0,
    locale = "en-US",
    month: controlledMonth,
    defaultMonth,
    onMonthChange,
    numberOfMonths = 1,
    showWeekNumber = false,
    getDayMeta,
    className,
    "aria-label": ariaLabel,
  } = props;
  const isRange = props.mode === "range";
  const isWeek = props.mode === "week";
  const isMultiple = props.mode === "multiple";
  const count = Math.max(1, Math.floor(numberOfMonths));
  const minNights = isRange ? ((props as CalendarRangeProps).minNights ?? 0) : 0;
  const maxNights = isRange ? (props as CalendarRangeProps).maxNights : undefined;
  // Taller cells only when there is something to put under the number.
  const tall = !!getDayMeta;

  const uid = useId();
  const reduce = useReducedMotion();

  // ── selection ──
  const [internalValue, setInternalValue] = useState<
    Date | DateRange | WeekRange | Date[] | null
  >(props.defaultValue ?? null);
  const valueControlled = props.value !== undefined;
  const value = valueControlled ? (props.value ?? null) : internalValue;
  const single =
    isRange || isWeek || isMultiple ? null : (value as Date | null);
  const range = isRange ? (value as DateRange | null) : null;
  const week = isWeek ? (value as WeekRange | null) : null;
  const picked = isMultiple ? ((value as Date[] | null) ?? []) : [];
  const isPicked = (d: Date) => picked.some((p) => sameDay(p, d));

  // ── visible months ──
  const anchor = single ?? range?.from ?? week?.from ?? picked[0] ?? null;
  const [internalMonth, setInternalMonth] = useState(() =>
    startOfMonth(defaultMonth ?? anchor ?? new Date()),
  );
  const month = controlledMonth
    ? startOfMonth(controlledMonth)
    : internalMonth;
  const [direction, setDirection] = useState(1);
  const lastMonth = addMonths(month, count - 1);
  const inWindow = (d: Date) => {
    const m = startOfMonth(d);
    return m >= month && m <= lastMonth;
  };

  const setMonth = useCallback(
    (next: Date) => {
      const m = startOfMonth(next);
      if (sameMonth(m, month)) return;
      setDirection(m > month ? 1 : -1);
      if (!controlledMonth) setInternalMonth(m);
      onMonthChange?.(m);
    },
    [month, controlledMonth, onMonthChange],
  );

  // "Today" is read after mount: the server's clock and timezone can disagree
  // with the viewer's, and a mismatched marker would break hydration.
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(startOfDay(new Date())), []);

  // ── roving focus ──
  const [focused, setFocused] = useState<Date>(() =>
    startOfDay(anchor ?? defaultMonth ?? new Date()),
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  // Range hover preview: the band follows the pointer until the end is picked.
  // In week mode it is the row under the pointer or keyboard focus.
  const [hovered, setHovered] = useState<Date | null>(null);

  // Keep the tab stop inside the visible months when they change by buttons.
  const focusInMonth = inWindow(focused)
    ? focused
    : anchor && inWindow(anchor)
      ? anchor
      : month;

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-month="${monthKey(focusInMonth)}"] [data-date="${dayKey(focusInMonth)}"]`,
      )
      ?.focus();
  }, [focusInMonth]);

  const isDisabled = useCallback(
    (d: Date) =>
      (minDate && d < startOfDay(minDate)) ||
      (maxDate && d > startOfDay(maxDate)) ||
      !!isDateDisabled?.(d) ||
      !!getDayMeta?.(d)?.disabled,
    [minDate, maxDate, isDateDisabled, getDayMeta],
  );

  // While a range end is being chosen, days that would make it too short or
  // too long are blocked (earlier days stay open: they restart the range).
  const choosingEnd = !!range && !range.to;
  const nightsAllowed = (n: number) =>
    n >= minNights && (maxNights === undefined || n <= maxNights);
  const blockedByNights = (d: Date) =>
    choosingEnd &&
    !!range &&
    d > range.from &&
    !nightsAllowed(daysBetween(range.from, d));

  const weekStart = (d: Date) =>
    addDays(d, -((d.getDay() - weekStartsOn + 7) % 7));

  const select = (d: Date) => {
    if (isDisabled(d) || blockedByNights(d)) return;
    if (!inWindow(d)) setMonth(d);
    setFocused(d);

    if (isWeek) {
      const from = weekStart(d);
      const next: WeekRange = { from, to: addDays(from, 6) };
      if (!valueControlled) setInternalValue(next);
      (props as CalendarWeekProps).onValueChange?.(next);
      return;
    }

    if (isMultiple) {
      const max = (props as CalendarMultipleProps).max;
      const next = isPicked(d)
        ? picked.filter((p) => !sameDay(p, d))
        : max !== undefined && picked.length >= max
          ? null
          : [...picked, d].sort((a, b) => a.getTime() - b.getTime());
      if (!next) return;
      if (!valueControlled) setInternalValue(next);
      (props as CalendarMultipleProps).onValueChange?.(next);
      return;
    }
    if (!isRange) {
      if (!valueControlled) setInternalValue(d);
      (props as CalendarSingleProps).onValueChange?.(d);
      return;
    }
    // First click starts a range; a later day closes it; an earlier day, the
    // start again when it would be too short, or a click on a finished range
    // starts over.
    const next: DateRange =
      range &&
      !range.to &&
      d >= range.from &&
      nightsAllowed(daysBetween(range.from, d))
        ? { from: range.from, to: d }
        : { from: d };
    if (!valueControlled) setInternalValue(next);
    (props as CalendarRangeProps).onValueChange?.(next);
  };

  const onGridKeyDown = (e: KeyboardEvent) => {
    const base = focusInMonth;
    let next: Date | null = null;
    switch (e.key) {
      case "ArrowLeft":
        next = addDays(base, -1);
        break;
      case "ArrowRight":
        next = addDays(base, 1);
        break;
      case "ArrowUp":
        next = addDays(base, -7);
        break;
      case "ArrowDown":
        next = addDays(base, 7);
        break;
      case "Home":
        next = addDays(base, -((base.getDay() - weekStartsOn + 7) % 7));
        break;
      case "End":
        next = addDays(base, 6 - ((base.getDay() - weekStartsOn + 7) % 7));
        break;
      case "PageUp":
        next = addMonths(base, e.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = addMonths(base, e.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    e.preventDefault();
    shouldFocus.current = true;
    setFocused(next);
    // Scroll the window only when focus leaves it, by as little as needed.
    if (!inWindow(next))
      setMonth(next < month ? next : addMonths(startOfMonth(next), 1 - count));
  };

  // ── labels ──
  const monthFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
    [locale],
  );
  const weekdays = useMemo(() => {
    const short = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const long = new Intl.DateTimeFormat(locale, { weekday: "long" });
    // 2023-01-01 was a Sunday.
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2023, 0, 1 + ((i + weekStartsOn) % 7));
      return { short: short.format(d).slice(0, 2), long: long.format(d) };
    });
  }, [locale, weekStartsOn]);
  const dayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [locale],
  );

  const prevDisabled =
    !!minDate && startOfMonth(minDate) >= month;
  const nextDisabled =
    !!maxDate && startOfMonth(maxDate) <= lastMonth;

  // Range band end: the picked end, or the hovered day while choosing one.
  // A day that can't close the range doesn't stretch the band to it.
  const bandEnd =
    range &&
    !range.to &&
    hovered &&
    hovered > range.from &&
    !isDisabled(hovered) &&
    !blockedByNights(hovered)
      ? hovered
      : range?.to;
  // Week mode: the row being previewed (pointer or keyboard focus).
  const previewWeek = isWeek && hovered ? weekStart(hovered) : null;

  const navButton =
    "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

  const months = Array.from({ length: count }, (_, i) => addMonths(month, i));
  // Weekday index of the column, so connecting bands stop at the row ends.
  const column = (d: Date) => (d.getDay() - weekStartsOn + 7) % 7;
  const cellSize = tall ? "h-12 w-10" : "size-9";

  return (
    <div
      className={cn(
        "w-fit rounded-2xl border border-border bg-card p-3 text-foreground",
        className,
      )}
    >
      <div
        ref={gridRef}
        onPointerLeave={() => setHovered(null)}
        className="flex flex-col gap-x-6 gap-y-4 sm:flex-row"
      >
        {months.map((m, i) => {
          const mk = monthKey(m);
          const weeks = buildWeeks(m, weekStartsOn);
          const labelId = `${uid}-label-${i}`;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional; each keeps its own month transition.
              key={i}
              className="min-w-0"
            >
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                {i === 0 ? (
                  <button
                    type="button"
                    aria-label="Previous month"
                    disabled={prevDisabled}
                    onClick={() => setMonth(addMonths(month, -1))}
                    className={navButton}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <span aria-hidden className="size-8" />
                )}
                <h2
                  id={labelId}
                  aria-live={i === 0 ? "polite" : undefined}
                  className="text-sm font-medium tabular-nums"
                >
                  {monthFormat.format(m)}
                </h2>
                {i === count - 1 ? (
                  <button
                    type="button"
                    aria-label="Next month"
                    disabled={nextDisabled}
                    onClick={() => setMonth(addMonths(month, 1))}
                    className={navButton}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <span aria-hidden className="size-8" />
                )}
              </div>

              <div className="relative overflow-hidden">
                <AnimatePresence
                  initial={false}
                  mode="popLayout"
                  custom={direction}
                >
                  <motion.table
                    key={mk}
                    data-month={mk}
                    custom={direction}
                    aria-labelledby={ariaLabel ? undefined : labelId}
                    aria-label={ariaLabel ? `${ariaLabel}, ${monthFormat.format(m)}` : undefined}
                    onKeyDown={onGridKeyDown}
                    variants={{
                      enter: (dir: number) => ({
                        opacity: 0,
                        x: reduce ? 0 : dir * 28,
                        filter: reduce ? "blur(0px)" : "blur(4px)",
                      }),
                      center: {
                        opacity: 1,
                        x: 0,
                        filter: "blur(0px)",
                        transition: MONTH_ENTER,
                      },
                      exit: (dir: number) => ({
                        opacity: 0,
                        x: reduce ? 0 : dir * -28,
                        filter: reduce ? "blur(0px)" : "blur(4px)",
                        transition: MONTH_EXIT,
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="border-collapse"
                  >
                    <thead>
                      <tr>
                        {showWeekNumber && (
                          <th
                            scope="col"
                            abbr="Week"
                            className="h-8 w-8 text-[11px] font-medium text-muted-foreground/70"
                          >
                            Wk
                          </th>
                        )}
                        {weekdays.map((w) => (
                          <th
                            key={w.long}
                            scope="col"
                            abbr={w.long}
                            className={cn(
                              "h-8 text-[11px] font-medium text-muted-foreground",
                              tall ? "w-10" : "w-9",
                            )}
                          >
                            {w.short}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weeks.map((row) => {
                        // Days this row actually draws: side-by-side months
                        // leave the other month's days blank.
                        const shown =
                          count > 1 ? row.filter((d) => sameMonth(d, m)) : row;
                        const weekSelected =
                          !!week && sameDay(row[0], weekStart(week.from));
                        const weekPreview =
                          !weekSelected && sameDay(row[0], previewWeek);
                        // ISO weeks run Monday–Sunday; the row's Thursday
                        // decides which one a differently started row is.
                        const thursday =
                          row.find((d) => d.getDay() === 4) ?? row[0];
                        return (
                          <tr key={dayKey(row[0])}>
                            {showWeekNumber && (
                              <th
                                scope="row"
                                className={cn(
                                  "p-0 text-center text-[11px] font-normal tabular-nums transition-colors",
                                  weekSelected
                                    ? "font-medium text-foreground"
                                    : "text-muted-foreground/70",
                                )}
                              >
                                {shown.length > 0 ? isoWeek(thursday) : null}
                              </th>
                            )}
                            {row.map((d) => {
                              const outside = !sameMonth(d, m);
                              // Side-by-side months would show these days twice.
                              if (outside && count > 1)
                                return (
                                  <td key={dayKey(d)} className="p-0">
                                    <span className={cn("block", cellSize)} />
                                  </td>
                                );
                              const meta = getDayMeta?.(d) ?? null;
                              const disabled = isDisabled(d);
                              const nightsBlocked =
                                !disabled && blockedByNights(d);
                              const isToday = sameDay(d, today);
                              const isFrom = sameDay(d, range?.from);
                              const isTo = sameDay(d, bandEnd);
                              const inBand =
                                !!range?.from &&
                                !!bandEnd &&
                                d > range.from &&
                                d < bandEnd;
                              const chosen = isMultiple && isPicked(d);
                              const inWeek =
                                !!week &&
                                d >= startOfDay(week.from) &&
                                d <= startOfDay(week.to);
                              const selected = isRange
                                ? isFrom || (isTo && !!range?.to)
                                : isWeek
                                  ? inWeek
                                  : isMultiple
                                    ? chosen
                                    : sameDay(d, single);
                              const endpoint = isFrom || isTo;
                              // Picked neighbours in the same row merge into one
                              // pill, so a run of days reads as a block.
                              const joinPrev =
                                chosen &&
                                column(d) > 0 &&
                                sameMonth(addDays(d, -1), m) &&
                                isPicked(addDays(d, -1));
                              const joinNext =
                                chosen &&
                                column(d) < 6 &&
                                sameMonth(addDays(d, 1), m) &&
                                isPicked(addDays(d, 1));
                              // The week pill lives in the row's first drawn
                              // cell and spans every drawn day after it.
                              const weekPill =
                                isWeek &&
                                (weekSelected || weekPreview) &&
                                sameDay(d, shown[0]);

                              return (
                                <td key={dayKey(d)} className="relative p-0">
                                  {(inBand ||
                                    (endpoint &&
                                      bandEnd &&
                                      !sameDay(range?.from, bandEnd))) && (
                                    <span
                                      aria-hidden
                                      className={cn(
                                        "absolute inset-y-0.5 bg-primary/10",
                                        inBand && "inset-x-0",
                                        isFrom && "left-1/2 right-0",
                                        isTo && "left-0 right-1/2",
                                      )}
                                    />
                                  )}
                                  {weekPill && (
                                    <motion.span
                                      aria-hidden
                                      // Selected and previewed rows each glide
                                      // between weeks, scoped per month.
                                      layoutId={`${uid}-${mk}-${weekSelected ? "week" : "week-preview"}`}
                                      transition={
                                        reduce ? { duration: 0 } : SPRING_LAYOUT
                                      }
                                      style={{ width: `${shown.length * 100}%` }}
                                      className={cn(
                                        "pointer-events-none absolute inset-y-0 left-0 rounded-lg",
                                        weekSelected ? "bg-primary" : "bg-muted",
                                      )}
                                    />
                                  )}
                                  <button
                                    type="button"
                                    data-date={dayKey(d)}
                                    tabIndex={
                                      sameDay(d, focusInMonth) && !outside
                                        ? 0
                                        : -1
                                    }
                                    aria-label={
                                      meta?.label
                                        ? `${dayLabel.format(d)}, ${meta.label}`
                                        : dayLabel.format(d)
                                    }
                                    aria-pressed={selected}
                                    aria-disabled={
                                      disabled || nightsBlocked || undefined
                                    }
                                    aria-current={isToday ? "date" : undefined}
                                    title={
                                      nightsBlocked
                                        ? daysBetween(range?.from ?? d, d) <
                                          minNights
                                          ? `Minimum ${minNights} nights`
                                          : `Maximum ${maxNights} nights`
                                        : undefined
                                    }
                                    onClick={() => select(d)}
                                    onFocus={() => {
                                      setFocused(d);
                                      if (isWeek) setHovered(d);
                                    }}
                                    onBlur={() => isWeek && setHovered(null)}
                                    onPointerEnter={() =>
                                      (isRange || isWeek) && setHovered(d)
                                    }
                                    className={cn(
                                      "relative isolate flex items-center justify-center rounded-lg text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                                      cellSize,
                                      tall && "flex-col gap-0.5",
                                      outside
                                        ? "text-muted-foreground/50"
                                        : "text-foreground",
                                      !selected &&
                                        !disabled &&
                                        !nightsBlocked &&
                                        !isWeek &&
                                        "hover:bg-muted",
                                      selected && "text-primary-foreground",
                                      selected &&
                                        outside &&
                                        "text-primary-foreground/60",
                                      isTo && !range?.to && "text-foreground",
                                      nightsBlocked &&
                                        "cursor-not-allowed text-muted-foreground/40",
                                      disabled &&
                                        "cursor-not-allowed text-muted-foreground/40 line-through",
                                    )}
                                  >
                                    {selected &&
                                      !isWeek &&
                                      (isRange || isMultiple ? (
                                        <motion.span
                                          aria-hidden
                                          initial={
                                            reduce ? false : { scale: 0.7 }
                                          }
                                          animate={{ scale: 1 }}
                                          transition={SPRING_PRESS}
                                          className={cn(
                                            "absolute inset-0 -z-10 rounded-lg bg-primary",
                                            joinPrev && "rounded-l-none",
                                            joinNext && "rounded-r-none",
                                          )}
                                        />
                                      ) : (
                                        <motion.span
                                          aria-hidden
                                          // Scoped per month so the pill glides
                                          // between days but never across the
                                          // sliding grids.
                                          layoutId={`${uid}-${mk}-selected`}
                                          transition={
                                            reduce
                                              ? { duration: 0 }
                                              : SPRING_LAYOUT
                                          }
                                          className="absolute inset-0 -z-10 rounded-lg bg-primary"
                                        />
                                      ))}
                                    {isTo && !range?.to && (
                                      <span
                                        aria-hidden
                                        className="absolute inset-0 -z-10 rounded-lg border border-primary/40"
                                      />
                                    )}
                                    {tall ? (
                                      <span className="leading-none">
                                        {d.getDate()}
                                      </span>
                                    ) : (
                                      d.getDate()
                                    )}
                                    {tall && (
                                      <span
                                        aria-hidden
                                        className={cn(
                                          "h-2.5 text-[10px] leading-none",
                                          meta?.tone === "accent"
                                            ? // Tinted toward the foreground so
                                              // the green keeps contrast on
                                              // light and dark cards.
                                              "font-medium text-[color:color-mix(in_oklab,var(--chart-3)_70%,var(--foreground))]"
                                            : meta?.tone === "muted"
                                              ? "text-muted-foreground/60"
                                              : "text-muted-foreground",
                                          selected &&
                                            "text-primary-foreground/75",
                                          (disabled || nightsBlocked) &&
                                            "text-muted-foreground/40",
                                        )}
                                      >
                                        {meta?.label}
                                      </span>
                                    )}
                                    {isToday && (
                                      <span
                                        aria-hidden
                                        className={cn(
                                          "absolute size-1 rounded-full",
                                          tall ? "top-1.5 right-1.5" : "bottom-1",
                                          selected
                                            ? "bg-primary-foreground"
                                            : "bg-primary",
                                        )}
                                      />
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </motion.table>
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
