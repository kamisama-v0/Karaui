"use client";

import { Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/components/motion/popover-morph";
import { WheelPicker } from "@/components/motion/wheel-picker";
import { cn } from "@/lib/utils";

/**
 * A wall-clock time, always 24-hour internally: `hours` 0–23, `minutes` 0–59.
 * The 12/24-hour choice is display only, so a value never changes meaning when
 * `hourCycle` does. Use `parseTime` / `toTimeString` for "HH:mm" strings.
 */
export type TimeValue = { hours: number; minutes: number };

export type HourCycle = 12 | 24;

const pad = (n: number) => String(n).padStart(2, "0");

/** "09:30" → { hours: 9, minutes: 30 }. Returns null for anything malformed. */
export function parseTime(input: string): TimeValue | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/** { hours: 9, minutes: 30 } → "09:30" (24-hour, zero padded). */
export function toTimeString(time: TimeValue) {
  return `${pad(time.hours)}:${pad(time.minutes)}`;
}

/** Locale label for a time, e.g. "9:30 AM" (en-US, 12h) or "09:30" (24h). */
export function formatTime(
  time: TimeValue,
  { locale = "en-US", hourCycle = 12 }: { locale?: string; hourCycle?: HourCycle } = {},
) {
  // A fixed calendar day: only the clock fields are read, and a constant date
  // keeps the output identical on server and client.
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: hourCycle === 12 ? "h12" : "h23",
  }).format(new Date(2000, 0, 1, time.hours, time.minutes));
}

/** Snaps minutes onto the step grid the minute wheel offers. */
function snapMinutes(minutes: number, step: number) {
  const last = Math.floor(59 / step) * step;
  return Math.min(Math.round(minutes / step) * step, last);
}

export interface TimePickerProps {
  /** Controlled time (24-hour). */
  value?: TimeValue;
  /** Uncontrolled initial time. Default 09:00. */
  defaultValue?: TimeValue;
  /** Fires as each wheel settles on a row. Always 24-hour. */
  onValueChange?: (time: TimeValue) => void;
  /** 12 shows hour 12–11 plus an AM/PM wheel; 24 shows 00–23. Default 12. */
  hourCycle?: HourCycle;
  /** Minute wheel granularity. A value off the grid displays snapped to the
   * nearest step and the first wheel turn commits the snapped minute. Default 5. */
  minuteStep?: number;
  /** Rows visible per wheel, odd. Default 5. */
  visibleCount?: number;
  /** Row height in px. Default 36. */
  itemHeight?: number;
  /** Tick sound per row crossed (WheelPicker's `sound`). Default false. */
  sound?: boolean;
  disabled?: boolean;
  className?: string;
  /** Prefix for each wheel's accessible name. Default "Time". */
  "aria-label"?: string;
}

const DEFAULT_TIME: TimeValue = { hours: 9, minutes: 0 };

/**
 * iOS-style time wheels: hour, minute and (for 12-hour) an AM/PM drum, each a
 * `WheelPicker`, so drag/flick, mouse wheel and keyboard (↑/↓, Home/End on a
 * focused wheel) all come from the shared drum. Controlled or uncontrolled;
 * the value is always 24-hour `{ hours, minutes }`.
 */
export function TimePicker({
  value: controlledValue,
  defaultValue = DEFAULT_TIME,
  onValueChange,
  hourCycle = 12,
  minuteStep = 5,
  visibleCount = 5,
  itemHeight = 36,
  sound = false,
  disabled = false,
  className,
  "aria-label": ariaLabel = "Time",
}: TimePickerProps) {
  const [internal, setInternal] = useState<TimeValue>(defaultValue);
  const controlled = controlledValue !== undefined;
  const value = controlled ? controlledValue : internal;
  const step = Math.max(1, Math.min(30, Math.floor(minuteStep)));

  // Each wheel reports on its own, sometimes several times in one frame while
  // dragging; composing from the latest committed time (not the render
  // closure) keeps a quick hour turn from being undone by the minute wheel.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const commit = (patch: Partial<TimeValue>) => {
    const next = { ...latest.current, ...patch };
    if (
      next.hours === latest.current.hours &&
      next.minutes === latest.current.minutes
    )
      return;
    latest.current = next;
    if (!controlled) setInternal(next);
    onValueChange?.(next);
  };

  const hourOptions = useMemo(
    () =>
      hourCycle === 12
        ? // 12 sits first: 12 AM is hour 0, so the wheel reads 12, 1 … 11.
          Array.from({ length: 12 }, (_, i) => ({
            value: String(i),
            label: String(i === 0 ? 12 : i),
          }))
        : Array.from({ length: 24 }, (_, i) => ({
            value: String(i),
            label: pad(i),
          })),
    [hourCycle],
  );
  const minuteOptions = useMemo(
    () =>
      Array.from({ length: Math.floor(59 / step) + 1 }, (_, i) => ({
        value: String(i * step),
        label: pad(i * step),
      })),
    [step],
  );

  const pm = value.hours >= 12;
  const hourValue = String(hourCycle === 12 ? value.hours % 12 : value.hours);
  const minuteValue = String(snapMinutes(value.minutes, step));
  const hourLabel =
    hourOptions.find((o) => o.value === hourValue)?.label ?? hourValue;

  const wheel = "border-0 bg-transparent";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-2xl border border-border bg-card p-1.5 text-base tabular-nums",
        disabled && "opacity-50",
        className,
      )}
    >
      <WheelPicker
        options={hourOptions}
        value={hourValue}
        onValueChange={(v) => {
          const h = Number(v);
          commit({
            hours:
              hourCycle === 12 ? h + (latest.current.hours >= 12 ? 12 : 0) : h,
          });
        }}
        visibleCount={visibleCount}
        itemHeight={itemHeight}
        sound={sound}
        disabled={disabled}
        className={cn(wheel, "w-16")}
        aria-label={`${ariaLabel}, hour ${hourLabel}`}
      />
      <span aria-hidden className="-mx-1 font-medium text-muted-foreground">
        :
      </span>
      <WheelPicker
        options={minuteOptions}
        value={minuteValue}
        onValueChange={(v) => commit({ minutes: Number(v) })}
        visibleCount={visibleCount}
        itemHeight={itemHeight}
        sound={sound}
        disabled={disabled}
        className={cn(wheel, "w-16")}
        aria-label={`${ariaLabel}, minute ${pad(Number(minuteValue))}`}
      />
      {hourCycle === 12 && (
        <WheelPicker
          options={PERIODS}
          value={pm ? "PM" : "AM"}
          onValueChange={(v) => {
            const h = latest.current.hours % 12;
            commit({ hours: v === "PM" ? h + 12 : h });
          }}
          visibleCount={visibleCount}
          itemHeight={itemHeight}
          sound={sound}
          disabled={disabled}
          className={cn(wheel, "w-16 text-sm")}
          aria-label={`${ariaLabel}, ${pm ? "PM" : "AM"}`}
        />
      )}
    </div>
  );
}

