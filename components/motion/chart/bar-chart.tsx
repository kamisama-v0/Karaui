"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useRef, useState } from "react";
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

export interface BarChartProps {
  data: ChartDatum[];
  /** Key of the category label in each datum. */
  index: string;
  /** One or more series; several render as grouped bars. */
  series: ChartSeries[];
  /** Plot height in px. Default 240. */
  height?: number;
  /** Tooltip and table values. Default: grouped thousands. */
  formatValue?: (value: number) => string;
  /** Axis tick values. Default: compact (1.2K). */
  formatAxis?: (value: number) => string;
  /** Names the chart for assistive tech and the table view. */
  title: string;
  className?: string;
}

const MAX_BAR = 24; // thin marks: a bar never fills its slot
const GAP = 2; // surface gap between touching bars
const RADIUS = 4; // rounded data end, square at the baseline
const AXIS = 24; // room for x labels

/** Column path with a rounded top and a square base. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Column chart for comparing magnitudes across categories. Bars grow from the
 * baseline when scrolled into view; hovering or arrowing through a category
 * lifts its bars and shows one tooltip listing every series.
 */
export function BarChart({
  data,
  index,
  series,
  height = 240,
  formatValue = formatFull,
  formatAxis = formatCompact,
  title,
  className,
}: BarChartProps) {
  const reduce = useReducedMotion();
  const [measureRef, { width }] = useMeasure();
  const viewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, { once: true, amount: 0.35 });
  const [active, setActive] = useState<number | null>(null);

  const values = data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0));
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const left = gutterFor(ticks.map(formatAxis));
  const plotW = Math.max(0, width - left);
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(
    2,
    Math.min(MAX_BAR, (band * 0.7 - GAP * (series.length - 1)) / series.length),
  );
  const groupW = barW * series.length + GAP * (series.length - 1);
  const y = (v: number) => height - ((v - lo) / (hi - lo)) * height;
  const stride = labelStride(data.length, plotW);
  const shown = reduce || inView;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    setActive((a) =>
      a === null
        ? step > 0
          ? 0
          : data.length - 1
        : Math.min(data.length - 1, Math.max(0, a + step)),
    );
  };

  const tooltipX = active === null ? 0 : left + band * active + band / 2;
  const tooltipY =
    active === null
      ? 0
      : Math.min(
          ...series.map((s) => y(Math.max(0, Number(data[active][s.key]) || 0))),
        ) + 8;

  return (
    <div ref={viewRef} className={cn("flex w-full flex-col gap-3", className)}>
      {series.length > 1 && (
        <ChartLegend
          mark="block"
          items={series.map((s, i) => ({ label: s.label, color: seriesColor(s, i) }))}
        />
      )}
      <div ref={measureRef} className="relative w-full">
        {width > 0 && (
          // biome-ignore lint/a11y/useSemanticElements: a chart is not a form; group labels the plot
          <svg
            width={width}
            height={height + AXIS}
            role="group"
            aria-label={`${title}. Use arrow keys to read each category.`}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable chart widget; arrow keys read values
            tabIndex={0}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
            className="block overflow-visible rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={left}
                  x2={width}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--border-strong)"
                  strokeWidth={1}
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

            {data.map((d, i) => {
              const gx = left + band * i + (band - groupW) / 2;
              const dim = active !== null && active !== i;
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: categories keep their order.
                <g key={i}>
                  {series.map((s, si) => {
                    const v = Number(d[s.key]) || 0;
                    const top = y(Math.max(0, v));
                    const h = Math.abs(y(v) - y(0));
                    return (
                      <motion.path
                        key={s.key}
                        d={columnPath(gx + si * (barW + GAP), top, barW, h)}
                        fill={seriesColor(s, si)}
                        initial={false}
                        animate={{
                          scaleY: shown ? 1 : 0,
                          opacity: dim ? 0.35 : 1,
                        }}
                        transition={{
                          scaleY: reduce
                            ? { duration: 0 }
                            : { ...GROW, delay: i * 0.03 },
                          opacity: { duration: 0.15 },
                        }}
                        style={{
                          transformBox: "fill-box",
                          transformOrigin: v >= 0 ? "bottom" : "top",
                        }}
                      />
                    );
                  })}
                  {i % stride === 0 && (
                    <text
                      x={left + band * i + band / 2}
                      y={height + 16}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[11px]"
                    >
                      {String(d[index])}
                    </text>
                  )}
                  {/* The whole category band is the hit target, not the bar. */}
                  <rect
                    x={left + band * i}
                    y={0}
                    width={band}
                    height={height}
                    fill="transparent"
                    onPointerEnter={() => setActive(i)}
                  />
                </g>
              );
            })}

            <line
              x1={left}
              x2={width}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.5}
              shapeRendering="crispEdges"
            />
          </svg>
        )}
        <ChartTooltip
          open={active !== null}
          x={tooltipX}
          y={tooltipY}
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
