"use client";

import { TrendingUp } from "lucide-react";
import { FunnelChart } from "@/components/motion/chart/funnel-chart";

const DATA = [
  { label: "Visits", value: 12_480 },
  { label: "Sign-ups", value: 4_210 },
  { label: "Activated", value: 2_380 },
  { label: "Trial", value: 1_120 },
  { label: "Paid", value: 486 },
];

export function ChartFunnelPreview() {
  return (
    <div className="w-full max-w-2xl rounded-xl border border-border bg-card text-card-foreground">
      <div className="grid gap-1 border-b border-border p-5">
        <p className="font-semibold leading-none">Signup funnel</p>
        <p className="text-sm text-muted-foreground">September 2026</p>
      </div>
      <div className="px-3 pt-5 pb-4 sm:px-5">
        <FunnelChart title="Signup funnel, September 2026" data={DATA} />
      </div>
      <div className="grid gap-1.5 border-t border-border p-5 text-sm">
        <p className="flex items-center gap-2 font-medium leading-none">
          Paid conversion up 0.6 points this month <TrendingUp className="size-4" />
        </p>
        <p className="leading-none text-muted-foreground">
          Hover a stage to compare it with the one before
        </p>
      </div>
    </div>
  );
}
