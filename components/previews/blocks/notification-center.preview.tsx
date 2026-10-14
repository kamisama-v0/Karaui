"use client";

import { GitPullRequest, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  NotificationCenter,
  type NotificationItem,
} from "@/components/motion/notification-center";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Offsets from "now"; the clock is read after mount, so the server render
// and the first client render agree.
function demo(now: number): NotificationItem[] {
  return [
    {
      id: "n1",
      name: "Maya Chen",
      title: "Maya Chen commented on Billing meter",
      description: "Can we round usage to the nearest minute before invoicing?",
      timestamp: now - 4 * MIN,
    },
    {
      id: "n2",
      icon: <GitPullRequest />,
      title: "PR #482 was approved",
      description: "Leo Park approved “Retry webhooks with backoff”.",
      timestamp: now - 52 * MIN,
    },
    {
      id: "n3",
      icon: <Rocket />,
      title: "Deploy to production succeeded",
      timestamp: now - 3 * HOUR,
      read: true,
    },
    {
      id: "n4",
      name: "Ava Rossi",
      title: "Ava Rossi invited you to Growth",
      timestamp: now - 1 * DAY - 2 * HOUR,
    },
    {
      id: "n5",
      icon: <ShieldCheck />,
      title: "New sign-in from Chrome on macOS",
      timestamp: now - 3 * DAY,
      read: true,
    },
  ];
}

const INCOMING: Omit<NotificationItem, "id" | "timestamp">[] = [
  { name: "Sam Okafor", title: "Sam Okafor mentioned you in #design", description: "@you thoughts on the empty states?" },
  { icon: <Sparkles />, title: "Your weekly report is ready" },
  { name: "Leo Park", title: "Leo Park assigned you Session expiry bug" },
  { icon: <Rocket />, title: "Preview deployment is live" },
];

// Clicking "Simulate new" should not dismiss the open panel.
const isSimulateButton = (target: Element) =>
  Boolean(target.closest("[data-simulate-notification]"));

export function NotificationCenterPreview() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(true);
  const nextIndex = useRef(0);

  useEffect(() => {
    setItems(demo(Date.now()));
  }, []);

  const simulate = () => {
    const i = nextIndex.current++;
    const template = INCOMING[i % INCOMING.length];
    setItems((prev) => [{ ...template, id: `new-${i}`, timestamp: Date.now() }, ...prev]);
  };

  return (
    <div className="flex h-[460px] w-full max-w-[36rem] items-start justify-between gap-3 p-1">
      <button
        type="button"
        data-simulate-notification=""
        onClick={simulate}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Sparkles aria-hidden className="size-3.5" />
        Simulate new
      </button>
      <NotificationCenter
        notifications={items}
        onNotificationsChange={setItems}
        open={open}
        onOpenChange={setOpen}
        ignoreOutside={isSimulateButton}
      />
    </div>
  );
}
