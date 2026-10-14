"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useCallback, useId, useState } from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export type PaginationVariant = "numbers" | "dots";
export type PaginationItem = number | "ellipsis";

export interface PaginationProps {
  /** Total number of pages (1-based). */
  total: number;
  /** Controlled current page (1-based). */
  page?: number;
  /** Initial page for uncontrolled use. */
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  /** Pages shown on each side of the current page. */
  siblings?: number;
  /** Pages always shown at the start and end. */
  boundaries?: number;
  /** `numbers` renders page buttons; `dots` is a compact indicator row. */
  variant?: PaginationVariant;
  /** Most dots shown at once in the `dots` variant; the window follows the page. */
  maxDots?: number;
  /** Render previous / next controls. */
  showControls?: boolean;
  disabled?: boolean;
  /** Accessible name for the `<nav>` landmark. */
  "aria-label"?: string;
  /** Accessible name per page button. */
  getPageLabel?: (page: number) => string;
  className?: string;
}

function range(start: number, end: number) {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

/**
 * Page items with ellipses. The item count stays constant once ellipses
 * appear, so slots keep their position and only their numbers change.
 */
export function getPaginationItems(
  total: number,
  page: number,
  siblings = 1,
  boundaries = 1,
): PaginationItem[] {
  const count = Math.max(0, Math.floor(total));
  const sib = Math.max(0, Math.floor(siblings));
  const bound = Math.max(1, Math.floor(boundaries));
  // boundaries + siblings + current + two ellipses
  const slots = sib * 2 + 3 + bound * 2;
  if (count <= slots) return range(1, count);

  const left = Math.max(page - sib, bound + 1);
  const right = Math.min(page + sib, count - bound);
  const showLeft = left > bound + 2;
  const showRight = right < count - bound - 1;

  if (!showLeft && showRight) {
    const leftCount = sib * 2 + bound + 2;
    return [
      ...range(1, leftCount),
      "ellipsis",
      ...range(count - bound + 1, count),
    ];
  }
  if (showLeft && !showRight) {
    const rightCount = sib * 2 + bound + 2;
    return [
      ...range(1, bound),
      "ellipsis",
      ...range(count - rightCount + 1, count),
    ];
  }
  return [
    ...range(1, bound),
    "ellipsis",
    ...range(left, right),
    "ellipsis",
    ...range(count - bound + 1, count),
  ];
}

function clamp(value: number, total: number) {
  return Math.min(Math.max(1, Math.round(value)), Math.max(1, total));
}

// Numbers roll in the direction of travel when the window shifts.
const ROLL_VARIANTS: Variants = {
  initial: (dir: number) => ({ opacity: 0, y: dir >= 0 ? "100%" : "-100%" }),
  animate: { opacity: 1, y: "0%", transition: SPRING_SWAP },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir >= 0 ? "-100%" : "100%",
    transition: { duration: 0.14, ease: EASE_OUT },
  }),
};

const FADE_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const ITEM_CLASS =
  "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40";

