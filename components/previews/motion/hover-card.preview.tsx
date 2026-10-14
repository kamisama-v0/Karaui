"use client";

import { CalendarDays, Globe } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/motion/hover-card";

const STATS = [
  { label: "Components", value: "120+" },
  { label: "Stars", value: "4.8k" },
  { label: "Followers", value: "2.1k" },
];

export function HoverCardPreview() {
  return (
    <div className="flex min-h-[340px] w-full items-center justify-center px-4">
      <p className="max-w-sm text-center text-sm leading-7 text-muted-foreground">
        Built and maintained by{" "}
        <HoverCard>
          <HoverCardTrigger>
            <a
              href="https://github.com/kamisama-v0/Karaui"
              target="_blank"
              rel="noreferrer"
              className="rounded font-medium text-foreground underline decoration-foreground/30 underline-offset-4 outline-none transition-colors hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              @karaui
            </a>
          </HoverCardTrigger>
          <HoverCardContent className="w-72">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                KU
              </span>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-foreground">karaUI</p>
                <p className="text-xs text-muted-foreground">@karaui</p>
              </div>
            </div>
            <p className="mt-3 text-left text-[13px] leading-relaxed text-foreground">
              Motion-first React components you copy, paste and own. Springs,
              shared layout and accessible defaults.
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-left">
                  <dt className="text-[11px] text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums text-foreground">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              Joined March 2025
            </p>
          </HoverCardContent>
        </HoverCard>
        . Read the{" "}
        <HoverCard openDelay={350}>
          <HoverCardTrigger>
            <a
              href="https://motion.dev/docs/react-animation"
              target="_blank"
              rel="noreferrer"
              className="rounded font-medium text-foreground underline decoration-foreground/30 underline-offset-4 outline-none transition-colors hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              motion docs
            </a>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-80 overflow-hidden p-0">
            <div className="relative h-28 overflow-hidden bg-muted">
              <div className="absolute -left-6 top-4 size-24 rounded-full bg-[var(--chart-1)] opacity-70 blur-xl" />
              <div className="absolute right-6 -top-4 size-20 rounded-full bg-[var(--chart-2)] opacity-70 blur-xl" />
              <div className="absolute bottom-[-30px] left-1/2 size-24 rounded-full bg-[var(--chart-4)] opacity-60 blur-xl" />
              <span className="absolute bottom-3 left-4 rounded-md bg-card/80 px-2 py-0.5 font-mono text-[11px] text-foreground">
                motion/react
              </span>
            </div>
            <div className="p-4 text-left">
              <p className="text-sm font-semibold text-foreground">
                React animation — Motion
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Springs, gestures, layout and exit animations with a simple,
                declarative API.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe aria-hidden="true" className="size-3.5" />
                motion.dev
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>{" "}
        for the springs underneath.
      </p>
    </div>
  );
}
