"use client";

import { useState } from "react";
import { Calendar, type DateRange } from "@/components/motion/calendar";

const nights = (r: DateRange) =>
  r.to ? Math.round((r.to.getTime() - r.from.getTime()) / 86_400_000) : 0;

export function CalendarRangePreview() {
  const [range, setRange] = useState<DateRange | null>(null);
  const [today] = useState(() => new Date());

  return (
    <div className="flex flex-col items-center gap-3">
      <Calendar
        mode="range"
        value={range}
        onValueChange={setRange}
        minDate={today}
      />
      <span className="text-sm text-muted-foreground tabular-nums">
        {range?.to
          ? `${nights(range)} night${nights(range) === 1 ? "" : "s"}`
          : range
            ? "Pick a check-out day"
            : "Pick a check-in day"}
      </span>
    </div>
  );
}
