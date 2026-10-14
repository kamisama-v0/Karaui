"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type ChartSeries = {
  /** Key of the value in each datum. */
  key: string;
  label: string;
  /** Any CSS color. Default: the next `--chart-N` slot, in fixed order. */
  color?: string;
};

export type ChartDatum = Record<string, string | number>;

/** "natural" is a monotone curve: smooth, but never overshoots a data point. */
export type ChartCurve = "natural" | "linear" | "step";

export type TooltipIndicator = "dot" | "line" | "dashed";

// Fixed categorical order, validated for colorblind and normal-vision
// separation (light and dark steps live in the theme's --chart-* tokens).
// Fallbacks are the light steps, for projects without the theme layer.
const SLOT_FALLBACKS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

/** Color for slot `index`; color follows the series, never its rank. */
export function seriesColor(series: { color?: string }, index: number) {
  if (series.color) return series.color;
  const slot = index % SLOT_FALLBACKS.length;
  return `var(--chart-${slot + 1}, ${SLOT_FALLBACKS[slot]})`;
}

/**
 * Layout width of the element given the returned ref. ResizeObserver reports
 * the untransformed box, unlike getBoundingClientRect (react-use-measure), so a
 * chart inside a scaled container (thumbnails, zoomed stages) still fills it.
 */
export function useChartWidth<T extends Element = HTMLDivElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, width] as const;
}

// A fixed locale keeps server and client output identical for hydration.
const FULL = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
export const formatFull = (n: number) => FULL.format(n);
export const formatCompact = (n: number) => COMPACT.format(n);

/** Round tick values covering [min, max], about `count` of them. */
export function niceTicks(min: number, max: number, count = 4) {
  if (min === max) max = min + 1;
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

/** Keep every k-th label so neighbours stay at least `minGap` px apart. */
export function labelStride(count: number, width: number, minGap = 56) {
  return Math.max(1, Math.ceil(count / Math.max(1, Math.floor(width / minGap))));
}

/** Approximate gutter for axis labels at 12px. */
export function gutterFor(labels: string[]) {
  return Math.max(...labels.map((l) => l.length), 1) * 7 + 12;
}

type Point = [number, number];

/** SVG path through `points` (sorted by x) with the given curve. */
export function curvePath(points: Point[], curve: ChartCurve) {
  if (points.length === 0) return "";
  const [x0, y0] = points[0];
  if (points.length === 1) return `M${x0},${y0}`;
  if (curve === "step") {
    // Changes value halfway between points, like a stepped series.
    let d = `M${x0},${y0}`;
    for (let i = 1; i < points.length; i++) {
      const [px] = points[i - 1];
      const [x, y] = points[i];
      const mid = (px + x) / 2;
      d += `H${mid}V${y}H${x}`;
    }
    return d;
  }
  if (curve === "linear" || points.length < 3) {
    return points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join("");
  }
  // Monotone cubic (Fritsch–Carlson): tangents are clamped so the curve stays
  // between its neighbours and never invents a peak the data doesn't have.
  const n = points.length;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    slopes.push(dx ? (points[i + 1][1] - points[i][1]) / dx : 0);
  }
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === n - 1) return slopes[n - 2];
    const a = slopes[i - 1];
    const b = slopes[i];
    return a * b <= 0 ? 0 : (a + b) / 2;
  });
  for (let i = 0; i < n - 1; i++) {
    const m = slopes[i];
    if (m === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / m;
    const b = tangents[i + 1] / m;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      tangents[i] = t * a * m;
      tangents[i + 1] = t * b * m;
    }
  }
  let d = `M${x0},${y0}`;
  for (let i = 0; i < n - 1; i++) {
    const [xa, ya] = points[i];
    const [xb, yb] = points[i + 1];
    const h = (xb - xa) / 3;
    d += `C${xa + h},${ya + tangents[i] * h} ${xb - h},${yb - tangents[i + 1] * h} ${xb},${yb}`;
  }
  return d;
}

// ── tooltip ────────────────────────────────────────────────────────────────

export type TooltipRow = { label: string; value: string; color: string };

function Indicator({ kind, color }: { kind: TooltipIndicator; color: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0 rounded-[2px]",
        kind === "dot" && "size-2.5",
        kind === "line" && "w-1 self-stretch",
        kind === "dashed" && "w-0 self-stretch border-[1.5px] border-dashed",
      )}
      style={
        kind === "dashed" ? { borderColor: color } : { background: color }
      }
    />
  );
}

/**
 * Compact readout that springs between data positions: an optional label,
 * then one row per series with a colored indicator, the name and the value.
 */
export function ChartTooltip({
  open,
  x,
  y,
  width,
  label,
  rows,
  indicator = "dot",
}: {
  open: boolean;
  /** Anchor in px, relative to the chart's positioned wrapper. */
  x: number;
  y: number;
  /** Wrapper width, to flip the tooltip before it overflows the edge. */
  width: number;
  label?: string;
  rows: TooltipRow[];
  indicator?: TooltipIndicator;
}) {
  const reduce = useReducedMotion();
  const flip = x > width / 2;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, x, y, scale: reduce ? 1 : 0.96 }}
          animate={{ opacity: 1, x, y, scale: 1 }}
          exit={{ opacity: 0, scale: reduce ? 1 : 0.96, transition: { duration: 0.1 } }}
          transition={
            reduce
              ? { duration: 0 }
              : {
                  opacity: { duration: 0.12 },
                  scale: { duration: 0.15, ease: EASE_OUT },
                  // Tracks the pointer between data positions; firm enough to
                  // never trail behind a quick sweep.
                  default: { type: "spring", stiffness: 520, damping: 42 },
                }
          }
          className="pointer-events-none absolute top-0 left-0 z-10"
        >
          <div
            className={cn(
              "grid min-w-32 -translate-y-1/2 gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-xl",
              flip ? "-translate-x-[calc(100%+12px)]" : "translate-x-3",
            )}
          >
            {label ? (
              <p className="font-medium text-foreground">{label}</p>
            ) : null}
            {rows.map((row) => (
              <div key={row.label} className="flex items-stretch gap-2">
                <Indicator kind={indicator} color={row.color} />
                <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {row.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── legend & table ─────────────────────────────────────────────────────────

export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string }[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-[2px]"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** The table view: every value reachable without hovering or seeing color. */
export function ChartTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: ReactNode[][];
}) {
  // The wrapper is what hides it: a <caption> escapes a visually hidden
  // table's clip and would otherwise paint over the chart.
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows mirror data order and never reorder.
            <tr key={r}>
              {row.map((cell, c) =>
                c === 0 ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed column order.
                  <th key={c} scope="row">
                    {cell}
                  </th>
                ) : (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed column order.
                  <td key={c}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Shared entrance timing: marks grow once the chart scrolls into view. */
export const GROW = { duration: 0.7, ease: EASE_OUT } as const;

/** Arrow-key stepping shared by every chart that reads positions. */
export function stepIndex(
  key: string,
  current: number | null,
  count: number,
  wrap = false,
) {
  const forward = key === "ArrowRight" || key === "ArrowDown";
  const back = key === "ArrowLeft" || key === "ArrowUp";
  if (!forward && !back) return undefined;
  if (current === null) return forward ? 0 : count - 1;
  const next = current + (forward ? 1 : -1);
  if (wrap) return (next + count) % count;
  return Math.min(count - 1, Math.max(0, next));
}
