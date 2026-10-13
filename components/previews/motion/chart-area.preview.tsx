"use client";

import { useState } from "react";
import { AreaChart } from "@/components/motion/chart/area-chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";

// 90 days of deterministic traffic (no Math.random, so SSR and client agree):
// a weekly rhythm on a slow upward drift.
const START = Date.UTC(2026, 6, 17);
const DATA = Array.from({ length: 90 }, (_, i) => {
  const weekly = Math.sin((i / 7) * Math.PI * 2);
  const drift = i * 1.6;
  return {
    date: new Date(START + i * 86_400_000).toISOString().slice(0, 10),
    desktop: Math.round(210 + drift + weekly * 46 + Math.sin(i * 1.7) * 22),
    mobile: Math.round(150 + drift * 0.8 + weekly * 30 + Math.cos(i * 1.3) * 18),
  };
});

const RANGES = [
  { value: "90", label: "3 months" },
  { value: "30", label: "30 days" },
  { value: "7", label: "7 days" },
];

const day = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const formatDate = (iso: string) => day.format(new Date(`${iso}T00:00:00Z`));

export function ChartAreaPreview() {
  const [range, setRange] = useState("90");
  const data = DATA.slice(-Number(range));

  return (
    <div className="w-full max-w-2xl rounded-xl border border-border bg-card text-card-foreground">
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center">
        <div className="grid flex-1 gap-1">
          <p className="font-semibold leading-none">Visitors</p>
          <p className="text-sm text-muted-foreground">
            Total visitors for the last{" "}
            {RANGES.find((r) => r.value === range)?.label}
          </p>
        </div>
        <Tabs value={range} onValueChange={setRange} variant="segment">
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.value} value={r.value}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="px-3 pt-5 pb-4 sm:px-5">
        <AreaChart
          title="Daily visitors by device"
          data={data}
          index="date"
          series={[
            { key: "mobile", label: "Mobile" },
            { key: "desktop", label: "Desktop" },
          ]}
          stacked
          formatIndex={formatDate}
        />
      </div>
    </div>
  );
}
