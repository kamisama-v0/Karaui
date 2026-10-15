"use client";

import { FilePlus2, MessageSquarePlus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  type ContextSegment,
  ContextMeter,
} from "@/components/agents/context-meter";
import { PromptInput } from "@/components/agents/prompt-input";
import { Button } from "@/components/motion/button";

const LIMIT = 200_000;

const INITIAL: ContextSegment[] = [
  { id: "system", label: "System prompt", tokens: 6_200 },
  { id: "conversation", label: "Conversation", tokens: 92_400 },
  { id: "files", label: "Files", tokens: 38_600 },
  { id: "tools", label: "Tool results", tokens: 21_800 },
];

function add(segments: ContextSegment[], id: string, tokens: number) {
  return segments.map((segment) =>
    segment.id === id ? { ...segment, tokens: segment.tokens + tokens } : segment,
  );
}

export function ContextMeterPreview() {
  const [segments, setSegments] = useState(INITIAL);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const compact = () =>
    new Promise<void>((resolve) => {
      timer.current = window.setTimeout(() => {
        setSegments((current) =>
          current.map((segment) =>
            segment.id === "conversation"
              ? { ...segment, tokens: 14_800 }
              : segment.id === "tools"
                ? { ...segment, tokens: 4_200 }
                : segment,
          ),
        );
        resolve();
      }, 900);
    });

  return (
    <div className="flex h-[380px] w-full max-w-xl flex-col justify-end gap-3 pb-6">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setSegments((s) => add(s, "conversation", 14_000))}
        >
          <MessageSquarePlus aria-hidden="true" className="size-3.5" />
          Long reply
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setSegments((s) => add(s, "files", 11_500))}
        >
          <FilePlus2 aria-hidden="true" className="size-3.5" />
          Attach file
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setSegments(INITIAL)}
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Reset
        </Button>
      </div>
      <PromptInput
        minRows={1}
        placeholder="Hover the meter to see what fills the context…"
        leadingAction={
          <ContextMeter segments={segments} limit={LIMIT} onCompact={compact} />
        }
      />
    </div>
  );
}
