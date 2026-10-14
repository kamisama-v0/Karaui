"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/components/motion/popover-morph";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

/** A span of months; both ends are the first of their month. */
export type MonthRange = { from: Date; to?: Date };

type MonthPickerBaseProps = {
  /** Earliest selectable month (any day inside it). */
  minDate?: Date;
  /** Latest selectable month (any day inside it). */
  maxDate?: Date;
  /** Extra per-month rule; receives the first of the month. */
  isMonthDisabled?: (month: Date) => boolean;
  /** Year shown first when nothing is selected. Pass it explicitly for SSR —
   * without it the current year is read after mount. */
  defaultYear?: number;
  /** BCP 47 locale for month names. Default "en-US". */
  locale?: string;
  className?: string;
  "aria-label"?: string;
};

export type MonthPickerSingleProps = MonthPickerBaseProps & {
  mode?: "single";
  /** First of the selected month. */
  value?: Date | null;
  defaultValue?: Date | null;
  /** Called with the first of the picked month. */
  onValueChange?: (month: Date) => void;
};

export type MonthPickerRangeProps = MonthPickerBaseProps & {
  mode: "range";
  value?: MonthRange | null;
  defaultValue?: MonthRange | null;
  onValueChange?: (range: MonthRange) => void;
};

export type MonthPickerProps = MonthPickerSingleProps | MonthPickerRangeProps;

// ── month helpers (local time, month precision) ───────────────────────────

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameMonth = (a?: Date | null, b?: Date | null) =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth();
const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
/** First year of the 12-year page that holds `year`. */
const pageStart = (year: number) => Math.floor(year / 12) * 12;

const COLS = 3;

// Year/page swaps reuse the calendar's directional slide: a short travel in
// the direction you move, with the exit quicker than the entry. Switching
// between the month and year grids zooms instead, since it changes depth
// rather than position. Transform + opacity only.
const SLIDE_ENTER = { duration: 0.26, ease: EASE_OUT } as const;
const SLIDE_EXIT = { duration: 0.16, ease: EASE_OUT } as const;

type Motion = { dir: number; zoom: number; reduce: boolean };
const gridVariants = {
  enter: ({ dir, zoom, reduce }: Motion) => ({
    opacity: 0,
    x: reduce || zoom ? 0 : dir * 28,
    scale: reduce || !zoom ? 1 : zoom > 0 ? 0.92 : 1.08,
  }),
  center: { opacity: 1, x: 0, scale: 1, transition: SLIDE_ENTER },
  exit: ({ dir, zoom, reduce }: Motion) => ({
    opacity: 0,
    x: reduce || zoom ? 0 : dir * -28,
    scale: reduce || !zoom ? 1 : zoom > 0 ? 1.08 : 0.92,
    transition: SLIDE_EXIT,
  }),
};

/**
 * Month grid for one year (3 × 4), with a selection pill that glides between
 * months on a shared-layout spring. Prev/next slide to neighbouring years;
 * clicking the year zooms out to a 12-year grid. Single month or month range,
 * min/max and per-month disabling, roving-focus keyboard navigation (arrows,
 * Home/End per row, PageUp/PageDown by year — by 12 years in the year grid,
 * Escape back to months). Values are the first of the month. Controlled or
 * uncontrolled; reduced-motion safe.
 */
