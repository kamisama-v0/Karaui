"use client";

import { TrendingUp } from "lucide-react";
import { LineChart } from "@/components/motion/chart/line-chart";

const DATA = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 173, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 264, mobile: 140 },
];

export function ChartLinePreview() {
  return (
    <div className="w-full max-w-xl rounded-xl border border-border bg-card text-card-foreground">
      <div className="grid gap-1 p-5 pb-2">
        <p className="font-semibold leading-none">Sessions</p>
        <p className="text-sm text-muted-foreground">January – June 2026</p>
      </div>
      <div className="px-5 pt-4">
        <LineChart
          title="Monthly sessions by device, January to June 2026"
          data={DATA}
          index="month"
          series={[
            { key: "desktop", label: "Desktop" },
            { key: "mobile", label: "Mobile" },
          ]}
          dots
          formatIndex={(m) => m.slice(0, 3)}
        />
      </div>
      <div className="grid gap-1.5 p-5 pt-3 text-sm">
        <p className="flex items-center gap-2 font-medium leading-none">
          Trending up by 8.4% this month <TrendingUp className="size-4" />
        </p>
        <p className="leading-none text-muted-foreground">
          Showing sessions for the last 6 months
        </p>
      </div>
    </div>
  );
}
