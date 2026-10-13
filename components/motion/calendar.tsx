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
};

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

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
 * Month-grid calendar for single dates or ranges. The selected day is a pill
 * that glides between days on a shared-layout spring; months slide in from
 * the direction you travel. Full keyboard grid navigation (arrows, Home/End,
 * PageUp/PageDown, Shift+Page for years). Controlled or uncontrolled for both
 * the selection and the visible month; reduced-motion safe.
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
    className,
    "aria-label": ariaLabel,
  } = props;
  const isRange = props.mode === "range";

  const uid = useId();
  const reduce = useReducedMotion();

  // ── selection ──
  const [internalValue, setInternalValue] = useState<
    Date | DateRange | null
  >(props.defaultValue ?? null);
  const valueControlled = props.value !== undefined;
  const value = valueControlled ? (props.value ?? null) : internalValue;
  const single = isRange ? null : (value as Date | null);
  const range = isRange ? (value as DateRange | null) : null;

  // ── visible month ──
  const anchor = single ?? range?.from ?? null;
  const [internalMonth, setInternalMonth] = useState(() =>
    startOfMonth(defaultMonth ?? anchor ?? new Date()),
  );
  const month = controlledMonth
    ? startOfMonth(controlledMonth)
    : internalMonth;
  const [direction, setDirection] = useState(1);

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
  const [hovered, setHovered] = useState<Date | null>(null);

  // Keep the tab stop inside the visible month when it changes by buttons.
  const focusInMonth = sameMonth(focused, month)
    ? focused
    : anchor && sameMonth(anchor, month)
      ? anchor
      : month;

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-month="${monthKey(month)}"] [data-date="${dayKey(focusInMonth)}"]`,
      )
      ?.focus();
  }, [focusInMonth, month]);

  const isDisabled = useCallback(
    (d: Date) =>
      (minDate && d < startOfDay(minDate)) ||
      (maxDate && d > startOfDay(maxDate)) ||
      !!isDateDisabled?.(d),
    [minDate, maxDate, isDateDisabled],
  );

  const select = (d: Date) => {
    if (isDisabled(d)) return;
    if (!sameMonth(d, month)) setMonth(d);
    setFocused(d);

    if (!isRange) {
      if (!valueControlled) setInternalValue(d);
      (props as CalendarSingleProps).onValueChange?.(d);
      return;
    }
    // First click starts a range; a later day closes it; an earlier day or a
    // click on a finished range starts over.
    const next: DateRange =
      range && !range.to && d >= range.from
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
    setMonth(next);
  };

  // ── labels ──
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }).format(month),
    [locale, month],
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

  const weeks = useMemo(
    () => buildWeeks(month, weekStartsOn),
    [month, weekStartsOn],
  );

  const prevDisabled =
    !!minDate && startOfMonth(minDate) >= month;
  const nextDisabled =
    !!maxDate && startOfMonth(maxDate) <= month;

  // Range band end: the picked end, or the hovered day while choosing one.
  const bandEnd =
    range && !range.to && hovered && hovered > range.from
      ? hovered
      : range?.to;

  const navButton =
    "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

  const mk = monthKey(month);

  return (
    <div
      className={cn(
        "w-fit rounded-2xl border border-border bg-card p-3 text-foreground",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          aria-label="Previous month"
          disabled={prevDisabled}
          onClick={() => setMonth(addMonths(month, -1))}
          className={navButton}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2
          id={`${uid}-label`}
          aria-live="polite"
          className="text-sm font-medium tabular-nums"
        >
          {monthLabel}
        </h2>
        <button
          type="button"
          aria-label="Next month"
          disabled={nextDisabled}
          onClick={() => setMonth(addMonths(month, 1))}
          className={navButton}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div ref={gridRef} className="relative overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.table
            key={mk}
            data-month={mk}
            custom={direction}
            aria-labelledby={ariaLabel ? undefined : `${uid}-label`}
            aria-label={ariaLabel}
            onKeyDown={onGridKeyDown}
            onPointerLeave={() => setHovered(null)}
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
                {weekdays.map((w) => (
                  <th
                    key={w.long}
                    scope="col"
                    abbr={w.long}
                    className="h-8 w-9 text-[11px] font-medium text-muted-foreground"
                  >
                    {w.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={dayKey(week[0])}>
                  {week.map((d) => {
                    const outside = !sameMonth(d, month);
                    const disabled = isDisabled(d);
                    const isToday = sameDay(d, today);
                    const isFrom = sameDay(d, range?.from);
                    const isTo = sameDay(d, bandEnd);
                    const inBand =
                      !!range?.from && !!bandEnd && d > range.from && d < bandEnd;
                    const selected = isRange
                      ? isFrom || (isTo && !!range?.to)
                      : sameDay(d, single);
                    const endpoint = isFrom || isTo;

                    return (
                      <td key={dayKey(d)} className="relative p-0">
                        {(inBand || (endpoint && bandEnd && !sameDay(range?.from, bandEnd))) && (
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
                        <button
                          type="button"
                          data-date={dayKey(d)}
                          tabIndex={
                            sameDay(d, focusInMonth) && !outside ? 0 : -1
                          }
                          aria-label={dayLabel.format(d)}
                          aria-pressed={selected}
                          aria-disabled={disabled || undefined}
                          aria-current={isToday ? "date" : undefined}
                          onClick={() => select(d)}
                          onFocus={() => setFocused(d)}
                          onPointerEnter={() => isRange && setHovered(d)}
                          className={cn(
                            "relative isolate flex size-9 items-center justify-center rounded-lg text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                            outside
                              ? "text-muted-foreground/50"
                              : "text-foreground",
                            !selected && !disabled && "hover:bg-muted",
                            selected && "text-primary-foreground",
                            isTo && !range?.to && "text-foreground",
                            disabled &&
                              "cursor-not-allowed text-muted-foreground/40 line-through",
                          )}
                        >
                          {selected &&
                            (isRange ? (
                              <motion.span
                                aria-hidden
                                initial={reduce ? false : { scale: 0.7 }}
                                animate={{ scale: 1 }}
                                transition={SPRING_PRESS}
                                className="absolute inset-0 -z-10 rounded-lg bg-primary"
                              />
                            ) : (
                              <motion.span
                                aria-hidden
                                // Scoped per month so the pill glides between
                                // days but never across the sliding grids.
                                layoutId={`${uid}-${mk}-selected`}
                                transition={
                                  reduce ? { duration: 0 } : SPRING_LAYOUT
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
                          {d.getDate()}
                          {isToday && (
                            <span
                              aria-hidden
                              className={cn(
                                "absolute bottom-1 size-1 rounded-full",
                                selected ? "bg-primary-foreground" : "bg-primary",
                              )}
                            />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </motion.table>
        </AnimatePresence>
      </div>
    </div>
  );
}
