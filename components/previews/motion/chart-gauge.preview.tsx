"use client";

import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/motion/button";
import { GaugeChart } from "@/components/motion/chart/gauge-chart";

const SEGMENTS = [
  { to: 50, label: "Poor", color: "var(--chart-2, #eb6834)" },
  { to: 80, label: "Needs work", color: "var(--chart-4, #eda100)" },
  { to: 100, label: "Good", color: "var(--chart-3, #1baf7a)" },
];

const PRESETS = [32, 68, 94];

export function ChartGaugePreview() {
  const [value, setValue] = useState(68);

  return (
    <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-border bg-card text-card-foreground">
      <div className="grid gap-1 p-5 pb-0 text-center">
        <p className="font-semibold leading-none">Performance score</p>
        <p className="text-sm text-muted-foreground">Lighthouse, mobile</p>
      </div>
      <GaugeChart
        className="pt-5"
        title="Performance score"
        value={value}
        segments={SEGMENTS}
      />
      <div className="flex gap-2 pt-4">
        {PRESETS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === value ? "primary" : "outline"}
            aria-pressed={p === value}
            onClick={() => setValue(p)}
          >
            {p}
          </Button>
        ))}
      </div>
      <div className="grid gap-1.5 p-5 text-center text-sm">
        <p className="flex items-center justify-center gap-2 font-medium leading-none">
          Up 9 points since last deploy <TrendingUp className="size-4" />
        </p>
        <p className="leading-none text-muted-foreground">
          Pick a score to swing the needle
        </p>
      </div>
    </div>
  );
}
