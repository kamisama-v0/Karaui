"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/motion/button";
import {
  CookieConsent,
  type CookieConsentPosition,
  type CookiePreferences,
} from "@/components/motion/cookie-consent";

const POSITIONS: { value: CookieConsentPosition; label: string }[] = [
  { value: "bottom-left", label: "Left" },
  { value: "bottom", label: "Center" },
  { value: "bottom-right", label: "Right" },
];

function describe(preferences: CookiePreferences) {
  const on = (["analytics", "marketing"] as const).filter((key) => preferences[key]);
  return on.length === 0 ? "Necessary only" : `Necessary + ${on.join(" + ")}`;
}

export function CookieConsentPreview() {
  const [run, setRun] = useState(0);
  const [position, setPosition] = useState<CookieConsentPosition>("bottom-right");
  const [choice, setChoice] = useState<CookiePreferences | null>(null);

  const reset = () => {
    setChoice(null);
    setRun((n) => n + 1);
  };

  return (
    <div className="flex w-full flex-col items-center gap-3 py-2">
      <div className="relative h-[440px] w-full max-w-[600px] overflow-hidden rounded-3xl border border-border bg-background">
        {/* Faux page behind the banner. */}
        <div aria-hidden="true" className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 rounded-full bg-foreground/15" />
            <div className="flex gap-2">
              <div className="h-3 w-10 rounded-full bg-foreground/10" />
              <div className="h-3 w-10 rounded-full bg-foreground/10" />
              <div className="h-3 w-10 rounded-full bg-foreground/10" />
            </div>
          </div>
          <div className="mt-4 h-6 w-2/3 rounded-full bg-foreground/10" />
          <div className="h-3 w-1/2 rounded-full bg-foreground/[0.07]" />
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div className="h-24 rounded-2xl bg-card" />
            <div className="h-24 rounded-2xl bg-card" />
            <div className="h-24 rounded-2xl bg-card" />
          </div>
        </div>

        <div className="absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
          <div className="flex rounded-full border border-border bg-card p-0.5 text-xs">
            {POSITIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={position === option.value}
                onClick={() => {
                  setPosition(option.value);
                  reset();
                }}
                className={
                  position === option.value
                    ? "rounded-full bg-foreground px-2.5 py-1 font-medium text-background"
                    : "rounded-full px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={reset} className="h-7">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset
          </Button>
        </div>

        {choice ? (
          <p
            aria-live="polite"
            className="absolute inset-x-0 bottom-6 text-center text-xs text-muted-foreground"
          >
            Saved: {describe(choice)}
          </p>
        ) : null}

        <CookieConsent
          key={run}
          contained
          position={position}
          onConsentChange={setChoice}
        />
      </div>
    </div>
  );
}