export function Pagination({
  total,
  page,
  defaultPage = 1,
  onPageChange,
  siblings = 1,
  boundaries = 1,
  variant = "numbers",
  maxDots = 7,
  showControls = true,
  disabled = false,
  "aria-label": ariaLabel = "Pagination",
  getPageLabel = (p) => `Page ${p}`,
  className,
}: PaginationProps) {
  const reduce = useReducedMotion() ?? false;
  const canHover = useHoverCapable();
  const groupId = useId();
  const [internal, setInternal] = useState(() => clamp(defaultPage, total));
  const controlled = page !== undefined;
  const current = clamp(controlled ? page : internal, total);

  // Direction of the last move drives the roll. Derived during render with
  // the setState-in-render pattern so it is ready on the same pass.
  const [track, setTrack] = useState({ page: current, dir: 0 });
  if (track.page !== current) {
    setTrack({ page: current, dir: current > track.page ? 1 : -1 });
  }
  const direction = track.page !== current
    ? current > track.page ? 1 : -1
    : track.dir;

  const go = useCallback(
    (next: number) => {
      const target = clamp(next, total);
      if (target === current || disabled) return;
      if (!controlled) setInternal(target);
      onPageChange?.(target);
    },
    [controlled, current, disabled, onPageChange, total],
  );

  const nudge = !reduce && canHover;
  const rollVariants = reduce ? FADE_VARIANTS : ROLL_VARIANTS;
  const pillTransition = reduce ? { duration: 0 } : SPRING_LAYOUT;

  const control = (dir: -1 | 1) => {
    const isPrev = dir === -1;
    const Icon = isPrev ? ChevronLeft : ChevronRight;
    const atEdge = isPrev ? current <= 1 : current >= total;
    return (
      <motion.button
        type="button"
        aria-label={isPrev ? "Previous page" : "Next page"}
        disabled={disabled || atEdge || total < 1}
        onClick={() => go(current + dir)}
        initial="rest"
        animate="rest"
        whileHover={nudge ? "hover" : undefined}
        whileTap={reduce ? undefined : { scale: 0.9 }}
        transition={SPRING_PRESS}
        className={cn(
          ITEM_CLASS,
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          variant === "dots" && "size-8",
        )}
      >
        <motion.span
          aria-hidden="true"
          variants={{ rest: { x: 0 }, hover: { x: isPrev ? -2 : 2 } }}
          transition={SPRING_PRESS}
          className="grid place-items-center"
        >
          <Icon className="size-4" />
        </motion.span>
      </motion.button>
    );
  };

  if (variant === "dots") {
    const size = Math.max(3, Math.min(maxDots, total));
    const start = Math.min(
      Math.max(1, current - Math.floor(size / 2)),
      Math.max(1, total - size + 1),
    );
    const dots = range(start, Math.min(total, start + size - 1));
    const first = dots[0] ?? 1;
    const last = dots[dots.length - 1] ?? 1;

    return (
      <nav aria-label={ariaLabel} className={cn("inline-flex items-center gap-1", className)}>
        {showControls ? control(-1) : null}
        <LayoutGroup id={groupId}>
          <ul className="flex items-center gap-0.5">
            <AnimatePresence initial={false} mode="popLayout">
              {dots.map((p) => {
                const active = p === current;
                // Shrink edge dots when more pages hide beyond them.
                const edge =
                  (p === first && first > 1) || (p === last && last < total);
                return (
                  <motion.li
                    key={p}
                    layout={reduce ? false : "position"}
                    initial={{ opacity: 0, scale: reduce ? 1 : 0.4 }}
                    animate={{ opacity: 1, scale: edge && !reduce ? 0.6 : 1 }}
                    exit={{ opacity: 0, scale: reduce ? 1 : 0.4 }}
                    transition={reduce ? { duration: 0.12 } : SPRING_LAYOUT}
                    className="flex"
                  >
                    <button
                      type="button"
                      aria-label={getPageLabel(p)}
                      aria-current={active ? "page" : undefined}
                      disabled={disabled}
                      onClick={() => go(p)}
                      className="group relative grid h-5 w-5 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40"
                    >
                      <span className="size-2 rounded-full bg-muted-foreground/35 transition-colors group-hover:bg-muted-foreground/60" />
                      {active ? (
                        <motion.span
                          layoutId="pagination-dot"
                          transition={pillTransition}
                          className="absolute inset-x-0 top-1.5 h-2 rounded-full bg-foreground"
                        />
                      ) : null}
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </LayoutGroup>
        {showControls ? control(1) : null}
      </nav>
    );
  }

  const items = getPaginationItems(total, current, siblings, boundaries);

  return (
    <nav aria-label={ariaLabel} className={cn("inline-flex", className)}>
      <ul className="flex items-center gap-1">
        {showControls ? <li className="flex">{control(-1)}</li> : null}
        <LayoutGroup id={groupId}>
          {items.map((item, index) => {
            const active = item === current;
            const itemKey = String(item);
            return (
              // Slots are keyed by position so buttons (and their focus)
              // persist while the numbers inside roll to new values.
              // biome-ignore lint/suspicious/noArrayIndexKey: positional slots are the point.
              <li key={index} className="relative flex">
                {active ? (
                  <motion.span
                    layoutId="pagination-pill"
                    transition={pillTransition}
                    className="absolute inset-0 rounded-full bg-primary"
                  />
                ) : null}
                {item === "ellipsis" ? (
                  <span
                    aria-hidden="true"
                    className={cn(ITEM_CLASS, "text-muted-foreground")}
                  >
                    …
                  </span>
                ) : (
                  <motion.button
                    type="button"
                    aria-label={getPageLabel(item)}
                    aria-current={active ? "page" : undefined}
                    disabled={disabled}
                    onClick={() => go(item)}
                    whileTap={reduce ? undefined : { scale: 0.9 }}
                    transition={SPRING_PRESS}
                    className={cn(
                      ITEM_CLASS,
                      active
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <AnimatePresence
                      initial={false}
                      mode="popLayout"
                      custom={direction}
                    >
                      <motion.span
                        key={itemKey}
                        custom={direction}
                        variants={rollVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="col-start-1 row-start-1"
                      >
                        {item}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                )}
              </li>
            );
          })}
        </LayoutGroup>
        {showControls ? <li className="flex">{control(1)}</li> : null}
      </ul>
    </nav>
  );
}
