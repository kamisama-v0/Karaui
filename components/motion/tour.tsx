"use client";

import {
  AnimatePresence,
  animate,
  type MotionValue,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/motion/button";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type TourPlacement = "top" | "right" | "bottom" | "left";

export interface TourStep {
  /** CSS selector or ref of the element to spotlight. Missing → centered card. */
  target: string | RefObject<HTMLElement | null>;
  title: ReactNode;
  content: ReactNode;
  /** Preferred side for the card. Flips/shifts to stay in the viewport. */
  placement?: TourPlacement;
}

export type TourCloseReason = "complete" | "skip" | "escape";

export interface TourLabels {
  next?: string;
  back?: string;
  skip?: string;
  done?: string;
}

export interface TourProps {
  steps: TourStep[];
  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled step index. */
  step?: number;
  /** Uncontrolled step the tour (re)starts at each time it opens. Default 0. */
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  /** Fires when Done is pressed on the last step. */
  onComplete?: () => void;
  /** Fires whenever the tour closes, with why. */
  onClose?: (reason: TourCloseReason) => void;
  /** Space between the target and the spotlight edge, px. Default 8. */
  padding?: number;
  /** Spotlight corner radius, px. Default 12. */
  radius?: number;
  /** Dim strength of the overlay, 0–1. Default 0.6. */
  overlayOpacity?: number;
  labels?: TourLabels;
  /** Classes for the popover card. */
  className?: string;
}

type Box = { left: number; top: number; width: number; height: number };

// Gap between spotlight and card, and the minimum distance the card keeps
// from the viewport edges.
const GAP = 12;
const MARGIN = 12;
// How long after a step change measurements keep springing toward the target
// (the target may still be smooth-scrolling into view). Outside this window,
// scroll/resize updates snap so the spotlight stays glued to the element.
const GLIDE_MS = 700;

const OPPOSITE: Record<TourPlacement, TourPlacement> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function resolveTarget(target: TourStep["target"]): HTMLElement | null {
  if (typeof document === "undefined") return null;
  if (typeof target === "string") {
    return document.querySelector<HTMLElement>(target);
  }
  return target.current;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), Math.max(min, max));

/** Positions the card beside `spot`, flipping to the side with room and
 * shifting along the edge so it never leaves the viewport. */
function placeCard(
  spot: Box | null,
  card: { width: number; height: number },
  preferred: TourPlacement | undefined,
  vw: number,
  vh: number,
): { x: number; y: number; side: TourPlacement | "center" } {
  const { width: w, height: h } = card;
  if (!spot) {
    return { x: (vw - w) / 2, y: (vh - h) / 2, side: "center" };
  }
  const right = spot.left + spot.width;
  const bottom = spot.top + spot.height;
  const space: Record<TourPlacement, number> = {
    top: spot.top - GAP - MARGIN,
    bottom: vh - bottom - GAP - MARGIN,
    left: spot.left - GAP - MARGIN,
    right: vw - right - GAP - MARGIN,
  };
  const need = (side: TourPlacement) =>
    side === "top" || side === "bottom" ? h : w;
  const order: TourPlacement[] = preferred
    ? [
        preferred,
        OPPOSITE[preferred],
        ...(["bottom", "top", "right", "left"] as const).filter(
          (s) => s !== preferred && s !== OPPOSITE[preferred],
        ),
      ]
    : ["bottom", "top", "right", "left"];
  const side =
    order.find((s) => space[s] >= need(s)) ??
    order.reduce((best, s) => (space[s] > space[best] ? s : best), order[0]);

  const cx = spot.left + spot.width / 2;
  const cy = spot.top + spot.height / 2;
  let x: number;
  let y: number;
  if (side === "bottom" || side === "top") {
    x = cx - w / 2;
    y = side === "bottom" ? bottom + GAP : spot.top - GAP - h;
  } else {
    y = cy - h / 2;
    x = side === "right" ? right + GAP : spot.left - GAP - w;
  }
  return {
    x: clamp(x, MARGIN, vw - w - MARGIN),
    y: clamp(y, MARGIN, vh - h - MARGIN),
    side,
  };
}

/**
 * Onboarding tour: dims the page, cuts a rounded spotlight around each
 * target and glides it between steps, with a card beside the target holding
 * the step copy, progress dots and Back/Next/Skip/Done. Everything renders
 * `position: fixed` from `getBoundingClientRect`, so it stays aligned inside
 * scrolled pages and nested scroll containers.
 */
