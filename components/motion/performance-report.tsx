"use client";

import { Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { type ReactNode, useId, useMemo, useState } from "react";
import type { DateRange } from "@/components/motion/calendar";
import { AreaChart } from "@/components/motion/chart/area-chart";
import { seriesColor } from "@/components/motion/chart/shared";
import { DateRangePicker, type DateRangePreset } from "@/components/motion/date-range-picker";
import { Skeleton, SkeletonSwap } from "@/components/motion/skeleton";
import { StatCard, type StatFormat } from "@/components/motion/stat-card";
import { Switch } from "@/components/motion/switch";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface ReportKpi {
  id: string;
  label: string;
  value: number;
  /** Same metric for the comparison period; drives the delta badge. */
  previous?: number;
  format?: StatFormat;
  /** Which way is good news. Default "up". */
  goodDirection?: "up" | "down";
  icon?: ReactNode;
}

export interface ReportTrendPoint {
  /** ISO date (YYYY-MM-DD), read as UTC. */
  date: string;
  current: number;
  previous?: number;
}

export interface ReportBreakdownRow {
  id: string;
  label: string;
  value: number;
  previous?: number;
}

export interface PerformanceReportData {
  kpis: ReportKpi[];
  trend: ReportTrendPoint[];
  /** Name of the trended metric, e.g. "Sessions". */
  trendLabel?: string;
  breakdown: ReportBreakdownRow[];
  /** Name of the breakdown dimension, e.g. "Channel". */
  breakdownLabel?: string;
}

export type InsightTone = "positive" | "negative" | "neutral";

export interface ReportInsight {
  id: string;
  tone: InsightTone;
  text: ReactNode;
}

export interface PerformanceReportProps {
  /** Report contents for the current range. `null` renders the loading state. */
  data: PerformanceReportData | null;
  /** Show skeletons (e.g. while a new range loads). */
  loading?: boolean;
  range?: DateRange | null;
  defaultRange?: DateRange | null;
  onRangeChange?: (range: { from: Date; to: Date }) => void;
  presets?: DateRangePreset[];
  /** Controlled previous-period comparison. */
  compare?: boolean;
  defaultCompare?: boolean;
  onCompareChange?: (compare: boolean) => void;
  /** Override the auto-generated highlights. */
  insights?: ReportInsight[];
  title?: ReactNode;
  /** Default "en-US". */
  locale?: string;
  /** Trend chart plot height in px. Default 110. */
  chartHeight?: number;
  className?: string;
}

const UTC_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const formatDay = (iso: string) => {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(ms) ? iso : UTC_DAY.format(ms);
};

const TONE_TEXT: Record<InsightTone, string> = {
  positive: "text-[color-mix(in_oklab,var(--success)_60%,var(--foreground))]",
  negative: "text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]",
  neutral: "text-muted-foreground",
};
const TONE_BG: Record<InsightTone, string> = {
  positive: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)]",
  negative: "bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)]",
  neutral: "bg-foreground/5",
};

const change = (value: number, previous?: number) =>
  previous === undefined || previous === 0 ? undefined : (value - previous) / Math.abs(previous);

/**
 * Plain-language highlights derived from the report: the biggest KPI move vs
 * the previous period, the top and fastest-growing breakdown rows, and the
 * peak day of the trend. Exported so it can feed other surfaces.
 */
