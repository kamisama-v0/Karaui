"use client";

import { useState } from "react";
import { DatePicker } from "@/components/motion/date-picker";

export function DatePickerPreview() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <div className="flex min-h-[26rem] flex-col items-center gap-2 pt-8">
      <span className="text-sm text-muted-foreground">Due date</span>
      <DatePicker value={date} onValueChange={setDate} />
    </div>
  );
}
