"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarDays,
  Italic,
  SquareKanban,
  List,
  Underline,
} from "lucide-react";
import { useState } from "react";
import { SegmentedControl, ToggleGroup } from "@/components/motion/segmented-control";
import { cn } from "@/lib/utils";

export function SegmentedControlPreview() {
  const [view, setView] = useState("board");
  const [billing, setBilling] = useState("monthly");
  const [marks, setMarks] = useState<string[]>(["bold"]);
  const [align, setAlign] = useState("left");

  return (
    <div className="flex w-full max-w-md flex-col gap-7">
      <Section title="View">
        <SegmentedControl
          aria-label="View"
          value={view}
          onValueChange={setView}
          options={[
            { value: "list", label: "List", icon: <List /> },
            { value: "board", label: "Board", icon: <SquareKanban /> },
            { value: "calendar", label: "Calendar", icon: <CalendarDays /> },
          ]}
        />
      </Section>

      <Section title="Billing period">
        <SegmentedControl
          aria-label="Billing period"
          name="billing"
          size="lg"
          fullWidth
          value={billing}
          onValueChange={setBilling}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly −20%" },
            { value: "lifetime", label: "Lifetime", disabled: true },
          ]}
        />
      </Section>

      <Section title="Text format">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="multiple"
            aria-label="Text style"
            value={marks}
            onValueChange={setMarks}
            items={[
              { value: "bold", icon: <Bold />, "aria-label": "Bold" },
              { value: "italic", icon: <Italic />, "aria-label": "Italic" },
              { value: "underline", icon: <Underline />, "aria-label": "Underline" },
            ]}
          />
          <ToggleGroup
            type="single"
            required
            aria-label="Text alignment"
            value={align}
            onValueChange={setAlign}
            items={[
              { value: "left", icon: <AlignLeft />, "aria-label": "Align left" },
              { value: "center", icon: <AlignCenter />, "aria-label": "Align center" },
              { value: "right", icon: <AlignRight />, "aria-label": "Align right" },
            ]}
          />
        </div>
        <p
          className={cn(
            "rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground",
            marks.includes("bold") && "font-semibold",
            marks.includes("italic") && "italic",
            marks.includes("underline") && "underline underline-offset-4",
            align === "center" && "text-center",
            align === "right" && "text-right",
          )}
        >
          The quick brown fox jumps over the lazy dog.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      {children}
    </div>
  );
}
