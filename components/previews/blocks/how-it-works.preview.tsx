"use client";

import { Plug, Rocket, Sparkles } from "lucide-react";
import { HowItWorks, type HowItWorksStep } from "@/components/motion/how-it-works";

// Fictional product; media is a small CSS mock per step.
function ConnectMock() {
  return (
    <div className="flex h-32 items-center justify-center gap-3 p-4">
      {["--chart-1", "--chart-2", "--chart-3"].map((token) => (
        <div
          key={token}
          className="grid size-11 place-items-center rounded-xl border border-border bg-background shadow-xs"
        >
          <span className="size-4 rounded-md" style={{ backgroundColor: `var(${token})` }} />
        </div>
      ))}
      <div className="h-px w-10 bg-border-strong" />
      <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <Plug aria-hidden className="size-5" />
      </div>
    </div>
  );
}

function ConfigureMock() {
  return (
    <div className="flex h-32 flex-col justify-center gap-2.5 p-5">
      {[72, 48, 88].map((w, i) => (
        <div key={w} className="flex items-center gap-3">
          <span
            className={
              i === 1
                ? "h-4 w-7 rounded-full bg-muted ring-1 ring-border"
                : "h-4 w-7 rounded-full bg-primary"
            }
          />
          <span className="h-2 rounded-full bg-foreground/15" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

function LaunchMock() {
  const bars = [30, 45, 40, 62, 58, 80, 92];
  return (
    <div className="flex h-32 items-end gap-2 p-5">
      {bars.map((h) => (
        <div
          key={h}
          className="flex-1 rounded-t-md bg-(--chart-1)"
          style={{ height: `${h}%`, opacity: 0.5 + h / 200 }}
        />
      ))}
    </div>
  );
}

const STEPS: HowItWorksStep[] = [
  {
    id: "connect",
    icon: <Plug aria-hidden />,
    title: "Connect your sources",
    description: "Link your repo, tracker and chat in a few clicks.",
    media: <ConnectMock />,
  },
  {
    id: "configure",
    icon: <Sparkles aria-hidden />,
    title: "Pick your rules",
    description: "Choose what gets summarized and who hears about it.",
    media: <ConfigureMock />,
  },
  {
    id: "launch",
    icon: <Rocket aria-hidden />,
    title: "Ship the brief",
    description: "A weekly digest lands in every inbox on Monday.",
    media: <LaunchMock />,
  },
];

export function HowItWorksPreview() {
  return (
    <div className="w-full max-w-[40rem] px-1">
      <HowItWorks eyebrow="How it works" heading="From setup to signal in three steps" steps={STEPS} />
    </div>
  );
}
