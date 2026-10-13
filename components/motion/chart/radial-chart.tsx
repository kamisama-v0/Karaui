"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useRef, useState } from "react";
import {
  ChartLegend,
  ChartTable,
  formatFull,
  seriesColor,
  stepIndex,
} from "@/components/motion/chart/shared";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type RadialRing = {
  label: string;
  value: number;
  /** Any CSS color. Default: the next `--chart-N` slot, in fixed order. */
  color?: string;
};

export interface RadialChartProps {
  /** One ring per item, outermost first. A single item makes a progress ring. */
  data: RadialRing[];
  /** The value a full ring represents. Default 100. */
  max?: number;
  /** Diameter in px. Default 220. */
  size?: number;
  /** Ring thickness in px. Default 14. */
  thickness?: number;
  /** Center content when nothing is hovered. Default: first ring's share. */
  centerValue?: string;
  centerLabel?: string;
  /** Show the legend. Default: when there are two or more rings. */
  legend?: boolean;
  formatValue?: (value: number) => string;
  /** Names the chart for assistive tech and the table view. */
  title: string;
  className?: string;
}

const RING_GAP = 6;

/**
 * Progress against a target as concentric rings that fill clockwise from
 * 12 o'clock with rounded caps. Hovering or arrowing to a ring dims the
 * others and swaps the center readout to that ring.
 */
export function RadialChart({
  data,
  max = 100,
  size = 220,
  thickness = 14,
  centerValue,
  centerLabel,
  legend,
  formatValue = formatFull,
  title,
  className,
}: RadialChartProps) {
  const reduce = useReducedMotion();
  const viewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, { once: true, amount: 0.3 });
  const [active, setActive] = useState<number | null>(null);
  const shown = reduce || inView;

  const c = size / 2;
  const share = (v: number) => Math.min(1, Math.max(0, v / max));
  const pct = (v: number) => `${Math.round(share(v) * 100)}%`;

  const shownIndex = active ?? 0;
  const center =
    active === null && centerValue !== undefined
      ? { key: "custom", value: centerValue, label: centerLabel ?? "" }
      : {
          key: `r${shownIndex}`,
          value: pct(data[shownIndex]?.value ?? 0),
          label:
            active === null && centerLabel !== undefined
              ? centerLabel
              : `${data[shownIndex]?.label ?? ""} · ${formatValue(data[shownIndex]?.value ?? 0)}`,
        };

  return (
    <div ref={viewRef} className={cn("flex flex-col items-center", className)}>
      {/* biome-ignore lint/a11y/useSemanticElements: a chart is not a form; group labels the rings */}
      <div
        role="group"
        aria-label={`${title}. Use arrow keys to read each ring.`}
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
          // Rings start at 12 o'clock and fill clockwise.
          className="-rotate-90"
        >
          <title>{title}</title>
          {data.map((ring, i) => {
            const r = c - thickness / 2 - i * (thickness + RING_GAP);
            if (r <= thickness) return null;
            const color = seriesColor(ring, i);
            const dim = active !== null && active !== i;
            return (
              <g key={ring.label} onPointerEnter={() => setActive(i)}>
                <circle
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke="var(--border-strong)"
                  strokeWidth={thickness}
                />
                <motion.circle
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  initial={false}
                  animate={{
                    pathLength: shown ? share(ring.value) : 0,
                    opacity: dim ? 0.3 : 1,
                  }}
                  transition={{
                    pathLength: reduce
                      ? { duration: 0 }
                      : { duration: 1, ease: EASE_OUT, delay: i * 0.12 },
                    opacity: { duration: 0.15 },
                  }}
                />
              </g>
            );
          })}
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
                  : { opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.12, ease: EASE_OUT } }
              }
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="flex max-w-[60%] flex-col items-center text-center"
            >
              <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {center.value}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {center.label}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {(legend ?? data.length > 1) && (
        <ChartLegend
          items={data.map((ring, i) => ({ label: ring.label, color: seriesColor(ring, i) }))}
        />
      )}
      <ChartTable
        caption={title}
        head={["Ring", "Value", `Share of ${formatValue(max)}`]}
        rows={data.map((ring) => [ring.label, formatValue(ring.value), pct(ring.value)])}
      />
    </div>
  );
}
