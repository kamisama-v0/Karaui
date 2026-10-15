"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface HowItWorksStep {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Shown in the media panel while this step is active. */
  media?: ReactNode;
}

export interface HowItWorksProps {
  /** 3–5 steps read best; more still work. */
  steps: HowItWorksStep[];
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  /** Controlled active step id (only meaningful when steps carry `media`). */
  value?: string;
  /** Initial active step id when uncontrolled. Defaults to the first step. */
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** Seconds the connector takes to travel between two markers. Default 0.45. */
  segmentDuration?: number;
  className?: string;
  /** Classes for the media panel (aspect ratio, height). */
  mediaClassName?: string;
}

// Must match the gap-6 used by the list in both orientations; connector
// segments span exactly one item plus one gap.
const GAP = "1.5rem";
// Marker diameter (size-10).
const MARKER = "2.5rem";

/**
 * One connector piece between marker `index` and marker `index + 1`. Plain
 * HTML so `scaleX`/`scaleY` grow from a CSS origin motion leaves alone.
 * Two copies render — one per orientation — and container queries pick one.
 */
function Segment({
  index,
  drawn,
  duration,
  reduce,
}: {
  index: number;
  drawn: boolean;
  duration: number;
  reduce: boolean | null;
}) {
  const transition = reduce
    ? { duration: 0.2, delay: index * 0.05 }
    : { duration, ease: EASE_IN_OUT, delay: 0.15 + index * duration };
  const vertical: CSSProperties = {
    top: MARKER,
    left: `calc(${MARKER} / 2 - 1px)`,
    height: `calc(100% - ${MARKER} + ${GAP})`,
  };
  const horizontal: CSSProperties = {
    top: `calc(${MARKER} / 2 - 1px)`,
    left: `calc(50% + ${MARKER} / 2)`,
    width: `calc(100% - ${MARKER} + ${GAP})`,
  };
  return (
    <>
      <span
        aria-hidden
        style={vertical}
        className="pointer-events-none absolute w-0.5 overflow-hidden rounded-full bg-border @xl:hidden"
      >
        <motion.span
          className="block size-full origin-top bg-primary"
          initial={reduce ? { opacity: 0 } : { scaleY: 0 }}
          animate={drawn ? (reduce ? { opacity: 1 } : { scaleY: 1 }) : undefined}
          transition={transition}
        />
      </span>
      <span
        aria-hidden
        style={horizontal}
        className="pointer-events-none absolute hidden h-0.5 overflow-hidden rounded-full bg-border @xl:block"
      >
        <motion.span
          className="block size-full origin-left bg-primary"
          initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
          animate={drawn ? (reduce ? { opacity: 1 } : { scaleX: 1 }) : undefined}
          transition={transition}
        />
      </span>
    </>
  );
}

/**
 * "How it works" section: numbered steps joined by a connector that draws
 * from marker to marker as the section scrolls into view, each marker
 * lighting up as the line reaches it. Steps sit in a row on wide containers
 * and become a vertical timeline on narrow ones. When steps carry `media`,
 * they act as tabs: hovering, focusing or pressing one cross-fades the media
 * panel below to that step.
 */
