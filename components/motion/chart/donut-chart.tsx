"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { type KeyboardEvent, useRef, useState } from "react";
import {
  ChartLegend,
  ChartTable,
  formatFull,
  GROW,
  seriesColor,
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
  /** Diameter in px. Default 200. */
  size?: number;
  /** Ring thickness in px. Default 22. */
  thickness?: number;
  /** Center caption under the total. Default "Total". */
  totalLabel?: string;
  formatValue?: (value: number) => string;
  /** Names the chart for assistive tech and the table view. */
  title: string;
  className?: string;
}

const GAP_PX = 2; // surface gap between slices, measured along the ring

/**
 * Share-of-whole ring. Slices sweep in around the ring when scrolled into
 * view; hovering or arrowing to a slice dims the rest and swaps the center
 * from the total to that slice's value and share.
 */
export function DonutChart({
  data,
  size = 200,
  thickness = 22,
  totalLabel = "Total",
  formatValue = formatFull,
  title,
  className,
}: DonutChartProps) {
  const reduce = useReducedMotion();
  const viewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, { once: true, amount: 0.35 });
  const [active, setActive] = useState<number | null>(null);
  const shown = reduce || inView;

  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const gapFrac = data.length > 1 ? GAP_PX / circumference : 0;
  const pct = (v: number) =>
    total ? `${Math.round((Math.max(0, v) / total) * 100)}%` : "0%";

  // Each slice is a stroked arc on one circle: start angle via rotation,
  // length via the dash, so the sweep is a plain pathLength animation.
  let cursor = 0;
  const slices = data.map((d, i) => {
    const frac = total ? Math.max(0, d.value) / total : 0;
    const start = cursor;
    cursor += frac;
    return {
      ...d,
      color: seriesColor({ key: d.label, label: d.label, color: d.color }, i),
      start,
      length: Math.max(0, frac - gapFrac),
    };
  });

  const onKeyDown = (e: KeyboardEvent) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    setActive((a) =>
      a === null
        ? dir > 0
          ? 0
          : data.length - 1
        : (a + dir + data.length) % data.length,
    );
  };

  const center =
    active === null
      ? { key: "total", value: formatValue(total), label: totalLabel }
      : {
          key: `s${active}`,
          value: formatValue(data[active].value),
          label: `${data[active].label} · ${pct(data[active].value)}`,
        };

  return (
    <div
      ref={viewRef}
      className={cn("flex flex-col items-center gap-4", className)}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: a chart is not a form; group labels the ring */}
      <div
        role="group"
        aria-label={`${title}. Use arrow keys to read each slice.`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable chart widget; arrow keys read values
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          aria-hidden
          className="-rotate-90"
          onPointerLeave={() => setActive(null)}
        >
          <title>{title}</title>
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={thickness}
          />
          {slices.map((s, i) => (
            <motion.circle
              key={s.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              // Rotation places the slice's start; pathLength draws its length.
              style={{
                rotate: s.start * 360,
                transformOrigin: "center",
                transformBox: "fill-box",
              }}
              initial={false}
              animate={{
                pathLength: shown ? s.length : 0,
                opacity: active !== null && active !== i ? 0.3 : 1,
              }}
              transition={{
                pathLength: reduce
                  ? { duration: 0 }
                  : { ...GROW, duration: 0.7, delay: 0.1 + s.start * 0.5 },
                opacity: { duration: 0.15 },
              }}
              onPointerEnter={() => setActive(i)}
              className="cursor-default"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
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
              className="flex max-w-[70%] flex-col items-center text-center"
            >
              <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {center.value}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {center.label}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ChartLegend
        mark="block"
        items={slices.map((s) => ({ label: s.label, color: s.color }))}
        className="justify-center"
      />
      <ChartTable
        caption={title}
        head={["Slice", "Value", "Share"]}
        rows={data.map((d) => [d.label, formatValue(d.value), pct(d.value)])}
      />
    </div>
  );
}
