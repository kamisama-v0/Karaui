"use client";

import { Changelog, type ChangelogEntry } from "@/components/motion/changelog";
import { ScrollArea } from "@/components/motion/scroll-area";

const ENTRIES: ChangelogEntry[] = [
  {
    id: "2.4.0",
    version: "v2.4.0",
    date: "2026-10-14",
    title: "Artifacts and voice mode",
    summary: "Generated code now opens beside the chat, and you can talk to the agent hands-free.",
    changes: [
      { tag: "new", text: "Artifact panel with version history and fullscreen preview." },
      { tag: "new", text: "Voice mode with a live audio-reactive orb." },
      { tag: "improved", text: "Conversation search is 3× faster on large workspaces." },
      { tag: "fixed", text: "Pinned chats no longer jump when a title finishes streaming." },
    ],
  },
  {
    id: "2.3.2",
    version: "v2.3.2",
    date: "2026-09-30",
    title: "Stability fixes",
    changes: [
      { tag: "fixed", text: "Webhook retries respect the configured back-off." },
      { tag: "fixed", text: "Dark mode contrast on disabled inputs." },
    ],
  },
  {
    id: "2.3.0",
    version: "v2.3.0",
    date: "2026-09-12",
    title: "Faster dashboards",
    summary: "Charts stream in progressively instead of waiting for every query.",
    changes: [
      { tag: "improved", text: "Dashboard first paint is 40% faster." },
      { tag: "new", text: "Export any chart as PNG or CSV." },
      { tag: "improved", text: "Keyboard shortcuts for switching workspaces." },
    ],
  },
];

export function ChangelogPreview() {
  return (
    <ScrollArea aria-label="Changelog demo" className="h-[400px] w-full max-w-xl" fadeEdges type="always">
      <div className="p-1">
        <Changelog
          entries={ENTRIES}
          onSubscribe={() => new Promise((resolve) => setTimeout(resolve, 900))}
        />
      </div>
    </ScrollArea>
  );
}
