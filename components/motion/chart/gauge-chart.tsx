"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";
import {
  ChartLegend,
  formatFull,
  seriesColor,
} from "@/components/motion/chart/shared";
import { cn } from "@/lib/utils";

export type GaugeSegment = {
  /** Upper bound of this band; it starts where the previous one ends (or at `min`). */
  to: number;
  label: string;
  /** Any CSS color. Default: the next `--chart-N` slot, in fixed order. */
  color?: string;
};

export interface GaugeChartProps {
  value: number;
  /** Default 0. */
  min?: number;
  /** Default 100. */
  max?: number;
  /** Threshold bands, ascending. The fill takes the color of the band the value sits in. */
  segments?: GaugeSegment[];
  /** Caption under the value. Default: the active segment's label. */
  label?: string;
  /** Fill color when there are no segments. Default `--chart-1`. */
  color?: string;
  /** Arc length in degrees, 180 (semicircle) to 300. Default 240. */
  sweep?: number;
  /** Width in px. Default 260. */
  size?: number;
  /** Arc thickness in px. Default 16. */
  thickness?: number;
  /** Show the segment legend. Default: when there are segments. */
  legend?: boolean;
  formatValue?: (value: number) => string;
  /** Names the meter for assistive tech. */
  title: string;
  className?: string;
}

// A needle wants a little overshoot and settle, unlike UI panels: softer and
// less damped than SPRING_LAYOUT so the swing reads as a physical pointer.
const SPRING_NEEDLE = { stiffness: 140, damping: 16, mass: 0.9 } as const;
const BAND_GAP = 5; // between the threshold band and the arc
const BAND_W = 4;