export function HowItWorks({
  steps,
  eyebrow,
  heading,
  description,
  value,
  defaultValue,
  onValueChange,
  segmentDuration = 0.45,
  className,
  mediaClassName,
}: HowItWorksProps) {
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const drawn = useInView(listRef, { once: true, amount: 0.4 });
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const hasMedia = steps.some((step) => step.media != null);
  const [internal, setInternal] = useState(defaultValue ?? steps[0]?.id ?? "");
  const active = value ?? internal;

  const select = useCallback(
    (id: string) => {
      if (id === active) return;
      if (value === undefined) setInternal(id);
      onValueChange?.(id);
    },
    [active, value, onValueChange],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = steps.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = index === last ? 0 : index + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = index === 0 ? last : index - 1;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    const step = steps[next];
    if (!step) return;
    select(step.id);
    tabRefs.current[next]?.focus();
  };

  // Each marker fills when the connector arrives at it.
  const markerDelay = (index: number) =>
    reduce ? index * 0.05 : 0.15 + index * segmentDuration;

  const header =
    eyebrow || heading || description ? (
      <div className="mx-auto mb-10 flex max-w-xl flex-col items-center gap-3 text-center">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        {heading ? (
          <h2 className="text-balance font-display text-2xl font-semibold leading-tight tracking-tight text-foreground @3xl:text-3xl">
            {heading}
          </h2>
        ) : null}
        {description ? (
          <p className="text-pretty text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    ) : null;

  return (
    <section className={cn("@container w-full", className)}>
      {header}
      <ol
        ref={listRef}
        role={hasMedia ? "tablist" : undefined}
        className="grid grid-cols-1 gap-6 @xl:auto-cols-fr @xl:grid-flow-col"
      >
        {steps.map((step, index) => {
          const isActive = hasMedia && step.id === active;
          const marker = (
            <span className="relative grid size-10 shrink-0 place-items-center">
              <span className="absolute inset-0 rounded-full border border-border bg-card" />
              <span className="relative font-mono text-sm font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <motion.span
                aria-hidden
                className="absolute inset-0 grid place-items-center rounded-full bg-primary font-mono text-sm font-semibold tabular-nums text-primary-foreground shadow-sm"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                animate={
                  drawn ? (reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }) : undefined
                }
                transition={{ duration: 0.35, ease: EASE_OUT, delay: markerDelay(index) }}
              >
                {index + 1}
              </motion.span>
            </span>
          );
          const card = (
            <span
              className={cn(
                "flex min-w-0 flex-1 flex-col gap-2 rounded-2xl border bg-card p-4 text-left transition-[border-color,background-color,box-shadow] duration-200 @xl:items-center @xl:text-center",
                isActive
                  ? "border-border-strong bg-muted/60 shadow-sm"
                  : "border-border",
                hasMedia && !isActive && "group-hover/step:border-border-strong",
              )}
            >
              {step.icon ? (
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary [&_svg]:size-4.5">
                  {step.icon}
                </span>
              ) : null}
              <span className="text-sm font-semibold text-foreground">{step.title}</span>
              {step.description ? (
                <span className="text-pretty text-sm leading-6 text-muted-foreground">
                  {step.description}
                </span>
              ) : null}
            </span>
          );
          const inner = (
            <>
              {marker}
              {card}
            </>
          );
          const itemClass =
            "group/step relative flex w-full gap-4 @xl:flex-col @xl:items-center";

          return (
            <motion.li
              key={step.id}
              role={hasMedia ? "presentation" : undefined}
              className="relative"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={drawn ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.45, ease: EASE_OUT, delay: markerDelay(index) }}
            >
              {index < steps.length - 1 ? (
                <Segment
                  index={index}
                  drawn={drawn}
                  duration={segmentDuration}
                  reduce={reduce}
                />
              ) : null}
              {hasMedia ? (
                <button
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${step.id}`}
                  aria-selected={isActive}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => select(step.id)}
                  onFocus={() => select(step.id)}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") select(step.id);
                  }}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  className={cn(
                    itemClass,
                    "rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                >
                  {inner}
                </button>
              ) : (
                <div className={itemClass}>{inner}</div>
              )}
            </motion.li>
          );
        })}
      </ol>

      {hasMedia ? (
        <div
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${active}`}
          className={cn(
            "mt-6 grid overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
            mediaClassName,
          )}
        >
          {/* Every media stays mounted in one grid cell, so the panel keeps
              the tallest step's height and switching never shifts layout. */}
          {steps.map((step) => {
            const shown = step.id === active;
            return (
              <motion.div
                key={step.id}
                aria-hidden={!shown}
                inert={!shown}
                className="[grid-area:1/1]"
                initial={false}
                animate={
                  reduce
                    ? { opacity: shown ? 1 : 0 }
                    : { opacity: shown ? 1 : 0, scale: shown ? 1 : 0.98, y: shown ? 0 : 6 }
                }
                transition={{ duration: shown ? 0.3 : 0.18, ease: EASE_OUT }}
              >
                {step.media}
              </motion.div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
