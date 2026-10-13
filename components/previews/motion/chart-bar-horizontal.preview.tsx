"use client";

import { TrendingUp } from "lucide-react";
import { BarChart } from "@/components/motion/chart/bar-chart";

const DATA = [
  { browser: "Chrome", visitors: 275 },
  { browser: "Safari", visitors: 200 },
  { browser: "Firefox", visitors: 187 },
  { browser: "Edge", visitors: 173 },
  { browser: "Other", visitors: 90 },
];

export function ChartBarHorizontalPreview() {
  return (
    <div className="w-full max-w-xl rounded-xl border border-border bg-card text-card-foreground">
      <div className="grid gap-1 p-5 pb-2">
        <p className="font-semibold leading-none">Top browsers</p>
        <p className="text-sm text-muted-foreground">Last 30 days</p>
      </div>
      <div className="px-5 pt-4">
        <BarChart
          title="Visitors by browser over the last 30 days"
          data={DATA}
          index="browser"
          series={[{ key: "visitors", label: "Visitors" }]}
          layout="horizontal"
          showValues
          indicator="line"
        />
      </div>
      <div className="grid gap-1.5 p-5 pt-4 text-sm">
        <p className="flex items-center gap-2 font-medium leading-none">
          Chrome leads Safari by 37.5% <TrendingUp className="size-4" />
        </p>
        <p className="leading-none text-muted-foreground">
          925 visitors across 5 browsers
        </p>
      </div>
    </div>
  );
}
