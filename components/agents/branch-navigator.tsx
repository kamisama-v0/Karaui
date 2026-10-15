"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Children,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useState,
} from "react";
import { EASE_OUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

type Direction = 1 | -1;

interface BranchContextValue {
  index: number;
  count: number;
  direction: Direction;
  setIndex: (next: number) => void;
}

const BranchContext = createContext<BranchContextValue | null>(null);

/** Index state with the direction of the last move, controlled or not. */
function useBranchState(
  count: number,
  index: number | undefined,
  defaultIndex: number,
  onIndexChange: ((index: number) => void) | undefined,
) {
  const [internal, setInternal] = useState(defaultIndex);
  const raw = index ?? internal;
  const current = Math.max(0, Math.min(raw, Math.max(count - 1, 0)));
  // Derive direction from whichever source moved the index (render-time
  // derived state, so controlled updates slide the right way too).
  const [previous, setPrevious] = useState(current);
  const [direction, setDirection] = useState<Direction>(1);
  if (previous !== current) {
    setDirection(current > previous ? 1 : -1);
    setPrevious(current);
  }

  const setIndex = (next: number) => {
    const clamped = Math.max(0, Math.min(next, count - 1));
    if (clamped === current) return;
    if (index === undefined) setInternal(clamped);
    onIndexChange?.(clamped);
  };

  return { index: current, direction, setIndex };
}

export interface BranchesProps {
  /** Number of versions (match the `BranchContent` children). */
  count: number;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  children: ReactNode;
  className?: string;
}

/** Shares one version index between `BranchContent` and `BranchNavigator`. */
export function Branches({
  count,
  index,
  defaultIndex = 0,
  onIndexChange,
  children,
  className,
}: BranchesProps) {
  const state = useBranchState(count, index, defaultIndex, onIndexChange);
  return (
    <BranchContext.Provider value={{ ...state, count }}>
      <div data-slot="branches" className={cn("min-w-0", className)}>
        {children}
      </div>
    </BranchContext.Provider>
  );
}

export interface BranchContentProps {
  /** One child per version; only the active one renders. */
  children: ReactNode;
  className?: string;
}

const SLIDE = 28;

/** Renders the active version, sliding in from the side you navigated toward. */
export function BranchContent({ children, className }: BranchContentProps) {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("BranchContent must be used inside <Branches>.");
  const reduce = useReducedMotion() ?? false;
  const versions = Children.toArray(children);
  const active = versions[ctx.index] ?? null;

  return (
    <div data-slot="branch-content" className={cn("relative", className)}>
      <AnimatePresence initial={false} mode="popLayout" custom={ctx.direction}>
        <motion.div
          key={ctx.index}
          custom={ctx.direction}
          variants={{
            enter: (dir: Direction) =>
              reduce
                ? { opacity: 0 }
                : { opacity: 0, x: dir * SLIDE, filter: "blur(4px)" },
            center: { opacity: 1, x: 0, filter: "blur(0px)" },
            exit: (dir: Direction) =>
              reduce
                ? { opacity: 0, transition: { duration: 0.1 } }
                : {
                    opacity: 0,
                    x: dir * -SLIDE * 0.6,
                    filter: "blur(4px)",
                    transition: { duration: 0.14, ease: EASE_OUT },
                  },
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={
            reduce ? { duration: 0.15 } : { duration: 0.28, ease: EASE_OUT }
          }
        >
          {active}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export interface BranchNavigatorProps {
  /** Omit inside `Branches`; required standalone. */
  count?: number;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Noun used in labels, e.g. "response" → "Previous response". */
  label?: string;
  /** Hide the control when there is only one version. Default true. */
  hideWhenSingle?: boolean;
  className?: string;
}

/** "‹ 2 / 3 ›" switcher for regenerated or edited message versions. */
export function BranchNavigator(props: BranchNavigatorProps) {
  const ctx = useContext(BranchContext);
  if (ctx && props.count === undefined && props.index === undefined) {
    return <NavigatorView {...props} {...ctx} />;
  }
  return <StandaloneNavigator {...props} />;
}

function StandaloneNavigator({
  count = 1,
  index,
  defaultIndex = 0,
  onIndexChange,
  ...rest
}: BranchNavigatorProps) {
  const state = useBranchState(count, index, defaultIndex, onIndexChange);
  return <NavigatorView {...rest} {...state} count={count} />;
}

function NavigatorView({
  index,
  count,
  direction,
  setIndex,
  label = "version",
  hideWhenSingle = true,
  className,
}: BranchContextValue & Omit<BranchNavigatorProps, "count" | "index">) {
  const reduce = useReducedMotion() ?? false;
  if (hideWhenSingle && count <= 1) return null;

  const atStart = index <= 0;
  const atEnd = index >= count - 1;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let next: number | null = null;
    if (event.key === "ArrowLeft") next = index - 1;
    else if (event.key === "ArrowRight") next = index + 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next === null) return;
    event.preventDefault();
    const clamped = Math.max(0, Math.min(next, count - 1));
    setIndex(clamped);
    // Keep focus on a usable arrow once an edge disables the current one.
    const group = event.currentTarget.parentElement;
    const target =
      clamped <= 0
        ? group?.querySelector<HTMLButtonElement>("[data-branch-next]")
        : clamped >= count - 1
          ? group?.querySelector<HTMLButtonElement>("[data-branch-prev]")
          : null;
    if (target && target !== event.currentTarget) target.focus();
  };

  const arrow =
    "grid size-6 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35";

  return (
    <fieldset
      data-slot="branch-navigator"
      className={cn(
        "m-0 inline-flex min-w-0 items-center gap-0.5 border-0 p-0 text-xs text-muted-foreground",
        className,
      )}
    >
      <legend className="sr-only">{`${capitalize(label)}s`}</legend>
      <motion.button
        type="button"
        data-branch-prev=""
        aria-label={`Previous ${label}`}
        disabled={atStart}
        onClick={() => setIndex(index - 1)}
        onKeyDown={onKeyDown}
        whileTap={reduce ? undefined : { x: -2 }}
        transition={SPRING_SWAP}
        className={arrow}
      >
        <ChevronLeft aria-hidden="true" className="size-3.5" />
      </motion.button>
      <span
        aria-hidden="true"
        className="flex min-w-9 items-center justify-center gap-0.5 font-mono tabular-nums"
      >
        <span className="relative inline-grid overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.span
              key={index}
              custom={direction}
              variants={{
                enter: (dir: Direction) =>
                  reduce ? { opacity: 0 } : { opacity: 0, y: dir * 8 },
                center: { opacity: 1, y: 0 },
                exit: (dir: Direction) =>
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: dir * -8, transition: { duration: 0.12 } },
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduce ? { duration: 0.12 } : SPRING_SWAP}
              className="text-foreground"
            >
              {index + 1}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="text-muted-foreground/60">/</span>
        <span>{count}</span>
      </span>
      <span aria-live="polite" className="sr-only">
        {`${capitalize(label)} ${index + 1} of ${count}`}
      </span>
      <motion.button
        type="button"
        data-branch-next=""
        aria-label={`Next ${label}`}
        disabled={atEnd}
        onClick={() => setIndex(index + 1)}
        onKeyDown={onKeyDown}
        whileTap={reduce ? undefined : { x: 2 }}
        transition={SPRING_SWAP}
        className={arrow}
      >
        <ChevronRight aria-hidden="true" className="size-3.5" />
      </motion.button>
    </fieldset>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
