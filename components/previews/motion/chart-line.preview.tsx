"use client";

import { LineChart } from "@/components/motion/chart/line-chart";

const DATA = [
  { day: "Mon", visitors: 3120 },
  { day: "Tue", visitors: 3480 },
  { day: "Wed", visitors: 3290 },
  { day: "Thu", visitors: 4010 },
  { day: "Fri", visitors: 4390 },
  { day: "Sat", visitors: 3760 },
  { day: "Sun", visitors: 4620 },
];

export function ChartLinePreview() {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-medium text-foreground">Visitors</p>
      <p className="mb-4 text-xs text-muted-foreground">Last 7 days</p>
      <LineChart
        title="Daily visitors over the last 7 days"
        data={DATA}
        index="day"
        series={[{ key: "visitors", label: "Visitors" }]}
        area
      />
    </div>
  );
}
