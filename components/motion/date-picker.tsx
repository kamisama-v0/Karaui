"use client";

import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { Calendar } from "@/components/motion/calendar";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/components/motion/popover-morph";
import { cn } from "@/lib/utils";

const MEDIUM_DATE: Intl.DateTimeFormatOptions = { dateStyle: "medium" };

export interface DatePickerProps {
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (date: Date) => void;
  placeholder?: string;
  /** Intl options for the trigger label. Default: medium date. */
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
 * Date field whose calendar morphs open from the trigger corner and closes
 * as soon as a day is picked. Controlled or uncontrolled.
 */
export function DatePicker({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  placeholder = "Pick a date",
  formatOptions = MEDIUM_DATE,
  locale = "en-US",
  minDate,
  maxDate,
  isDateDisabled,
  weekStartsOn,
  align = "start",
  disabled,
  className,
  "aria-label": ariaLabel = "Choose date",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<Date | null>(
    defaultValue,
  );
  const value =
    controlledValue !== undefined ? controlledValue : internalValue;

  const label = useMemo(
    () =>
      value
        ? new Intl.DateTimeFormat(locale, formatOptions).format(value)
        : null,
    [value, locale, formatOptions],
  );

  return (
    <MorphPopover open={open} onOpenChange={setOpen}>
      <MorphPopoverTrigger>
        <button
          type="button"
          disabled={disabled}
          aria-label={label ? `${ariaLabel}, ${label}` : ariaLabel}
          className={cn(
            "inline-flex h-10 min-w-48 items-center gap-2 rounded-xl border border-border bg-background px-3 text-left text-sm outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            label ? "text-foreground" : "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate tabular-nums">
            {label ?? placeholder}
          </span>
        </button>
      </MorphPopoverTrigger>

      <MorphPopoverContent align={align} className="p-0">
        <Calendar
          value={value}
          onValueChange={(d) => {
            if (controlledValue === undefined) setInternalValue(d);
            onValueChange?.(d);
            setOpen(false);
          }}
          locale={locale}
          minDate={minDate}
          maxDate={maxDate}
          isDateDisabled={isDateDisabled}
          weekStartsOn={weekStartsOn}
          className="border-0 bg-transparent"
        />
      </MorphPopoverContent>
    </MorphPopover>
  );
}
