"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { DateTimePicker } from "@/components/motion/date-time-picker";

export function DateTimePickerPreview() {
  const [when, setWhen] = useState<Date | null>(null);

  return (
    // Field sits at the top so the panel opening below it stays in the frame.
    <div className="flex min-h-[28rem] flex-col items-center pt-4">
      <div className="flex w-full max-w-[26rem] flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 *:min-w-0 *:flex-1">
            <DateTimePicker
              value={when}
              onValueChange={setWhen}
              placeholder="Schedule for…"
              aria-label="Schedule post"
              className="w-full min-w-0"
            />
          </div>
          <button
            type="button"
            disabled={!when}
            aria-label="Confirm schedule"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 border-border border-t pt-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-8 rounded-full bg-[linear-gradient(135deg,var(--chart-1),var(--chart-3))]"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium">karaUI</span>
              <span className="text-xs text-muted-foreground">
                {when ? "Scheduled" : "Draft"}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Date and time pickers just landed: wheels, calendars and month
            grids, all springy and keyboard friendly.
          </p>
          <div className="h-28 rounded-xl bg-[linear-gradient(135deg,color-mix(in_oklab,var(--chart-2)_35%,transparent),color-mix(in_oklab,var(--chart-4)_35%,transparent))]" />
        </div>
      </div>
    </div>
  );
}
