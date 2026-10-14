"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { VoiceInput } from "@/components/agents/voice-input";
import { EASE_OUT } from "@/lib/ease";

const PHRASES = [
  "Summarize the last three pull requests and flag anything risky.",
  "Draft a reply thanking the team for shipping the release.",
  "Find every place we still call the old billing endpoint.",
  "Turn these meeting notes into a checklist for tomorrow.",
];

export function VoiceInputPreview() {
  const reduce = useReducedMotion() ?? false;
  const turn = useRef(0);
  const [notes, setNotes] = useState<{ id: number; text: string }[]>([]);

  // `simulate` fakes the waveform without microphone access, and this stub
  // stands in for a real speech-to-text request.
  const transcribe = (_audio: Blob) =>
    new Promise<string>((resolve) => {
      const phrase = PHRASES[turn.current % PHRASES.length] ?? "";
      turn.current += 1;
      window.setTimeout(() => resolve(phrase), 1100);
    });

  return (
    <div className="flex h-[360px] w-full max-w-md flex-col items-center justify-center gap-6">
      <VoiceInput
        simulate
        maxDuration={30}
        onTranscribe={transcribe}
        onTranscript={(text) => {
          if (!text) return;
          setNotes((current) =>
            [{ id: turn.current, text }, ...current].slice(0, 3),
          );
        }}
      />
      <ul className="flex h-36 w-full flex-col gap-2">
        <AnimatePresence initial={false}>
          {notes.length === 0 ? (
            <motion.li
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-muted-foreground"
            >
              Tap the mic, speak, then confirm.
            </motion.li>
          ) : (
            notes.map((note) => (
              <motion.li
                key={note.id}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                {note.text}
              </motion.li>
            ))
          )}
        </AnimatePresence>
      </ul>
    </div>
  );
}
