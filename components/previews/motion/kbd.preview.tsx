"use client";

import { Command, FileDown, Search } from "lucide-react";
import { useEffect } from "react";
import { Kbd, KbdCombo } from "@/components/motion/kbd";

const SHORTCUTS = [
  { icon: Search, label: "Search", keys: ["mod", "k"] },
  { icon: FileDown, label: "Save", keys: ["mod", "s"] },
  { icon: Command, label: "Command palette", keys: ["mod", "shift", "p"] },
];

export function KbdPreview() {
  // Pressing ⌘S / Ctrl+S here should only animate the keys, not open the
  // browser's Save dialog. ⌘K is left alone so the page's own search still
  // works.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (event.code === "KeyS" || (event.shiftKey && event.code === "KeyP")) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-[340px] w-full flex-col items-center justify-center gap-5 px-4">
      <ul className="w-full max-w-sm divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {SHORTCUTS.map(({ icon: Icon, label, keys }) => (
          <li
            key={label}
            className="flex items-center gap-3 px-4 py-3 text-sm text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
            </span>
            <span className="flex-1">{label}</span>
            <KbdCombo keys={keys} listen />
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Try pressing them — or hold <Kbd size="sm" listen>shift</Kbd>
      </p>
    </div>
  );
}