const PERIODS = ["AM", "PM"];

/**
 * Moves focus to the first focusable node inside `container` once the morph
 * popover has measured itself — it stays `visibility: hidden` for a frame or
 * two, and focusing a hidden element silently fails.
 */
function useFocusFirst(
  container: React.RefObject<HTMLElement | null>,
  selector: string,
) {
  useEffect(() => {
    let frame = 0;
    let tries = 0;
    const attempt = () => {
      const el = container.current?.querySelector<HTMLElement>(selector);
      if (el) el.focus({ preventScroll: true });
      if ((!el || document.activeElement !== el) && tries++ < 10)
        frame = requestAnimationFrame(attempt);
    };
    frame = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(frame);
  }, [container, selector]);
}

export interface TimeFieldProps
  extends Omit<TimePickerProps, "value" | "defaultValue" | "onValueChange" | "className"> {
  /** Controlled committed time; null shows the placeholder. */
  value?: TimeValue | null;
  defaultValue?: TimeValue | null;
  /** Fires once, when Done is pressed. Always 24-hour. */
  onValueChange?: (time: TimeValue) => void;
  /** Where the wheels start while the field is empty. Default 09:00. */
  initialTime?: TimeValue;
  placeholder?: string;
  /** Default "en-US". */
  locale?: string;
  align?: "start" | "end";
  className?: string;
}

/**
 * Time field whose wheels morph open from the trigger corner. Turning the
 * wheels edits a draft; Done commits it, Escape or an outside click discards
 * it. Controlled or uncontrolled.
 */
export function TimeField({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  initialTime = DEFAULT_TIME,
  placeholder = "Pick a time",
  locale = "en-US",
  hourCycle = 12,
  align = "start",
  disabled,
  className,
  "aria-label": ariaLabel = "Choose time",
  ...pickerProps
}: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<TimeValue | null>(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internal;
  const [draft, setDraft] = useState<TimeValue>(value ?? initialTime);

  const label = value ? formatTime(value, { locale, hourCycle }) : null;

  const onOpenChange = (next: boolean) => {
    if (next) setDraft(value ?? initialTime);
    setOpen(next);
  };

  const done = () => {
    if (controlledValue === undefined) setInternal(draft);
    onValueChange?.(draft);
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
            "inline-flex h-10 min-w-40 items-center gap-2 rounded-xl border border-border bg-background px-3 text-left text-sm outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            label ? "text-foreground" : "text-muted-foreground",
            className,
          )}
        >
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate tabular-nums">
            {label ?? placeholder}
          </span>
        </button>
      </MorphPopoverTrigger>

      <MorphPopoverContent align={align} className="p-0">
        <TimeFieldPanel
          draft={draft}
          setDraft={setDraft}
          onDone={done}
          hourCycle={hourCycle}
          locale={locale}
          {...pickerProps}
        />
      </MorphPopoverContent>
    </MorphPopover>
  );
}

type TimeFieldPanelProps = Omit<
  TimePickerProps,
  "value" | "defaultValue" | "onValueChange" | "className" | "aria-label"
> & {
  draft: TimeValue;
  setDraft: (time: TimeValue) => void;
  onDone: () => void;
  locale: string;
};

function TimeFieldPanel({
  draft,
  setDraft,
  onDone,
  hourCycle,
  locale,
  ...pickerProps
}: TimeFieldPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusFirst(ref, '[role="listbox"]');

  return (
    <div ref={ref} className="flex flex-col gap-2 p-2">
      <TimePicker
        {...pickerProps}
        value={draft}
        onValueChange={setDraft}
        hourCycle={hourCycle}
        className="border-0 bg-transparent p-0"
      />
      <div className="flex items-center justify-between gap-3 border-border border-t px-1 pt-2">
        <span className="text-sm font-medium tabular-nums">
          {formatTime(draft, { locale, hourCycle })}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          Done
        </button>
      </div>
    </div>
  );
}
