"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

// ScrollArea keeps the browser's own scrolling (wheel, touch momentum,
// keyboard, scroll anchoring, find-in-page) and only replaces the *painted*
// scrollbar: the native bar is hidden and an overlay thumb is drawn on top.
// The thumb is a visual affordance (aria-hidden); keyboard and assistive tech
// scroll the focusable viewport itself.

export type ScrollAreaOrientation = "vertical" | "horizontal" | "both";
/** `hover`: visible while hovered or scrolling. `scroll`: only while scrolling. `always`: whenever content overflows. */
export type ScrollAreaType = "hover" | "scroll" | "always";

export interface ScrollAreaProps extends Omit<HTMLAttributes<HTMLDivElement>, "dir"> {
  children?: ReactNode;
  orientation?: ScrollAreaOrientation;
  type?: ScrollAreaType;
  /** Milliseconds of idle before the thumb fades out. */
  scrollHideDelay?: number;
  /** Fade the content out at edges that have more content beyond them. */
  fadeEdges?: boolean;
  /** Maximum fade length in px; it grows with the distance from the edge. */
  fadeSize?: number;
  /** Class for the scrolling viewport (padding usually belongs here). */
  viewportClassName?: string;
  /** Ref to the native scroll container, for `scrollTo` or virtualizers. */
  viewportRef?: Ref<HTMLElement | null>;
  /** Accessible name for the focusable scroll region. */
  "aria-label"?: string;
}

const MIN_THUMB = 24;
const TRACK_INSET = 2;
/** Fraction of the visible size a track click pages by (keeps a little context). */
const PAGE_FACTOR = 0.9;

type Axis = "x" | "y";

