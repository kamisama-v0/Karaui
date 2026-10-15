"use client";

import { CalendarRange } from "lucide-react";
import { useMemo, useState } from "react";
import { Calendar, type DateRange } from "@/components/motion/calendar";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/components/motion/popover-morph";
import { cn } from "@/lib/utils";

const SHORT_DATE: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

export type DateRangePreset = {
  label: string;
  /** Called on click, so "today" is read when the preset is used. */
  range: () => { from: Date; to: Date };
};

export interface DateRangePickerProps {
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  /** Fires once both ends are picked (or a preset is chosen). */
  onValueChange?: (range: { from: Date; to: Date }) => void;
  placeholder?: string;
  /** Quick picks listed beside the calendar. */
  presets?: DateRangePreset[];
  /** Months side by side. Default 2 (stacked below `sm`). */
  numberOfMonths?: number;
  /** Intl options for the trigger label. Default: "Oct 14 – 20, 2026". */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Default "en-US". */
  locale?: string;
  minDate?: Date;
  maxDate?: Date;
  isDateDisabled?: (date: Date) => boolean;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  align?: "start" | "end";
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Range field whose two-month calendar morphs open from the trigger. The band
 * follows the pointer until the end day is picked, then the popover closes
 * and commits; optional presets commit in one click. Picking only a start
 * and closing keeps the previous range. Controlled or uncontrolled.
 */
export function DateRangePicker({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  placeholder = "Pick a date range",
  presets,
  numberOfMonths = 2,
  formatOptions = SHORT_DATE,
  locale = "en-US",
  minDate,
  maxDate,
  isDateDisabled,
  weekStartsOn,
  align = "start",
  disabled,
  className,
  "aria-label": ariaLabel = "Choose date range",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<DateRange | null>(
    defaultValue,
  );
  const value =
    controlledValue !== undefined ? controlledValue : internalValue;
  // In-progress pick; only a finished range reaches `value`.
  const [draft, setDraft] = useState<DateRange | null>(value);

  const format = useMemo(
    () => new Intl.DateTimeFormat(locale, formatOptions),
    [locale, formatOptions],
  );
  const label =
    value?.to != null
      ? // Not formatRange: its separators differ between ICU builds (Node on
        // the server vs the browser), which breaks hydration.
        `${format.format(value.from)} – ${format.format(value.to)}`
      : value
        ? format.format(value.from)
        : null;

  const commit = (range: { from: Date; to: Date }) => {
    if (controlledValue === undefined) setInternalValue(range);
    onValueChange?.(range);
    setOpen(false);
  };

  const onOpenChange = (next: boolean) => {
    // Each opening starts from the committed range.
    if (next) setDraft(value);
    setOpen(next);
  };

  return (
    <MorphPopover open={open} onOpenChange={onOpenChange}>
      <MorphPopoverTrigger>
        <button
          type="button"
          disabled={disabled}
          aria-label={label ? `${ariaLabel}, ${label}` : ariaLabel}
          className={cn(
            "inline-flex h-10 min-w-60 items-center gap-2 rounded-xl border border-border bg-background px-3 text-left text-sm outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            label ? "text-foreground" : "text-muted-foreground",
            className,
          )}
        >
          <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate tabular-nums">
            {label ?? placeholder}
          </span>
        </button>
      </MorphPopoverTrigger>

      <MorphPopoverContent align={align} className="p-0">
        <div className="flex flex-col sm:flex-row">
          {presets && presets.length > 0 && (
            <ul className="flex gap-1 overflow-x-auto border-b border-border p-2 [scrollbar-width:none] sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0">
              {presets.map((p) => (
                <li key={p.label} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => commit(p.range())}
                    className="w-full whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Calendar
            mode="range"
            numberOfMonths={numberOfMonths}
            value={draft}
            onValueChange={(r) => {
              setDraft(r);
              if (r.to) commit({ from: r.from, to: r.to });
            }}
            locale={locale}
            minDate={minDate}
            maxDate={maxDate}
            isDateDisabled={isDateDisabled}
            weekStartsOn={weekStartsOn}
            className="border-0 bg-transparent"
          />
        </div>
      </MorphPopoverContent>
    </MorphPopover>
  );
}
