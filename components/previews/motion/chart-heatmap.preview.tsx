"use client";

import { TrendingUp } from "lucide-react";
import { HeatmapChart } from "@/components/motion/chart/heatmap-chart";

// A year of deterministic activity (seeded PRNG, fixed end date) so the server
// and client render the same calendar.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const END = Date.UTC(2026, 9, 10);
const DAYS = 371;
const rand = mulberry32(20261010);
const DATA = Array.from({ length: DAYS }, (_, i) => {
  const time = END - (DAYS - 1 - i) * 86_400_000;
  const dow = new Date(time).getUTCDay();
  const weekend = dow === 0 || dow === 6;
  // Busier toward the present, quieter on weekends, with idle days.
  const base = (weekend ? 1.5 : 5) * (0.6 + (i / DAYS) * 0.8);
  const r = rand();
  const value = r < (weekend ? 0.55 : 0.18) ? 0 : Math.round(base * (0.3 + rand() * 1.9));
  return { date: new Date(time).toISOString().slice(0, 10), value };
});
const TOTAL = DATA.reduce((sum, d) => sum + d.value, 0);

export function ChartHeatmapPreview() {
  return (
    <div className="w-full max-w-3xl rounded-xl border border-border bg-card text-card-foreground">
      <div className="grid gap-1 border-b border-border p-5">
        <p className="font-semibold leading-none">Contributions</p>
        <p className="text-sm text-muted-foreground">
          {TOTAL.toLocaleString("en-US")} contributions in the last year
        </p>
      </div>
      <div className="px-3 pt-5 pb-4 sm:px-5">
        <HeatmapChart title="Daily contributions over the last year" data={DATA} />
      </div>
      <div className="grid gap-1.5 border-t border-border p-5 text-sm">
        <p className="flex items-center gap-2 font-medium leading-none">
          Trending up by 18% this quarter <TrendingUp className="size-4" />
        </p>
        <p className="leading-none text-muted-foreground">
          Hover a day, or focus the grid and use the arrow keys
        </p>
      </div>
    </div>
  );
}