export function ScrollArea({
  children,
  orientation = "vertical",
  type = "hover",
  scrollHideDelay = 700,
  fadeEdges = true,
  fadeSize = 28,
  className,
  viewportClassName,
  viewportRef,
  "aria-label": ariaLabel,
  onPointerEnter,
  onPointerLeave,
  ...rest
}: ScrollAreaProps) {
  const reduce = useReducedMotion();
  const viewport = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const thumbs = useRef<Record<Axis, HTMLDivElement | null>>({ x: null, y: null });
  const tracks = useRef<Record<Axis, HTMLDivElement | null>>({ x: null, y: null });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovering = useRef(false);
  const dragging = useRef<{
    axis: Axis;
    pointer: number;
    scroll: number;
    ratio: number;
  } | null>(null);

  const [overflow, setOverflow] = useState({ x: false, y: false });
  const [visible, setVisible] = useState(false);

  useImperativeHandle(viewportRef, () => viewport.current as HTMLElement, []);

  const allowX = orientation !== "vertical";
  const allowY = orientation !== "horizontal";

  // Geometry is written straight to the DOM on every scroll frame so a long
  // list never re-renders React while scrolling.
  const update = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = el;
    const hasY = allowY && scrollHeight - clientHeight > 1;
    const hasX = allowX && scrollWidth - clientWidth > 1;
    setOverflow((prev) => (prev.x === hasX && prev.y === hasY ? prev : { x: hasX, y: hasY }));

    const place = (axis: Axis) => {
      const thumb = thumbs.current[axis];
      const track = tracks.current[axis];
      if (!thumb || !track) return;
      const trackLen = axis === "y" ? track.clientHeight : track.clientWidth;
      const view = axis === "y" ? clientHeight : clientWidth;
      const total = axis === "y" ? scrollHeight : scrollWidth;
      const pos = axis === "y" ? scrollTop : scrollLeft;
      const len = Math.max(MIN_THUMB, Math.min(trackLen, (view / total) * trackLen));
      const max = total - view;
      const offset = max > 0 ? (pos / max) * (trackLen - len) : 0;
      // The thumb's length is set (not animated) whenever content resizes;
      // its motion along the track is a transform.
      if (axis === "y") {
        thumb.style.height = `${len}px`;
        thumb.style.transform = `translate3d(0, ${offset}px, 0)`;
      } else {
        thumb.style.width = `${len}px`;
        thumb.style.transform = `translate3d(${offset}px, 0, 0)`;
      }
    };
    if (hasY) place("y");
    if (hasX) place("x");

    if (fadeEdges) {
      // Fade length tracks the distance to each edge, so the mask eases in
      // and out as you leave or reach an end instead of popping.
      const top = hasY ? Math.min(fadeSize, scrollTop) : 0;
      const bottom = hasY ? Math.min(fadeSize, scrollHeight - clientHeight - scrollTop) : 0;
      const left = hasX ? Math.min(fadeSize, scrollLeft) : 0;
      const right = hasX ? Math.min(fadeSize, scrollWidth - clientWidth - scrollLeft) : 0;
      el.style.setProperty("--sa-top", `${Math.max(0, top)}px`);
      el.style.setProperty("--sa-bottom", `${Math.max(0, bottom)}px`);
      el.style.setProperty("--sa-left", `${Math.max(0, left)}px`);
      el.style.setProperty("--sa-right", `${Math.max(0, right)}px`);
    }
  }, [allowX, allowY, fadeEdges, fadeSize]);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (dragging.current) return;
      if (type === "hover" && hovering.current) return;
      setVisible(false);
    }, scrollHideDelay);
  }, [scrollHideDelay, type]);

  const reveal = useCallback(() => {
    setVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    const el = viewport.current;
    const inner = content.current;
    if (!el || !inner) return;
    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [update]);

  // Bars mount only once overflow is known; place their thumbs right after.
  useEffect(() => {
    if (overflow.x || overflow.y) update();
  }, [overflow.x, overflow.y, update]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const onScroll = () => {
    update();
    if (type !== "always") reveal();
  };

  const startDrag = (axis: Axis) => (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewport.current;
    const track = tracks.current[axis];
    const thumb = thumbs.current[axis];
    if (!el || !track || !thumb || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const trackLen = axis === "y" ? track.clientHeight : track.clientWidth;
    const thumbLen = axis === "y" ? thumb.offsetHeight : thumb.offsetWidth;
    const max = axis === "y" ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
    dragging.current = {
      axis,
      pointer: axis === "y" ? event.clientY : event.clientX,
      scroll: axis === "y" ? el.scrollTop : el.scrollLeft,
      ratio: trackLen - thumbLen > 0 ? max / (trackLen - thumbLen) : 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setVisible(true);
    clearTimeout(hideTimer.current);
  };

  const onDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragging.current;
    const el = viewport.current;
    if (!drag || !el) return;
    const delta = (drag.axis === "y" ? event.clientY : event.clientX) - drag.pointer;
    if (drag.axis === "y") el.scrollTop = drag.scroll + delta * drag.ratio;
    else el.scrollLeft = drag.scroll + delta * drag.ratio;
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (type !== "always") scheduleHide();
  };

  // Clicking the empty track pages one viewport toward the click, like a
  // native scrollbar track.
  const pageTrack = (axis: Axis) => (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewport.current;
    const thumb = thumbs.current[axis];
    if (!el || !thumb || event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault();
    const rect = thumb.getBoundingClientRect();
    const before = axis === "y" ? event.clientY < rect.top : event.clientX < rect.left;
    const page = (axis === "y" ? el.clientHeight : el.clientWidth) * PAGE_FACTOR;
    const amount = before ? -page : page;
    el.scrollBy({
      top: axis === "y" ? amount : 0,
      left: axis === "x" ? amount : 0,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const fade = "linear-gradient(to bottom, transparent 0, black var(--sa-top), black calc(100% - var(--sa-bottom)), transparent 100%)";
  const fadeX = "linear-gradient(to right, transparent 0, black var(--sa-left), black calc(100% - var(--sa-right)), transparent 100%)";
  const mask = fadeEdges
    ? allowX && allowY
      ? `${fade}, ${fadeX}`
      : allowX
        ? fadeX
        : fade
    : undefined;
  const viewportStyle: CSSProperties | undefined = mask
    ? ({
        "--sa-top": "0px",
        "--sa-bottom": "0px",
        "--sa-left": "0px",
        "--sa-right": "0px",
        maskImage: mask,
        WebkitMaskImage: mask,
        maskComposite: allowX && allowY ? "intersect" : undefined,
        WebkitMaskComposite: allowX && allowY ? "source-in" : undefined,
      } as CSSProperties)
    : undefined;

  const shown = type === "always" || visible;
  const both = overflow.x && overflow.y;

  const renderBar = (axis: Axis) => (
    <motion.div
      aria-hidden
      ref={(node: HTMLDivElement | null) => {
        tracks.current[axis] = node;
      }}
      data-orientation={axis === "y" ? "vertical" : "horizontal"}
      initial={false}
      animate={{ opacity: shown ? 1 : 0 }}
      transition={{ duration: shown ? 0.15 : 0.3, ease: EASE_OUT }}
      onPointerDown={pageTrack(axis)}
      className={cn(
        "group/scroll-track absolute z-10 flex touch-none select-none",
        !shown && "pointer-events-none",
        axis === "y" ? "w-2.5 justify-center" : "h-2.5 flex-col justify-center",
      )}
      style={
        axis === "y"
          ? { top: TRACK_INSET, right: TRACK_INSET, bottom: both ? 12 : TRACK_INSET }
          : { left: TRACK_INSET, bottom: TRACK_INSET, right: both ? 12 : TRACK_INSET }
      }
    >
      <div
        ref={(node) => {
          thumbs.current[axis] = node;
        }}
        onPointerDown={startDrag(axis)}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          "absolute rounded-full bg-foreground/25 transition-colors hover:bg-foreground/45 active:bg-foreground/55 will-change-transform",
          axis === "y" ? "top-0 w-1.5 group-hover/scroll-track:w-2" : "left-0 h-1.5 group-hover/scroll-track:h-2",
        )}
      />
    </motion.div>
  );

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        hovering.current = true;
        if (type === "hover") {
          setVisible(true);
          clearTimeout(hideTimer.current);
        }
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        hovering.current = false;
        if (type === "hover") scheduleHide();
      }}
      {...rest}
    >
      {/* The viewport is focusable (tabIndex 0) so keyboard users can scroll
          it (WCAG 2.1.1); pass `aria-label` to name the region. */}
      <section
        ref={viewport}
        aria-label={ariaLabel}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container must be focusable for keyboard scrolling (WCAG 2.1.1).
        tabIndex={0}
        onScroll={onScroll}
        style={viewportStyle}
        className={cn(
          "size-full outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
          allowY ? "overflow-y-auto" : "overflow-y-hidden",
          allowX ? "overflow-x-auto" : "overflow-x-hidden",
          viewportClassName,
        )}
      >
        {/* Horizontal content is laid out at its own width so the observer
            sees it grow; vertical content keeps the viewport's width. */}
        <div ref={content} className={cn(allowX ? "w-max min-w-full" : "min-w-full")}>
          {children}
        </div>
      </section>
      {overflow.y ? renderBar("y") : null}
      {overflow.x ? renderBar("x") : null}
    </div>
  );
}
