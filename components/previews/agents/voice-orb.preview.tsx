"use client";

import { Brain, Ear, Moon, Volume2 } from "lucide-react";
import { useState } from "react";
import { VoiceOrb, type VoiceOrbState } from "@/components/agents/voice-orb";
import { SegmentedControl } from "@/components/motion/segmented-control";

const CAPTIONS: Record<VoiceOrbState, string> = {
  idle: "Tap to talk",
  listening: "Listening…",
  thinking: "Thinking it through…",
  speaking: "Here's what I found.",
};

export function VoiceOrbPreview() {
  const [state, setState] = useState<VoiceOrbState>("speaking");

  return (
    <div className="flex h-[380px] w-full flex-col items-center justify-center gap-6">
      <VoiceOrb state={state} simulate size={180} />
      <p className="h-5 text-sm text-muted-foreground">{CAPTIONS[state]}</p>
      <SegmentedControl
        aria-label="Orb state"
        size="sm"
        value={state}
        onValueChange={(v) => setState(v as VoiceOrbState)}
        options={[
          { value: "idle", label: "Idle", icon: <Moon aria-hidden="true" /> },
          { value: "listening", label: "Listen", icon: <Ear aria-hidden="true" /> },
          { value: "thinking", label: "Think", icon: <Brain aria-hidden="true" /> },
          { value: "speaking", label: "Speak", icon: <Volume2 aria-hidden="true" /> },
        ]}
      />
    </div>
  );
}
