"use client";

import { Layers, PanelsTopLeft, Rocket, Sparkles, SplitSquareHorizontal, TreePine } from "lucide-react";
import { useRef } from "react";

import { Timeline, TimelineItem } from "@/components/motion/timeline";

const entries = [
  {
    date: "Jun 28, 2026",
    dateTime: "2026-06-28",
    title: "Select & Morph Select",
    description: "Composable select primitives whose panel pinches off the trigger.",
    icon: <Layers />,
    status: "done",
  },
  {
    date: "Aug 11, 2026",
    dateTime: "2026-08-11",
    title: "Combobox",
    description: "Searchable selection with grouped filtering and a gliding active row.",
    icon: <Sparkles />,
    status: "done",
  },
  {
    date: "Sep 2, 2026",
    dateTime: "2026-09-02",
    title: "Agent primitives",
    description: "Message, prompt input, tool results and approvals for AI interfaces.",
    icon: <PanelsTopLeft />,
    status: "done",
  },
  {
    date: "Oct 14, 2026",
    dateTime: "2026-10-14",
    title: "Tree View, Resizable Panels, Image Compare",
    description: "Workspace primitives: a keyboard-first file tree, spring-snapping splits and a before/after divider.",
    icon: <TreePine />,
    status: "current",
  },
  {
    date: "Nov 2026",
    dateTime: "2026-11",
    title: "Data grid",
    description: "Virtualised rows, sticky columns and animated sorting.",
    icon: <SplitSquareHorizontal />,
    status: "upcoming",
  },
  {
    date: "Dec 2026",
    dateTime: "2026-12",
    title: "karaUI v3",
    description: "Theming presets and a visual playground for every motion token.",
    icon: <Rocket />,
    status: "upcoming",
  },
] as const;

export function TimelinePreview() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-[400px] w-full items-center justify-center">
      <div
        ref={scrollRef}
        className="relative h-[360px] w-full max-w-md overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-2xl border border-border bg-card px-6 py-8"
      >
        <p className="mb-6 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Changelog · scroll
        </p>
        <Timeline scrollContainer={scrollRef}>
          {entries.map((entry) => (
            <TimelineItem
              key={entry.dateTime}
              date={entry.date}
              dateTime={entry.dateTime}
              title={entry.title}
              description={entry.description}
              icon={entry.icon}
              status={entry.status}
            />
          ))}
        </Timeline>
        <div className="h-16" />
      </div>
    </div>
  );
}
