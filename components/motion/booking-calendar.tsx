"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/motion/button";
import {
  Calendar,
  type CalendarDayMeta,
  type DateRange,
} from "@/components/motion/calendar";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type BookingSummary = {
  from: Date;
  to: Date;
  nights: number;
  /** Sum of the nightly prices, check-in night through the last night. */
  total: number;
};

export interface BookingCalendarProps {
  /** Nightly price keyed by "YYYY-MM-DD" (the night's check-in date), or a
   * function. Nights without a price can't be booked. */
  prices: Record<string, number> | ((date: Date) => number | null | undefined);
  /** Nights already taken, as dates or "YYYY-MM-DD". They render struck
   * through; the first one after a check-in still works as the check-out. */
  booked?: (Date | string)[];
  /** Fewest nights per stay. Default 1. */
  minNights?: number;
  /** Most nights per stay. */
  maxNights?: number;
  /** ISO 4217 code for prices and the total. Default "USD". */
  currency?: string;
  /** BCP 47 locale. Default "en-US" so server and client output match. */
  locale?: string;
  /** Earliest check-in, typically today (read it after mount). */
  minDate?: Date;
  maxDate?: Date;
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (range: DateRange | null) => void;
  /** Uncontrolled first visible month. */
  defaultMonth?: Date;
  /** Months side by side. Default 2. */
  numberOfMonths?: number;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Called by the Reserve button with the finished stay. */
  onReserve?: (booking: BookingSummary) => void;
  /** Reserve button text. Default "Reserve". */
  reserveLabel?: string;
  className?: string;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);
const nightsBetween = (a: Date, b: Date) =>
  Math.round(
    (new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() -
      new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()) /
      86_400_000,
  );
const toDate = (d: Date | string) => {
  if (d instanceof Date) return d;
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};

/** Share of each month's open nights tinted as the cheapest. */
const CHEAP_SHARE = 0.25;
/** How far ahead to look for the next taken night after a check-in. */
const SCAN_LIMIT = 366;

const SWAP = { duration: 0.2, ease: EASE_OUT } as const;

/**
 * Stay picker block: a two-month range `Calendar` with nightly prices under
 * each day (each month's cheapest quarter tinted), booked nights struck
 * through and unselectable, a stay can't run across a booked night, minimum
 * and maximum nights, and a summary footer with dates, nights, the
 * `Intl`-formatted total and a Reserve button. Controlled or uncontrolled.
 */
