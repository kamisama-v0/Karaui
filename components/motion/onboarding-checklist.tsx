"use client";

import { ChevronDown, PartyPopper, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button, StatefulButton } from "@/components/motion/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/motion/collapsible";
import { Progress, ProgressCircle } from "@/components/motion/progress";
import { EASE_OUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type OnboardingStep = {
  id: string;
  title: string;
  description?: ReactNode;
  /** CTA label inside the expanded step. Default "Mark as done". */
  actionLabel?: string;
  /** Runs when the CTA is pressed; the step completes once it resolves. */
  onAction?: () => void | Promise<void>;
};

export interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  /** Controlled completed step ids. */
  completed?: string[];
  defaultCompleted?: string[];
  onCompletedChange?: (completed: string[]) => void;
  /** Controlled visibility. Dismissing sets it to false. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  dismissible?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  celebrationTitle?: ReactNode;
  celebrationDescription?: ReactNode;
  className?: string;
}

const NEXT_OPEN_DELAY_MS = 420;
const CONFETTI_COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
// Deterministic burst: evenly spaced angles, alternating distances.
const CONFETTI = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const distance = i % 2 === 0 ? 74 : 54;
  return {
    id: i,
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: i % 3 === 0,
  };
});

function CheckMark({ done }: { done: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative grid size-5 shrink-0 place-items-center">
      <span
        className={cn(
          "absolute inset-0 rounded-full border-2 transition-colors duration-200",
          done ? "border-primary" : "border-border-strong",
        )}
      />
      <motion.span
        initial={false}
        animate={{ scale: done ? 1 : reduce ? 1 : 0.3, opacity: done ? 1 : 0 }}
        transition={reduce ? { duration: 0.15 } : SPRING_SWAP}
        className="absolute inset-0 rounded-full bg-primary"
      />
      <svg viewBox="0 0 20 20" className="relative size-3.5 text-primary-foreground" fill="none" aria-hidden="true">
        <motion.path
          d="M5 10.5l3.2 3.2L15 7"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.28, delay: done && !reduce ? 0.08 : 0, ease: EASE_OUT }}
        />
      </svg>
    </span>
  );
}

/**
 * Getting-started card: a progress ring and bar, steps that expand (via
 * `Collapsible`) to show a description and CTA, a completed step pops its
 * check, strikes its title and auto-opens the next open step, an optional
 * dismiss, and a confetti celebration state once everything is done.
 */
export function OnboardingChecklist({
  steps,
  completed: completedProp,
  defaultCompleted = [],
  onCompletedChange,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  dismissible = true,
  title = "Get started",
  description = "A few steps to set up your workspace.",
  celebrationTitle = "You're all set!",
  celebrationDescription = "Your workspace is ready. Time to build something.",
  className,
}: OnboardingChecklistProps) {
  const reduce = useReducedMotion();
  const [internalCompleted, setInternalCompleted] = useState(defaultCompleted);
  const completed = completedProp ?? internalCompleted;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const visible = openProp ?? internalOpen;

  const [expanded, setExpanded] = useState<string | null>(
    () => steps.find((s) => !defaultCompleted.includes(s.id))?.id ?? null,
  );
  const [pending, setPending] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const doneCount = steps.filter((s) => completed.includes(s.id)).length;
  const allDone = steps.length > 0 && doneCount === steps.length;
  const percent = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  const commit = (next: string[]) => {
    if (completedProp === undefined) setInternalCompleted(next);
    onCompletedChange?.(next);
  };

  const setDone = (id: string, done: boolean) => {
    const next = done
      ? [...completed.filter((c) => c !== id), id]
      : completed.filter((c) => c !== id);
    commit(next);
    if (!done) return;
    window.clearTimeout(timer.current);
    // Let the check land before the next step unfolds.
    timer.current = window.setTimeout(() => {
      const index = steps.findIndex((s) => s.id === id);
      const following = [...steps.slice(index + 1), ...steps.slice(0, index)].find(
        (s) => !next.includes(s.id),
      );
      setExpanded(following?.id ?? null);
    }, NEXT_OPEN_DELAY_MS);
  };

  const runAction = async (step: OnboardingStep) => {
    setPending(step.id);
    try {
      await step.onAction?.();
      setDone(step.id, true);
    } finally {
      setPending(null);
    }
  };

  const dismiss = () => {
    if (openProp === undefined) setInternalOpen(false);
    onOpenChange?.(false);
  };

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.section
          key="checklist"
          aria-label="Onboarding checklist"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            reduce
              ? { opacity: 0 }
              : { opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.18, ease: EASE_OUT } }
          }
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className={cn(
            "w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-5",
            className,
          )}
        >
          <header className="flex items-start gap-3.5">
            <ProgressCircle
              value={percent}
              size={44}
              thickness={4}
              aria-label="Onboarding progress"
              className="shrink-0 text-[11px]"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">
                {allDone ? "Everything's done." : description}{" "}
                <span className="tabular-nums">
                  {doneCount}/{steps.length}
                </span>
              </p>
            </div>
            {dismissible ? (
              <button
                type="button"
                aria-label="Dismiss checklist"
                onClick={dismiss}
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </header>

          <Progress
            value={percent}
            size="sm"
            aria-label="Steps completed"
            showValue={false}
            className="mt-4"
            trackClassName="bg-foreground/10"
          />

          <AnimatePresence mode="wait" initial={false}>
            {allDone ? (
              <motion.div
                key="celebrate"
                role="status"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="flex flex-col items-center gap-3 pt-8 pb-3 text-center"
              >
                <span className="relative grid size-16 place-items-center">
                  {reduce
                    ? null
                    : CONFETTI.map((piece) => (
                        <motion.span
                          key={piece.id}
                          aria-hidden
                          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                          animate={{ x: piece.x, y: piece.y, opacity: 0, scale: 1 }}
                          transition={{ duration: 0.9, delay: 0.1, ease: EASE_OUT }}
                          className={cn(
                            "absolute top-1/2 left-1/2 -mt-1 -ml-1 size-2",
                            piece.round ? "rounded-full" : "rounded-xs",
                            piece.color,
                          )}
                        />
                      ))}
                  <motion.span
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={reduce ? { duration: 0.2 } : SPRING_SWAP}
                    className="grid size-16 place-items-center rounded-full bg-muted text-foreground"
                  >
                    <PartyPopper className="size-7" aria-hidden />
                  </motion.span>
                </span>
                <div>
                  <p className="text-base font-semibold text-foreground">{celebrationTitle}</p>
                  <p className="text-sm text-muted-foreground">{celebrationDescription}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => commit([])}>
                    Start over
                  </Button>
                  {dismissible ? (
                    <Button size="sm" onClick={dismiss}>
                      Dismiss
                    </Button>
                  ) : null}
                </div>
              </motion.div>
            ) : (
              <motion.ul
                key="steps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="mt-3 flex flex-col"
              >
                {steps.map((step) => {
                  const done = completed.includes(step.id);
                  const isOpen = expanded === step.id;
                  return (
                    <li key={step.id} className="border-b border-border last:border-b-0">
                      <Collapsible
                        open={isOpen}
                        onOpenChange={(next) => setExpanded(next ? step.id : null)}
                      >
                        <div className="flex items-center gap-3 py-2.5">
                          <button
                            type="button"
                            aria-pressed={done}
                            aria-label={`Mark "${step.title}" as ${done ? "not done" : "done"}`}
                            onClick={() => setDone(step.id, !done)}
                            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                          >
                            <CheckMark done={done} />
                          </button>
                          <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <span className="relative min-w-0 truncate">
                              <span
                                className={cn(
                                  "text-sm font-medium transition-colors duration-200",
                                  done ? "text-muted-foreground" : "text-foreground",
                                )}
                              >
                                {step.title}
                              </span>
                              {/* Strike line draws left→right on an HTML span. */}
                              <motion.span
                                aria-hidden
                                initial={false}
                                animate={{ scaleX: done ? 1 : 0 }}
                                transition={{ duration: reduce ? 0 : 0.3, ease: EASE_OUT }}
                                className="absolute top-1/2 left-0 h-px w-full origin-left bg-muted-foreground"
                              />
                            </span>
                            <motion.span
                              aria-hidden
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={reduce ? { duration: 0 } : SPRING_SWAP}
                              className="shrink-0 text-muted-foreground"
                            >
                              <ChevronDown className="size-4" />
                            </motion.span>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent innerClassName="pb-3 pl-8">
                          {step.description ? (
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          ) : null}
                          {done ? (
                            <p className="mt-2 text-xs font-medium text-success">Completed</p>
                          ) : (
                            <StatefulButton
                              size="sm"
                              className="mt-2.5"
                              state={pending === step.id ? "loading" : "idle"}
                              loadingText="Working"
                              onClick={() => void runAction(step)}
                            >
                              {step.actionLabel ?? "Mark as done"}
                            </StatefulButton>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
