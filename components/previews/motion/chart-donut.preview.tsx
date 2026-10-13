"use client";

import { TrendingUp } from "lucide-react";
import { DonutChart } from "@/components/motion/chart/donut-chart";

const DATA = [
  { label: "Chrome", value: 275 },
  { label: "Safari", value: 200 },
  { label: "Firefox", value: 187 },
  { label: "Edge", value: 173 },
  { label: "Other", value: 90 },
];

export function ChartDonutPreview() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-border bg-card text-card-foreground">
      <div className="grid gap-1 p-5 pb-0 text-center">
        <p className="font-semibold leading-none">Browser share</p>
        <p className="text-sm text-muted-foreground">January – June 2026</p>
      </div>
      <DonutChart
        className="pt-5"
        title="Visitors by browser, January to June 2026"
        data={DATA}
        totalLabel="Visitors"
      />
      <div className="grid gap-1.5 p-5 text-center text-sm">
        <p className="flex items-center justify-center gap-2 font-medium leading-none">
          Trending up by 5.2% this month <TrendingUp className="size-4" />
        </p>
        <p className="leading-none text-muted-foreground">
          Hover a slice to see its share
        </p>
      </div>
    </div>
  );
}
