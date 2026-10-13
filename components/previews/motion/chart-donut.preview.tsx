"use client";

import { DonutChart } from "@/components/motion/chart/donut-chart";

const DATA = [
  { label: "Organic", value: 4820 },
  { label: "Direct", value: 2930 },
  { label: "Referral", value: 1640 },
  { label: "Social", value: 980 },
];

export function ChartDonutPreview() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-card p-5">
      <p className="self-start text-sm font-medium text-foreground">
        Traffic sources
      </p>
      <p className="mb-4 self-start text-xs text-muted-foreground">This month</p>
      <DonutChart
        title="Traffic sources this month"
        data={DATA}
        totalLabel="Sessions"
      />
    </div>
  );
}
