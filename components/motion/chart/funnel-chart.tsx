"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import {
  ChartTable,
  ChartTooltip,
  formatFull,
  GROW,
  seriesColor,
  stepIndex,
  useChartWidth,
} from "@/components/motion/chart/shared";
import { cn } from "@/lib/utils";

export type FunnelStage = {
  label: string;
  value: number;
};

export interface FunnelChartProps {
  /** Ordered steps, widest first (visits → signups → purchases…). */
  data: FunnelStage[];
  /** Plot height in px. Default 180. */
  height?: number;
  /** Any CSS color; later stages fade toward the surface. Default `--chart-1`. */
  color?: string;
  /** Print each step's conversion from the previous one. Default true. */
  showConversion?: boolean;
  formatValue?: (value: number) => string;
  /** Names the chart for assistive tech and the table view. */
  title: string;
  className?: string;
}

const GAP = 2; // hairline between stages
const MIN_BAND = 0.04; // a near-empty stage still shows a sliver

const PCT = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

/**
 * Conversion through ordered steps as one horizontal funnel: each stage is a
 * band whose height follows its value and eases into the next stage's height.
 * Bands grow out of the center line one after another when scrolled into
 * view; hovering or arrowing to a stage dims the rest and reads its value and
 * conversion from the previous step and from the top of the funnel.
 */
export function FunnelChart({
  data,
  height = 180,
  color = seriesColor({}, 0),
  showConversion = true,
  formatValue = formatFull,
  title,
  className,
}: FunnelChartProps) {
  const reduce = useReducedMotion();
  const [measureRef, width] = useChartWidth();
  const viewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, { once: true, amount: 0.3 });
  const [active, setActive] = useState<number | null>(null);
  const shown = reduce || inView;

  const n = data.length;
  const top = Math.max(0, ...data.map((d) => d.value));
  const share = (v: number) =>
    top > 0 ? Math.max(MIN_BAND, Math.max(0, v) / top) : MIN_BAND;
  const ofPrev = (i: number) =>
    i === 0 || data[i - 1].value <= 0 ? 1 : data[i].value / data[i - 1].value;
  const ofTop = (i: number) =>
    data[0].value > 0 ? data[i].value / data[0].value : 0;

  const colW = n ? width / n : 0;
  const cy = height / 2;
  const half = (i: number) => (share(data[Math.min(i, n - 1)].value) * height) / 2;
  // Later stages fade toward the surface but stay clearly colored.
  const fillFor = (i: number) =>
    n <= 1
      ? color
      : `color-mix(in oklab, ${color} ${Math.round(100 - (45 * i) / (n - 1))}%, transparent)`;

  // Each band holds its height for the first part of the column, then eases
  // (S-curve) into the next stage's height.
  const bandPath = (i: number) => {
    const x0 = i * colW + (i === 0 ? 0 : GAP / 2);
    const x1 = (i + 1) * colW - (i === n - 1 ? 0 : GAP / 2);
    const h0 = half(i);
    const h1 = half(i + 1);
    const flat = x0 + (x1 - x0) * 0.35;
    const mid = (flat + x1) / 2;
    return [
      `M${x0},${cy - h0}`,
      `L${flat},${cy - h0}`,
      `C${mid},${cy - h0} ${mid},${cy - h1} ${x1},${cy - h1}`,
      `L${x1},${cy + h1}`,
      `C${mid},${cy + h1} ${mid},${cy + h0} ${flat},${cy + h0}`,
      `L${x0},${cy + h0}Z`,
    ].join("");
  };

  return (
    <div ref={viewRef} className={cn("w-full", className)}>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, n)}, minmax(0, 1fr))` }}
      >
        {data.map((d, i) => (
          <motion.div
            key={d.label}
            initial={false}
            animate={{ opacity: active !== null && active !== i ? 0.45 : 1 }}
            transition={{ duration: 0.15 }}
            className={cn("min-w-0 pb-3", i > 0 && "border-l border-border pl-3")}
          >
            <p className="truncate text-xs text-muted-foreground">{d.label}</p>
            <p className="truncate text-lg font-semibold tracking-tight text-foreground tabular-nums">
              {formatValue(d.value)}
            </p>
            {showConversion && (
              <p className="truncate text-xs text-muted-foreground tabular-nums">
                {i === 0 ? " " : `${PCT.format(ofPrev(i))} of previous`}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div ref={measureRef} className="relative w-full">
        {width > 0 && n > 0 && (
          // biome-ignore lint/a11y/useSemanticElements: a chart is not a form; group labels the plot
          <svg
            width={width}
            height={height}
            role="group"
            aria-label={`${title}. Use arrow keys to read each stage.`}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable chart widget; arrow keys read values
            tabIndex={0}
            onKeyDown={(e) => {
              const next = stepIndex(e.key, active, n);
              if (next === undefined) return;
              e.preventDefault();
              setActive(next);
            }}
            onPointerMove={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const i = Math.floor((e.clientX - box.left) / (colW || 1));
              setActive(Math.min(n - 1, Math.max(0, i)));
            }}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            className="block touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {data.slice(1).map((d, i) => (
              <line
                key={d.label}
                x1={(i + 1) * colW}
                x2={(i + 1) * colW}
                y1={0}
                y2={height}
                stroke="var(--border-strong)"
                strokeDasharray="3 3"
                shapeRendering="crispEdges"
              />
            ))}
            {data.map((d, i) => (
              <motion.path
                key={d.label}
                d={bandPath(i)}
                fill={fillFor(i)}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{
                  opacity: active !== null && active !== i ? 0.35 : 1,
                  scaleY: shown ? 1 : 0,
                }}
                transition={{
                  scaleY: reduce
                    ? { duration: 0 }
                    : { ...GROW, delay: 0.1 + i * 0.12 },
                  opacity: { duration: 0.15 },
                }}
                style={{ transformBox: "view-box", transformOrigin: `0px ${cy}px` }}
              />
            ))}
          </svg>
        )}
        <ChartTooltip
          open={active !== null}
          x={active === null ? 0 : (active + 0.5) * colW}
          y={cy}
          width={width}
          label={active === null ? "" : data[active].label}
          rows={
            active === null
              ? []
              : [
                  { label: "Value", value: formatValue(data[active].value), color: fillFor(active) },
                  ...(active > 0
                    ? [
                        { label: "Of previous", value: PCT.format(ofPrev(active)), color: fillFor(active) },
                        { label: "Of first", value: PCT.format(ofTop(active)), color: fillFor(active) },
                      ]
                    : []),
                ]
          }
        />
      </div>

      <ChartTable
        caption={title}
        head={["Stage", "Value", "Of previous", "Of first"]}
        rows={data.map((d, i) => [
          d.label,
          formatValue(d.value),
          i === 0 ? "—" : PCT.format(ofPrev(i)),
          PCT.format(ofTop(i)),
        ])}
      />
    </div>
  );
}
