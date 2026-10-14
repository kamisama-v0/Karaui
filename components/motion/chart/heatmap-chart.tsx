"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChartTable,
  ChartTooltip,
  formatFull,
  GROW,
  seriesColor,
  useChartWidth,
} from "@/components/motion/chart/shared";
import { cn } from "@/lib/utils";

export type HeatmapDatum = {
  /** Calendar day, `YYYY-MM-DD` (read as UTC). */
  date: string;
  value: number;
};

export interface HeatmapChartProps {
  /** One entry per day; missing days count as zero, repeated days are summed. */
  data: HeatmapDatum[];
  /** Columns to show, ending on the latest date in `data`. Default 53 (a year). */
  weeks?: number;
  /** Intensity steps including the empty step. Default 5. */
  levels?: number;
  /** Any CSS color for the strongest step. Default `--chart-1`. */
  color?: string;
  /** Tooltip value text. Default "N contributions". */
  formatValue?: (value: number) => string;
  /** Tooltip date text from a `YYYY-MM-DD` string. Default "Oct 3". */
  formatDate?: (date: string) => string;
  /** Names the chart for assistive tech and the table view. */
  title: string;
  className?: string;
}

const DAY_MS = 86_400_000;
const LEFT = 30; // weekday labels
const TOP = 20; // month labels
// Cell pitch bounds: below MIN the grid scrolls; above MAX it stops growing.
const MIN_PITCH = 8;
const MAX_PITCH = 18;
const WEEKDAYS = [
  [1, "Mon"],
  [3, "Wed"],
  [5, "Fri"],
] as const;

// Fixed locale + UTC keep server and client output identical for hydration.
const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const LONG = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** Days since the epoch, from `YYYY-MM-DD`, in UTC. */
function toDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / DAY_MS);
}
const toIso = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
/** 0 = Sunday. 1970-01-01 was a Thursday. */
const weekday = (day: number) => (((day + 4) % 7) + 7) % 7;

const defaultFormatValue = (v: number) =>
  `${formatFull(v)} ${v === 1 ? "contribution" : "contributions"}`;
const defaultFormatDate = (iso: string) => SHORT.format(new Date(`${iso}T00:00:00Z`));

/**
 * Contribution calendar: one rounded cell per day, a column per week, shaded
 * in `levels` steps of one color. Cells fade and scale in column by column when
 * scrolled into view; hovering or arrowing (up/down by day, left/right by
 * week) reads a day. Sizes itself to the available width and scrolls
 * horizontally, newest week in view, when it can't fit.
 */
