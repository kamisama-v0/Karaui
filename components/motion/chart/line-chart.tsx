"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useId,
  useRef,
  useState,
} from "react";
import useMeasure from "react-use-measure";
import {
  ChartLegend,
  type ChartDatum,
  type ChartSeries,
  ChartTable,
  ChartTooltip,
  formatCompact,
  formatFull,
  GROW,
  gutterFor,
  labelStride,
  niceTicks,
  seriesColor,
} from "@/components/motion/chart/shared";
import { cn } from "@/lib/utils";

export interface LineChartProps {
  data: ChartDatum[];
  /** Key of the x label in each datum (dates, months…). */
  index: string;
  series: ChartSeries[];
  /** Plot height in px. Default 240. */
  height?: number;
  /** Soft fill under a single series. Ignored with several series. */
  area?: boolean;
  /** Start the y axis at zero. Default true. */
  zeroBased?: boolean;
  formatValue?: (value: number) => string;
  formatAxis?: (value: number) => string;
  /** Names the chart for assistive tech and the table view. */
  title: string;
  className?: string;
}

const AXIS = 24;
const PAD_RIGHT = 8; // keeps the end dot inside the frame

/**
 * Trend chart: 2px lines draw themselves in when scrolled into view, a
 * crosshair snaps to the nearest x, and one tooltip lists every series there.
 * Arrow keys step through x positions.
 */
export function LineChart({
  data,
  index,
  series,
  height = 240,
  area = false,
  zeroBased = true,
  formatValue = formatFull,
  formatAxis = formatCompact,
  title,
  className,
}: LineChartProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const [measureRef, { width }] = useMeasure();
  const viewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, { once: true, amount: 0.35 });
  const [active, setActive] = useState<number | null>(null);

  const values = data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0));
  const ticks = niceTicks(
    zeroBased ? Math.min(0, ...values) : Math.min(...values),
    Math.max(...values),
  );
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const left = gutterFor(ticks.map(formatAxis));
  const plotW = Math.max(0, width - left - PAD_RIGHT);
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;
  const x = (i: number) => left + i * step;
  const y = (v: number) => height - ((v - lo) / (hi - lo)) * height;
  const stride = labelStride(data.length, plotW);
  const shown = reduce || inView;
  const fill = area && series.length === 1;

  const linePath = (key: string) =>
    data
      .map((d, i) => `${i ? "L" : "M"}${x(i)},${y(Number(d[key]) || 0)}`)
      .join("");

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - box.left - left) / (step || 1));
    setActive(Math.min(data.length - 1, Math.max(0, i)));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    setActive((a) =>
      a === null
        ? dir > 0
          ? 0
          : data.length - 1
        : Math.min(data.length - 1, Math.max(0, a + dir)),
    );
  };

  const last = data.length - 1;

  return (
    <div ref={viewRef} className={cn("flex w-full flex-col gap-3", className)}>
      {series.length > 1 && (
        <ChartLegend
          mark="line"
          items={series.map((s, i) => ({ label: s.label, color: seriesColor(s, i) }))}
        />
      )}
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
            onKeyDown={onKeyDown}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            className="block touch-pan-y overflow-visible rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {fill && (
              <defs>
                <linearGradient id={`${uid}-fill`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={seriesColor(series[0], 0)} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={seriesColor(series[0], 0)} stopOpacity={0} />
                </linearGradient>
              </defs>
            )}

            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={left}
                  x2={width - PAD_RIGHT}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--border-strong)"
                  shapeRendering="crispEdges"
                />
                <text
                  x={left - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px] tabular-nums"
                >
                  {formatAxis(t)}
                </text>
              </g>
            ))}

            {data.map((d, i) =>
              i % stride === 0 ? (
                <text
                  // biome-ignore lint/suspicious/noArrayIndexKey: x positions keep their order.
                  key={i}
                  x={x(i)}
                  y={height + 16}
                  textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
                  className="fill-muted-foreground text-[11px]"
                >
                  {String(d[index])}
                </text>
              ) : null,
            )}

            {fill && (
              <motion.path
                d={`${linePath(series[0].key)}L${x(last)},${y(lo)}L${x(0)},${y(lo)}Z`}
                fill={`url(#${uid}-fill)`}
                initial={false}
                animate={{ opacity: shown ? 1 : 0 }}
                transition={reduce ? { duration: 0 } : { ...GROW, delay: 0.25 }}
              />
            )}

            {series.map((s, si) => (
              <motion.path
                key={s.key}
                d={linePath(s.key)}
                fill="none"
                stroke={seriesColor(s, si)}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={false}
                animate={{ pathLength: shown ? 1 : 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.9, ease: GROW.ease, delay: si * 0.08 }
                }
              />
            ))}

            {active !== null && (
              <line
                x1={x(active)}
                x2={x(active)}
                y1={0}
                y2={height}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.5}
                shapeRendering="crispEdges"
              />
            )}

            {/* Dots: the active x while reading, otherwise each series' end. */}
            {series.map((s, si) => {
              const i = active ?? last;
              return (
                <motion.circle
                  key={s.key}
                  r={4}
                  cx={x(i)}
                  cy={y(Number(data[i][s.key]) || 0)}
                  fill={seriesColor(s, si)}
                  stroke="var(--card)"
                  strokeWidth={2}
                  initial={false}
                  animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : 0.4 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.2, delay: active === null ? 0.8 : 0 }
                  }
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
              );
            })}
          </svg>
        )}
        <ChartTooltip
          open={active !== null}
          x={active === null ? 0 : x(active)}
          y={
            active === null
              ? 0
              : Math.min(
                  ...series.map((s) => y(Number(data[active][s.key]) || 0)),
                )
          }
          width={width}
          title={active === null ? "" : String(data[active][index])}
          rows={
            active === null
              ? []
              : series.map((s, si) => ({
                  label: s.label,
                  value: formatValue(Number(data[active][s.key]) || 0),
                  color: seriesColor(s, si),
                }))
          }
        />
      </div>
      <ChartTable
        caption={title}
        head={[index, ...series.map((s) => s.label)]}
        rows={data.map((d) => [
          String(d[index]),
          ...series.map((s) => formatValue(Number(d[s.key]) || 0)),
        ])}
      />
    </div>
  );
}
