"use client";

import { Sparkline } from "@/components/motion/chart/sparkline";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const TILES = [
  {
    label: "Revenue",
    value: usd.format(48210),
    delta: "+12.4%",
    data: [31, 34, 33, 37, 36, 41, 40, 44, 43, 48],
    format: (n: number) => usd.format(n * 1000),
  },
  {
    label: "Active users",
    value: "8,940",
    delta: "+4.1%",
    data: [80, 82, 81, 84, 83, 86, 85, 87, 88, 89],
    format: (n: number) => (n * 100).toLocaleString("en-US"),
  },
];

export function SparklinePreview() {
  return (
    <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
      {TILES.map((t) => (
        <div
          key={t.label}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <p className="text-xs text-muted-foreground">{t.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {t.value}
            </span>
            <span className="text-xs text-muted-foreground">
              {t.delta} vs last week
            </span>
          </div>
          <Sparkline
            className="mt-3"
            data={t.data}
            label={`${t.label}, last 10 weeks`}
            formatValue={t.format}
          />
        </div>
      ))}
    </div>
  );
}
