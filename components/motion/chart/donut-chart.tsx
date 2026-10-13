"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useId, useRef, useState } from "react";
import {
  ChartLegend,
  ChartTable,
  formatFull,
  seriesColor,
  stepIndex,
} from "@/components/motion/chart/shared";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type DonutSlice = {
  label: string;
  value: number;
  /** Any CSS color. Default: the next `--chart-N` slot, in fixed order. */
  color?: string;
};

export interface DonutChartProps {
  /**
   * Parts of one whole. Keep it to five or fewer and fold the long tail into
   * an "Other" slice; close values compare better as bars.
   */
  data: DonutSlice[];
  /** "donut" (default) leaves room for the center readout; "pie" is solid. */
  variant?: "donut" | "pie";
  /** Diameter in px. Default 220. */
  size?: number;
  /** Ring thickness for the donut, in px. Default 32% of the radius. */
  thickness?: number;
  /** Center caption under the total. Default "Total". */
  totalLabel?: string;
  /** Show the legend under the chart. Default true. */
  legend?: boolean;
  formatValue?: (value: number) => string;
  /** Names the chart for assistive tech and the table view. */
  title: string;
  className?: string;
}

const ACTIVE_GROW = 1.06;

/** Annular sector from angle a0 to a1 (radians, 0 = 12 o'clock, clockwise). */
function sector(c: number, r0: number, r1: number, a0: number, a1: number): string {
  const pt = (r: number, a: number) =>
    `${c + r * Math.sin(a)},${c - r * Math.cos(a)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    // A full ring can't be one arc; split it in two halves.
    const mid = a0 + Math.PI;
    return `${sector(c, r0, r1, a0, mid)}${sector(c, r0, r1, mid, a1)}`;
  }
  const outer = `M${pt(r1, a0)}A${r1},${r1} 0 ${large} 1 ${pt(r1, a1)}`;
  if (r0 <= 0) return `${outer}L${c},${c}Z`;
  return `${outer}L${pt(r0, a1)}A${r0},${r0} 0 ${large} 0 ${pt(r0, a0)}Z`;
}

/**
 * Share of a whole as a donut or pie. Slices sweep in clockwise when scrolled
 * into view; hovering or arrowing to a slice lifts it, dims the rest and
 * swaps the center readout from the total to that slice's value and share.
 */
export function DonutChart({
  data,
  variant = "donut",
  size = 220,
  thickness,
  totalLabel = "Total",
  legend = true,
  formatValue = formatFull,
  title,
  className,
}: DonutChartProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const viewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, { once: true, amount: 0.3 });
  const [active, setActive] = useState<number | null>(null);
  const shown = reduce || inView;

  // Leave room inside the box for the active slice to grow.
  const c = size / 2;
  const r1 = (size / 2) / ACTIVE_GROW - 2;
  const r0 = variant === "pie" ? 0 : r1 - (thickness ?? r1 * 0.32);
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  const pct = (v: number) =>
    total ? `${Math.round((Math.max(0, v) / total) * 100)}%` : "0%";

  let cursor = 0;
  const slices = data.map((d, i) => {
    const a0 = cursor;
    cursor += total ? (Math.max(0, d.value) / total) * Math.PI * 2 : 0;
    return { ...d, color: seriesColor(d, i), path: sector(c, r0, r1, a0, cursor) };
  });

  const center =
    active === null
      ? { key: "total", value: formatValue(total), label: totalLabel }
      : {
          key: `s${active}`,
          value: formatValue(data[active].value),
          label: `${data[active].label} · ${pct(data[active].value)}`,
        };

  // The reveal mask: one stroke as thick as the whole radius, swept from 12
  // o'clock with pathLength so every slice uncovers in clockwise order.
  const maskR = (r1 + r0) / 2;
  const maskW = r1 - r0 + 8;

  // Donut: the readout sits in the hole. Pie: it sits under the chart.
  const readout = (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={center.key}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={
          reduce
            ? { opacity: 0, transition: { duration: 0.1 } }
            : {
                opacity: 0,
                y: -6,
                filter: "blur(4px)",
                transition: { duration: 0.12, ease: EASE_OUT },
              }
        }
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="flex flex-col items-center text-center"
      >
        <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {center.value}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {center.label}
        </span>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div ref={viewRef} className={cn("flex flex-col items-center", className)}>
      {/* biome-ignore lint/a11y/useSemanticElements: a chart is not a form; group labels the ring */}
      <div
        role="group"
        aria-label={`${title}. Use arrow keys to read each slice.`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable chart widget; arrow keys read values
        tabIndex={0}
        onKeyDown={(e) => {
          const next = stepIndex(e.key, active, data.length, true);
          if (next === undefined) return;
          e.preventDefault();
          setActive(next);
        }}
        onBlur={() => setActive(null)}
        className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          aria-hidden
          onPointerLeave={() => setActive(null)}
          className="overflow-visible"
        >
          <title>{title}</title>
          <defs>
            <mask id={`${uid}-sweep`}>
              <motion.circle
                cx={c}
                cy={c}
                r={maskR}
                fill="none"
                stroke="white"
                strokeWidth={maskW}
                transform={`rotate(-90 ${c} ${c})`}
                initial={false}
                animate={{ pathLength: shown ? 1 : 0 }}
                transition={reduce ? { duration: 0 } : { duration: 1, ease: EASE_OUT }}
              />
            </mask>
          </defs>
          <g mask={`url(#${uid}-sweep)`}>
            {slices.map((s, i) => (
              <motion.path
                key={s.label}
                d={s.path}
                fill={s.color}
                // A surface-colored stroke separates neighbouring slices.
                stroke="var(--card)"
                strokeWidth={2}
                strokeLinejoin="round"
                initial={false}
                animate={{
                  scale: active === i && !reduce ? ACTIVE_GROW : 1,
                  opacity: active !== null && active !== i ? 0.35 : 1,
                }}
                transition={{
                  scale: { type: "spring", stiffness: 420, damping: 28 },
                  opacity: { duration: 0.15 },
                }}
                style={{
                  transformBox: "view-box",
                  transformOrigin: `${c}px ${c}px`,
                }}
                onPointerEnter={() => setActive(i)}
              />
            ))}
          </g>
        </svg>

        {variant === "donut" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {readout}
          </div>
        )}
      </div>

      {variant === "pie" && (
        <div className="mt-3 flex min-h-12 items-center justify-center">{readout}</div>
      )}

      {legend && (
        <ChartLegend
          items={slices.map((s) => ({ label: s.label, color: s.color }))}
        />
      )}
      <ChartTable
        caption={title}
        head={["Slice", "Value", "Share"]}
        rows={data.map((d) => [d.label, formatValue(d.value), pct(d.value)])}
      />
    </div>
  );
}
