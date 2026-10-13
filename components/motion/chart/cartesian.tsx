"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { type PointerEvent, useId, useRef, useState } from "react";
import useMeasure from "react-use-measure";
import {
  type ChartCurve,
  type ChartDatum,
  ChartLegend,
  type ChartSeries,
  ChartTable,
  ChartTooltip,
  curvePath,
  formatCompact,
  formatFull,
  GROW,
  gutterFor,
  labelStride,
  niceTicks,
  seriesColor,
  stepIndex,
  type TooltipIndicator,
} from "@/components/motion/chart/shared";
import { cn } from "@/lib/utils";

export interface CartesianChartProps {
  data: ChartDatum[];
  /** Key of the x value in each datum (dates, months…). */
  index: string;
  series: ChartSeries[];
  /** Plot height in px. Default 250. */
  height?: number;
  /** Default "natural" (smooth, never overshoots a point). */
  curve?: ChartCurve;
  /** Stack series on top of each other instead of overlapping them. */
  stacked?: boolean;
  /** Draw a dot on every point. */
  dots?: boolean;
  /** Print each point's value above it. Best for short series. */
  showValues?: boolean;
  /** Show the y axis labels. Default false: gridlines carry the scale. */
  yAxis?: boolean;
  /** Show the legend. Default: when there are two or more series. */
  legend?: boolean;
  indicator?: TooltipIndicator;
  /** Formats x labels and the tooltip title. */
  formatIndex?: (value: string) => string;
  formatValue?: (value: number) => string;
  formatAxis?: (value: number) => string;
  /** Names the chart for assistive tech and the table view. */
  title: string;
  className?: string;
}

const AXIS = 28; // x labels
const PAD_X = 12;
const PAD_TOP = 12;

/**
 * Shared engine for line and area charts: monotone, linear or stepped curves,
 * optional stacking and gradient fills; lines draw in left to right and areas
 * rise from the baseline when scrolled into view (replayed when the range changes), a hairline cursor that
 * snaps to the nearest x, and one tooltip listing every series there.
 */
