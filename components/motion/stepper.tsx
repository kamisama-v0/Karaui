"use client";

import { Check } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "motion/react";
import {
  Children,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps } from "@/components/motion/button";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type StepperStep = {
  id: string;
  title: string;
  description?: string;
};

/** Return false (or a promise of false) to keep the user on the current step. */
export type StepperGuard = (index: number) => boolean | Promise<boolean>;

export interface StepperProps {
  steps: StepperStep[];
  /** Controlled active step index. */
  value?: number;
  /** Uncontrolled initial step index. Default 0. */
  defaultValue?: number;
  onValueChange?: (index: number) => void;
  /** Runs before leaving a step forward (Next, or jumping ahead). */
  canAdvance?: StepperGuard;
  /** Called when Next is pressed on the last step and its guard passes. */
  onComplete?: () => void | Promise<void>;
  /**
   * Linear (default): the indicator only jumps back, or forward to steps
   * already reached. Non-linear: any step, still guarded by `canAdvance`.
   */
  linear?: boolean;
  children: ReactNode;
  className?: string;
}

type StepperContextValue = {
  steps: StepperStep[];
  value: number;
  count: number;
  direction: 1 | -1;
  reached: number;
  completed: ReadonlySet<number>;
  errorStep: number | null;
  errorTick: number;
  pending: boolean;
  linear: boolean;
  isFirst: boolean;
  isLast: boolean;
  baseId: string;
  next: () => Promise<boolean>;
  previous: () => void;
  goTo: (index: number) => Promise<boolean>;
};

const StepperContext = createContext<StepperContextValue | null>(null);

/** Step state and navigation for custom controls inside `<Stepper>`. */
export function useStepper() {
  const ctx = useContext(StepperContext);
  if (!ctx) throw new Error("useStepper must be used within <Stepper>");
  return ctx;
}

const clamp = (n: number, max: number) => Math.min(Math.max(n, 0), max);

/**
 * Multi-step flow: an indicator whose active ring glides between steps and
 * whose connectors fill as you advance, panels that slide in from the
 * direction of travel while the container morphs to each panel's height, and
 * a guard per step that shakes the indicator when it refuses. Controlled or
 * uncontrolled; reduced-motion safe.
 */
export function Stepper({
  steps,
  value: controlledValue,
  defaultValue = 0,
  onValueChange,
  canAdvance,
  onComplete,
  linear = true,
  children,
  className,
}: StepperProps) {
  const count = steps.length;
  const baseId = useId();
  const [internalValue, setInternalValue] = useState(() =>
    clamp(defaultValue, count - 1),
  );
  const value = clamp(controlledValue ?? internalValue, count - 1);

  const [direction, setDirection] = useState<1 | -1>(1);
  const [reached, setReached] = useState(value);
  const [completed, setCompleted] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [errorStep, setErrorStep] = useState<number | null>(null);
  // Bumped on every refusal so the same step can shake twice in a row.
  const [errorTick, setErrorTick] = useState(0);
  const [pending, setPending] = useState(false);

  // A controlled jump past `reached` (e.g. restoring a draft) still counts.
  useEffect(() => setReached((r) => Math.max(r, value)), [value]);

  const commit = useCallback(
    (index: number) => {
      setDirection(index > value ? 1 : -1);
      setErrorStep(null);
      if (controlledValue === undefined) setInternalValue(index);
      onValueChange?.(index);
    },
    [value, controlledValue, onValueChange],
  );

  const guard = useCallback(
    async (index: number) => {
      if (!canAdvance) return true;
      setPending(true);
      try {
        return await canAdvance(index);
      } finally {
        setPending(false);
      }
    },
    [canAdvance],
  );

  const refuse = useCallback((index: number) => {
    setErrorStep(index);
    setErrorTick((t) => t + 1);
  }, []);

  const markDone = useCallback((from: number, to: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      for (let i = from; i < to; i++) next.add(i);
      return next;
    });
  }, []);

  const goTo = useCallback(
    async (target: number) => {
      const index = clamp(target, count - 1);
      if (index === value || pending) return false;
      if (index < value) {
        commit(index);
        return true;
      }
      // Linear: forward only to steps already reached, or the very next one.
      if (linear && index > Math.max(reached, value + 1)) return false;
      // Every step being skipped over must pass its guard, in order.
      for (let i = value; i < index; i++) {
        if (!(await guard(i))) {
          refuse(i);
          if (i !== value) commit(i);
          return false;
        }
      }
      markDone(value, index);
      setReached((r) => Math.max(r, index));
      commit(index);
      return true;
    },
    [count, value, pending, linear, reached, guard, refuse, markDone, commit],
  );

  const next = useCallback(async () => {
    if (pending) return false;
    if (value < count - 1) return goTo(value + 1);
    if (!(await guard(value))) {
      refuse(value);
      return false;
    }
    markDone(value, value + 1);
    setErrorStep(null);
    setPending(true);
    try {
      await onComplete?.();
    } finally {
      setPending(false);
    }
    return true;
  }, [pending, value, count, goTo, guard, refuse, markDone, onComplete]);

  const previous = useCallback(() => {
    if (value > 0 && !pending) commit(value - 1);
  }, [value, pending, commit]);

  const ctx = useMemo<StepperContextValue>(
    () => ({
      steps,
      value,
      count,
      direction,
      reached,
      completed,
      errorStep,
      errorTick,
      pending,
      linear,
      isFirst: value === 0,
      isLast: value === count - 1,
      baseId,
      next,
      previous,
      goTo,
    }),
    [
      steps,
      value,
      count,
      direction,
      reached,
      completed,
      errorStep,
      errorTick,
      pending,
      linear,
      baseId,
      next,
      previous,
      goTo,
    ],
  );

  return (
    <StepperContext.Provider value={ctx}>
      <div className={cn("flex w-full flex-col gap-6", className)}>
        {children}
      </div>
    </StepperContext.Provider>
  );
}

