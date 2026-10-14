"use client";

import { useState } from "react";
import {
  ColorPicker,
  ColorPickerPopover,
} from "@/components/motion/color-picker";

export function ColorPickerPreview() {
  const [color, setColor] = useState("#6366f1");

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
      <div className="rounded-2xl border border-border bg-card p-3">
        <ColorPicker value={color} onChange={setColor} alpha />
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">Popover trigger</p>
        <ColorPickerPopover label="Accent" defaultValue="#22c55e" />
        <p className="max-w-56 text-xs text-muted-foreground">
          Inline value:{" "}
          <span className="font-mono text-foreground">{color}</span>
        </p>
      </div>
    </div>
  );
}