export function CartesianChart({
  type,
  fill = "gradient",
  data,
  index,
  series,
  height = 250,
  curve = "natural",
  stacked = false,
  dots = false,
  showValues = false,
  yAxis = false,
  legend,
  indicator = "dot",
  formatIndex = (v) => v,
  formatValue = formatFull,
  formatAxis = formatCompact,
  title,
  className,
}: CartesianChartProps & {
  type: "line" | "area";
  fill?: "gradient" | "solid";
}) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [measureRef, { width }] = useMeasure();
  const viewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, { once: true, amount: 0.3 });
  const [active, setActive] = useState<number | null>(null);
  const shown = reduce || inView;

  const value = (d: ChartDatum, key: string) => Number(d[key]) || 0;

  // Per-series [lower, upper] for every point; lower is 0 unless stacked.
  const bands = series.map((_, si) =>
    data.map((d) => {
      const lower = stacked
        ? series.slice(0, si).reduce((sum, s) => sum + value(d, s.key), 0)
        : 0;
      return [lower, lower + value(d, series[si].key)] as const;
    }),
  );
  const tops = bands.flatMap((b) => b.map(([, up]) => up));
  const ticks = niceTicks(Math.min(0, ...tops), Math.max(...tops, 0));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];

  const left = yAxis ? gutterFor(ticks.map(formatAxis)) : PAD_X;
  const plotW = Math.max(0, width - left - PAD_X);
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;
  const x = (i: number) => left + i * step;
  const y = (v: number) => PAD_TOP + (1 - (v - lo) / (hi - lo)) * (height - PAD_TOP);
  const stride = labelStride(data.length, plotW, 64);
  const last = data.length - 1;
  const showLegend = legend ?? series.length > 1;

  const linePts = (si: number) =>
    bands[si].map(([, up], i) => [x(i), y(up)] as [number, number]);
  const areaPath = (si: number) => {
    const top = curvePath(linePts(si), curve);
    const bottom = curvePath(
      bands[si].map(([low], i) => [x(i), y(low)] as [number, number]).reverse(),
      curve,
    ).replace(/^M/, "L");
    return `${top}${bottom}Z`;
  };

  // Replays the reveal when the visible range changes (e.g. 7d → 90d).
  const revealKey = `${data.length}-${String(data[0]?.[index] ?? "")}`;

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - box.left - left) / (step || 1));
    setActive(Math.min(last, Math.max(0, i)));
  };

  const activeTop =
    active === null
      ? 0
      : Math.min(...series.map((_, si) => y(bands[si][active][1])));

  return (
    <div ref={viewRef} className={cn("w-full", className)}>
      <div ref={measureRef} className="relative w-full">
        {width > 0 && data.length > 0 && (
          // biome-ignore lint/a11y/useSemanticElements: a chart is not a form; group labels the plot
          <svg
            width={width}
            height={height + AXIS}
            role="group"
            aria-label={`${title}. Use arrow keys to read each point.`}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable chart widget; arrow keys read values
            tabIndex={0}
            onKeyDown={(e) => {
              const next = stepIndex(e.key, active, data.length);
              if (next === undefined) return;
              e.preventDefault();
              setActive(next);
            }}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            className="block touch-pan-y overflow-visible rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <defs>
              {type === "area" &&
                series.map((s, si) => (
                  <linearGradient
                    key={s.key}
                    id={`${uid}-fill-${si}`}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={seriesColor(s, si)}
                      stopOpacity={fill === "gradient" ? 0.6 : 0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={seriesColor(s, si)}
                      stopOpacity={fill === "gradient" ? 0.05 : 0.4}
                    />
                  </linearGradient>
                ))}
            </defs>

            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={yAxis ? left : 0}
                  x2={width}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--border-strong)"
                  shapeRendering="crispEdges"
                />
                {yAxis && (
                  <text
                    x={left - 8}
                    y={y(t)}
                    dy="0.32em"
                    textAnchor="end"
                    className="fill-muted-foreground text-xs tabular-nums"
                  >
                    {formatAxis(t)}
                  </text>
                )}
              </g>
            ))}

            {data.map((d, i) =>
              // Every stride-th label plus the last, minus a strided one that
              // would crowd the last.
              i === last || (i % stride === 0 && (last - i) * step >= 64) ? (
                <text
                  // biome-ignore lint/suspicious/noArrayIndexKey: x positions keep their order.
                  key={i}
                  x={x(i)}
                  y={height + 20}
                  textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
                  className="fill-muted-foreground text-xs"
                >
                  {formatIndex(String(d[index]))}
                </text>
              ) : null,
            )}

            {active !== null && (
              <line
                x1={x(active)}
                x2={x(active)}
                y1={PAD_TOP}
                y2={height}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.4}
                shapeRendering="crispEdges"
              />
            )}

            {/* Remounted per range so the entrance replays when the data
                window changes (e.g. 7 days → 3 months). */}
            <g key={revealKey}>
              {type === "area" &&
                series.map((s, si) => (
                  <motion.path
                    key={s.key}
                    d={areaPath(si)}
                    fill={`url(#${uid}-fill-${si})`}
                    initial={reduce ? false : { opacity: 0, scaleY: 0.4 }}
                    animate={shown ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0.4 }}
                    transition={reduce ? { duration: 0 } : { ...GROW, duration: 0.9, delay: 0.15 }}
                    style={{ transformBox: "view-box", transformOrigin: `0px ${y(lo)}px` }}
                  />
                ))}
              {series.map((s, si) => (
                <motion.path
                  key={s.key}
                  d={curvePath(linePts(si), curve)}
                  fill="none"
                  stroke={seriesColor(s, si)}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: shown ? 1 : 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 1.1, ease: GROW.ease, delay: si * 0.08 }}
                />
              ))}
              {(dots || showValues) && (
                <motion.g
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: shown ? 1 : 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.3, delay: 0.9 }}
                >
                  {dots &&
                    series.map((s, si) =>
                      linePts(si).map(([cx, cy], i) => (
                        <circle
                          // biome-ignore lint/suspicious/noArrayIndexKey: points keep their order.
                          key={`${s.key}-${i}`}
                          cx={cx}
                          cy={cy}
                          r={3.5}
                          fill={seriesColor(s, si)}
                          stroke="var(--card)"
                          strokeWidth={2}
                        />
                      )),
                    )}
                  {showValues &&
                    series.map((s, si) =>
                      linePts(si).map(([cx, cy], i) => (
                        <text
                          // biome-ignore lint/suspicious/noArrayIndexKey: points keep their order.
                          key={`${s.key}-v${i}`}
                          x={cx}
                          y={cy - 12}
                          textAnchor="middle"
                          className="fill-foreground text-xs font-medium tabular-nums"
                        >
                          {formatValue(value(data[i], s.key))}
                        </text>
                      )),
                    )}
                </motion.g>
              )}
            </g>

            {active !== null &&
              series.map((s, si) => (
                <motion.circle
                  key={s.key}
                  initial={reduce ? false : { scale: 0.4 }}
                  animate={{ scale: 1, cx: x(active), cy: y(bands[si][active][1]) }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 520, damping: 40 }
                  }
                  r={5}
                  fill={seriesColor(s, si)}
                  stroke="var(--card)"
                  strokeWidth={2}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
              ))}
          </svg>
        )}
        <ChartTooltip
          open={active !== null}
          x={active === null ? 0 : x(active)}
          y={activeTop}
          width={width}
          indicator={indicator}
          label={active === null ? "" : formatIndex(String(data[active][index]))}
          rows={
            active === null
              ? []
              : (() => {
                  const rows = series.map((s, si) => ({
                    label: s.label,
                    value: formatValue(value(data[active], s.key)),
                    color: seriesColor(s, si),
                  }));
                  // Stacked: read top-down, the way the bands sit.
                  return stacked ? rows.reverse() : rows;
                })()
          }
        />
      </div>
      {showLegend && (
        <ChartLegend
          items={series.map((s, si) => ({ label: s.label, color: seriesColor(s, si) }))}
        />
      )}
      <ChartTable
        caption={title}
        head={[index, ...series.map((s) => s.label)]}
        rows={data.map((d) => [
          formatIndex(String(d[index])),
          ...series.map((s) => formatValue(value(d, s.key))),
        ])}
      />
    </div>
  );
}
