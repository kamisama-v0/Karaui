"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  cloneElement,
  createContext,
  isValidElement,
  type MutableRefObject,
  type ReactElement,
  type FocusEvent as ReactFocusEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  type PlacementAlign,
  type PlacementSide,
  resolvePlacement,
} from "@/components/motion/anchored-placement";
import { usePopoverPortalPosition } from "@/components/motion/popover-position";
import { EASE_OUT, SPRING_PANEL } from "@/lib/ease";
import { useHoverGesture } from "@/lib/hooks/use-hover-gesture";
import { cn } from "@/lib/utils";

interface HoverCardContextValue {
  open: boolean;
  contentId: string;
  triggerRef: MutableRefObject<HTMLElement | null>;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  /** Open after `openDelay` (or at once when `immediate`). */
  scheduleOpen: (immediate?: boolean) => void;
  /** Close after `closeDelay` — cancelled if the pointer comes back. */
  scheduleClose: () => void;
  cancel: () => void;
  close: () => void;
  reduce: boolean;
}

const HoverCardContext = createContext<HoverCardContextValue | null>(null);

function useHoverCardContext(component: string) {
  const ctx = useContext(HoverCardContext);
  if (!ctx) throw new Error(`${component} must be used within <HoverCard>`);
  return ctx;
}

export interface HoverCardProps {
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hover time before the card opens, in ms. Default 500. */
  openDelay?: number;
  /** Time after the pointer leaves before the card closes, in ms. Default 300. */
  closeDelay?: number;
  className?: string;
}

/**
 * A rich preview shown while the pointer rests on a trigger (usually a link).
 *
 * - Opens after `openDelay`, closes `closeDelay` after the pointer leaves both
 *   the trigger and the card, so the pointer can travel into the card.
 * - Opens when the trigger receives keyboard focus; closes on Escape or blur.
 * - Touch has no hover: a tap is just a tap and the trigger behaves as the
 *   link it is. The card is supplementary — never put the only path to an
 *   action inside it.
 */
export function HoverCard({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  openDelay = 500,
  closeDelay = 300,
  className,
}: HoverCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : internalOpen;
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentId = useId();
  const reduce = useReducedMotion() ?? false;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const scheduleOpen = useCallback(
    (immediate = false) => {
      cancel();
      if (open) return;
      if (immediate) {
        setOpen(true);
        return;
      }
      timer.current = setTimeout(() => {
        timer.current = null;
        setOpen(true);
      }, openDelay);
    },
    [cancel, open, openDelay, setOpen],
  );

  const scheduleClose = useCallback(() => {
    cancel();
    if (!open) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      setOpen(false);
    }, closeDelay);
  }, [cancel, closeDelay, open, setOpen]);

  const close = useCallback(() => {
    cancel();
    setOpen(false);
  }, [cancel, setOpen]);

  useEffect(() => cancel, [cancel]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const ctx = useMemo<HoverCardContextValue>(
    () => ({
      open,
      contentId,
      triggerRef,
      contentRef,
      scheduleOpen,
      scheduleClose,
      cancel,
      close,
      reduce,
    }),
    [open, contentId, scheduleOpen, scheduleClose, cancel, close, reduce],
  );

  return (
    <HoverCardContext.Provider value={ctx}>
      <span className={cn("inline-flex", className)}>{children}</span>
    </HoverCardContext.Provider>
  );
}

type TriggerChildProps = React.HTMLAttributes<HTMLElement> & {
  ref?: Ref<HTMLElement>;
  [key: `data-${string}`]: string | undefined;
};

export interface HoverCardTriggerProps {
  /** A single focusable element, usually an `<a>`. Its own handlers still run. */
  children: ReactElement<TriggerChildProps>;
  className?: string;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as MutableRefObject<T | null>).current = value;
}

