"use client";

import { Pause, Play } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface FeatureSectionItem {
  id: string;
  title: string;
  description: ReactNode;
  icon?: ReactNode;
  /** What the visual panel shows while this feature is active. */
  visual: ReactNode;
}

export interface FeatureSectionProps {
  features: FeatureSectionItem[];
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  /** Controlled active feature id. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** Advance through features on a timer. Default true. */
  autoplay?: boolean;
  /** Milliseconds per feature. Default 6000. */
  interval?: number;
  /** Visual panel side at wide sizes. Default "right". */
  visualPosition?: "left" | "right";
  /** Classes for the visual panel (set its height here). Default `h-72`. */
  visualClassName?: string;
  className?: string;
}

/**
 * Marketing features block: a vertical tab list of features beside a visual
 * panel that cross-fades and slides (in the direction of travel) to each
 * feature's visual. With `autoplay`, the active row fills a progress rail and
 * advances when it completes; hovering or focusing the block pauses it, and a
 * pause button stops it for good. Only runs while on screen.
 */
export function FeatureSection({
  features,
  eyebrow,
  heading,
  description,
  value: valueProp,
  defaultValue,
  onValueChange,
  autoplay = true,
  interval = 6000,
  visualPosition = "right",
  visualClassName,
  className,
}: FeatureSectionProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, { amount: 0.3 });
  const [internal, setInternal] = useState(defaultValue ?? features[0]?.id ?? "");
  const controlled = valueProp !== undefined;
  const active = controlled ? valueProp : internal;
  const [dir, setDir] = useState<1 | -1>(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const progress = useMotionValue(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = Math.max(
    0,
    features.findIndex((f) => f.id === active),
  );

  const select = useCallback(
    (index: number) => {
      const target = features[(index + features.length) % features.length];
      if (!target) return;
      setDir(index >= activeIndex ? 1 : -1);
      progress.set(0);
      if (!controlled) setInternal(target.id);
      onValueChange?.(target.id);
    },
    [features, activeIndex, controlled, onValueChange, progress],
  );

  const running = autoplay && !stopped && !hovered && !focused && inView && features.length > 1;

  // A frame loop owns the progress value so pausing holds the exact position.
  const selectRef = useRef(select);
  selectRef.current = select;
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = progress.get() + (now - last) / interval;
      last = now;
      if (next >= 1) {
        selectRef.current(activeIndex + 1);
      } else progress.set(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, interval, progress, activeIndex]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const map: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: features.length - 1,
    };
    if (!(event.key in map)) return;
    event.preventDefault();
    const next = (map[event.key] + features.length) % features.length;
    select(next);
    tabRefs.current[next]?.focus();
  };

  const current = features[activeIndex];
  const panelId = `${baseId}-panel`;
  const slide = {
    enter: (d: number) =>
      reduce ? { opacity: 0 } : { opacity: 0, y: d * 28, scale: 0.98 },
    center: { opacity: 1, y: 0, scale: 1 },
    exit: (d: number) =>
      reduce
        ? { opacity: 0 }
        : { opacity: 0, y: d * -28, scale: 0.98, transition: { duration: 0.2, ease: EASE_OUT } },
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover/focus only pause autoplay; the controls inside are real tabs and buttons.
    <section
      ref={rootRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className={cn("@container w-full", className)}
    >
      {eyebrow || heading || description ? (
        <header className="mb-6 max-w-xl">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          {heading ? (
            <h2 className="mt-1 text-2xl font-semibold tracking-tight @xl:text-3xl">{heading}</h2>
          ) : null}
          {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        </header>
      ) : null}

      <div
        className={cn(
          "grid gap-4 @xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] @xl:items-center",
          visualPosition === "left" && "@xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]",
        )}
      >
        <div className={cn("flex flex-col", visualPosition === "left" && "@xl:order-2")}>
          <div role="tablist" aria-orientation="vertical" aria-label="Features" className="flex flex-col gap-1">
            {features.map((feature, i) => {
              const isActive = i === activeIndex;
              return (
                <button
                  key={feature.id}
                  ref={(node) => {
                    tabRefs.current[i] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${feature.id}`}
                  aria-selected={isActive}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => select(i)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={cn(
                    "relative overflow-hidden rounded-xl py-3 pr-3 pl-5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                    isActive ? "bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  {/* Progress rail: a track with a fill scaled from the top. */}
                  <span aria-hidden className="absolute top-3 bottom-3 left-2 w-0.5 overflow-hidden rounded-full bg-foreground/10">
                    {isActive ? (
                      <motion.span
                        style={{ scaleY: autoplay ? progress : 1 }}
                        className="absolute inset-0 origin-top rounded-full bg-primary"
                      />
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2.5">
                    {feature.icon ? (
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-lg transition-colors [&_svg]:size-3.5",
                          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {feature.icon}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {feature.title}
                    </span>
                  </span>
                  <AnimatePresence initial={false}>
                    {isActive ? (
                      // Height animated on purpose: the open row has to push the
                      // rows below it down, which a transform can't do.
                      <motion.span
                        key="desc"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={reduce ? { duration: 0 } : { duration: 0.28, ease: EASE_OUT }}
                        className="block overflow-hidden"
                      >
                        <span
                          className={cn(
                            "block pt-1.5 text-xs leading-relaxed text-muted-foreground",
                            feature.icon && "pl-9.5",
                          )}
                        >
                          {feature.description}
                        </span>
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
          {autoplay && features.length > 1 ? (
            <button
              type="button"
              onClick={() => setStopped(!stopped)}
              aria-label={stopped ? "Resume autoplay" : "Pause autoplay"}
              className="mt-2 inline-flex h-7 items-center gap-1.5 self-start rounded-full px-2.5 text-[11px] text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            >
              {stopped ? <Play aria-hidden className="size-3" /> : <Pause aria-hidden className="size-3" />}
              {stopped ? "Play" : "Pause"}
            </button>
          ) : null}
        </div>

        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={current ? `${baseId}-tab-${current.id}` : undefined}
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border bg-muted/40",
            visualClassName ?? "h-72",
            visualPosition === "left" && "@xl:order-1",
          )}
        >
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            {current ? (
              <motion.div
                key={current.id}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="absolute inset-0"
              >
                {current.visual}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
