"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import useMeasure from "react-use-measure";
import {
  type ChartDatum,
  ChartLegend,
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
  stepIndex,
  type TooltipIndicator,
} from "@/components/motion/chart/shared";
import { cn } from "@/lib/utils";

export interface BarChartProps {
  data: ChartDatum[];
  /** Key of the category label in each datum. */
  index: string;
  series: ChartSeries[];
  /** "vertical" draws columns; "horizontal" draws rows of bars. */
  layout?: "vertical" | "horizontal";
  /** Stack series into one bar per category. */
  stacked?: boolean;
  /** Print each bar's value at its end. */
  showValues?: boolean;
  /** Corner radius of the bar's data end, in px. Default 6. */
  radius?: number;
  /** Plot height in px (vertical layout). Default 250. */
  height?: number;
  /** Show the value axis labels. Default false: gridlines carry the scale. */
  valueAxis?: boolean;
  /** Show the legend. Default: when there are two or more series. */
  legend?: boolean;
  indicator?: TooltipIndicator;
  formatIndex?: (value: string) => string;
  formatValue?: (value: number) => string;
  formatAxis?: (value: number) => string;
  /** Names the chart for assistive tech and the table view. */
  title: string;
  className?: string;
}

const GAP = 4; // between bars of one group
const ROW = 36; // horizontal layout: px per category
const AXIS = 28;

type Rect = { x: number; y: number; w: number; h: number };

/** Bar path rounded only at the data end, square against the baseline. */
function barPath({ x, y, w, h }: Rect, r: number, end: "top" | "bottom" | "right" | "left") {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (end === "top")
    return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
  if (end === "bottom")
    return `M${x},${y}V${y + h - rr}Q${x},${y + h} ${x + rr},${y + h}H${x + w - rr}Q${x + w},${y + h} ${x + w},${y + h - rr}V${y}Z`;
  if (end === "right")
    return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
  return `M${x + w},${y}H${x + rr}Q${x},${y} ${x},${y + rr}V${y + h - rr}Q${x},${y + h} ${x + rr},${y + h}H${x + w}Z`;
}

/**
 * Compares magnitudes across categories as columns or horizontal bars,
 * grouped or stacked. Bars grow from the baseline when scrolled into view;
 * hovering or arrowing to a category dims the others and shows one tooltip
 * for every series.
 */
