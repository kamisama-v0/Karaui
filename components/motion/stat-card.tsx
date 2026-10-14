"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useMemo } from "react";
import { Sparkline } from "@/components/motion/chart/sparkline";
import { NumberTicker } from "@/components/motion/number-ticker";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type StatFormat = "number" | "currency" | "percent" | "compact";
export type StatTone = "positive" | "negative" | "neutral";

export interface StatCardProps {
  label: ReactNode;
  /** Headline value. For `format="percent"` pass a fraction (0.034 = 3.4%). */
  value: number;
  /** Preset formatting. Default "number". */
  format?: StatFormat;
  /** ISO 4217 code for `format="currency"`. Default "USD". */
  currency?: string;
  /** Formatting locale. Default "en-US" so server and client agree. */
  locale?: string;
  /** Extra Intl options merged over the preset (e.g. fraction digits). */
  formatOptions?: Intl.NumberFormatOptions;
  /** Relative change as a fraction (0.12 = +12%). Omit to hide the badge. */
  delta?: number;
  /** Which direction is good news. Default "up"; use "down" for churn, latency… */
  goodDirection?: "up" | "down";
  /** Force the badge tone instead of deriving it from delta and goodDirection. */
  deltaTone?: StatTone;
  /** Trend values for the inline sparkline. */
  sparkline?: number[];
  /** Sparkline color (any CSS color). Default follows the delta tone. */
  sparklineColor?: string;
  /** Small caption under the value, e.g. "vs previous 30 days". */
  caption?: ReactNode;
  /** Optional icon beside the label. */
  icon?: ReactNode;
  /** Render a skeleton instead of the value. */
  loading?: boolean;
  className?: string;
}

const TONE_CLASS: Record<StatTone, string> = {
  positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  negative: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};
const TONE_COLOR: Record<StatTone, string> = {
  positive: "var(--chart-3, #1baf7a)",
  negative: "var(--destructive, #e5484d)",
  neutral: "var(--chart-1, #2a78d6)",
};

function presetOptions(
  format: StatFormat,
  currency: string,
): Intl.NumberFormatOptions {
  switch (format) {
    case "currency":
      return { style: "currency", currency, maximumFractionDigits: 0 };
    case "percent":
      return { style: "percent", maximumFractionDigits: 1 };
    case "compact":
      return { notation: "compact", maximumFractionDigits: 1 };
    default:
      return { maximumFractionDigits: 0 };
  }
}

/**
 * KPI tile: label, a headline number whose digits roll to each new value, a
 * delta badge toned by whether the move is good news, an optional sparkline
 * that redraws when its data changes, and a caption. `loading` swaps in a
 * skeleton of the same footprint so the grid never jumps.
 */
export function StatCard({
  label,
  value,
  format = "number",
  currency = "USD",
  locale = "en-US",
  formatOptions,
  delta,
  goodDirection = "up",
  deltaTone,
  sparkline,
  sparklineColor,
  caption,
  icon,
  loading = false,
  className,
}: StatCardProps) {
  const reduce = useReducedMotion();
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        ...presetOptions(format, currency),
        ...formatOptions,
      }),
    [locale, format, currency, formatOptions],
  );
  const deltaFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
      }),
    [locale],
  );

  // NumberTicker rolls integers, so feed it the value scaled by the shown
  // precision and divide back in the formatter — decimals survive the roll.
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 0;
  const scale = 10 ** (fractionDigits + (format === "percent" ? 2 : 0));
  const tickerValue = Math.round(value * scale);
  const formatTicker = (n: number) => formatter.format(n / scale);

  const tone: StatTone =
    deltaTone ??
    (delta === undefined || delta === 0
      ? "neutral"
      : (delta > 0) === (goodDirection === "up")
        ? "positive"
        : "negative");
  const DeltaIcon = (delta ?? 0) < 0 ? ArrowDownRight : ArrowUpRight;
  const deltaText = delta === undefined ? "" : deltaFormatter.format(delta);
  const sparkLabel = typeof label === "string" ? label : "Trend";

  return (
    <section
      aria-busy={loading || undefined}
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 text-card-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon ? <span className="[&_svg]:size-3.5">{icon}</span> : null}
        <span className="truncate">{label}</span>
      </div>

      {loading ? (
        <div className="mt-2 flex flex-col gap-2" aria-hidden>
          <span className="h-7 w-28 animate-pulse rounded-md bg-muted" />
          <span className="h-4 w-16 animate-pulse rounded-full bg-muted" />
          {sparkline ? <span className="mt-1 h-9 w-full animate-pulse rounded-md bg-muted" /> : null}
        </div>
      ) : (
        <>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <NumberTicker
              value={tickerValue}
              format={formatTicker}
              duration={0.7}
              stagger={0.03}
              className="text-2xl font-semibold tracking-tight"
            />
            {delta !== undefined ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors",
                  TONE_CLASS[tone],
                )}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={DeltaIcon === ArrowUpRight ? "up" : "down"}
                    initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduce ? 0 : -4 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="inline-flex"
                  >
                    <DeltaIcon aria-hidden className="size-3" />
                  </motion.span>
                </AnimatePresence>
                <span className="sr-only">
                  {tone === "positive" ? "Improved " : tone === "negative" ? "Worsened " : "Changed "}
                </span>
                {deltaText}
              </span>
            ) : null}
          </div>
          {caption ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p>
          ) : null}
          {sparkline && sparkline.length > 1 ? (
            <Sparkline
              // Keyed by the data so a new range remounts and draws in again.
              key={sparkline.join(",")}
              data={sparkline}
              height={36}
              label={sparkLabel}
              color={sparklineColor ?? TONE_COLOR[tone]}
              formatValue={(v) => formatter.format(v)}
              className="mt-3"
            />
          ) : null}
        </>
      )}
    </section>
  );
}

export interface StatGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container-query grid for StatCards: one column when narrow, two from
 * 28rem, four from 48rem of its own width.
 */
export function StatGrid({ children, className }: StatGridProps) {
  return (
    <div className={cn("@container w-full", className)}>
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:grid-cols-4">
        {children}
      </div>
    </div>
  );
}
