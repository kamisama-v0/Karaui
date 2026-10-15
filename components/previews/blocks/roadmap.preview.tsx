"use client";

import { Roadmap, type RoadmapItem } from "@/components/motion/roadmap";
import { ScrollArea } from "@/components/motion/scroll-area";

const ITEMS: RoadmapItem[] = [
  {
    id: "sso",
    title: "SAML single sign-on",
    description: "Okta, Azure AD and Google Workspace.",
    status: "planned",
    tags: ["Security"],
    votes: 128,
    quarter: "Q1 2027",
  },
  {
    id: "offline",
    title: "Offline mode",
    description: "Keep editing without a connection; sync when back.",
    status: "planned",
    tags: ["Mobile"],
    votes: 86,
    quarter: "Q1 2027",
  },
  {
    id: "voice",
    title: "Voice mode",
    description: "Talk to the agent hands-free.",
    status: "in-progress",
    tags: ["AI"],
    votes: 211,
    voted: true,
    quarter: "Q4 2026",
  },
  {
    id: "api-v2",
    title: "Public API v2",
    status: "in-progress",
    tags: ["Developers"],
    votes: 64,
    quarter: "Q4 2026",
  },
  {
    id: "artifacts",
    title: "Artifact panel",
    description: "Generated code opens beside the chat.",
    status: "shipped",
    tags: ["AI"],
    votes: 173,
    quarter: "Q3 2026",
  },
  {
    id: "dark",
    title: "Dark mode",
    status: "shipped",
    tags: ["Design"],
    votes: 99,
    quarter: "Q3 2026",
  },
];

export function RoadmapPreview() {
  return (
    <ScrollArea aria-label="Roadmap demo" className="h-[440px] w-full max-w-[640px]" fadeEdges>
      <div className="p-1">
        <Roadmap defaultItems={ITEMS} quarters={["Q3 2026", "Q4 2026", "Q1 2027"]} />
      </div>
    </ScrollArea>
  );
}