/** Point on a circle; angle in degrees, 0 = 12 o'clock, clockwise. */
function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const [x0, y0] = polar(cx, cy, r, from);
  const [x1, y1] = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M${x0},${y0}A${r},${r} 0 ${large} 1 ${x1},${y1}`;
}

/**
 * A single value on a scale: an arc that fills with `pathLength` and a needle
 * that springs to the value, both driven by one spring so they never drift
 * apart. Optional threshold segments ring the arc and color the fill by the
 * band the value falls in. Exposed to assistive tech as a meter.
 */
export function GaugeChart({
  value,
  min = 0,
  max = 100,
  segments,
  label,
  color,
  sweep = 240,
  size = 260,
  thickness = 16,
  legend,
  formatValue = formatFull,
  title,
  className,
}: GaugeChartProps) {
  const reduce = useReducedMotion();
  const viewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, { once: true, amount: 0.4 });
  const shown = reduce || inView;

  const span = max - min || 1;
  const clamped = Math.min(max, Math.max(min, value));
  const frac = (clamped - min) / span;
  const deg = Math.min(300, Math.max(180, sweep));
  const start = -deg / 2;

  const bands = (segments ?? []).map((s, i, all) => ({
    ...s,
    from: i === 0 ? min : all[i - 1].to,
    color: seriesColor(s, i),
  }));
  const current =
    bands.find((b) => clamped <= b.to) ?? bands[bands.length - 1] ?? null;
  const fillColor = current?.color ?? color ?? seriesColor({}, 0);
  const caption = label ?? current?.label ?? "";

  // Geometry: the band rings the arc on the outside; leave room for it.
  const outer = bands.length ? BAND_GAP + BAND_W : 0;
  const r = size / 2 - thickness / 2 - outer - 2;
  const cx = size / 2;
  const cy = size / 2;
  // Lowest point of the arc ends (below the pivot once the sweep passes 180°).
  const endDrop = Math.max(0, -Math.cos((deg / 2) * (Math.PI / 180))) * (r + outer);
  const readoutTop = cy + 14;
  const height = Math.max(cy + endDrop + thickness / 2 + 22, readoutTop + 58);

  // One spring drives both the fill and the needle.
  const progress = useSpring(0, SPRING_NEEDLE);
  useEffect(() => {
    const target = shown ? frac : 0;
    if (reduce) progress.jump(target);
    else progress.set(target);
  }, [frac, shown, reduce, progress]);
  const pathLength = useTransform(progress, (p) => Math.max(0, p));
  const needleLen = r - thickness / 2 - 8;
  // Needle endpoints computed from the angle: motion rewrites
  // transform-origin on SVG children, so rotating a group drifts off the hub.
  const angle = useTransform(progress, (p) => ((start + p * deg) * Math.PI) / 180);
  const tipX = useTransform(angle, (a) => cx + needleLen * Math.sin(a));
  const tipY = useTransform(angle, (a) => cy - needleLen * Math.cos(a));
  const tailX = useTransform(angle, (a) => cx - 6 * Math.sin(a));
  const tailY = useTransform(angle, (a) => cy + 6 * Math.cos(a));
  const [minX, minY] = polar(cx, cy, r, start);
  const [maxX, maxY] = polar(cx, cy, r, -start);

  return (
    <div ref={viewRef} className={cn("flex flex-col items-center", className)}>
      {/* biome-ignore lint/a11y/useSemanticElements: custom-drawn meter; <meter> can't contain the SVG */}
      <div
        role="meter"
        aria-label={title}
        aria-valuenow={clamped}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={caption ? `${formatValue(clamped)}, ${caption}` : formatValue(clamped)}
        className="relative"
        style={{ width: size, height }}
      >
        <svg width={size} height={height} aria-hidden className="overflow-visible">
          <title>{title}</title>
          {bands.map((b) => {
            const a0 = start + ((b.from - min) / span) * deg;
            const a1 = start + ((Math.min(max, b.to) - min) / span) * deg;
            if (a1 <= a0) return null;
            return (
              <path
                key={b.label}
                d={arc(cx, cy, r + thickness / 2 + BAND_GAP + BAND_W / 2, a0 + 0.6, a1 - 0.6)}
                fill="none"
                stroke={b.color}
                strokeWidth={BAND_W}
                strokeOpacity={b === current ? 1 : 0.45}
              />
            );
          })}

          <path
            d={arc(cx, cy, r, start, -start)}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={thickness}
            strokeLinecap="round"
          />
          <motion.path
            d={arc(cx, cy, r, start, -start)}
            fill="none"
            stroke={fillColor}
            strokeWidth={thickness}
            strokeLinecap="round"
            initial={false}
            animate={{ opacity: shown && frac > 0 ? 1 : 0 }}
            transition={{ opacity: { duration: 0.2 } }}
            style={{ pathLength, transition: "stroke 200ms" }}
          />

          <text
            x={minX}
            y={minY + thickness / 2 + 14}
            textAnchor="middle"
            className="fill-muted-foreground text-xs tabular-nums"
          >
            {formatValue(min)}
          </text>
          <text
            x={maxX}
            y={maxY + thickness / 2 + 14}
            textAnchor="middle"
            className="fill-muted-foreground text-xs tabular-nums"
          >
            {formatValue(max)}
          </text>

          <motion.line
            x1={tailX}
            y1={tailY}
            x2={tipX}
            y2={tipY}
            stroke="var(--foreground)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={7} fill="var(--foreground)" stroke="var(--card)" strokeWidth={3} />
        </svg>

        <div
          className="pointer-events-none absolute inset-x-0 flex flex-col items-center text-center"
          style={{ top: readoutTop }}
        >
          <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {formatValue(clamped)}
          </span>
          {caption ? (
            <span className="max-w-[70%] truncate text-xs text-muted-foreground">
              {caption}
            </span>
          ) : null}
        </div>
      </div>

      {(legend ?? bands.length > 0) && bands.length > 0 && (
        <ChartLegend items={bands.map((b) => ({ label: b.label, color: b.color }))} />
      )}
    </div>
  );
}
