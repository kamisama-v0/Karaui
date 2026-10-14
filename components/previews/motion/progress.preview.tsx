"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/motion/button";
import {
  Progress,
  ProgressCircle,
  ProgressSteps,
} from "@/components/motion/progress";

// Deterministic upload "chunks" (percent added per tick) so the demo is the
// same every run: a fast start, a stall, then a quick finish.
const CHUNKS = [6, 9, 12, 7, 3, 2, 1, 8, 11, 14, 9, 10, 8];
const TICK_MS = 260;
const PROCESSING_MS = 1400;

type Phase = "idle" | "uploading" | "processing" | "done";

const ONBOARDING = [
  { label: "Account" },
  { label: "Profile" },
  { label: "Team" },
  { label: "Billing" },
];

export function ProgressPreview() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [percent, setPercent] = useState(0);
  const [step, setStep] = useState(1);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };
  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );

  const start = () => {
    clearTimers();
    setPercent(0);
    setPhase("uploading");
    let total = 0;
    CHUNKS.forEach((chunk, i) => {
      total = Math.min(100, total + chunk);
      const next = total;
      timers.current.push(
        window.setTimeout(() => setPercent(next), TICK_MS * (i + 1)),
      );
    });
    const uploadEnd = TICK_MS * (CHUNKS.length + 1);
    timers.current.push(
      window.setTimeout(() => setPhase("processing"), uploadEnd),
      window.setTimeout(() => setPhase("done"), uploadEnd + PROCESSING_MS),
    );
  };

  const reset = () => {
    clearTimers();
    setPhase("idle");
    setPercent(0);
  };

  const status =
    phase === "idle"
      ? "Ready to upload"
      : phase === "uploading"
        ? `${((24.8 * percent) / 100).toFixed(1)} of 24.8 MB`
        : phase === "processing"
          ? "Processing…"
          : "Upload complete";

  const uploadStage =
    phase === "idle" ? 0 : phase === "uploading" ? 1 + percent / 100 : phase === "processing" ? 2.5 : 3;

  return (
    <div className="flex w-full max-w-lg flex-col gap-4 p-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              brand-assets.zip
            </p>
            <p className="text-xs text-muted-foreground">{status}</p>
          </div>
          {phase === "idle" ? (
            <Button size="sm" onClick={start}>
              Start upload
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={reset}>
              Reset
            </Button>
          )}
        </div>
        <Progress
          aria-label="Upload progress"
          value={phase === "done" ? 100 : percent}
          indeterminate={phase === "processing"}
          showValue={phase !== "processing"}
          label={phase === "processing" ? "Processing" : "Uploading"}
          indicatorClassName={phase === "done" ? "bg-[var(--chart-2)]" : undefined}
        />
        <ProgressSteps
          aria-label="Upload stages"
          size="sm"
          steps={[{ label: "Queued" }, { label: "Upload" }, { label: "Process" }]}
          value={uploadStage}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center gap-4 rounded-2xl border border-border bg-card p-4">
          <ProgressCircle
            aria-label="Upload"
            value={phase === "done" ? 100 : percent}
            size={64}
          />
          <ProgressCircle
            aria-label="Storage used"
            value={72}
            size={48}
            indicatorClassName="text-[var(--chart-3)]"
          />
          <ProgressCircle aria-label="Syncing" indeterminate size={32} />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <ProgressSteps
            aria-label="Onboarding"
            steps={ONBOARDING}
            value={step}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setStep((s) => (s >= ONBOARDING.length ? 0 : s + 1))
              }
            >
              {step >= ONBOARDING.length ? "Restart" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