export function HoverCardTrigger({ children, className }: HoverCardTriggerProps) {
  const ctx = useHoverCardContext("HoverCardTrigger");
  const hover = useHoverGesture();
  if (!isValidElement(children)) {
    throw new Error("<HoverCardTrigger> requires a single React element");
  }
  const childProps = children.props;
  const childRef = childProps.ref;

  return cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      ctx.triggerRef.current = node;
      assignRef(childRef, node);
    },
    "data-state": ctx.open ? "open" : "closed",
    className: cn(childProps.className, className),
    // Pointer events, filtered through useHoverGesture: a finger never rests,
    // so touch never schedules an open and the tap reaches the link intact.
    onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => {
      childProps.onPointerEnter?.(event);
      if (hover.enter(event)) ctx.scheduleOpen();
    },
    onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => {
      childProps.onPointerLeave?.(event);
      if (hover.leave(event)) ctx.scheduleClose();
    },
    onFocus: (event: ReactFocusEvent<HTMLElement>) => {
      childProps.onFocus?.(event);
      // Only keyboard focus opens it; a click's focus is already a hover.
      if (event.currentTarget.matches(":focus-visible")) ctx.scheduleOpen();
    },
    onBlur: (event: ReactFocusEvent<HTMLElement>) => {
      childProps.onBlur?.(event);
      const next = event.relatedTarget as Node | null;
      if (next && ctx.contentRef.current?.contains(next)) return;
      ctx.close();
    },
  });
}

export interface HoverCardContentProps {
  children: ReactNode;
  /** Preferred side; flips when the viewport lacks room. Default "bottom". */
  side?: PlacementSide;
  /** Default "center". */
  align?: PlacementAlign;
  /** Gap between trigger and card, in px. Default 8. */
  sideOffset?: number;
  alignOffset?: number;
  className?: string;
}

// Distance the card travels in from the trigger side on entrance.
const ENTER_SHIFT = 6;

function shiftFor(side: PlacementSide) {
  if (side === "bottom") return { x: 0, y: -ENTER_SHIFT };
  if (side === "top") return { x: 0, y: ENTER_SHIFT };
  if (side === "right") return { x: -ENTER_SHIFT, y: 0 };
  return { x: ENTER_SHIFT, y: 0 };
}

export function HoverCardContent({
  children,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  className,
}: HoverCardContentProps) {
  const ctx = useHoverCardContext("HoverCardContent");
  const hover = useHoverGesture();
  const [portalReady, setPortalReady] = useState(false);
  const layout = usePopoverPortalPosition(
    ctx.triggerRef,
    ctx.contentRef,
    portalReady && ctx.open,
  );

  useEffect(() => setPortalReady(true), []);

  if (!portalReady) return null;

  const placement = layout
    ? resolvePlacement(layout, { side, align, sideOffset, alignOffset })
    : null;
  // The requested side seeds the entrance offset: the first frame mounts
  // before measurement, and a flip is the rare case.
  const shift = shiftFor(side);

  return createPortal(
    <AnimatePresence>
      {ctx.open ? (
        <motion.div
          ref={ctx.contentRef}
          id={ctx.contentId}
          data-side={placement?.side ?? side}
          initial={
            ctx.reduce
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.92, x: shift.x, y: shift.y }
          }
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={
            ctx.reduce
              ? { opacity: 0, transition: { duration: 0.1 } }
              : {
                  opacity: 0,
                  scale: 0.96,
                  transition: { duration: 0.14, ease: EASE_OUT },
                }
          }
          transition={
            ctx.reduce
              ? { duration: 0.14, ease: EASE_OUT }
              : { ...SPRING_PANEL, opacity: { duration: 0.18, ease: EASE_OUT } }
          }
          style={{
            left: placement?.left ?? 0,
            top: placement?.top ?? 0,
            transformOrigin: placement?.origin ?? "50% 0%",
            visibility: placement ? "visible" : "hidden",
          }}
          onPointerEnter={(event) => {
            if (hover.enter(event)) ctx.cancel();
          }}
          onPointerLeave={(event) => {
            if (hover.leave(event)) ctx.scheduleClose();
          }}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null;
            if (
              next &&
              (event.currentTarget.contains(next) ||
                ctx.triggerRef.current?.contains(next))
            )
              return;
            ctx.close();
          }}
          className={cn(
            "fixed z-[100] w-72 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-[0_20px_44px_-14px_rgba(0,0,0,0.3)]",
            className,
          )}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
