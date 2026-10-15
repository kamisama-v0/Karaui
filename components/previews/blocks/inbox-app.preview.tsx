"use client";

import { Archive, Inbox, Send, Star, Trash2 } from "lucide-react";
import { InboxApp, type InboxFolder, type InboxMessage } from "@/components/motion/inbox-app";

const FOLDERS: InboxFolder[] = [
  { id: "inbox", label: "Inbox", icon: <Inbox aria-hidden /> },
  {
    id: "starred",
    label: "Starred",
    icon: <Star aria-hidden />,
    filter: (m) => Boolean(m.starred) && m.folder !== "trash",
  },
  { id: "sent", label: "Sent", icon: <Send aria-hidden /> },
  { id: "archive", label: "Archive", icon: <Archive aria-hidden /> },
  { id: "trash", label: "Trash", icon: <Trash2 aria-hidden /> },
];

const MESSAGES: InboxMessage[] = [
  {
    id: "m1",
    folder: "inbox",
    from: { name: "Maya Chen", email: "maya@northwind.dev" },
    subject: "Launch checklist for Thursday",
    preview: "I pulled the open items into one list so we can close them out before the release.",
    body: "Hi team,\n\nI pulled the open items into one list so we can close them out before Thursday's release. Docs are ready, the changelog needs one more pass, and QA signs off tomorrow morning.\n\nShout if anything is missing.\n\nMaya",
    date: "2026-10-14T09:12:00Z",
    unread: true,
    starred: true,
  },
  {
    id: "m2",
    folder: "inbox",
    from: { name: "Leo Park", email: "leo@northwind.dev" },
    subject: "Re: Webhook retries",
    preview: "Backoff now caps at 30 minutes. Dashboard shows the attempt history per event.",
    body: "Backoff now caps at 30 minutes and the dashboard shows the attempt history per event. I'd love a review before we flip the flag for everyone.\n\nLeo",
    date: "2026-10-14T07:40:00Z",
    unread: true,
  },
  {
    id: "m3",
    folder: "inbox",
    from: { name: "Ava Rossi", email: "ava@studio.co" },
    subject: "New icon set — first pass",
    preview: "Attached the 24px grid exports. Strokes are 1.5 to match the type weight.",
    date: "2026-10-13T16:05:00Z",
  },
  {
    id: "m4",
    folder: "inbox",
    from: { name: "Billing", email: "billing@cloudhost.io" },
    subject: "Your October invoice is ready",
    preview: "Invoice #4021 for $184.20 is available in your account.",
    date: "2026-10-12T11:30:00Z",
  },
  {
    id: "m5",
    folder: "inbox",
    from: { name: "Sam Okafor", email: "sam@northwind.dev" },
    subject: "Offsite agenda draft",
    preview: "Day one is planning, day two is hack projects. Thoughts on the timing?",
    date: "2026-10-11T14:22:00Z",
    unread: true,
  },
  {
    id: "m6",
    folder: "sent",
    from: { name: "You" },
    subject: "Re: Q4 roadmap",
    preview: "Agreed on moving search ahead of exports.",
    date: "2026-10-10T10:00:00Z",
  },
];

export function InboxAppPreview() {
  return (
    <div className="w-full max-w-[40rem]">
      <InboxApp folders={FOLDERS} defaultMessages={MESSAGES} defaultSelectedId="m1" />
    </div>
  );
}
