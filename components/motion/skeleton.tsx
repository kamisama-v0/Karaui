"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type SkeletonShape = "rect" | "circle" | "text";

export interface SkeletonProps {
  shape?: SkeletonShape;
  /** CSS width (number = px). Text defaults to 100%, circles to 40px. */
  width?: number | string;
  /** CSS height (number = px). Circles default to their width. */
  height?: number | string;
  /** Sweep a highlight across the block. Reduced motion swaps it for a pulse. */
  shimmer?: boolean;
  className?: string;
  style?: CSSProperties;
}

const SHAPE_CLASS: Record<SkeletonShape, string> = {
  rect: "rounded-lg",
  circle: "rounded-full shrink-0",
  text: "h-3.5 rounded-md",
};

// Reduced motion: no sweep; the block breathes in opacity only.
const PULSE = {
  animate: { opacity: [1, 0.55, 1] },
  transition: { duration: 1.6, ease: EASE_IN_OUT, repeat: Infinity },
};

/**
 * A placeholder block. The shimmer is a gradient strip translated across the
 * block (transform only), clipped by the block's own overflow.
 */
export function Skeleton({
  shape = "rect",
  width,
  height,
  shimmer = true,
  className,
  style,
}: SkeletonProps) {
  const reduce = useReducedMotion();
  const resolvedWidth = width ?? (shape === "circle" ? 40 : undefined);
  const resolvedHeight = height ?? (shape === "circle" ? resolvedWidth : undefined);

  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden bg-muted",
        SHAPE_CLASS[shape],
        shape === "text" && "w-full",
        className,
      )}
      style={{ width: resolvedWidth, height: resolvedHeight, ...style }}
      animate={reduce && shimmer ? PULSE.animate : undefined}
      transition={reduce && shimmer ? PULSE.transition : undefined}
    >
      {shimmer && !reduce ? (
        <motion.span
          className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--foreground)_9%,transparent),transparent)]"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: 1.5,
            ease: EASE_IN_OUT,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />
      ) : null}
    </motion.div>
  );
}

export interface SkeletonTextProps {
  /** Number of lines. */
  lines?: number;
  /** Width of the final line, so the block reads like a real paragraph. */
  lastLineWidth?: number | string;
  /** Gap between lines (Tailwind class). */
  gapClassName?: string;
  lineClassName?: string;
  shimmer?: boolean;
  className?: string;
}

/** A paragraph of text lines with a shorter, natural-looking last line. */
export function SkeletonText({
  lines = 3,
  lastLineWidth = "62%",
  gapClassName = "gap-2",
  lineClassName,
  shimmer = true,
  className,
}: SkeletonTextProps) {
  const count = Math.max(1, lines);
  return (
    <div aria-hidden="true" className={cn("flex w-full flex-col", gapClassName, className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional and never reorder
          key={i}
          shape="text"
          shimmer={shimmer}
          className={lineClassName}
          width={count > 1 && i === count - 1 ? lastLineWidth : "100%"}
        />
      ))}
    </div>
  );
}

export interface SkeletonSwapProps {
  /** While true the skeleton shows; flip to false to cross-fade to children. */
  loading: boolean;
  /** Placeholder rendered while loading — mirror the real content's shape. */
  skeleton: ReactNode;
  /** Real content. May be absent while loading. */
  children?: ReactNode;
  /**
   * Keep the last measured content height while reloading, so a reload never
   * collapses the box to the skeleton's height. Default true.
   */
  keepHeight?: boolean;
  /** Announced to screen readers while loading. */
  loadingLabel?: string;
  className?: string;
}

/**
 * Cross-fades from a skeleton to real content without layout shift: both
 * layers share one grid cell during the fade (the box takes the taller of the
 * two), and the last measured content height is held as a min-height while a
 * reload shows the skeleton again.
 */
export function SkeletonSwap({
  loading,
  skeleton,
  children,
  keepHeight = true,
  loadingLabel = "Loading",
  className,
}: SkeletonSwapProps) {
  const reduce = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<number | null>(null);

  useEffect(() => {
    const node = contentRef.current;
    if (loading || !node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setMeasured(entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [loading]);

  return (
    <div
      aria-busy={loading}
      className={cn("relative grid", className)}
      style={keepHeight && loading && measured != null ? { minHeight: measured } : undefined}
    >
      <span className="sr-only" aria-live="polite">
        {loading ? loadingLabel : ""}
      </span>
      <AnimatePresence initial={false}>
        {loading ? (
          <motion.div
            key="skeleton"
            className="[grid-area:1/1]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: EASE_OUT } }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            ref={contentRef}
            className="[grid-area:1/1]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
