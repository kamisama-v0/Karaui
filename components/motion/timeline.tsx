"use client";

import {
  motion,
  type Transition,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
} from "react";

import { EASE_OUT, SPRING_GLIDE, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type TimelineStatus = "done" | "current" | "upcoming";

type TimelineContextValue = {
  root?: RefObject<HTMLElement | null>;
  reduce: boolean;
};

const TimelineContext = createContext<TimelineContextValue>({ reduce: false });

export interface TimelineProps {
  children: ReactNode;
  /**
   * Scroll container for contained scroll areas. Defaults to the viewport.
   * Drives both the line progress and each item's reveal.
   */
  scrollContainer?: RefObject<HTMLElement | null>;
  className?: string;
}

// Dot pop: a touch of overshoot so the marker lands with weight.
const DOT_POP: Transition = { type: "spring", stiffness: 520, damping: 22, mass: 0.6 };
const CONTENT_IN: Transition = { duration: 0.45, ease: EASE_OUT };
const PULSE: Transition = { duration: 1.6, ease: EASE_OUT, repeat: Number.POSITIVE_INFINITY };

export function Timeline({ children, scrollContainer, className }: TimelineProps) {
  const reduce = Boolean(useReducedMotion());
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    container: scrollContainer,
    // Line starts drawing as the list's top crosses 80% of the viewport and
    // completes when its end reaches the bottom edge.
    offset: ["start 0.8", "end end"],
  });
  const progress = useSpring(scrollYProgress, SPRING_GLIDE);

  return (
    <TimelineContext.Provider value={{ root: scrollContainer, reduce }}>
      <div className={cn("relative", className)}>
        <span
          aria-hidden
          className="pointer-events-none absolute top-2 bottom-2 left-[15.5px] w-px bg-border"
        />
        <motion.span
          aria-hidden
          className="pointer-events-none absolute top-2 bottom-2 left-[15.5px] w-px origin-top bg-foreground"
          style={{ scaleY: reduce ? 1 : progress }}
        />
        <ol ref={listRef} className="relative flex flex-col gap-8">
          {children}
        </ol>
      </div>
    </TimelineContext.Provider>
  );
}

export interface TimelineItemProps {
  title: ReactNode;
  date?: ReactNode;
  /** ISO date for the `<time>` element when `date` is a display string. */
  dateTime?: string;
  description?: ReactNode;
  icon?: ReactNode;
  status?: TimelineStatus;
  /** Extra content under the description (tags, links). */
  children?: ReactNode;
  className?: string;
}

const STATUS_LABEL: Record<TimelineStatus, string> = {
  done: "Completed",
  current: "In progress",
  upcoming: "Upcoming",
};

export function TimelineItem({
  title,
  date,
  dateTime,
  description,
  icon,
  status,
  children,
  className,
}: TimelineItemProps) {
  const { root, reduce } = useContext(TimelineContext);
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { root, once: true, amount: 0.4 });
  const shown = inView || reduce;

  return (
    <li
      ref={ref}
      aria-current={status === "current" ? "step" : undefined}
      className={cn("relative flex gap-4", className)}
    >
      <div className="relative z-10 grid size-8 shrink-0 place-items-center">
        {status === "current" && !reduce ? (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-foreground/25"
            initial={{ scale: 1, opacity: 0 }}
            animate={shown ? { scale: [1, 1.7], opacity: [0.6, 0] } : undefined}
            transition={PULSE}
          />
        ) : null}
        {status === "current" && reduce ? (
          <span aria-hidden className="absolute -inset-1 rounded-full border border-foreground/30" />
        ) : null}
        <motion.span
          aria-hidden
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: shown ? 1 : 0 }}
          transition={DOT_POP}
          className={cn(
            "relative grid size-8 place-items-center rounded-full border text-[13px] [&>svg]:size-3.5",
            status === "done" && "border-foreground bg-foreground text-background",
            status === "current" && "border-foreground bg-background text-foreground",
            (status === "upcoming" || !status) && "border-border bg-background text-muted-foreground",
          )}
        >
          {icon ?? (
            <span
              className={cn(
                "size-2 rounded-full",
                status === "done" ? "bg-background" : status === "current" ? "bg-foreground" : "bg-muted-foreground/50",
              )}
            />
          )}
        </motion.span>
      </div>

      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
        animate={shown ? { opacity: 1, x: 0 } : undefined}
        transition={reduce ? { duration: 0.2 } : { ...CONTENT_IN, x: SPRING_SWAP }}
        className="min-w-0 flex-1 pt-1"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {date ? (
            <time dateTime={dateTime} className="text-xs tabular-nums text-muted-foreground">
              {date}
            </time>
          ) : null}
          {status ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-[10px] font-medium",
                status === "current" ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          ) : null}
        </div>
        <h3 className="mt-1 text-sm font-medium text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </motion.div>
    </li>
  );
}
