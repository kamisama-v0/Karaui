"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useId, useRef } from "react";
import {
  formatFull,
  GROW,
  useChartWidth,
} from "@/components/motion/chart/shared";
import { cn } from "@/lib/utils";

export interface SparklineProps {
  /** Values in time order. */
  data: number[];
  /** Height in px; width fills the container. Default 40. */
  height?: number;
  /** Any CSS color. Default: the first `--chart-*` slot. */
  color?: string;
  /** Soft fill under the line. Default true. */
  area?: boolean;
  formatValue?: (value: number) => string;
  /** What the values are, e.g. "Weekly revenue". Used in the spoken summary. */
  label: string;
  className?: string;
}

const PAD = 5; // room for the end dot and its ring

/**
 * Word-sized trend line for stat tiles. Draws in when scrolled into view and
 * ends on a ringed dot at the latest value. It has no hover layer: the tile's
 * headline number carries the value, and the summary below is spoken.
 */
export function Sparkline({
  data,
  height = 40,
  color = "var(--chart-1, #2a78d6)",
  area = true,
  formatValue = formatFull,
  label,
  className,
}: SparklineProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const [measureRef, width] = useChartWidth();
  const viewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, { once: true, amount: 0.5 });
  const shown = reduce || inView;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) =>
    PAD + (data.length > 1 ? (i / (data.length - 1)) * (width - PAD * 2) : 0);
  const y = (v: number) => PAD + (1 - (v - min) / span) * (height - PAD * 2);
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
  const last = data.length - 1;

  const first = data[0] ?? 0;
  const end = data[last] ?? 0;
  const change = first ? ((end - first) / Math.abs(first)) * 100 : 0;
  const summary = `${label}: ${formatValue(first)} to ${formatValue(end)}, ${
    change >= 0 ? "up" : "down"
  } ${Math.abs(change).toFixed(1)}% over ${data.length} points`;

  return (
    <div ref={viewRef} className={cn("w-full", className)}>
      <div ref={measureRef} style={{ height }} className="w-full">
        {width > 0 && data.length > 1 && (
          <svg width={width} height={height} role="img" aria-label={summary}>
            {area && (
              <>
                <defs>
                  <linearGradient id={`${uid}-fill`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <motion.path
                  d={`${line}L${x(last)},${height}L${x(0)},${height}Z`}
                  fill={`url(#${uid}-fill)`}
                  initial={false}
                  animate={{ opacity: shown ? 1 : 0 }}
                  transition={reduce ? { duration: 0 } : { ...GROW, delay: 0.3 }}
                />
              </>
            )}
            <motion.path
              d={line}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: shown ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.8, ease: GROW.ease }}
            />
            <motion.circle
              cx={x(last)}
              cy={y(end)}
              r={3.5}
              fill={color}
              stroke="var(--card)"
              strokeWidth={2}
              initial={false}
              animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : 0.4 }}
              transition={reduce ? { duration: 0 } : { duration: 0.2, delay: 0.7 }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          </svg>
        )}
      </div>
    </div>
  );
}
