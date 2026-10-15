"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Pilcrow,
  Underline,
} from "lucide-react";
import { useState } from "react";
import { Toggle, ToggleGroup, ToggleGroupItem } from "@/components/motion/toggle-group";
import { cn } from "@/lib/utils";

export function ToggleGroupPreview() {
  const [marks, setMarks] = useState<string[]>(["bold"]);
  const [align, setAlign] = useState("left");
  const [dropCap, setDropCap] = useState(false);

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="multiple"
          aria-label="Text style"
          value={marks}
          onValueChange={setMarks}
        >
          <ToggleGroupItem value="bold" aria-label="Bold">
            <Bold />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <Italic />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <Underline />
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup
          type="single"
          required
          variant="outline"
          aria-label="Text alignment"
          value={align}
          onValueChange={setAlign}
        >
          <ToggleGroupItem value="left" aria-label="Align left">
            <AlignLeft />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Align center">
            <AlignCenter />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Align right">
            <AlignRight />
          </ToggleGroupItem>
        </ToggleGroup>

        <Toggle
          variant="outline"
          aria-label="Drop cap"
          pressed={dropCap}
          onPressedChange={setDropCap}
        >
          <Pilcrow />
        </Toggle>
      </div>

      <p
        className={cn(
          "rounded-xl border border-border bg-card px-5 py-4 text-sm leading-relaxed text-foreground transition-[text-align] duration-200",
          marks.includes("bold") && "font-semibold",
          marks.includes("italic") && "italic",
          marks.includes("underline") && "underline decoration-foreground/40 underline-offset-4",
          align === "center" && "text-center",
          align === "right" && "text-right",
          dropCap &&
            "first-letter:float-left first-letter:mr-2 first-letter:text-4xl first-letter:leading-none first-letter:font-bold",
        )}
      >
        Good typography is invisible. The reader notices the ideas, not the
        letters, and every control here only nudges the page toward that
        quiet clarity.
      </p>

      <p className="text-xs text-muted-foreground">
        Tab into a group, then use the arrow keys; Space or Enter toggles.
      </p>
    </div>
  );
}
