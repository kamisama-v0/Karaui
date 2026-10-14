"use client";

import { Activity, DollarSign, TrendingDown, Users } from "lucide-react";
import { useState } from "react";
import { StatCard, StatGrid } from "@/components/motion/stat-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";

type Range = "7d" | "30d" | "90d";

const RANGES: { value: Range; caption: string; points: number }[] = [
  { value: "7d", caption: "vs previous 7 days", points: 7 },
  { value: "30d", caption: "vs previous 30 days", points: 12 },
  { value: "90d", caption: "vs previous 90 days", points: 16 },
];

// Deterministic wiggle (no Math.random) so server and client render the same.
function series(points: number, base: number, trend: number, wobble: number, seed: number) {
  return Array.from({ length: points }, (_, i) => {
    const t = i / Math.max(1, points - 1);
    const wiggle = Math.sin(i * 1.7 + seed) * 0.6 + Math.sin(i * 0.9 + seed * 2) * 0.4;
    return Math.round((base * (1 + trend * t) + wiggle * wobble) * 1000) / 1000;
  });
}

const DATA: Record<
  Range,
  {
    revenue: { value: number; delta: number };
    users: { value: number; delta: number };
    conversion: { value: number; delta: number };
    churn: { value: number; delta: number };
  }
> = {
  "7d": {
    revenue: { value: 48_250, delta: 0.084 },
    users: { value: 12_480, delta: 0.032 },
    conversion: { value: 0.0342, delta: 0.051 },
    churn: { value: 0.012, delta: -0.08 },
  },
  "30d": {
    revenue: { value: 196_430, delta: 0.124 },
    users: { value: 38_920, delta: 0.117 },
    conversion: { value: 0.0318, delta: -0.023 },
    churn: { value: 0.021, delta: 0.046 },
  },
  "90d": {
    revenue: { value: 571_900, delta: 0.216 },
    users: { value: 104_300, delta: 0.284 },
    conversion: { value: 0.0296, delta: 0.068 },
    churn: { value: 0.018, delta: -0.135 },
  },
};

const SEEDS = { "7d": 1, "30d": 2.4, "90d": 3.7 } as const;

export function StatCardPreview() {
  const [range, setRange] = useState<Range>("30d");
  const meta = RANGES.find((r) => r.value === range) ?? RANGES[1];
  const d = DATA[range];
  const s = SEEDS[range];
  const n = meta.points;

  return (
    <div className="flex w-full max-w-[38rem] flex-col items-stretch gap-3 p-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Overview</p>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)} variant="segment">
          <TabsList className="border border-border">
            {RANGES.map((r) => (
              <TabsTrigger key={r.value} value={r.value} className="px-3 py-1 text-xs">
                {r.value}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <StatGrid>
        <StatCard
          label="Revenue"
          icon={<DollarSign />}
          format="currency"
          value={d.revenue.value}
          delta={d.revenue.delta}
          caption={meta.caption}
          sparkline={series(n, 100, d.revenue.delta * 2, 6, s)}
        />
        <StatCard
          label="Active users"
          icon={<Users />}
          format="compact"
          value={d.users.value}
          delta={d.users.delta}
          caption={meta.caption}
          sparkline={series(n, 100, d.users.delta * 2, 5, s + 1)}
        />
        <StatCard
          label="Conversion"
          icon={<Activity />}
          format="percent"
          formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          value={d.conversion.value}
          delta={d.conversion.delta}
          caption={meta.caption}
          sparkline={series(n, 100, d.conversion.delta * 2, 4, s + 2)}
        />
        <StatCard
          label="Churn"
          icon={<TrendingDown />}
          format="percent"
          value={d.churn.value}
          delta={d.churn.delta}
          goodDirection="down"
          caption={meta.caption}
          sparkline={series(n, 100, d.churn.delta * 2, 4, s + 3)}
        />
      </StatGrid>
    </div>
  );
}
