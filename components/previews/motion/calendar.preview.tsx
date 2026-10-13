"use client";

import { useState } from "react";
import { Calendar } from "@/components/motion/calendar";

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

export function CalendarPreview() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <div className="flex flex-col items-center gap-3">
      <Calendar
        value={date}
        onValueChange={setDate}
        isDateDisabled={isWeekend}
        weekStartsOn={1}
      />
      <span className="text-sm text-muted-foreground tabular-nums">
        {date ? date.toDateString() : "Weekdays only"}
      </span>
    </div>
  );
}