// ── indicator ──────────────────────────────────────────────────────────────

export interface StepperIndicatorProps {
  /** Show each step's title under its marker. Default true. */
  showTitles?: boolean;
  className?: string;
}

/** Numbered markers joined by connectors that fill as steps complete. */
export function StepperIndicator({
  showTitles = true,
  className,
}: StepperIndicatorProps) {
  const {
    steps,
    value,
    reached,
    completed,
    errorStep,
    errorTick,
    linear,
    baseId,
    goTo,
  } = useStepper();
  const reduce = useReducedMotion();

  return (
    <ol className={cn("flex w-full items-start", className)}>
      {steps.map((step, i) => {
        const active = i === value;
        const done = completed.has(i) && !active;
        const error = errorStep === i;
        const reachable = !linear || i <= reached;
        const state = error
          ? "error"
          : done
            ? "completed"
            : active
              ? "current"
              : "upcoming";

        return (
          <li
            key={step.id}
            className={cn(
              "relative flex min-w-0 flex-col items-center gap-2",
              i < steps.length - 1 ? "flex-1" : "flex-none",
            )}
          >
            {i < steps.length - 1 && (
              // Connector from this marker's center to the next one's.
              <span
                aria-hidden
                className="absolute top-4 left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-border"
              >
                <motion.span
                  className="absolute inset-0 origin-left bg-primary"
                  initial={false}
                  animate={{ scaleX: completed.has(i) ? 1 : 0 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.36, ease: EASE_OUT }
                  }
                />
              </span>
            )}
            <StepMarker
              index={i}
              state={state}
              shakeKey={error ? errorTick : 0}
              disabled={!reachable || active}
              label={`Step ${i + 1} of ${steps.length}: ${step.title}${
                done ? ", completed" : error ? ", needs attention" : ""
              }`}
              current={active}
              controls={`${baseId}-panel`}
              onSelect={() => goTo(i)}
              layoutGroup={baseId}
            />
            {showTitles && (
              <span
                aria-hidden
                className={cn(
                  "max-w-28 truncate px-1 text-center text-xs transition-colors",
                  active || done ? "text-foreground" : "text-muted-foreground",
                  error && "text-destructive",
                )}
              >
                {step.title}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepMarker({
  index,
  state,
  shakeKey,
  disabled,
  label,
  current,
  controls,
  onSelect,
  layoutGroup,
}: {
  index: number;
  state: "upcoming" | "current" | "completed" | "error";
  shakeKey: number;
  disabled: boolean;
  label: string;
  current: boolean;
  controls: string;
  onSelect: () => void;
  layoutGroup: string;
}) {
  const reduce = useReducedMotion();
  const shake = useAnimationControls();

  useEffect(() => {
    if (!shakeKey || reduce) return;
    shake.start({
      x: [0, -5, 5, -3, 3, 0],
      transition: { duration: 0.4, ease: EASE_OUT },
    });
  }, [shakeKey, reduce, shake]);

  return (
    <motion.button
      type="button"
      animate={shake}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "step" : undefined}
      aria-controls={current ? controls : undefined}
      onClick={onSelect}
      className={cn(
        "relative isolate flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
        state === "completed" &&
          "border-primary bg-primary text-primary-foreground",
        state === "current" && "border-transparent text-foreground",
        state === "upcoming" && "border-border bg-card text-muted-foreground",
        state === "error" &&
          "border-destructive bg-destructive/10 text-destructive",
        !disabled && state !== "current" && "hover:border-primary/60",
      )}
    >
      {state === "current" && (
        <motion.span
          aria-hidden
          // The ring glides from marker to marker as the active step changes.
          layoutId={`${layoutGroup}-ring`}
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="absolute -inset-px -z-10 rounded-full border-2 border-primary bg-card"
        />
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        {state === "completed" ? (
          <motion.span
            key="check"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={SPRING_SWAP}
          >
            <Check className="size-4" strokeWidth={2.5} />
          </motion.span>
        ) : (
          <motion.span
            key="number"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={SPRING_SWAP}
          >
            {index + 1}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── panels ─────────────────────────────────────────────────────────────────

export interface StepperPanelsProps {
  /** One child per step, in step order. */
  children: ReactNode;
  className?: string;
}

/**
 * Shows the active step's child. Panels slide in from the direction of
 * travel and the container morphs to each panel's height. Focus moves to the
 * new panel after navigation so keyboard and screen-reader users land on it.
 */
export function StepperPanels({ children, className }: StepperPanelsProps) {
  const { value, direction, steps, baseId } = useStepper();
  const reduce = useReducedMotion();
  const panels = Children.toArray(children);
  const containerRef = useRef<HTMLDivElement>(null);
  const shownStep = useRef(value);

  useEffect(() => {
    // Only move focus in response to navigation, never on first render.
    if (shownStep.current === value) return;
    shownStep.current = value;
    // The exiting panel is still mounted mid-transition, so look the entering
    // one up by its step instead of trusting a shared ref.
    containerRef.current
      ?.querySelector<HTMLElement>(`[data-step="${value}"]`)
      ?.focus({ preventScroll: true });
  }, [value]);

  const offset = reduce ? 0 : 24;

  return (
    <motion.div
      layout
      ref={containerRef}
      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
      className={cn("relative overflow-hidden", className)}
    >
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={value}
          data-step={value}
          id={`${baseId}-panel`}
          role="group"
          aria-label={`Step ${value + 1}: ${steps[value]?.title ?? ""}`}
          tabIndex={-1}
          layout="position"
          custom={direction}
          variants={{
            enter: (dir: number) => ({
              opacity: 0,
              x: dir * offset,
              filter: reduce ? "blur(0px)" : "blur(4px)",
            }),
            center: {
              opacity: 1,
              x: 0,
              filter: "blur(0px)",
              transition: { duration: 0.26, ease: EASE_OUT },
            },
            exit: (dir: number) => ({
              opacity: 0,
              x: dir * -offset,
              filter: reduce ? "blur(0px)" : "blur(4px)",
              transition: { duration: 0.16, ease: EASE_OUT },
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          className="outline-none"
        >
          {panels[value]}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ── controls ───────────────────────────────────────────────────────────────

export interface StepperPreviousProps extends Omit<ButtonProps, "onClick"> {
  children?: ReactNode;
}

/** Goes back one step. Hidden from layout on the first step. */
export function StepperPrevious({
  children = "Back",
  className,
  variant = "ghost",
  ...props
}: StepperPreviousProps) {
  const { isFirst, pending, previous } = useStepper();
  return (
    <Button
      type="button"
      variant={variant}
      disabled={isFirst || pending}
      onClick={previous}
      className={cn(isFirst && "invisible", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export interface StepperNextProps extends Omit<ButtonProps, "onClick"> {
  children?: ReactNode;
  /** Label on the last step. Default "Finish". */
  finishLabel?: ReactNode;
}

/** Advances through the step guard; on the last step it runs `onComplete`. */
export function StepperNext({
  children = "Continue",
  finishLabel = "Finish",
  ...props
}: StepperNextProps) {
  const { isLast, pending, next } = useStepper();
  return (
    <Button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => void next()}
      {...props}
    >
      {isLast ? finishLabel : children}
    </Button>
  );
}
