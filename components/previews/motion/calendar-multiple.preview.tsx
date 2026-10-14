"use client";

import { useState } from "react";
import { Calendar } from "@/components/motion/calendar";

const MAX_SHIFTS = 8;
const SHIFT_HOURS = 8;

export function CalendarMultiplePreview() {
  const [days, setDays] = useState<Date[]>([]);

  return (
    <div className="flex flex-col items-center gap-3">
      <Calendar
        mode="multiple"
        value={days}
        onValueChange={setDays}
        max={MAX_SHIFTS}
        weekStartsOn={1}
        aria-label="Shift days"
      />
      <span className="text-sm text-muted-foreground tabular-nums">
        {days.length
          ? `${days.length} of ${MAX_SHIFTS} shifts · ${days.length * SHIFT_HOURS}h`
          : `Pick up to ${MAX_SHIFTS} shift days`}
      </span>
    </div>
  );
}
