"use client";

import { useState } from "react";
import { Calendar, type WeekRange } from "@/components/motion/calendar";

const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** ISO 8601 week number, matching the calendar's "Wk" column. */
function isoWeek(d: Date) {
  const thursday = addDays(d, 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(thursday.getFullYear(), 0, 4);
  const first = addDays(jan4, 3 - ((jan4.getDay() + 6) % 7));
  return 1 + Math.round((thursday.getTime() - first.getTime()) / 604_800_000);
}

/** Demo hours derived from the date, so every render agrees. */
const hoursOn = (d: Date) => 6 + ((d.getDate() * 7 + d.getMonth() * 3) % 7) * 0.5;

const range = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "narrow" });

export function CalendarWeekPreview() {
  const [week, setWeek] = useState<WeekRange | null>(null);
  const workdays = week
    ? Array.from({ length: 5 }, (_, i) => addDays(week.from, i))
    : [];
  const total = workdays.reduce((sum, d) => sum + hoursOn(d), 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <Calendar
        mode="week"
        value={week}
        onValueChange={setWeek}
        weekStartsOn={1}
        showWeekNumber
        aria-label="Timesheet week"
      />
      {week ? (
        <div className="flex items-center gap-3 text-sm tabular-nums">
          <span className="font-medium">
            Wk {isoWeek(week.from)} · {range.format(week.from)} –{" "}
            {range.format(week.to)}
          </span>
          <span className="flex items-end gap-1" aria-hidden>
            {workdays.map((d) => (
              <span key={d.getDate()} className="flex flex-col items-center gap-0.5">
                <span
                  className="w-2 rounded-sm bg-primary/70"
                  style={{ height: `${hoursOn(d) * 2}px` }}
                />
                <span className="text-[9px] leading-none text-muted-foreground">
                  {weekday.format(d)}
                </span>
              </span>
            ))}
          </span>
          <span className="text-muted-foreground">{total}h logged</span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">
          Pick a week to open its timesheet
        </span>
      )}
    </div>
  );
}
