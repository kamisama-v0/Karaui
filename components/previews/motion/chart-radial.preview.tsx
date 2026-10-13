"use client";

import { TrendingUp } from "lucide-react";
import { RadialChart } from "@/components/motion/chart/radial-chart";

const DATA = [
  { label: "Move", value: 82 },
  { label: "Exercise", value: 64 },
  { label: "Stand", value: 91 },
];

export function ChartRadialPreview() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-border bg-card text-card-foreground">
      <div className="grid gap-1 p-5 pb-0 text-center">
        <p className="font-semibold leading-none">Daily goals</p>
        <p className="text-sm text-muted-foreground">Today</p>
      </div>
      <RadialChart
        className="pt-5"
        title="Progress toward the activity goals for today"
        data={DATA}
        centerValue="79%"
        centerLabel="Average"
        formatValue={(v) => `${v}%`}
      />
      <div className="grid gap-1.5 p-5 text-center text-sm">
        <p className="flex items-center justify-center gap-2 font-medium leading-none">
          Up 12% on yesterday <TrendingUp className="size-4" />
        </p>
        <p className="leading-none text-muted-foreground">
          Hover a ring to see its goal
        </p>
      </div>
    </div>
  );
}