export function BarChart({
  data,
  index,
  series,
  layout = "vertical",
  stacked = false,
  showValues = false,
  radius = 6,
  height: heightProp = 250,
  valueAxis = false,
  legend,
  indicator = "dot",
  formatIndex = (v) => v,
  formatValue = formatFull,
  formatAxis = formatCompact,
  title,
  className,
}: BarChartProps) {
  const reduce = useReducedMotion();
  const [measureRef, { width }] = useMeasure();
  const viewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, { once: true, amount: 0.3 });
  const [active, setActive] = useState<number | null>(null);
  const shown = reduce || inView;
  const horizontal = layout === "horizontal";
  const value = (d: ChartDatum, key: string) => Number(d[key]) || 0;

  // Value extent: stacked bars sum positives and negatives separately.
  const extents = data.flatMap((d) => {
    if (!stacked) return series.map((s) => value(d, s.key));
    let pos = 0;
    let neg = 0;
    for (const s of series) {
      const v = value(d, s.key);
      if (v >= 0) pos += v;
      else neg += v;
    }
    return [pos, neg];
  });
  const ticks = niceTicks(Math.min(0, ...extents), Math.max(0, ...extents));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];

  const labelGutter = horizontal
    ? gutterFor(data.map((d) => formatIndex(String(d[index]))))
    : 0;
  const valueGutter = !horizontal && valueAxis ? gutterFor(ticks.map(formatAxis)) : 0;
  // Room at the data end for printed values.
  const endRoom = showValues ? (horizontal ? 44 : 20) : 0;
  const height = horizontal ? data.length * ROW : heightProp;

  // Category axis runs along x (vertical) or y (horizontal).
  const catStart = horizontal ? 0 : valueGutter;
  const catLength = horizontal ? height : Math.max(0, width - valueGutter);
  const band = data.length ? catLength / data.length : 0;
  const valStart = horizontal ? labelGutter : endRoom;
  const valLength = horizontal
    ? Math.max(0, width - labelGutter - endRoom)
    : height - endRoom;
  // Value → position along the value axis, measured from its origin.
  const scale = (v: number) => ((v - lo) / (hi - lo)) * valLength;
  const zero = scale(0);

  const groups = stacked ? 1 : series.length;
  const thickness = Math.max(
    3,
    Math.min(horizontal ? 24 : 56, (band * (horizontal ? 0.72 : 0.62) - GAP * (groups - 1)) / groups),
  );
  const groupLen = thickness * groups + GAP * (groups - 1);

  const bars = data.map((d, i) => {
    const offset = catStart + band * i + (band - groupLen) / 2;
    let pos = 0;
    let neg = 0;
    return series.map((s, si) => {
      const v = value(d, s.key);
      const from = stacked ? (v >= 0 ? pos : neg) : 0;
      const to = from + v;
      if (stacked) {
        if (v >= 0) pos = to;
        else neg = to;
      }
      const a = scale(Math.min(from, to));
      const b = scale(Math.max(from, to));
      const lane = offset + (stacked ? 0 : si * (thickness + GAP));
      const rect: Rect = horizontal
        ? { x: valStart + a, y: lane, w: b - a, h: thickness }
        : { x: lane, y: valStart + (valLength - b), w: thickness, h: b - a };
      // Only the outermost segment of a stack gets the rounded end.
      const outer =
        !stacked ||
        series.slice(si + 1).every((t) => Math.sign(value(d, t.key)) !== Math.sign(v) || value(d, t.key) === 0);
      const end = horizontal ? (v >= 0 ? "right" : "left") : v >= 0 ? "top" : "bottom";
      return { s, si, v, rect, outer, end } as const;
    });
  });

  const totalH = horizontal ? height : height + AXIS;
  const stride = horizontal ? 1 : labelStride(data.length, catLength, 48);

  // Tooltip anchors at the category's data end.
  const anchor = (i: number) => {
    const rs = bars[i].map((b) => b.rect);
    if (horizontal) {
      return {
        x: Math.max(...rs.map((r) => r.x + r.w)),
        y: catStart + band * i + band / 2,
      };
    }
    return {
      x: catStart + band * i + band / 2,
      y: Math.min(...rs.map((r) => r.y)) + 12,
    };
  };
  const tip = active === null ? { x: 0, y: 0 } : anchor(active);

  return (
    <div ref={viewRef} className={cn("w-full", className)}>
      <div ref={measureRef} className="relative w-full">
        {width > 0 && data.length > 0 && (
          // biome-ignore lint/a11y/useSemanticElements: a chart is not a form; group labels the plot
          <svg
            width={width}
            height={totalH}
            role="group"
            aria-label={`${title}. Use arrow keys to read each category.`}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable chart widget; arrow keys read values
            tabIndex={0}
            onKeyDown={(e) => {
              const next = stepIndex(e.key, active, data.length);
              if (next === undefined) return;
              e.preventDefault();
              setActive(next);
            }}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            className="block overflow-visible rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Gridlines run across the value axis only. */}
            {ticks.map((t) => {
              const p = valStart + (horizontal ? scale(t) : valLength - scale(t));
              return (
                <g key={t}>
                  {horizontal ? (
                    <line x1={p} x2={p} y1={0} y2={height} stroke="var(--border-strong)" shapeRendering="crispEdges" />
                  ) : (
                    <line x1={valueGutter} x2={width} y1={p} y2={p} stroke="var(--border-strong)" shapeRendering="crispEdges" />
                  )}
                  {valueAxis && !horizontal && (
                    <text x={valueGutter - 8} y={p} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-xs tabular-nums">
                      {formatAxis(t)}
                    </text>
                  )}
                </g>
              );
            })}

            {bars.map((group, i) => {
              const dim = active !== null && active !== i;
              const label = formatIndex(String(data[i][index]));
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: categories keep their order.
                <g key={i}>
                  {group.map(({ s, si, rect, outer, end }) => (
                    <motion.path
                      key={s.key}
                      d={barPath(rect, outer ? radius : 0, end)}
                      fill={seriesColor(s, si)}
                      initial={false}
                      animate={{
                        [horizontal ? "scaleX" : "scaleY"]: shown ? 1 : 0,
                        opacity: dim ? 0.3 : 1,
                      }}
                      transition={{
                        scaleX: reduce ? { duration: 0 } : { ...GROW, delay: i * 0.04 },
                        scaleY: reduce ? { duration: 0 } : { ...GROW, delay: i * 0.04 },
                        opacity: { duration: 0.15 },
                      }}
                      style={{
                        // Grow from the zero line, whichever side the bar sits on.
                        transformBox: "view-box",
                        transformOrigin: horizontal
                          ? `${valStart + zero}px 0px`
                          : `0px ${valStart + valLength - zero}px`,
                      }}
                    />
                  ))}

                  {showValues &&
                    (stacked ? [group[group.length - 1]] : group).map(({ s, rect, v }) => {
                      const shownValue = stacked
                        ? group.reduce((sum, g) => sum + g.v, 0)
                        : v;
                      const end = stacked
                        ? horizontal
                          ? Math.max(...group.map((g) => g.rect.x + g.rect.w))
                          : Math.min(...group.map((g) => g.rect.y))
                        : horizontal
                          ? rect.x + rect.w
                          : rect.y;
                      return (
                        <motion.text
                          key={`${s.key}-v`}
                          x={horizontal ? end + 8 : rect.x + (stacked ? groupLen : rect.w) / 2}
                          y={horizontal ? rect.y + (stacked ? groupLen : rect.h) / 2 : end - 8}
                          dy={horizontal ? "0.32em" : undefined}
                          textAnchor={horizontal ? "start" : "middle"}
                          className="fill-foreground text-xs font-medium tabular-nums"
                          initial={false}
                          animate={{ opacity: shown ? (dim ? 0.3 : 1) : 0 }}
                          transition={reduce ? { duration: 0 } : { duration: 0.3, delay: shown && active === null ? 0.5 + i * 0.04 : 0 }}
                        >
                          {formatValue(shownValue)}
                        </motion.text>
                      );
                    })}

                  {horizontal ? (
                    <text
                      x={labelGutter - 10}
                      y={catStart + band * i + band / 2}
                      dy="0.32em"
                      textAnchor="end"
                      className="fill-muted-foreground text-xs"
                    >
                      {label}
                    </text>
                  ) : (
                    i % stride === 0 && (
                      <text
                        x={catStart + band * i + band / 2}
                        y={height + 20}
                        textAnchor="middle"
                        className="fill-muted-foreground text-xs"
                      >
                        {label}
                      </text>
                    )
                  )}

                  {/* The whole category band is the hit target, not the bar. */}
                  <rect
                    x={horizontal ? 0 : catStart + band * i}
                    y={horizontal ? catStart + band * i : 0}
                    width={horizontal ? width : band}
                    height={horizontal ? band : height}
                    fill="transparent"
                    onPointerEnter={() => setActive(i)}
                  />
                </g>
              );
            })}
          </svg>
        )}
        <ChartTooltip
          open={active !== null}
          x={tip.x}
          y={tip.y}
          width={width}
          indicator={indicator}
          label={active === null ? "" : formatIndex(String(data[active][index]))}
          rows={
            active === null
              ? []
              : series.map((s, si) => ({
                  label: s.label,
                  value: formatValue(value(data[active], s.key)),
                  color: seriesColor(s, si),
                }))
          }
        />
      </div>
      {(legend ?? series.length > 1) && (
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
