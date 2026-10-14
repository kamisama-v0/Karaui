"use client";

import { CalendarClock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "@/components/motion/calendar";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/components/motion/popover-morph";
import {
  type HourCycle,
  TimePicker,
  type TimeValue,
} from "@/components/motion/time-picker";
import { cn } from "@/lib/utils";

const MEDIUM_DATE_SHORT_TIME: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

export interface DateTimePickerProps {
  /** Controlled committed date and time; null shows the placeholder. */
  value?: Date | null;
  defaultValue?: Date | null;
  /** Fires once, when Done is pressed. */
  onValueChange?: (date: Date) => void;
  placeholder?: string;
  /** Intl options for the trigger label. Default `{ dateStyle: "medium",
   * timeStyle: "short" }` → "Oct 14, 2026, 9:30 AM" in en-US. */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Default "en-US". */
  locale?: string;
  /** 12 adds an AM/PM wheel; 24 shows 00–23. Also sets the label's clock. Default 12. */
  hourCycle?: HourCycle;
  /** Minute wheel granularity. Default 5. */
  minuteStep?: number;
  /** Where the wheels start while the field is empty. Default 09:00. */
  initialTime?: TimeValue;
  /** Earliest moment. Days before it are disabled, and a committed value
   * earlier on that same day is clamped up to it. */
  minDate?: Date;
  /** Latest moment, clamped the same way. */
  maxDate?: Date;
  isDateDisabled?: (date: Date) => boolean;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  align?: "start" | "end";
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

type Draft = { date: Date | null; time: TimeValue };

const combine = (date: Date, time: TimeValue) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.hours,
    time.minutes,
  );

/**
 * One field for a date and a time. Its panel morphs open from the trigger with
 * the calendar on the left and time wheels on the right (stacked below `sm`).
 * Picking a day and turning the wheels edit a draft; Done commits it, Escape
 * or an outside click discards it. Controlled or uncontrolled.
 */
export function DateTimePicker({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  placeholder = "Pick a date and time",
  formatOptions = MEDIUM_DATE_SHORT_TIME,
  locale = "en-US",
  hourCycle = 12,
  minuteStep = 5,
  initialTime = { hours: 9, minutes: 0 },
  minDate,
  maxDate,
  isDateDisabled,
  weekStartsOn,
  align = "start",
  disabled,
  className,
  "aria-label": ariaLabel = "Choose date and time",
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<Date | null>(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internal;
  const [draft, setDraft] = useState<Draft>({ date: null, time: initialTime });

  const label = useMemo(
    () =>
      value
        ? new Intl.DateTimeFormat(locale, {
            ...formatOptions,
            hourCycle: hourCycle === 12 ? "h12" : "h23",
          }).format(value)
        : null,
    [value, locale, formatOptions, hourCycle],
  );

  const onOpenChange = (next: boolean) => {
    if (next)
      setDraft(
        value
          ? {
              date: value,
              time: { hours: value.getHours(), minutes: value.getMinutes() },
            }
          : { date: null, time: initialTime },
      );
    setOpen(next);
  };

  const done = () => {
    if (!draft.date) return;
    let next = combine(draft.date, draft.time);
    if (minDate && next < minDate) next = new Date(minDate);
    if (maxDate && next > maxDate) next = new Date(maxDate);
    if (controlledValue === undefined) setInternal(next);
    onValueChange?.(next);
    setOpen(false);
  };

  return (
    <MorphPopover open={open} onOpenChange={onOpenChange}>
      <MorphPopoverTrigger>
        <button
          type="button"
          disabled={disabled}
          aria-label={label ? `${ariaLabel}, ${label}` : ariaLabel}
          className={cn(
            "inline-flex h-10 min-w-56 items-center gap-2 rounded-xl border border-border bg-background px-3 text-left text-sm outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            label ? "text-foreground" : "text-muted-foreground",
            className,
          )}
        >
          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate tabular-nums">
            {label ?? placeholder}
          </span>
        </button>
      </MorphPopoverTrigger>

      <MorphPopoverContent align={align} className="p-0">
        <DateTimePanel
          draft={draft}
          setDraft={setDraft}
          onDone={done}
          locale={locale}
          hourCycle={hourCycle}
          minuteStep={minuteStep}
          minDate={minDate}
          maxDate={maxDate}
          isDateDisabled={isDateDisabled}
          weekStartsOn={weekStartsOn}
        />
      </MorphPopoverContent>
    </MorphPopover>
  );
}

type DateTimePanelProps = {
  draft: Draft;
  setDraft: (update: (prev: Draft) => Draft) => void;
  onDone: () => void;
  locale: string;
  hourCycle: HourCycle;
  minuteStep: number;
  minDate?: Date;
  maxDate?: Date;
  isDateDisabled?: (date: Date) => boolean;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

function DateTimePanel({
  draft,
  setDraft,
  onDone,
  locale,
  hourCycle,
  minuteStep,
  minDate,
  maxDate,
  isDateDisabled,
  weekStartsOn,
}: DateTimePanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Land keyboard focus on the calendar's roving day once the morph panel has
  // measured itself (it is `visibility: hidden` for the first frame or two).
  useEffect(() => {
    let frame = 0;
    let tries = 0;
    const attempt = () => {
      const el = ref.current?.querySelector<HTMLElement>(
        'button[data-date][tabindex="0"]',
      );
      if (el) el.focus({ preventScroll: true });
      if ((!el || document.activeElement !== el) && tries++ < 10)
        frame = requestAnimationFrame(attempt);
    };
    frame = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(frame);
  }, []);

  const summary = draft.date
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        hourCycle: hourCycle === 12 ? "h12" : "h23",
      }).format(combine(draft.date, draft.time))
    : "Pick a day";

  return (
    <div ref={ref} className="flex flex-col">
      <div className="flex flex-col sm:flex-row">
        <Calendar
          value={draft.date}
          onValueChange={(date) => setDraft((prev) => ({ ...prev, date }))}
          locale={locale}
          minDate={minDate}
          maxDate={maxDate}
          isDateDisabled={isDateDisabled}
          weekStartsOn={weekStartsOn}
          className="border-0 bg-transparent"
        />
        <div className="flex flex-col items-center justify-center gap-2 border-border border-t p-3 sm:border-t-0 sm:border-l">
          <span className="text-xs font-medium text-muted-foreground">
            Time
          </span>
          <TimePicker
            value={draft.time}
            onValueChange={(time) => setDraft((prev) => ({ ...prev, time }))}
            hourCycle={hourCycle}
            minuteStep={minuteStep}
            className="bg-muted/40"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-border border-t px-3 py-2">
        <span
          className={cn(
            "truncate text-sm tabular-nums",
            draft.date ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {summary}
        </span>
        <button
          type="button"
          onClick={onDone}
          disabled={!draft.date}
          className="inline-flex h-8 shrink-0 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        >
          Done
        </button>
      </div>
    </div>
  );
}