export function MonthPicker(props: MonthPickerProps) {
  const {
    minDate,
    maxDate,
    isMonthDisabled,
    defaultYear,
    locale = "en-US",
    className,
    "aria-label": ariaLabel = "Choose month",
  } = props;
  const isRange = props.mode === "range";
  const uid = useId();
  const reduce = useReducedMotion() ?? false;

  // ── selection ──
  const [internalValue, setInternalValue] = useState<
    Date | MonthRange | null
  >(props.defaultValue ?? null);
  const valueControlled = props.value !== undefined;
  const value = valueControlled ? (props.value ?? null) : internalValue;
  const single = isRange ? null : (value as Date | null);
  const rawRange = isRange ? (value as MonthRange | null) : null;
  // Compare at month precision even if a caller hands in mid-month dates.
  const range = rawRange
    ? {
        from: startOfMonth(rawRange.from),
        to: rawRange.to ? startOfMonth(rawRange.to) : undefined,
      }
    : null;
  const anchor = single ?? range?.from ?? null;

  // ── visible year ──
  // Without a selection or `defaultYear` the year is unknown until mount, so
  // the server and the first client render agree; the grid then shows the
  // viewer's current year.
  const [year, setYearState] = useState<number | null>(
    anchor?.getFullYear() ?? defaultYear ?? null,
  );
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const now = startOfMonth(new Date());
    setToday(now);
    setYearState((y) => y ?? now.getFullYear());
  }, []);
  const shownYear = year ?? defaultYear ?? 2026;

  const [view, setView] = useState<"months" | "years">("months");
  const [page, setPage] = useState(() => pageStart(shownYear));
  const [motionState, setMotionState] = useState({ dir: 1, zoom: 0 });

  // ── roving focus ──
  const [focused, setFocused] = useState<Date>(() =>
    anchor ? startOfMonth(anchor) : new Date(shownYear, 0, 1),
  );
  const [focusedYear, setFocusedYear] = useState(shownYear);
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  const [hovered, setHovered] = useState<Date | null>(null);

  const focusMonth =
    focused.getFullYear() === shownYear
      ? focused
      : anchor && anchor.getFullYear() === shownYear
        ? startOfMonth(anchor)
        : new Date(shownYear, 0, 1);
  const focusYear =
    focusedYear >= page && focusedYear < page + 12 ? focusedYear : page;

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    const sel =
      view === "months"
        ? `[data-month="${monthKey(focusMonth)}"]`
        : `[data-year="${focusYear}"]`;
    gridRef.current?.querySelector<HTMLButtonElement>(sel)?.focus();
  });

  const minMonth = minDate ? startOfMonth(minDate) : null;
  const maxMonth = maxDate ? startOfMonth(maxDate) : null;
  const isDisabled = (m: Date) =>
    (!!minMonth && m < minMonth) ||
    (!!maxMonth && m > maxMonth) ||
    !!isMonthDisabled?.(m);
  const yearDisabled = (y: number) =>
    (!!minMonth && y < minMonth.getFullYear()) ||
    (!!maxMonth && y > maxMonth.getFullYear());

  const goYear = (next: number) => {
    if (next === shownYear) return;
    setMotionState({ dir: next > shownYear ? 1 : -1, zoom: 0 });
    setYearState(next);
  };
  const goPage = (next: number) => {
    if (next === page) return;
    setMotionState({ dir: next > page ? 1 : -1, zoom: 0 });
    setPage(next);
  };
  const openYears = () => {
    setMotionState({ dir: 1, zoom: 1 });
    setPage(pageStart(shownYear));
    setFocusedYear(shownYear);
    setView("years");
    shouldFocus.current = true;
  };
  const closeYears = (y: number) => {
    setMotionState({ dir: 1, zoom: -1 });
    setYearState(y);
    setFocused(new Date(y, focusMonth.getMonth(), 1));
    setView("months");
    shouldFocus.current = true;
  };

  const select = (m: Date) => {
    if (isDisabled(m)) return;
    setFocused(m);
    if (!isRange) {
      if (!valueControlled) setInternalValue(m);
      (props as MonthPickerSingleProps).onValueChange?.(m);
      return;
    }
    // First click starts a range; a later month closes it; an earlier month
    // or a click on a finished range starts over.
    const next: MonthRange =
      range && !range.to && m >= range.from
        ? { from: range.from, to: m }
        : { from: m };
    if (!valueControlled) setInternalValue(next);
    (props as MonthPickerRangeProps).onValueChange?.(next);
  };

  const onMonthKeyDown = (e: KeyboardEvent) => {
    const base = focusMonth;
    const col = base.getMonth() % COLS;
    const delta: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -COLS,
      ArrowDown: COLS,
      Home: -col,
      End: COLS - 1 - col,
      PageUp: -12,
      PageDown: 12,
    };
    if (!(e.key in delta)) return;
    e.preventDefault();
    const next = addMonths(base, delta[e.key]);
    shouldFocus.current = true;
    setFocused(next);
    goYear(next.getFullYear());
  };

  const onYearKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      // Stop the surrounding popover (if any) from closing as well.
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      closeYears(shownYear);
      return;
    }
    const col = (focusYear - page) % COLS;
    const delta: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -COLS,
      ArrowDown: COLS,
      Home: -col,
      End: COLS - 1 - col,
      PageUp: -12,
      PageDown: 12,
    };
    if (!(e.key in delta)) return;
    e.preventDefault();
    const next = focusYear + delta[e.key];
    shouldFocus.current = true;
    setFocusedYear(next);
    goPage(pageStart(next));
  };

  // ── labels ──
  const monthNames = useMemo(() => {
    const short = new Intl.DateTimeFormat(locale, { month: "short" });
    const long = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    });
    return {
      short: (d: Date) => short.format(d),
      long: (d: Date) => long.format(d),
    };
  }, [locale]);

  const prevDisabled =
    view === "months"
      ? !!minMonth && minMonth.getFullYear() >= shownYear
      : !!minMonth && minMonth.getFullYear() >= page;
  const nextDisabled =
    view === "months"
      ? !!maxMonth && maxMonth.getFullYear() <= shownYear
      : !!maxMonth && maxMonth.getFullYear() <= page + 11;

  const bandEnd =
    range && !range.to && hovered && hovered > range.from
      ? hovered
      : range?.to;

  const navButton =
    "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";
  const cell =
    "relative isolate flex h-10 w-full items-center justify-center rounded-lg text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";

  const gridKey = view === "months" ? `m-${shownYear}` : `y-${page}`;
  const custom: Motion = { ...motionState, reduce };
  const headerLabel =
    view === "months" ? String(shownYear) : `${page} – ${page + 11}`;

  return (
    <div
      className={cn(
        "w-72 rounded-2xl border border-border bg-card p-3 text-foreground",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={view === "months" ? "Previous year" : "Previous years"}
          disabled={prevDisabled}
          onClick={() =>
            view === "months" ? goYear(shownYear - 1) : goPage(page - 12)
          }
          className={navButton}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={
            view === "months"
              ? `${shownYear}, choose year`
              : `${headerLabel}, back to months`
          }
          onClick={() => (view === "months" ? openYears() : closeYears(shownYear))}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium tabular-nums outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-live="polite" className={cn(year === null && "invisible")}>
            {headerLabel}
          </span>
          <motion.span
            aria-hidden
            animate={{ rotate: view === "years" ? 180 : 0 }}
            transition={reduce ? { duration: 0 } : SPRING_PRESS}
            className="inline-flex text-muted-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.span>
        </button>
        <button
          type="button"
          aria-label={view === "months" ? "Next year" : "Next years"}
          disabled={nextDisabled}
          onClick={() =>
            view === "months" ? goYear(shownYear + 1) : goPage(page + 12)
          }
          className={navButton}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={gridRef}
        // Padded so focus rings on edge cells aren't clipped by the slide mask.
        className="relative -m-1 overflow-hidden p-1"
        onPointerLeave={() => setHovered(null)}
      >
        <AnimatePresence initial={false} mode="popLayout" custom={custom}>
          <motion.div
            key={gridKey}
            custom={custom}
            variants={gridVariants}
            initial="enter"
            animate="center"
            exit="exit"
            role="group"
            aria-label={
              view === "months" ? `${ariaLabel}, ${shownYear}` : "Choose year"
            }
            onKeyDown={view === "months" ? onMonthKeyDown : onYearKeyDown}
            className={cn(
              "grid grid-cols-3 gap-1",
              // Unknown year until mount (see above): hold the grid back
              // rather than flash a placeholder year.
              year === null && "invisible",
            )}
          >
            {view === "months"
              ? Array.from({ length: 12 }, (_, i) => {
                  const m = new Date(shownYear, i, 1);
                  const disabled = isDisabled(m);
                  const isFrom = sameMonth(m, range?.from);
                  const isTo = sameMonth(m, bandEnd);
                  const inBand =
                    !!range?.from && !!bandEnd && m > range.from && m < bandEnd;
                  const selected = isRange
                    ? isFrom || (isTo && !!range?.to)
                    : sameMonth(m, single);
                  const isNow = sameMonth(m, today);
                  return (
                    <button
                      key={monthKey(m)}
                      type="button"
                      data-month={monthKey(m)}
                      tabIndex={sameMonth(m, focusMonth) ? 0 : -1}
                      aria-label={monthNames.long(m)}
                      aria-pressed={selected}
                      aria-disabled={disabled || undefined}
                      aria-current={isNow ? "date" : undefined}
                      onClick={() => select(m)}
                      onFocus={() => setFocused(m)}
                      onPointerEnter={() => isRange && setHovered(m)}
                      className={cn(
                        cell,
                        inBand && "bg-primary/10",
                        !selected && !inBand && !disabled && "hover:bg-muted",
                        selected ? "text-primary-foreground" : "text-foreground",
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
                            // Scoped per year so the pill glides between
                            // months but never across the sliding grids.
                            layoutId={`${uid}-${shownYear}-month`}
                            transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                            className="absolute inset-0 -z-10 rounded-lg bg-primary"
                          />
                        ))}
                      {isTo && !range?.to && (
                        <span
                          aria-hidden
                          className="absolute inset-0 -z-10 rounded-lg border border-primary/40"
                        />
                      )}
                      {monthNames.short(m)}
                      {isNow && (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute bottom-1.5 size-1 rounded-full",
                            selected ? "bg-primary-foreground" : "bg-primary",
                          )}
                        />
                      )}
                    </button>
                  );
                })
              : Array.from({ length: 12 }, (_, i) => {
                  const y = page + i;
                  const disabled = yearDisabled(y);
                  const selected = y === shownYear;
                  return (
                    <button
                      key={y}
                      type="button"
                      data-year={y}
                      tabIndex={y === focusYear ? 0 : -1}
                      aria-pressed={selected}
                      aria-disabled={disabled || undefined}
                      aria-current={today?.getFullYear() === y ? "date" : undefined}
                      onClick={() => !disabled && closeYears(y)}
                      onFocus={() => setFocusedYear(y)}
                      className={cn(
                        cell,
                        "tabular-nums",
                        selected ? "text-primary-foreground" : "text-foreground",
                        !selected && !disabled && "hover:bg-muted",
                        disabled &&
                          "cursor-not-allowed text-muted-foreground/40 line-through",
                      )}
                    >
                      {selected && (
                        <motion.span
                          aria-hidden
                          layoutId={`${uid}-${page}-year`}
                          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                          className="absolute inset-0 -z-10 rounded-lg bg-primary"
                        />
                      )}
                      {y}
                    </button>
                  );
                })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const MONTH_YEAR: Intl.DateTimeFormatOptions = {
  month: "long",
  year: "numeric",
};

export interface MonthFieldProps
  extends Omit<
    MonthPickerSingleProps,
    "mode" | "value" | "defaultValue" | "onValueChange" | "className"
  > {
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (month: Date) => void;
  placeholder?: string;
  /** Intl options for the trigger label. Default "October 2026". */
  formatOptions?: Intl.DateTimeFormatOptions;
  align?: "start" | "end";
  disabled?: boolean;
  className?: string;
}

/**
 * Month field whose month grid morphs open from the trigger corner and closes
 * as soon as a month is picked. Controlled or uncontrolled.
 */
export function MonthField({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  placeholder = "Pick a month",
  formatOptions = MONTH_YEAR,
  locale = "en-US",
  align = "start",
  disabled,
  className,
  "aria-label": ariaLabel = "Choose month",
  ...pickerProps
}: MonthFieldProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<Date | null>(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internal;

  const label = useMemo(
    () =>
      value ? new Intl.DateTimeFormat(locale, formatOptions).format(value) : null,
    [value, locale, formatOptions],
  );

  return (
    <MorphPopover open={open} onOpenChange={setOpen}>
      <MorphPopoverTrigger>
        <button
          type="button"
          disabled={disabled}
          aria-label={label ? `${ariaLabel}, ${label}` : ariaLabel}
          className={cn(
            "inline-flex h-10 min-w-44 items-center gap-2 rounded-xl border border-border bg-background px-3 text-left text-sm outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            label ? "text-foreground" : "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate tabular-nums">
            {label ?? placeholder}
          </span>
        </button>
      </MorphPopoverTrigger>

      <MorphPopoverContent align={align} className="p-0">
        <MonthPicker
          {...pickerProps}
          aria-label={ariaLabel}
          locale={locale}
          value={value}
          onValueChange={(m) => {
            if (controlledValue === undefined) setInternal(m);
            onValueChange?.(m);
            setOpen(false);
          }}
          className="border-0 bg-transparent"
        />
      </MorphPopoverContent>
    </MorphPopover>
  );
}