export function HeatmapChart({
  data,
  weeks = 53,
  levels = 5,
  color = seriesColor({}, 0),
  formatValue = defaultFormatValue,
  formatDate = defaultFormatDate,
  title,
  className,
}: HeatmapChartProps) {
  const reduce = useReducedMotion();
  const [measureRef, width] = useChartWidth();
  const viewRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, { once: true, amount: 0.3 });
  const [active, setActive] = useState<number | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const shown = reduce || inView;

  const steps = Math.max(2, Math.round(levels));
  const cols = Math.max(1, Math.round(weeks));

  const values = new Map<number, number>();
  let end = Number.NEGATIVE_INFINITY;
  for (const d of data) {
    const day = toDay(d.date);
    if (Number.isNaN(day)) continue;
    values.set(day, (values.get(day) ?? 0) + (Number(d.value) || 0));
    end = Math.max(end, day);
  }
  const hasData = Number.isFinite(end);
  const first = hasData ? end - weekday(end) - (cols - 1) * 7 : 0;
  const count = hasData ? end - first + 1 : 0;
  const cells = Array.from({ length: count }, (_, i) => {
    const day = first + i;
    return { day, iso: toIso(day), value: values.get(day) ?? 0 };
  });

  const max = Math.max(0, ...cells.map((c) => c.value));
  const level = (v: number) =>
    v <= 0 || max <= 0
      ? 0
      : Math.min(steps - 1, Math.max(1, Math.ceil((v / max) * (steps - 1))));
  const fill = (l: number) => {
    if (l === 0) return "var(--border-strong)";
    const pct = steps === 2 ? 100 : Math.round(30 + (70 * (l - 1)) / (steps - 2));
    return `color-mix(in oklab, ${color} ${pct}%, transparent)`;
  };

  const pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, (width - LEFT) / cols));
  const gap = Math.max(2, pitch * 0.18);
  const cell = pitch - gap;
  const svgW = LEFT + cols * pitch - gap;
  const svgH = TOP + 7 * pitch - gap;
  const cellX = (i: number) => LEFT + Math.floor(i / 7) * pitch;
  const cellY = (i: number) => TOP + (i % 7) * pitch;

  // Month label over the first column of each month; a first label crowded by
  // the next one is dropped.
  const months: { col: number; text: string }[] = [];
  for (let c = 0; c < cols; c++) {
    const m = new Date((first + c * 7) * DAY_MS).getUTCMonth();
    const prev = c === 0 ? -1 : new Date((first + (c - 1) * 7) * DAY_MS).getUTCMonth();
    if (m !== prev) months.push({ col: c, text: MONTH.format(new Date((first + c * 7) * DAY_MS)) });
  }
  if (months.length > 1 && months[1].col - months[0].col < 3) months.shift();

  // Narrow screens: start on the newest weeks, the end people read first.
  const overflows = svgW > width;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !overflows) return;
    el.scrollLeft = el.scrollWidth;
    setScrollLeft(el.scrollLeft);
  }, [overflows]);

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const col = Math.floor((e.clientX - box.left - LEFT) / pitch);
    const row = Math.floor((e.clientY - box.top - TOP) / pitch);
    const i = col * 7 + row;
    if (col < 0 || row < 0 || row > 6 || i >= count) setActive(null);
    else setActive(i);
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const deltas: Record<string, number> = {
      ArrowUp: -1,
      ArrowDown: 1,
      ArrowLeft: -7,
      ArrowRight: 7,
    };
    let next: number;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else if (e.key in deltas) {
      if (active === null) next = count - 1;
      else {
        const moved = active + deltas[e.key];
        next = moved < 0 || moved >= count ? active : moved;
      }
    } else return;
    e.preventDefault();
    setActive(next);
    // Keep the read cell inside the scroll window.
    const el = scrollRef.current;
    if (el && overflows) {
      const x = cellX(next);
      if (x < el.scrollLeft + LEFT) el.scrollLeft = x - LEFT;
      else if (x + pitch > el.scrollLeft + el.clientWidth) {
        el.scrollLeft = x + pitch - el.clientWidth;
      }
    }
  };

  const activeCell = active === null ? null : cells[active];

  return (
    <div ref={viewRef} className={cn("w-full", className)}>
      <div ref={measureRef} className="relative w-full">
        <div
          ref={scrollRef}
          onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
          className={cn("w-full", overflows && "overflow-x-auto pb-1 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]")}
        >
          {width > 0 && count > 0 && (
            // biome-ignore lint/a11y/useSemanticElements: a chart is not a form; group labels the plot
            <svg
              width={svgW}
              height={svgH}
              role="group"
              aria-label={`${title}. Use arrow keys to read each day: up and down by day, left and right by week.`}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable chart widget; arrow keys read values
              tabIndex={0}
              onKeyDown={onKeyDown}
              onPointerMove={onPointerMove}
              onPointerLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              className="block touch-pan-x touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {months.map((m) => (
                <text
                  key={m.col}
                  x={LEFT + m.col * pitch}
                  y={TOP - 7}
                  className="fill-muted-foreground text-xs"
                >
                  {m.text}
                </text>
              ))}
              {WEEKDAYS.map(([row, text]) => (
                <text
                  key={text}
                  x={0}
                  y={TOP + row * pitch + cell / 2}
                  dy="0.32em"
                  className="fill-muted-foreground text-[10px]"
                >
                  {text}
                </text>
              ))}

              <motion.g
                initial={reduce ? false : "hidden"}
                animate={shown ? "shown" : "hidden"}
              >
                {cells.map((c, i) => (
                  <motion.rect
                    key={c.day}
                    x={cellX(i)}
                    y={cellY(i)}
                    width={cell}
                    height={cell}
                    rx={Math.min(3, cell * 0.22)}
                    fill={fill(level(c.value))}
                    custom={Math.floor(i / 7)}
                    variants={{
                      hidden: { opacity: 0, scale: reduce ? 1 : 0.4 },
                      shown: (col: number) => ({
                        opacity: 1,
                        scale: 1,
                        transition: reduce
                          ? { duration: 0 }
                          : { ...GROW, duration: 0.45, delay: col * 0.012 },
                      }),
                    }}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                ))}
              </motion.g>

              {active !== null && (
                <motion.rect
                  initial={false}
                  animate={{ x: cellX(active) - 1, y: cellY(active) - 1 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 520, damping: 40 }
                  }
                  width={cell + 2}
                  height={cell + 2}
                  rx={Math.min(4, cell * 0.25)}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
              )}
            </svg>
          )}
        </div>
        <ChartTooltip
          open={activeCell !== null}
          x={active === null ? 0 : cellX(active) + cell / 2 - scrollLeft}
          y={active === null ? 0 : cellY(active) + cell / 2}
          width={width}
          label={
            activeCell
              ? `${formatValue(activeCell.value)} · ${formatDate(activeCell.iso)}`
              : ""
          }
          rows={[]}
        />
      </div>

      <div className="flex items-center justify-end gap-1 pt-3 text-xs text-muted-foreground">
        <span className="mr-1">Less</span>
        {Array.from({ length: steps }, (_, l) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: steps are a fixed ordered scale.
            key={l}
            aria-hidden
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ background: fill(l) }}
          />
        ))}
        <span className="ml-1">More</span>
      </div>

      <ChartTable
        caption={title}
        head={["Date", "Value"]}
        rows={cells.map((c) => [
          LONG.format(new Date(c.day * DAY_MS)),
          formatValue(c.value),
        ])}
      />
    </div>
  );
}
