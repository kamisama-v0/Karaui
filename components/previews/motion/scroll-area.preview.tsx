"use client";

import { ScrollArea } from "@/components/motion/scroll-area";

const changelog = [
  { version: "2.8.0", kind: "feat", note: "Accordion and Collapsible primitives" },
  { version: "2.7.3", kind: "fix", note: "Combobox keeps placement through exit" },
  { version: "2.7.2", kind: "perf", note: "Table rows skip work while scrolling" },
  { version: "2.7.1", kind: "fix", note: "Dialog restores focus after nested close" },
  { version: "2.7.0", kind: "feat", note: "Month picker with year zoom" },
  { version: "2.6.4", kind: "docs", note: "Design style gallery and Copy CSS" },
  { version: "2.6.3", kind: "fix", note: "Tooltip flips inside the viewport" },
  { version: "2.6.2", kind: "perf", note: "Charts share one tooltip spring" },
  { version: "2.6.1", kind: "fix", note: "Carousel loop seam on resize" },
  { version: "2.6.0", kind: "feat", note: "Event calendar week view" },
  { version: "2.5.2", kind: "docs", note: "Reduced-motion notes per component" },
  { version: "2.5.1", kind: "fix", note: "Kbd shows Ctrl on non-Apple after mount" },
];

const kindColor: Record<string, string> = {
  feat: "var(--chart-1)",
  fix: "var(--chart-2)",
  perf: "var(--chart-3)",
  docs: "var(--chart-4)",
};

const collections = [
  { name: "Inputs", count: 14, color: "var(--chart-1)" },
  { name: "Overlays", count: 9, color: "var(--chart-2)" },
  { name: "Navigation", count: 11, color: "var(--chart-3)" },
  { name: "Charts", count: 9, color: "var(--chart-4)" },
  { name: "Feedback", count: 7, color: "var(--chart-5)" },
  { name: "Layout", count: 6, color: "var(--chart-1)" },
  { name: "Text", count: 8, color: "var(--chart-2)" },
];

export function ScrollAreaPreview() {
  return (
    <div className="flex w-full max-w-md flex-col gap-5">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <p className="border-b border-border px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Changelog
        </p>
        <ScrollArea aria-label="Changelog" className="h-52" viewportClassName="px-2 py-1.5">
          <ul className="flex flex-col">
            {changelog.map((entry) => (
              <li
                key={entry.version}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/60"
              >
                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  {entry.version}
                </span>
                <span
                  className="inline-flex w-11 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium"
                  style={{ color: kindColor[entry.kind] }}
                >
                  {entry.kind}
                </span>
                <span className="truncate text-foreground">{entry.note}</span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </div>

      <ScrollArea
        aria-label="Collections"
        orientation="horizontal"
        className="rounded-xl"
        viewportClassName="pb-4"
      >
        <div className="flex gap-3">
          {collections.map((c) => (
            <div
              key={c.name}
              className="flex w-36 shrink-0 flex-col gap-6 rounded-xl border border-border bg-card p-3.5 shadow-sm"
            >
              <span
                aria-hidden
                className="size-7 rounded-lg"
                style={{ background: `color-mix(in oklab, ${c.color} 22%, transparent)` }}
              >
                <span
                  className="m-2 block size-3 rounded-full"
                  style={{ background: c.color }}
                />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.count} components</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
