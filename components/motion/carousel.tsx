"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import {
  type AnimationPlaybackControls,
  animate,
  LayoutGroup,
  type MotionValue,
  motion,
  type PanInfo,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  Children,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { TOUCH_GESTURE_CONTENT_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

export type CarouselIndicators = "dots" | "thumbnails" | "none";

export interface CarouselProps {
  /** One child per slide. */
  children: ReactNode;
  /** Controlled index of the first visible slide. */
  index?: number;
  /** Initial index for uncontrolled use. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Wrap past either end. Seamless when there are at least `slidesPerView + 2` slides. */
  loop?: boolean;
  /** Advance automatically; `true` = every 5000ms, or pass the interval in ms. Pauses on hover, focus, drag and hidden tabs; off under reduced motion. */
  autoplay?: boolean | number;
  /** Slides shown at once: a number, or `{ minContainerWidthPx: count }`, e.g. `{ 0: 1, 480: 2, 768: 3 }`. */
  slidesPerView?: number | Record<number, number>;
  /** Space between slides in px. */
  gap?: number;
  indicators?: CarouselIndicators;
  /** Thumbnail content per position, for `indicators="thumbnails"`. */
  renderThumbnail?: (index: number) => ReactNode;
  /** Render previous / next buttons. */
  showControls?: boolean;
  /** Accessible name of the carousel. */
  "aria-label"?: string;
  /** Accessible name per slide. */
  getSlideLabel?: (index: number, count: number) => string;
  className?: string;
  slideClassName?: string;
}

const DEFAULT_INTERVAL = 5000;
/** How far ahead a release velocity projects, in seconds (flick momentum). */
const MOMENTUM_TIME = 0.22;
/** Most slides a single flick may travel. */
const MAX_FLING = 3;
/** Past an edge the track gives at most this fraction of a slide (rubber band). */
const EDGE_GIVE = 0.4;
/** Release velocity (px/s) that counts as a flick even over a short distance. */
const FLICK_VELOCITY = 320;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function resolvePerView(
  value: CarouselProps["slidesPerView"],
  width: number,
): number {
  if (typeof value === "number") return Math.max(1, Math.floor(value));
  if (!value) return 1;
  const points = Object.keys(value)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  let result = points.length > 0 ? value[points[0]] : 1;
  for (const point of points) if (width >= point) result = value[point];
  return Math.max(1, Math.floor(result));
}

/** Elastic overshoot: grows quickly at first, then asymptotes at EDGE_GIVE. */
function rubber(overshoot: number) {
  return EDGE_GIVE * (1 - 1 / (1 + overshoot));
}

export function Carousel({
  children,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  loop = false,
  autoplay = false,
  slidesPerView = 1,
  gap = 16,
  indicators = "dots",
  renderThumbnail,
  showControls = true,
  "aria-label": ariaLabel = "Carousel",
  getSlideLabel = (i, n) => `${i + 1} of ${n}`,
  className,
  slideClassName,
}: CarouselProps) {
  const reduce = useReducedMotion() ?? false;
  const slides = Children.toArray(children);
  const count = slides.length;
  const groupId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);

  // Measured viewport width; 0 on the server, so the first client pass matches.
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const perView = Math.min(resolvePerView(slidesPerView, width), Math.max(1, count));
  // Seamless wrap needs a spare slide on each side of the visible window.
  const wrap = loop && count >= perView + 2;
  const positions = wrap ? count : Math.max(1, count - perView + 1);
  const maxIndex = positions - 1;

  const [internal, setInternal] = useState(defaultIndex);
  const controlled = indexProp !== undefined;
  const raw = controlled ? indexProp : internal;
  const current = Math.min(Math.max(0, Math.round(raw)), maxIndex);

  const commit = useCallback(
    (next: number) => {
      if (!controlled) setInternal(next);
      onIndexChange?.(next);
    },
    [controlled, onIndexChange],
  );

  // `pos` is the track position in slides (fractional mid-drag, unbounded when
  // wrapping); `step` is one slide plus gap in px.
  const pos = useMotionValue(current);
  const step = useMotionValue(0);
  const targetRef = useRef(current);
  const animationRef = useRef<AnimationPlaybackControls | null>(null);

  useLayoutEffect(() => {
    step.set(width > 0 ? (width + gap) / perView : 0);
  }, [width, gap, perView, step]);

  const animateTo = useCallback(
    (target: number, velocity = 0) => {
      targetRef.current = target;
      animationRef.current?.stop();
      if (reduce) {
        pos.set(wrap ? mod(target, count) : target);
        targetRef.current = wrap ? mod(target, count) : target;
        return;
      }
      animationRef.current = animate(pos, target, {
        ...SPRING_LAYOUT,
        velocity,
        onComplete: () => {
          // Wrapped positions are visually identical, so fold back silently.
          if (wrap && targetRef.current === target) {
            const folded = mod(target, count);
            targetRef.current = folded;
            pos.set(folded);
          }
        },
      });
    },
    [reduce, pos, wrap, count],
  );

  const goTo = useCallback(
    (target: number, velocity = 0) => {
      const clamped = wrap ? target : Math.min(Math.max(0, target), maxIndex);
      animateTo(clamped, velocity);
      const next = wrap ? mod(clamped, count) : clamped;
      if (next !== current) commit(next);
    },
    [wrap, maxIndex, animateTo, count, current, commit],
  );

  // Follow external index changes (controlled prop, clamping after a resize).
  useEffect(() => {
    const t = Math.round(targetRef.current);
    const settled = wrap ? mod(t, count) : t;
    if (settled === current) return;
    let target = current;
    if (wrap) {
      let delta = current - settled;
      if (delta > count / 2) delta -= count;
      if (delta < -count / 2) delta += count;
      target = t + delta;
    }
    animateTo(target);
  }, [current, wrap, count, animateTo]);

  const canPrev = loop || current > 0;
  const canNext = loop || current < maxIndex;

  const next = useCallback(() => {
    if (positions <= 1) return;
    if (wrap) goTo(Math.round(targetRef.current) + 1);
    else goTo(current >= maxIndex ? (loop ? 0 : maxIndex) : current + 1);
  }, [positions, wrap, goTo, current, maxIndex, loop]);

  const prev = useCallback(() => {
    if (positions <= 1) return;
    if (wrap) goTo(Math.round(targetRef.current) - 1);
    else goTo(current <= 0 ? (loop ? maxIndex : 0) : current - 1);
  }, [positions, wrap, goTo, current, maxIndex, loop]);

  const jumpTo = useCallback(
    (i: number) => {
      if (!wrap) return goTo(i);
      const base = Math.round(targetRef.current);
      let delta = i - mod(base, count);
      if (delta > count / 2) delta -= count;
      if (delta < -count / 2) delta += count;
      goTo(base + delta);
    },
    [wrap, goTo, count],
  );

  /* ---- drag (motion pan) ---- */

  const dragStart = useRef(0);
  const [dragging, setDragging] = useState(false);
  const suppressClick = useRef(false);

  const onPanStart = () => {
    animationRef.current?.stop();
    dragStart.current = pos.get();
    suppressClick.current = true;
    setDragging(true);
  };

  const onPan = (_: PointerEvent, info: PanInfo) => {
    const s = step.get();
    if (!s) return;
    const rawPos = dragStart.current - info.offset.x / s;
    if (wrap) {
      pos.set(rawPos);
      return;
    }
    if (rawPos < 0) pos.set(-rubber(-rawPos));
    else if (rawPos > maxIndex) pos.set(maxIndex + rubber(rawPos - maxIndex));
    else pos.set(rawPos);
  };

  const onPanEnd = (_: PointerEvent, info: PanInfo) => {
    setDragging(false);
    // Let the click that ends this drag land first, then re-enable clicks.
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    const s = step.get();
    if (!s) return;
    const start = Math.round(dragStart.current);
    const v = info.velocity.x;
    let target: number;
    if (reduce) {
      // No momentum: one slide in the drag direction past a small threshold.
      const moved = info.offset.x / s;
      target = Math.abs(moved) > 0.2 ? start - Math.sign(moved) : start;
    } else {
      const projected = pos.get() - (v * MOMENTUM_TIME) / s;
      target = Math.round(projected);
      if (target === start && Math.abs(v) > FLICK_VELOCITY) {
        target = start - Math.sign(v);
      }
      target = Math.min(start + MAX_FLING, Math.max(start - MAX_FLING, target));
    }
    goTo(target, reduce ? 0 : -v / s);
  };

  /* ---- autoplay ---- */

  const interval =
    autoplay === true ? DEFAULT_INTERVAL : autoplay ? Math.max(1000, autoplay) : 0;
  const [stopped, setStopped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const autoplayOn = interval > 0 && !reduce && positions > 1 && !stopped;
  const paused = hovered || focused || tabHidden || dragging;

  useEffect(() => {
    const update = () => setTabHidden(document.visibilityState === "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const progress = useMotionValue(0);
  const elapsed = useRef(0);
  const nextRef = useRef(next);
  nextRef.current = next;
  const runningRef = useRef(false);
  runningRef.current = autoplayOn && !paused;

  // biome-ignore lint/correctness/useExhaustiveDependencies: restart the timer on every slide change.
  useEffect(() => {
    elapsed.current = 0;
    progress.set(0);
  }, [current, autoplayOn, progress]);

  useAnimationFrame((_, delta) => {
    if (!runningRef.current) return;
    elapsed.current += delta;
    if (elapsed.current >= interval) {
      elapsed.current = 0;
      progress.set(0);
      nextRef.current();
    } else {
      progress.set(elapsed.current / interval);
    }
  });

  /* ---- keyboard ---- */

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
    )
      return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "Home") {
      e.preventDefault();
      jumpTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      jumpTo(maxIndex);
    }
  };

  const isVisible = (i: number) => {
    const offset = wrap ? mod(i - current + 1, count) - 1 : i - current;
    return offset >= 0 && offset < perView;
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setFocused(false);
      }}
      className={cn("relative flex w-full flex-col gap-3", className)}
    >
      <div className="relative">
        <motion.div
          ref={viewportRef}
          onPanStart={onPanStart}
          onPan={onPan}
          onPanEnd={onPanEnd}
          onClickCapture={(e) => {
            if (!suppressClick.current) return;
            e.preventDefault();
            e.stopPropagation();
          }}
          className={cn(
            "relative overflow-hidden",
            // Vertical page scroll stays native; horizontal belongs to the pan.
            "touch-pan-y",
            TOUCH_GESTURE_CONTENT_CLASS,
            dragging ? "cursor-grabbing select-none" : "cursor-grab",
          )}
        >
          <div className="flex items-stretch" style={{ gap }}>
            {slides.map((slide, i) => (
              <Slide
                // biome-ignore lint/suspicious/noArrayIndexKey: slides are positional.
                key={i}
                index={i}
                count={count}
                wrap={wrap}
                pos={pos}
                step={step}
                perView={perView}
                gap={gap}
                visible={isVisible(i)}
                label={getSlideLabel(i, count)}
                className={slideClassName}
              >
                {slide}
              </Slide>
            ))}
          </div>
        </motion.div>

        {showControls && positions > 1 ? (
          <>
            <NavButton
              side="prev"
              disabled={!canPrev}
              onClick={prev}
              reduce={reduce}
            />
            <NavButton
              side="next"
              disabled={!canNext}
              onClick={next}
              reduce={reduce}
            />
          </>
        ) : null}
      </div>

      {indicators !== "none" && positions > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {interval > 0 && !reduce ? (
            <button
              type="button"
              onClick={() => setStopped((s) => !s)}
              aria-label={stopped ? "Start automatic slide show" : "Stop automatic slide show"}
              className="grid size-6 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {stopped ? <Play className="size-3" /> : <Pause className="size-3" />}
            </button>
          ) : null}
          <LayoutGroup id={groupId}>
            {indicators === "dots" ? (
              <div className="flex items-center">
                {Array.from({ length: positions }, (_, i) => {
                  const active = i === current;
                  return (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: positions are positional.
                      key={i}
                      type="button"
                      aria-label={`Go to slide ${i + 1}`}
                      aria-current={active ? "true" : undefined}
                      onClick={() => jumpTo(i)}
                      className="group relative grid h-6 w-6 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <span className="size-1.5 rounded-full bg-muted-foreground/40 transition-colors group-hover:bg-muted-foreground/70" />
                      {active ? (
                        <motion.span
                          layoutId="carousel-dot"
                          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                          className="absolute inset-x-0.5 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-foreground/25"
                        >
                          <ProgressFill
                            progress={progress}
                            running={autoplayOn}
                            className="bg-foreground"
                          />
                        </motion.span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex max-w-full items-center gap-1.5 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {Array.from({ length: positions }, (_, i) => {
                  const active = i === current;
                  return (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: positions are positional.
                      key={i}
                      type="button"
                      aria-label={`Go to slide ${i + 1}`}
                      aria-current={active ? "true" : undefined}
                      onClick={() => jumpTo(i)}
                      className={cn(
                        "relative h-10 w-14 shrink-0 overflow-hidden rounded-md outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring/50",
                        active ? "opacity-100" : "opacity-55 hover:opacity-90",
                      )}
                    >
                      <span className="pointer-events-none block size-full">
                        {renderThumbnail?.(i) ?? (
                          <span className="grid size-full place-items-center bg-muted text-muted-foreground text-xs tabular-nums">
                            {i + 1}
                          </span>
                        )}
                      </span>
                      {active ? (
                        <motion.span
                          layoutId="carousel-thumb"
                          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                          className="pointer-events-none absolute inset-0 overflow-hidden rounded-md ring-2 ring-primary ring-inset"
                        >
                          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/30">
                            <ProgressFill
                              progress={progress}
                              running={autoplayOn}
                              className="bg-primary"
                            />
                          </span>
                        </motion.span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </LayoutGroup>
        </div>
      ) : null}

      <div aria-live={autoplayOn && !paused ? "off" : "polite"} className="sr-only">
        {count > 0 ? `Slide ${current + 1} of ${positions}` : ""}
      </div>
    </section>
  );
}

function Slide({
  index,
  count,
  wrap,
  pos,
  step,
  perView,
  gap,
  visible,
  label,
  className,
  children,
}: {
  index: number;
  count: number;
  wrap: boolean;
  pos: MotionValue<number>;
  step: MotionValue<number>;
  perView: number;
  gap: number;
  visible: boolean;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  // Each slide sits at its natural flex slot (index * step) and is shifted to
  // its slot relative to the track position. When wrapping, the offset is
  // folded into [-1, count - 1) so a slide leaving one edge re-enters the other.
  const x = useTransform([pos, step], ([p, s]: number[]) => {
    let offset = index - p;
    if (wrap) offset = mod(offset + 1, count) - 1;
    return (offset - index) * s;
  });
  return (
    <motion.div
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      inert={!visible}
      style={{
        x,
        width: `calc((100% - ${gap * (perView - 1)}px) / ${perView})`,
      }}
      className={cn("shrink-0", className)}
    >
      {children}
    </motion.div>
  );
}

function ProgressFill({
  progress,
  running,
  className,
}: {
  progress: MotionValue<number>;
  running: boolean;
  className?: string;
}) {
  if (!running) return <span className={cn("absolute inset-0", className)} />;
  return (
    <motion.span
      aria-hidden
      className={cn("absolute inset-0 origin-left", className)}
      style={{ scaleX: progress }}
    />
  );
}

function NavButton({
  side,
  disabled,
  onClick,
  reduce,
}: {
  side: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
  reduce: boolean;
}) {
  const isPrev = side === "prev";
  const Icon = isPrev ? ChevronLeft : ChevronRight;
  return (
    <motion.button
      type="button"
      aria-label={isPrev ? "Previous slide" : "Next slide"}
      disabled={disabled}
      onClick={onClick}
      whileTap={reduce ? undefined : { scale: 0.9 }}
      transition={SPRING_PRESS}
      className={cn(
        "-translate-y-1/2 absolute top-1/2 grid size-9 place-items-center rounded-full border border-border bg-background/85 text-foreground shadow-sm outline-none backdrop-blur-sm transition-[opacity,background-color] hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-0",
        isPrev ? "left-2" : "right-2",
      )}
    >
      <Icon className="size-4" />
    </motion.button>
  );
}
