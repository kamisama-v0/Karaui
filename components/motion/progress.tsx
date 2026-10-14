"use client";

import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { NumberTicker } from "@/components/motion/number-ticker";
import { EASE_IN_OUT, EASE_OUT, SPRING_GLIDE } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type ProgressSize = "sm" | "md" | "lg";

// Reduced motion: indeterminate states drop every transform and keep a calm
// opacity pulse (same rhythm as Loader's reduced variant).
const REDUCED_PULSE = {
  animate: { opacity: [0.35, 0.85, 0.35] },
  transition: { duration: 1.4, ease: EASE_IN_OUT, repeat: Infinity },
};

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * A spring-smoothed 0..1 fraction. Uses SPRING_GLIDE (critically damped) so
 * the fill never rebounds past the true value. Reduced motion jumps instead.
 */
function useFraction(fraction: number) {
  const reduce = useReducedMotion();
  const spring = useSpring(0, SPRING_GLIDE);
  useEffect(() => {
    if (reduce) spring.jump(fraction);
    else spring.set(fraction);
  }, [fraction, reduce, spring]);
  return spring;
}

function defaultValueText(percent: number) {
  return `${percent}%`;
}

interface ProgressCommonProps {
  /** Current value. Omit (or pass `null`) together with `indeterminate`. */
  value?: number | null;
  /** Upper bound. Defaults to 100. */
  max?: number;
  /** Unknown-duration mode: a sliding segment (bar) or a spinning arc (circle). */
  indeterminate?: boolean;
  /** Visible label. When it is not a string, also pass `aria-label`. */
  label?: ReactNode;
  /** Show the rolling percentage. */
  showValue?: boolean;
  /** Screen-reader value text. Defaults to "42%". */
  getValueText?: (percent: number, value: number, max: number) => string;
  "aria-label"?: string;
  className?: string;
}

function useProgressState(
  value: number | null | undefined,
  max: number,
  indeterminate: boolean,
) {
  const safeMax = max > 0 ? max : 100;
  const isIndeterminate = indeterminate || value == null;
  const current = isIndeterminate ? 0 : Math.min(safeMax, Math.max(0, value ?? 0));
  const fraction = clamp01(current / safeMax);
  const percent = Math.round(fraction * 100);
  return { safeMax, isIndeterminate, current, fraction, percent };
}

/* -------------------------------------------------------------------------- */
/*                                  Progress                                  */
/* -------------------------------------------------------------------------- */

const TRACK_SIZE: Record<ProgressSize, string> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export interface ProgressProps extends ProgressCommonProps {
  size?: ProgressSize;
  /** Classes for the fill (e.g. `bg-emerald-500`). */
  indicatorClassName?: string;
  /** Classes for the track. */
  trackClassName?: string;
}

/**
 * Linear progress bar. The fill is an HTML element scaled on X from its left
 * edge (transform only), smoothed by a critically damped spring.
 */