export function generateInsights(
  data: PerformanceReportData,
  { compare = true, locale = "en-US", max = 4 }: { compare?: boolean; locale?: string; max?: number } = {},
): ReportInsight[] {
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const num = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const out: ReportInsight[] = [];

  if (compare) {
    const moves = data.kpis
      .map((k) => ({ k, d: change(k.value, k.previous) }))
      .filter((m): m is { k: ReportKpi; d: number } => m.d !== undefined && m.d !== 0)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const best = moves.find((m) => (m.d > 0) === ((m.k.goodDirection ?? "up") === "up"));
    const worst = moves.find((m) => (m.d > 0) !== ((m.k.goodDirection ?? "up") === "up"));
    if (best)
      out.push({
        id: `kpi-${best.k.id}`,
        tone: "positive",
        text: `${best.k.label} ${best.d > 0 ? "up" : "down"} ${pct.format(Math.abs(best.d))} vs the previous period.`,
      });
    if (worst)
      out.push({
        id: `kpi-${worst.k.id}`,
        tone: "negative",
        text: `${worst.k.label} ${worst.d > 0 ? "rose" : "slipped"} ${pct.format(Math.abs(worst.d))} — worth a look.`,
      });
  }

  const total = data.breakdown.reduce((s, r) => s + r.value, 0);
  const top = [...data.breakdown].sort((a, b) => b.value - a.value)[0];
  if (top && total > 0)
    out.push({
      id: `top-${top.id}`,
      tone: "neutral",
      text: `${top.label} drove ${pct.format(top.value / total)} of ${(data.trendLabel ?? "volume").toLowerCase()}.`,
    });

  if (compare) {
    const fastest = data.breakdown
      .map((r) => ({ r, d: change(r.value, r.previous) }))
      .filter((m): m is { r: ReportBreakdownRow; d: number } => m.d !== undefined)
      .sort((a, b) => b.d - a.d)[0];
    if (fastest && fastest.d > 0 && fastest.r.id !== top?.id)
      out.push({
        id: `fast-${fastest.r.id}`,
        tone: "positive",
        text: `${fastest.r.label} grew fastest, +${pct.format(fastest.d)}.`,
      });
  }

  const peak = data.trend.reduce<ReportTrendPoint | null>((p, c) => (!p || c.current > p.current ? c : p), null);
  if (peak)
    out.push({
      id: `peak-${peak.date}`,
      tone: "neutral",
      text: `Peak day was ${formatDay(peak.date)} with ${num.format(peak.current)} ${(data.trendLabel ?? "").toLowerCase()}.`,
    });

  return out.slice(0, max);
}

/**
 * Dashboard report: a range picker and previous-period toggle head a row of
 * rolling KPI cards, a trend chart (current vs previous as a second, muted
 * series), a breakdown table with inline bars, and auto-generated highlights
 * that stagger in. While a range loads every section holds its footprint as
 * a skeleton, then cross-fades back.
 */
