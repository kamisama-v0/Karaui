"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import {
  AvatarGroup,
  type AvatarGroupItem,
  type LiveCursor,
  LiveCursors,
} from "@/components/motion/avatar-group";

const PEOPLE: AvatarGroupItem[] = [
  { id: "maya", name: "Maya Chen", status: "online", typing: true },
  { id: "leo", name: "Leo Park", status: "online" },
  { id: "ava", name: "Ava Rossi", status: "away" },
  { id: "sam", name: "Sam Okafor", status: "busy" },
  { id: "noah", name: "Noah Berg", status: "online" },
  { id: "iris", name: "Iris Novak", status: "offline" },
  { id: "kai", name: "Kai Tanaka", status: "away" },
];

// Each cursor traces its own Lissajous loop, so the motion is deterministic
// (same on server and client) yet never looks scripted in lockstep.
const PATHS = [
  { id: "maya", name: "Maya", color: "var(--chart-1)", cx: 30, cy: 40, rx: 18, ry: 22, fx: 1, fy: 2, phase: 0 },
  { id: "leo", name: "Leo", color: "var(--chart-2)", cx: 66, cy: 55, rx: 20, ry: 18, fx: 2, fy: 1, phase: 1.7 },
  { id: "ava", name: "Ava", color: "var(--chart-4)", cx: 48, cy: 30, rx: 26, ry: 12, fx: 1, fy: 1, phase: 3.4 },
];

const TICK_MS = 350;

function cursorsAt(t: number): LiveCursor[] {
  return PATHS.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    x: p.cx + p.rx * Math.sin(t * 0.55 * p.fx + p.phase),
    y: p.cy + p.ry * Math.cos(t * 0.45 * p.fy + p.phase),
  }));
}

export function AvatarGroupPreview() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  // Start after mount so server and first client render match; reduced motion
  // keeps the cursors parked at their starting points.
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Launch plan</p>
          <p className="text-xs text-muted-foreground">
            3 editing now · Maya is typing
          </p>
        </div>
        <AvatarGroup items={PEOPLE} max={4} ringClassName="ring-background" />
      </div>

      <div className="relative h-56 overflow-hidden rounded-2xl border border-border bg-card bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="absolute left-[10%] top-[16%] w-32 -rotate-2 rounded-lg bg-[color-mix(in_oklab,var(--chart-3)_22%,var(--card))] p-2.5 text-xs text-foreground shadow-sm">
          Hero copy needs a shorter headline
        </div>
        <div className="absolute right-[10%] top-[22%] w-28 rotate-2 rounded-lg bg-[color-mix(in_oklab,var(--chart-5)_22%,var(--card))] p-2.5 text-xs text-foreground shadow-sm">
          Pricing page v2
        </div>
        <div className="absolute bottom-[14%] left-[34%] flex h-14 w-36 items-center justify-center rounded-xl border border-dashed border-border-strong text-xs text-muted-foreground">
          Drop screenshots
        </div>
        <LiveCursors cursors={cursorsAt(tick * 0.45)} />
      </div>
    </div>
  );
}
