"use client";

import { useState } from "react";
import { MonthField, MonthPicker } from "@/components/motion/month-picker";

// Fixed demo bounds keep server and client renders identical.
const FIRST_STATEMENT = new Date(2024, 0, 1);
const LATEST_STATEMENT = new Date(2026, 9, 1);
const EXPIRY_MIN = new Date(2026, 9, 1);
const EXPIRY_MAX = new Date(2036, 11, 1);
const EXPIRY_FORMAT: Intl.DateTimeFormatOptions = {
  month: "2-digit",
  year: "2-digit",
};
const STATEMENT_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export function MonthPickerPreview() {
  const [statement, setStatement] = useState<Date | null>(
    new Date(2026, 8, 1),
  );
  const [expiry, setExpiry] = useState<Date | null>(null);
  const days = statement
    ? new Date(statement.getFullYear(), statement.getMonth() + 1, 0).getDate()
    : 0;

  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center gap-6 py-6 sm:flex-row sm:items-start">
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm text-muted-foreground">Billing statement</span>
        <MonthPicker
          value={statement}
          onValueChange={setStatement}
          minDate={FIRST_STATEMENT}
          maxDate={LATEST_STATEMENT}
          aria-label="Statement month"
        />
        <span className="text-xs text-muted-foreground tabular-nums">
          {statement
            ? `${STATEMENT_LABEL.format(statement)} · ${days} days`
            : "Pick a month"}
        </span>
      </div>
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <span className="text-sm text-muted-foreground">Card expiry</span>
        <MonthField
          value={expiry}
          onValueChange={setExpiry}
          minDate={EXPIRY_MIN}
          maxDate={EXPIRY_MAX}
          formatOptions={EXPIRY_FORMAT}
          placeholder="MM / YY"
          aria-label="Card expiry"
          className="min-w-36"
        />
      </div>
    </div>
  );
}
