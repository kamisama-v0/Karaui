"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
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

// Fixed categorical order, validated for colorblind and normal-vision
// separation (light and dark steps live in the theme's --chart-* tokens).
// Fallbacks are the light steps, for projects without the theme layer.
const SLOT_FALLBACKS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

/** Color for series `index`; color follows the series, never its rank. */
export function seriesColor(series: ChartSeries, index: number) {
  if (series.color) return series.color;
  const slot = index % SLOT_FALLBACKS.length;
  return `var(--chart-${slot + 1}, ${SLOT_FALLBACKS[slot]})`;
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

/** Keep every k-th x label so neighbours stay at least `minGap` px apart. */
export function labelStride(count: number, width: number, minGap = 56) {
  return Math.max(1, Math.ceil(count / Math.max(1, Math.floor(width / minGap))));
}

/** Approximate left gutter for y labels at 11px. */
export function gutterFor(labels: string[]) {
  return Math.max(...labels.map((l) => l.length), 1) * 6.5 + 10;
}

// ── tooltip ────────────────────────────────────────────────────────────────

export type TooltipRow = { label: string; value: string; color: string };

/**
 * Value-first readout that springs between data positions. Rows key each
 * series with a short stroke of its color; text stays in text tokens.
 */
export function ChartTooltip({
  open,
  x,
  y,
  width,
  title,
  rows,
}: {
  open: boolean;
  /** Anchor in px, relative to the chart's positioned wrapper. */
  x: number;
  y: number;
  /** Wrapper width, to flip the tooltip before it overflows the edge. */
  width: number;
  title: string;
  rows: TooltipRow[];
}) {
  const reduce = useReducedMotion();
  const flip = x > width / 2;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, x, y }}
          animate={{ opacity: 1, x, y }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={
            reduce
              ? { duration: 0 }
              : {
                  opacity: { duration: 0.12 },
                  // Tracks the pointer between data positions; firm enough to
                  // never trail behind a quick sweep.
                  default: { type: "spring", stiffness: 520, damping: 42 },
                }
          }
          className="pointer-events-none absolute top-0 left-0 z-10"
        >
          <div
            className={cn(
              "min-w-32 -translate-y-1/2 rounded-xl border border-border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur",
              flip ? "-translate-x-[calc(100%+12px)]" : "translate-x-3",
            )}
          >
            <p className="mb-1.5 text-muted-foreground">{title}</p>
            <ul className="space-y-1">
              {rows.map((row) => (
                <li key={row.label} className="flex items-center gap-2">
                  <span
                    className="h-0.5 w-3 shrink-0 rounded-full"
                    style={{ background: row.color }}
                  />
                  <span className="font-medium tabular-nums text-foreground">
                    {row.value}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {row.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── legend & table ─────────────────────────────────────────────────────────

/** Legend that mirrors the mark: a block for bars/areas, a stroke for lines. */
export function ChartLegend({
  items,
  mark,
  className,
}: {
  items: { label: string; color: string }[];
  mark: "block" | "line";
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "shrink-0",
              mark === "block" ? "size-2.5 rounded-[3px]" : "h-0.5 w-3 rounded-full",
            )}
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
  return (
    <table className="sr-only">
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
  );
}

/** Shared entrance timing: marks grow once the chart scrolls into view. */
export const GROW = { duration: 0.6, ease: EASE_OUT } as const;
