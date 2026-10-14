"use client";

import { useState } from "react";
import type { DateRange } from "@/components/motion/calendar";
import {
  DateRangePicker,
  type DateRangePreset,
} from "@/components/motion/date-range-picker";

const DAY = 86_400_000;

function daysAgo(n: number) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - n);
}

const PRESETS: DateRangePreset[] = [
  { label: "Today", range: () => ({ from: daysAgo(0), to: daysAgo(0) }) },
  { label: "Last 7 days", range: () => ({ from: daysAgo(6), to: daysAgo(0) }) },
  { label: "Last 30 days", range: () => ({ from: daysAgo(29), to: daysAgo(0) }) },
  {
    label: "This month",
    range: () => {
      const t = daysAgo(0);
      return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: t };
    },
  },
  {
    label: "Last month",
    range: () => {
      const t = daysAgo(0);
      return {
        from: new Date(t.getFullYear(), t.getMonth() - 1, 1),
        to: new Date(t.getFullYear(), t.getMonth(), 0),
      };
    },
  },
];

export function DateRangePickerPreview() {
  const [range, setRange] = useState<DateRange | null>(null);
  const days = range?.to
    ? Math.round((range.to.getTime() - range.from.getTime()) / DAY) + 1
    : 0;

  return (
    <div className="flex min-h-[28rem] flex-col items-center gap-2 pt-8">
      <span className="text-sm text-muted-foreground">Report period</span>
      <DateRangePicker value={range} onValueChange={setRange} presets={PRESETS} />
      <span className="text-xs text-muted-foreground tabular-nums">
        {days ? `${days} day${days === 1 ? "" : "s"} selected` : "Pick a preset or two days"}
      </span>
    </div>
  );
}