export function Progress({
  value,
  max = 100,
  indeterminate = false,
  label,
  showValue = false,
  size = "md",
  getValueText = defaultValueText,
  indicatorClassName,
  trackClassName,
  className,
  "aria-label": ariaLabel,
}: ProgressProps) {
  const reduce = useReducedMotion();
  const labelId = useId();
  const { safeMax, isIndeterminate, current, fraction, percent } =
    useProgressState(value, max, indeterminate);
  const scaleX = useFraction(fraction);
  const hasHeader = label != null || (showValue && !isIndeterminate);

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
      aria-labelledby={ariaLabel == null && label != null && typeof label !== "string" ? labelId : undefined}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={isIndeterminate ? undefined : current}
      aria-valuetext={
        isIndeterminate ? undefined : getValueText(percent, current, safeMax)
      }
      className={cn("flex w-full flex-col gap-2", className)}
    >
      {hasHeader ? (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          {label != null ? (
            <span id={labelId} className="min-w-0 truncate font-medium text-foreground">
              {label}
            </span>
          ) : (
            <span />
          )}
          {showValue && !isIndeterminate ? (
            <span aria-hidden="true" className="shrink-0 text-muted-foreground">
              <NumberTicker
                value={percent}
                suffix="%"
                startOnView={false}
                duration={0.45}
                stagger={0}
              />
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-foreground/10",
          TRACK_SIZE[size],
          trackClassName,
        )}
      >
        {isIndeterminate ? (
          reduce ? (
            <motion.div
              className={cn("absolute inset-0 rounded-full bg-primary", indicatorClassName)}
              animate={REDUCED_PULSE.animate}
              transition={REDUCED_PULSE.transition}
            />
          ) : (
            // A 40%-wide segment travels from fully off the left edge
            // (-100% of itself) to fully off the right (250% of itself).
            <motion.div
              className={cn(
                "absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary",
                indicatorClassName,
              )}
              initial={{ x: "-100%" }}
              animate={{ x: "250%" }}
              transition={{ duration: 1.4, ease: EASE_IN_OUT, repeat: Infinity }}
            />
          )
        ) : (
          <motion.div
            className={cn(
              "absolute inset-0 origin-left rounded-full bg-primary",
              indicatorClassName,
            )}
            style={{ scaleX }}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               ProgressCircle                               */
/* -------------------------------------------------------------------------- */

export interface ProgressCircleProps extends ProgressCommonProps {
  /** Diameter in px. */
  size?: number;
  /** Stroke width in px. */
  thickness?: number;
  /** Replace the centered percentage with custom content. */
  children?: ReactNode;
  /** Classes for the progress arc (stroke via `text-*`). */
  indicatorClassName?: string;
}

/**
 * Ring progress. The arc draws with `pathLength`; the 12 o'clock start and
 * the indeterminate spin rotate whole HTML/SVG boxes with CSS transforms, so
 * no transform-origin is ever set on an inner SVG shape.
 */
export function ProgressCircle({
  value,
  max = 100,
  indeterminate = false,
  label,
  showValue = true,
  size = 64,
  thickness,
  getValueText = defaultValueText,
  children,
  indicatorClassName,
  className,
  "aria-label": ariaLabel,
}: ProgressCircleProps) {
  const reduce = useReducedMotion();
  const labelId = useId();
  const { safeMax, isIndeterminate, current, fraction, percent } =
    useProgressState(value, max, indeterminate);
  const stroke = thickness ?? Math.max(3, Math.round(size * 0.09));
  const r = (size - stroke) / 2;
  const c = size / 2;
  const pathLength = useFraction(fraction);
  // A round cap on a zero-length path still paints a dot; hide it at 0.
  const arcOpacity = useTransform(pathLength, (v) => (v > 0.002 ? 1 : 0));
  const fontSize = Math.max(10, Math.round(size * 0.22));

  const center =
    children ??
    (showValue && !isIndeterminate ? (
      <NumberTicker
        value={percent}
        suffix="%"
        startOnView={false}
        duration={0.45}
        stagger={0}
        className="font-semibold text-foreground"
      />
    ) : null);

  const ring = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
      // Start at 12 o'clock: rotate the whole <svg> box with CSS.
      className="-rotate-90"
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-foreground/10"
      />
      {isIndeterminate ? (
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn("stroke-current text-primary", indicatorClassName)}
          initial={false}
          animate={{ pathLength: 0.28 }}
          transition={{ duration: 0 }}
        />
      ) : (
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn("stroke-current text-primary", indicatorClassName)}
          style={{ pathLength, opacity: arcOpacity }}
        />
      )}
    </svg>
  );

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
      aria-labelledby={ariaLabel == null && label != null && typeof label !== "string" ? labelId : undefined}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={isIndeterminate ? undefined : current}
      aria-valuetext={
        isIndeterminate ? undefined : getValueText(percent, current, safeMax)
      }
      className={cn("inline-flex flex-col items-center gap-2", className)}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {isIndeterminate ? (
          // The spin lives on an HTML wrapper, never on an SVG child.
          <motion.div
            className="size-full"
            animate={reduce ? REDUCED_PULSE.animate : { rotate: 360 }}
            transition={
              reduce
                ? REDUCED_PULSE.transition
                : { duration: 1, ease: "linear", repeat: Infinity }
            }
          >
            {ring}
          </motion.div>
        ) : (
          ring
        )}
        {center != null ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center tabular-nums"
            style={{ fontSize }}
          >
            {center}
          </div>
        ) : null}
      </div>
      {label != null ? (
        <span id={labelId} className="text-xs text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                ProgressSteps                               */
/* -------------------------------------------------------------------------- */

export type ProgressStep = { label: string };

export interface ProgressStepsProps {
  /** Number of segments, or labelled steps (labels render under segments). */
  steps: number | ProgressStep[];
  /**
   * Completed steps. Fractions partially fill the next segment, e.g. `2.5`
   * fills two segments and half of the third.
   */
  value: number;
  size?: ProgressSize;
  /** Hide the step labels even when `steps` carries them. */
  hideLabels?: boolean;
  "aria-label"?: string;
  indicatorClassName?: string;
  className?: string;
}

// Delay between neighbouring segments so a jump of several steps reads as a
// sequence (stage 1 completes, then stage 2…) instead of all at once.
const SEGMENT_STAGGER = 0.14;

/**
 * Segmented progress: N tracks that fill one after another, e.g. upload
 * stages or onboarding steps. Increases fill left→right; decreases unwind
 * right→left.
 */
export function ProgressSteps({
  steps,
  value,
  size = "md",
  hideLabels = false,
  indicatorClassName,
  className,
  "aria-label": ariaLabel = "Progress",
}: ProgressStepsProps) {
  const reduce = useReducedMotion();
  const list: ProgressStep[] =
    typeof steps === "number"
      ? Array.from({ length: Math.max(1, steps) }, (_, i) => ({ label: `Step ${i + 1}` }))
      : steps;
  const count = list.length;
  const current = Math.min(count, Math.max(0, Number.isFinite(value) ? value : 0));
  const showLabels = !hideLabels && typeof steps !== "number";

  // Previous value decides the sequence direction and where it starts.
  const prevRef = useRef(current);
  const from = prevRef.current;
  useEffect(() => {
    prevRef.current = current;
  }, [current]);
  const growing = current >= from;

  const activeIndex = Math.min(count - 1, Math.floor(current));
  const valueText =
    current >= count
      ? `All ${count} steps complete`
      : `Step ${activeIndex + 1} of ${count}: ${list[activeIndex]?.label ?? ""}`;

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={count}
      aria-valuenow={current}
      aria-valuetext={valueText}
      className={cn("flex w-full flex-col gap-2", className)}
    >
      <div className="flex w-full gap-1.5">
        {list.map((_step, i) => {
          const fill = clamp01(current - i);
          const order = growing
            ? Math.max(0, i - Math.floor(from))
            : Math.max(0, Math.ceil(from) - 1 - i);
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
              key={i}
              className={cn(
                "relative flex-1 overflow-hidden rounded-full bg-foreground/10",
                TRACK_SIZE[size],
              )}
            >
              <motion.div
                className={cn(
                  "absolute inset-0 origin-left rounded-full bg-primary",
                  indicatorClassName,
                )}
                initial={false}
                animate={{ scaleX: fill }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.32, ease: EASE_OUT, delay: order * SEGMENT_STAGGER }
                }
              />
            </div>
          );
        })}
      </div>
      {showLabels ? (
        <div aria-hidden="true" className="flex w-full gap-1.5">
          {list.map((step, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
              key={i}
              className={cn(
                "min-w-0 flex-1 truncate text-xs transition-colors duration-200",
                i < current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
