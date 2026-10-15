"use client";

import { BarChart3, Bug, FileText, Languages, Lightbulb, Mail } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { PromptInput } from "@/components/agents/prompt-input";
import {
  type PromptSuggestion,
  PromptSuggestions,
} from "@/components/agents/prompt-suggestions";
import { EASE_OUT } from "@/lib/ease";

const SUGGESTIONS: PromptSuggestion[] = [
  {
    id: "summarize",
    title: "Summarize a document",
    subtitle: "Key points, decisions and open questions",
    prompt: "Summarize this document into key points, decisions and open questions.",
    icon: <FileText />,
  },
  {
    id: "debug",
    title: "Debug a failing test",
    subtitle: "Find the root cause and propose a fix",
    prompt: "Help me debug a failing test: find the root cause and propose a fix.",
    icon: <Bug />,
  },
  {
    id: "email",
    title: "Draft a follow-up email",
    subtitle: "Friendly, concise, with clear next steps",
    prompt: "Draft a friendly, concise follow-up email with clear next steps.",
    icon: <Mail />,
  },
  {
    id: "data",
    title: "Analyze a CSV export",
    subtitle: "Trends, outliers and a short report",
    prompt: "Analyze this CSV export and report trends and outliers.",
    icon: <BarChart3 />,
  },
  {
    id: "brainstorm",
    title: "Brainstorm product names",
    subtitle: "Ten short, memorable options",
    prompt: "Brainstorm ten short, memorable product names.",
    icon: <Lightbulb />,
  },
  {
    id: "translate",
    title: "Translate and localize copy",
    subtitle: "Keep tone and formatting intact",
    prompt: "Translate and localize this copy, keeping tone and formatting intact.",
    icon: <Languages />,
  },
];

export function PromptSuggestionsPreview() {
  const reduce = useReducedMotion() ?? false;
  const [value, setValue] = useState("");
  const [sent, setSent] = useState<string>();


  return (
    <div className="flex h-[440px] w-full max-w-xl flex-col justify-center gap-5">
      <div className="text-center">
        <motion.span
          aria-hidden="true"
          initial={reduce ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="mx-auto mb-3 grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground"
        >
          <svg viewBox="0 0 16 16" className="size-5" fill="currentColor" aria-hidden="true">
            <path d="M8 1.5C8.6 5.6 10.4 7.4 14.5 8 10.4 8.6 8.6 10.4 8 14.5 7.4 10.4 5.6 8.6 1.5 8 5.6 7.4 7.4 5.6 8 1.5Z" />
          </svg>
        </motion.span>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          What are we working on?
        </h3>
        <div className="h-5 text-sm text-muted-foreground">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={sent ? "sent" : "idle"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {sent
                ? "Prompt sent — start typing to filter again."
                : "Pick a suggestion or type to filter them."}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <PromptSuggestions
        suggestions={SUGGESTIONS}
        query={value}
        limit={4}
        onSelect={(prompt) => {
          setSent(undefined);
          setValue(prompt);
        }}
      />

      <PromptInput
        value={value}
        onValueChange={(next) => {
          setValue(next);
          setSent(undefined);
        }}
        minRows={1}
        maxRows={4}
        placeholder="Ask anything, or type “email”…"
        onSubmit={(prompt) => {
          setSent(prompt);
          setValue("");
        }}
      />
    </div>
  );
}