export function Tour({
  steps,
  open,
  defaultOpen = false,
  onOpenChange,
  step,
  defaultStep = 0,
  onStepChange,
  onComplete,
  onClose,
  padding = 8,
  radius = 12,
  overlayOpacity = 0.6,
  labels,
  className,
}: TourProps) {
  const [openState, setOpenState] = useState(defaultOpen);
  const isOpen = (open ?? openState) && steps.length > 0;
  const [stepState, setStepState] = useState(defaultStep);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Uncontrolled tours restart at `defaultStep` every time they open. Adjusted
  // during render so the first open frame already shows the right step.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (isOpen && step === undefined) setStepState(defaultStep);
  }

  const index = clamp(step ?? stepState, 0, Math.max(0, steps.length - 1));

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );

  const goTo = useCallback(
    (next: number) => {
      if (step === undefined) setStepState(next);
      onStepChange?.(next);
    },
    [step, onStepChange],
  );

  const close = useCallback(
    (reason: TourCloseReason) => {
      setOpen(false);
      if (reason === "complete") onComplete?.();
      onClose?.(reason);
    },
    [setOpen, onComplete, onClose],
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <TourLayer
          key="tour"
          steps={steps}
          index={index}
          goTo={goTo}
          close={close}
          padding={padding}
          radius={radius}
          overlayOpacity={overlayOpacity}
          labels={labels}
          className={className}
        />
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

interface TourLayerProps {
  steps: TourStep[];
  index: number;
  goTo: (step: number) => void;
  close: (reason: TourCloseReason) => void;
  padding: number;
  radius: number;
  overlayOpacity: number;
  labels?: TourLabels;
  className?: string;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function TourLayer({
  steps,
  index,
  goTo,
  close,
  padding,
  radius,
  overlayOpacity,
  labels,
  className,
}: TourLayerProps) {
  const reduce = useReducedMotion() ?? false;
  const isPresent = useIsPresent();
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const firstPlace = useRef(true);
  const glideUntil = useRef(0);
  const frame = useRef(0);
  const [side, setSide] = useState<TourPlacement | "center">("bottom");
  const [hasTarget, setHasTarget] = useState(true);

  const sx = useMotionValue(0);
  const sy = useMotionValue(0);
  const sw = useMotionValue(0);
  const sh = useMotionValue(0);
  const cx = useMotionValue(0);
  const cy = useMotionValue(0);

  const current = steps[index];
  const last = index === steps.length - 1;
  // Depend on the step's target/placement, not the step object: callers often
  // pass an inline `steps` array, whose objects are new every render.
  const target = current.target;
  const placement = current.placement;

  const measure = useCallback(() => {
    const el = resolveTarget(target);
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    let spot: Box | null = null;
    if (el) {
      const r = el.getBoundingClientRect();
      spot = {
        left: r.left - padding,
        top: r.top - padding,
        width: r.width + padding * 2,
        height: r.height + padding * 2,
      };
    }
    const glide =
      !reduce && !firstPlace.current && performance.now() < glideUntil.current;
    const set = (mv: MotionValue<number>, v: number) => {
      if (glide) {
        animate(mv, v, SPRING_LAYOUT);
      } else {
        mv.stop();
        mv.set(v);
      }
    };
    // With no target the spotlight collapses to a point at the center and the
    // whole viewport stays dimmed.
    const s = spot ?? { left: vw / 2, top: vh / 2, width: 0, height: 0 };
    set(sx, s.left);
    set(sy, s.top);
    set(sw, s.width);
    set(sh, s.height);

    const card = cardRef.current;
    const placed = placeCard(
      spot,
      { width: card?.offsetWidth ?? 0, height: card?.offsetHeight ?? 0 },
      placement,
      vw,
      vh,
    );
    set(cx, placed.x);
    set(cy, placed.y);
    setSide(placed.side);
    setHasTarget(Boolean(el));
    firstPlace.current = false;
  }, [target, placement, padding, reduce, sx, sy, sw, sh, cx, cy]);

  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
  }, [measure]);

  // Step change: bring the target into view, then glide to it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `index` re-arms the glide even when two steps share a target.
  useLayoutEffect(() => {
    const el = resolveTarget(target);
    if (!firstPlace.current) glideUntil.current = performance.now() + GLIDE_MS;
    if (el) {
      const r = el.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      if (r.top < 0 || r.bottom > vh || r.left < 0 || r.right > vw) {
        el.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: reduce ? "auto" : "smooth",
        });
      }
    }
    measure();
  }, [index, target, measure, reduce]);

  // Follow the target through scrolls (any container), resizes and reflows.
  useEffect(() => {
    const el = resolveTarget(target);
    const observer = new ResizeObserver(schedule);
    if (el) observer.observe(el);
    if (cardRef.current) observer.observe(cardRef.current);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame.current);
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [target, schedule]);

  // Focus moves into the card on open and returns to whatever opened the tour
  // the moment it starts closing.
  useLayoutEffect(() => {
    const active = document.activeElement;
    returnFocus.current = active instanceof HTMLElement ? active : null;
    nextRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (isPresent) return;
    const target = returnFocus.current;
    if (target?.isConnected) target.focus({ preventScroll: true });
  }, [isPresent]);

  // A step change can unmount the focused control (Back on the first step);
  // keep focus inside the dialog.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each step change.
  useEffect(() => {
    if (!isPresent) return;
    const card = cardRef.current;
    if (card && !card.contains(document.activeElement)) {
      nextRef.current?.focus({ preventScroll: true });
    }
  }, [index, isPresent]);

  useEffect(() => {
    if (!isPresent) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close("escape");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, isPresent]);

  const next = () => (last ? close("complete") : goTo(index + 1));
  const back = () => index > 0 && goTo(index - 1);

  const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      const card = cardRef.current;
      if (!card) return;
      const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const end = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      back();
    }
  };

  const enterOffset =
    reduce || side === "center"
      ? { x: 0, y: 0 }
      : {
          x: side === "left" ? 6 : side === "right" ? -6 : 0,
          y: side === "top" ? 6 : side === "bottom" ? -6 : 0,
        };

  return (
    <motion.div
      className="fixed inset-0 z-[9998]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } }}
      exit={{ opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }}
    >
      {/* Catches pointer input so the page underneath can't be used mid-tour. */}
      <div aria-hidden className="absolute inset-0" />
      {/* Spotlight: a rounded box whose giant box-shadow is the dim layer, so
          the cut-out is a real rounded rect with no clip/mask geometry. Its
          width/height are animated on purpose — the spotlight's size *is* the
          component's layout, and it is a single paint-only element. */}
      <motion.div
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-0",
          // The ring would draw a dot at the center when there's no target.
          hasTarget && "ring-2 ring-primary/70",
        )}
        style={{
          x: sx,
          y: sy,
          width: sw,
          height: sh,
          borderRadius: radius,
          boxShadow: `0 0 0 200vmax rgb(0 0 0 / ${overlayOpacity})`,
        }}
      />
      <motion.div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={onCardKeyDown}
        className="absolute left-0 top-0 w-[min(20rem,calc(100vw-24px))] outline-none"
        style={{ x: cx, y: cy }}
      >
        <motion.div
          initial={{ opacity: 0, scale: reduce ? 1 : 0.96, ...enterOffset }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
          transition={reduce ? { duration: 0.15 } : SPRING_PANEL}
          className={cn(
            "rounded-2xl border border-border bg-background p-4 text-foreground shadow-2xl",
            className,
          )}
        >
          <motion.div
            key={index}
            aria-live="polite"
            initial={{ opacity: 0, y: reduce ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            <p className="text-xs font-medium text-muted-foreground tabular-nums">
              Step {index + 1} of {steps.length}
            </p>
            <h2 id={titleId} className="mt-1 text-sm font-semibold">
              {current.title}
            </h2>
            <div
              id={bodyId}
              className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
            >
              {current.content}
            </div>
          </motion.div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <StepDots count={steps.length} index={index} reduce={reduce} />
            <div className="flex items-center gap-1.5">
              {!last ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => close("skip")}
                >
                  {labels?.skip ?? "Skip"}
                </Button>
              ) : null}
              {index > 0 ? (
                <Button variant="outline" size="sm" onClick={back}>
                  {labels?.back ?? "Back"}
                </Button>
              ) : null}
              <Button ref={nextRef} size="sm" onClick={next}>
                {last ? (labels?.done ?? "Done") : (labels?.next ?? "Next")}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

const DOT = 6;
const DOT_GAP = 6;

function StepDots({
  count,
  index,
  reduce,
}: {
  count: number;
  index: number;
  reduce: boolean;
}) {
  return (
    <div aria-hidden className="relative flex items-center" style={{ gap: DOT_GAP }}>
      {Array.from({ length: count }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: dots are positional.
          key={i}
          className={cn(
            "block rounded-full transition-colors",
            i < index ? "bg-primary/50" : "bg-muted-foreground/25",
          )}
          style={{ width: DOT, height: DOT }}
        />
      ))}
      <motion.span
        className="absolute left-0 top-1/2 block rounded-full bg-primary"
        style={{ width: DOT, height: DOT, marginTop: -DOT / 2 }}
        initial={false}
        animate={{ x: index * (DOT + DOT_GAP), scale: 1.35 }}
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
      />
    </div>
  );
}
