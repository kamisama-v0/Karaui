"use client";

import { AlarmClock } from "lucide-react";
import { useState } from "react";
import {
  formatTime,
  TimeField,
  TimePicker,
  type TimeValue,
} from "@/components/motion/time-picker";
import { cn } from "@/lib/utils";

const DAYS = [
  { key: "mon", short: "M", long: "Monday" },
  { key: "tue", short: "T", long: "Tuesday" },
  { key: "wed", short: "W", long: "Wednesday" },
  { key: "thu", short: "T", long: "Thursday" },
  { key: "fri", short: "F", long: "Friday" },
  { key: "sat", short: "S", long: "Saturday" },
  { key: "sun", short: "S", long: "Sunday" },
];

export function TimePickerPreview() {
  const [alarm, setAlarm] = useState<TimeValue>({ hours: 6, minutes: 45 });
  const [reminder, setReminder] = useState<TimeValue | null>({
    hours: 21,
    minutes: 30,
  });
  const [repeat, setRepeat] = useState<string[]>([
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
  ]);

  return (
    <div className="flex min-h-[26rem] flex-col items-center justify-center gap-6 py-6 sm:flex-row sm:items-start">
      <div className="flex w-72 flex-col items-center gap-3 rounded-3xl border border-border bg-card p-4">
        <div className="flex w-full items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <AlarmClock className="h-4 w-4" />
            Wake up
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {formatTime(alarm)}
          </span>
        </div>
        <TimePicker
          value={alarm}
          onValueChange={setAlarm}
          className="bg-background"
          aria-label="Alarm"
        />
        <fieldset className="flex gap-1.5">
          <legend className="sr-only">Repeat on</legend>
          {DAYS.map((d) => {
            const on = repeat.includes(d.key);
            return (
              <button
                key={d.key}
                type="button"
                aria-label={d.long}
                aria-pressed={on}
                onClick={() =>
                  setRepeat((r) =>
                    on ? r.filter((k) => k !== d.key) : [...r, d.key],
                  )
                }
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  on
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {d.short}
              </button>
            );
          })}
        </fieldset>
      </div>
      <div className="flex flex-col items-center gap-2 sm:items-start sm:pt-4">
        <span className="text-sm text-muted-foreground">Bedtime reminder</span>
        <TimeField
          value={reminder}
          onValueChange={setReminder}
          hourCycle={24}
          minuteStep={15}
          aria-label="Bedtime reminder"
        />
      </div>
    </div>
  );
}