export function BookingCalendar({
  prices,
  booked,
  minNights = 1,
  maxNights,
  currency = "USD",
  locale = "en-US",
  minDate,
  maxDate,
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  defaultMonth,
  numberOfMonths = 2,
  weekStartsOn = 0,
  onReserve,
  reserveLabel = "Reserve",
  className,
}: BookingCalendarProps) {
  const reduce = useReducedMotion();
  const [internalValue, setInternalValue] = useState<DateRange | null>(
    defaultValue,
  );
  const value =
    controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = (next: DateRange | null) => {
    if (controlledValue === undefined) setInternalValue(next);
    onValueChange?.(next);
  };

  const bookedKeys = useMemo(
    () => new Set((booked ?? []).map((d) => dayKey(toDate(d)))),
    [booked],
  );
  const priceOf = useCallback(
    (d: Date) => {
      const p = typeof prices === "function" ? prices(d) : prices[dayKey(d)];
      return p ?? null;
    },
    [prices],
  );
  const nightOpen = useCallback(
    (d: Date) => !bookedKeys.has(dayKey(d)) && priceOf(d) !== null,
    [bookedKeys, priceOf],
  );

  // Cheapest-quarter threshold per month, computed once per month shown.
  const cheapThreshold = useMemo(() => {
    const cache = new Map<string, number>();
    return (d: Date) => {
      const key = dayKey(d).slice(0, 7);
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const open: number[] = [];
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= last; i++) {
        const day = new Date(d.getFullYear(), d.getMonth(), i);
        const p = priceOf(day);
        if (p !== null && !bookedKeys.has(dayKey(day))) open.push(p);
      }
      open.sort((a, b) => a - b);
      const t = open.length
        ? open[Math.floor((open.length - 1) * CHEAP_SHARE)]
        : Number.NEGATIVE_INFINITY;
      cache.set(key, t);
      return t;
    };
  }, [bookedKeys, priceOf]);

  // While the check-out is being picked, the stay can't cross a taken night:
  // the first one caps the length, and its day still works as the check-out.
  const choosingEnd = !!value && !value.to;
  const reach = useMemo(() => {
    if (!value || value.to) return null;
    const cap = maxNights ?? SCAN_LIMIT;
    for (let n = 1; n <= cap; n++)
      if (!nightOpen(addDays(value.from, n))) return n;
    return cap;
  }, [value, maxNights, nightOpen]);
  const checkoutOnly =
    choosingEnd && value && reach !== null && !nightOpen(addDays(value.from, reach))
      ? addDays(value.from, reach)
      : null;

  const priceLabel = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 0,
      }),
    [locale, currency],
  );
  const money = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    [locale, currency],
  );
  const shortDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  const getDayMeta = (d: Date): CalendarDayMeta => {
    if (checkoutOnly && sameDay(d, checkoutOnly))
      return { label: "Out", tone: "muted" };
    const price = priceOf(d);
    if (bookedKeys.has(dayKey(d)) || price === null) return { disabled: true };
    return {
      label: priceLabel.format(price),
      tone: price <= cheapThreshold(d) ? "accent" : undefined,
    };
  };

  const stay: BookingSummary | null = useMemo(() => {
    if (!value?.to) return null;
    const nights = nightsBetween(value.from, value.to);
    let total = 0;
    for (let i = 0; i < nights; i++) total += priceOf(addDays(value.from, i)) ?? 0;
    return { from: value.from, to: value.to, nights, total };
  }, [value, priceOf]);

  const hint = stay
    ? `${shortDate.format(stay.from)} – ${shortDate.format(stay.to)}`
    : value
      ? `Check-in ${shortDate.format(value.from)} · pick check-out`
      : "Pick a check-in date";
  const detail = stay
    ? `${stay.nights} night${stay.nights === 1 ? "" : "s"} · ${money.format(stay.total)}`
    : minNights > 1
      ? `${minNights}-night minimum`
      : "Prices per night";

  return (
    <div
      className={cn(
        "w-fit rounded-2xl border border-border bg-card text-foreground",
        className,
      )}
    >
      <Calendar
        mode="range"
        value={value}
        onValueChange={setValue}
        numberOfMonths={numberOfMonths}
        minNights={minNights}
        maxNights={reach ?? maxNights}
        getDayMeta={getDayMeta}
        minDate={minDate}
        maxDate={maxDate}
        defaultMonth={defaultMonth}
        weekStartsOn={weekStartsOn}
        locale={locale}
        aria-label="Stay dates"
        className="border-0 bg-transparent"
      />
      <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
        <div aria-live="polite" className="min-w-0">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.p
              key={hint}
              initial={{ opacity: 0, y: reduce ? 0 : 6 }}
              animate={{ opacity: 1, y: 0, transition: SWAP }}
              exit={{ opacity: 0, y: reduce ? 0 : -6, transition: SWAP }}
              className="truncate text-sm font-medium tabular-nums"
            >
              {hint}
            </motion.p>
          </AnimatePresence>
          <p className="truncate text-xs text-muted-foreground tabular-nums">
            {detail}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {value && (
            <Button variant="ghost" size="sm" onClick={() => setValue(null)}>
              Clear
            </Button>
          )}
          <Button
            size="sm"
            disabled={!stay}
            onClick={() => stay && onReserve?.(stay)}
          >
            {reserveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