export function PerformanceReport({
  data,
  loading = false,
  range,
  defaultRange,
  onRangeChange,
  presets,
  compare: compareProp,
  defaultCompare = true,
  onCompareChange,
  insights: insightsProp,
  title = "Performance",
  locale = "en-US",
  chartHeight = 110,
  className,
}: PerformanceReportProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const [compareState, setCompareState] = useState(defaultCompare);
  const compare = compareProp ?? compareState;
  const setCompare = (next: boolean) => {
    if (compareProp === undefined) setCompareState(next);
    onCompareChange?.(next);
  };
  const busy = loading || data === null;

  const compact = useMemo(
    () => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }),
    [locale],
  );
  const full = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);
  const pct = useMemo(
    () => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }),
    [locale],
  );

  const insights = useMemo(
    () => insightsProp ?? (data ? generateInsights(data, { compare, locale }) : []),
    [insightsProp, data, compare, locale],
  );

  const trendLabel = data?.trendLabel ?? "Value";
  const series = [
    { key: "current", label: "This period" },
    ...(compare ? [{ key: "previous", label: "Previous", color: "var(--muted-foreground)" }] : []),
  ];
  const chartData = (data?.trend ?? []).map((p) => ({
    date: p.date,
    current: p.current,
    previous: p.previous ?? 0,
  }));

  const maxRow = Math.max(1, ...(data?.breakdown ?? []).map((r) => r.value));
  const dataKey = data ? `${data.trend[0]?.date ?? ""}-${data.trend.length}` : "none";

  const listVariants: Variants = {
    hidden: {},
    shown: { transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: 0.15 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 6 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
  };

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className={cn("@container flex w-full flex-col gap-3 text-card-foreground", className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${baseId}-title`} className="text-base font-semibold tracking-tight">
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <Switch checked={compare} onCheckedChange={setCompare} label="Compare" className="gap-2 text-sm" />
          <DateRangePicker
            value={range}
            defaultValue={defaultRange}
            onValueChange={onRangeChange}
            presets={presets}
            align="end"
            className="h-9 min-w-0"
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
        {(data?.kpis ?? PLACEHOLDER_KPIS).map((k) => (
          <StatCard
            key={k.id}
            label={k.label}
            icon={k.icon}
            value={k.value}
            format={k.format}
            goodDirection={k.goodDirection}
            delta={compare ? change(k.value, k.previous) : undefined}
            caption={compare ? "vs previous" : undefined}
            loading={busy}
            locale={locale}
            className="rounded-xl p-3"
          />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-xs font-medium text-muted-foreground">{trendLabel} over time</h4>
          <ul className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {series.map((s, i) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: seriesColor(s, i) }} />
                {s.label}
              </li>
            ))}
          </ul>
        </div>
        <SkeletonSwap
          loading={busy}
          loadingLabel="Loading report"
          skeleton={<Skeleton className="w-full rounded-lg" height={chartHeight + 28} />}
        >
          <AreaChart
            key={`${dataKey}-${compare}`}
            data={chartData}
            index="date"
            series={series}
            height={chartHeight}
            legend={false}
            indicator="line"
            formatIndex={formatDay}
            formatValue={(v) => full.format(v)}
            title={`${trendLabel} per day${compare ? ", with previous period" : ""}`}
          />
        </SkeletonSwap>
      </div>

      <div className="grid gap-3 @lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border bg-card p-3">
          <SkeletonSwap
            loading={busy}
            skeleton={
              <div className="flex flex-col gap-2.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} shape="text" />
                ))}
              </div>
            }
          >
            <table className="w-full text-xs">
              <caption className="sr-only">
                {trendLabel} by {(data?.breakdownLabel ?? "segment").toLowerCase()}
              </caption>
              <thead>
                <tr className="text-left text-[11px] text-muted-foreground">
                  <th scope="col" className="pb-1.5 font-medium">
                    {data?.breakdownLabel ?? "Segment"}
                  </th>
                  <th scope="col" className="pb-1.5 text-right font-medium">
                    {trendLabel}
                  </th>
                  <th scope="col" className="w-[30%] pb-1.5 pl-3 font-medium">
                    <span className="sr-only">Share</span>
                  </th>
                  {compare ? (
                    <th scope="col" className="pb-1.5 text-right font-medium">
                      Δ
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody key={dataKey}>
                {(data?.breakdown ?? []).map((r, i) => {
                  const d = change(r.value, r.previous);
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <th scope="row" className="py-1.5 pr-2 text-left font-medium">
                        {r.label}
                      </th>
                      <td className="py-1.5 text-right tabular-nums">{compact.format(r.value)}</td>
                      <td className="py-1.5 pl-3">
                        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
                          {/* Fill grows from the left edge: scaleX on an HTML element. */}
                          <motion.span
                            className="block h-full w-full origin-left rounded-full"
                            style={{ background: seriesColor({}, 0) }}
                            initial={{ scaleX: reduce ? r.value / maxRow : 0 }}
                            animate={{ scaleX: r.value / maxRow }}
                            transition={{ duration: 0.6, ease: EASE_OUT, delay: reduce ? 0 : 0.05 * i }}
                          />
                        </span>
                      </td>
                      {compare ? (
                        <td
                          className={cn(
                            "py-1.5 pl-2 text-right tabular-nums",
                            d === undefined ? "text-muted-foreground" : TONE_TEXT[d >= 0 ? "positive" : "negative"],
                          )}
                        >
                          {d === undefined ? "—" : pct.format(d)}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SkeletonSwap>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lightbulb className="size-3.5" aria-hidden />
            Highlights
          </h4>
          <SkeletonSwap
            loading={busy}
            skeleton={
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton shape="circle" width={20} />
                    <Skeleton shape="text" className="flex-1" />
                  </div>
                ))}
              </div>
            }
          >
            <motion.ul
              key={`${dataKey}-${compare}`}
              variants={listVariants}
              initial="hidden"
              animate="shown"
              className="flex flex-col gap-2"
            >
              {insights.map((ins) => {
                const Icon = ins.tone === "negative" ? TrendingDown : ins.tone === "positive" ? TrendingUp : Lightbulb;
                return (
                  <motion.li key={ins.id} variants={itemVariants} className="flex items-start gap-2 text-xs leading-snug">
                    <span
                      aria-hidden
                      className={cn("grid size-5 shrink-0 place-items-center rounded-full", TONE_BG[ins.tone], TONE_TEXT[ins.tone])}
                    >
                      <Icon className="size-3" />
                    </span>
                    <span className="pt-0.5">{ins.text}</span>
                  </motion.li>
                );
              })}
            </motion.ul>
          </SkeletonSwap>
        </div>
      </div>
    </section>
  );
}

// Footprint for the first load, before any data arrives.
const PLACEHOLDER_KPIS: ReportKpi[] = [0, 1, 2, 3].map((i) => ({
  id: `placeholder-${i}`,
  label: "Loading",
  value: 0,
}));
