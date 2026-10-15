"use client";

import { X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  PresenceContext,
  useAnimate,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning";

export type BadgeSize = "sm" | "md" | "lg";

/** Soft tinted surface or a filled one. Only the status variants differ. */
export type BadgeTone = "soft" | "solid";

const BASE: Record<"default" | "secondary" | "outline", string> = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-foreground/[0.07] text-foreground",
  outline: "border-border-strong bg-transparent text-foreground",
};

// Status tints mix the token toward --foreground/--background (as `alert`
// does), so the text keeps its contrast in both themes and every design style.
const SOFT: Record<"destructive" | "success" | "warning", string> = {
  destructive:
    "border-[color-mix(in_oklab,var(--destructive)_30%,transparent)] bg-[color-mix(in_oklab,var(--destructive)_10%,var(--background))] text-[color-mix(in_oklab,var(--destructive)_78%,var(--foreground))]",
  success:
    "border-[color-mix(in_oklab,var(--success)_32%,transparent)] bg-[color-mix(in_oklab,var(--success)_11%,var(--background))] text-[color-mix(in_oklab,var(--success)_60%,var(--foreground))]",
  warning:
    "border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[color-mix(in_oklab,var(--warning)_13%,var(--background))] text-[color-mix(in_oklab,var(--warning)_52%,var(--foreground))]",
};

// Filled status badges. Red reads best with light text in both themes;
// green and amber are light hues, so they always get dark text.
const SOLID: Record<"destructive" | "success" | "warning", string> = {
  destructive:
    "border-transparent bg-destructive text-background dark:text-foreground",
  success:
    "border-transparent bg-success text-[color-mix(in_oklab,var(--success)_22%,var(--foreground))] dark:text-[color-mix(in_oklab,var(--success)_22%,var(--background))]",
  warning:
    "border-transparent bg-warning text-[color-mix(in_oklab,var(--warning)_22%,var(--foreground))] dark:text-[color-mix(in_oklab,var(--warning)_22%,var(--background))]",
};

const SIZE: Record<BadgeSize, string> = {
  sm: "h-5 gap-1 px-1.5 text-[11px] [&_svg]:size-3",
  md: "h-6 gap-1.5 px-2 text-xs [&_svg]:size-3.5",
  lg: "h-7 gap-1.5 px-2.5 text-[13px] [&_svg]:size-3.5",
};

// Count badges are circles at one digit and pills beyond.
const COUNT_SIZE: Record<BadgeSize, string> = {
  sm: "h-4 min-w-4 px-1 text-[10px]",
  md: "h-5 min-w-5 px-1.5 text-[11px]",
  lg: "h-6 min-w-6 px-1.5 text-xs",
};

function variantClass(variant: BadgeVariant, tone: BadgeTone) {
  if (variant === "default" || variant === "secondary" || variant === "outline") {
    return BASE[variant];
  }
  return tone === "solid" ? SOLID[variant] : SOFT[variant];
}

export interface BadgeProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  /** Status variants only (destructive/success/warning). Default "soft". */
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Leading status dot in the text color; `"pulse"` adds a radiating ring. */
  dot?: boolean | "pulse";
  /** Leading icon (sized to the badge). Ignored when `dot` is set. */
  icon?: ReactNode;
  /**
   * Makes the badge removable: an × button plays the exit, then calls this.
   * Focus moves to the neighbouring chip's × when the removal came from it.
   */
  onRemove?: () => void;
  /** Accessible name of the × button. Default `Remove <text>`. */
  removeLabel?: string;
  /**
   * Count mode: renders a compact number that rolls up or down as it changes
   * and bumps when it rises. Hidden at 0 unless `showZero`.
   */
  count?: number;
  /** Counts above this read "max+". Default 99. */
  max?: number;
  showZero?: boolean;
  /** Spoken label for count mode, e.g. `(n) => \`${n} unread\``. */
  countLabel?: (count: number) => string;
  className?: string;
}

/**
 * General-purpose badge: six variants, three sizes, an optional (pulsing) dot
 * or icon, removable chips with an exit animation, and a count mode with
 * rolling digits capped at "99+". For animated status transitions
 * (loading → success) use `AnimatedBadge` instead.
 */
export function Badge(props: BadgeProps) {
  if (props.count !== undefined) return <CountBadge {...props} count={props.count} />;
  return <LabelBadge {...props} />;
}

/* -------------------------------------------------------------------------- */
/*                                 Label badge                                */
/* -------------------------------------------------------------------------- */

function LabelBadge({
  children,
  variant = "default",
  tone = "soft",
  size = "md",
  dot = false,
  icon,
  onRemove,
  removeLabel,
  className,
}: BadgeProps) {
  const reduce = useReducedMotion() ?? false;
  // Inside an AnimatePresence the badge pops in when added; anywhere else it
  // renders as-is so server HTML is visible before hydration.
  const inPresence = useContext(PresenceContext) !== null;
  const rootRef = useRef<HTMLSpanElement>(null);
  const [leaving, setLeaving] = useState(false);
  const refocus = useRef<HTMLElement | null>(null);
  const removable = Boolean(onRemove);

  const hidden = reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 };

  const startRemove = (fromKeyboardFocus: boolean) => {
    if (leaving) return;
    if (fromKeyboardFocus) refocus.current = neighbourRemoveButton(rootRef.current);
    setLeaving(true);
  };

  const finishRemove = () => {
    if (!leaving) return;
    const target = refocus.current;
    refocus.current = null;
    onRemove?.();
    if (target) requestAnimationFrame(() => target.focus({ preventScroll: true }));
  };

  const text = typeof children === "string" ? children : undefined;

  return (
    <motion.span
      ref={rootRef}
      data-badge=""
      // Siblings glide into the gap a removed chip leaves (transform-only).
      layout={removable && !reduce ? "position" : false}
      initial={inPresence ? hidden : false}
      animate={
        leaving
          ? { ...hidden, pointerEvents: "none" }
          : { opacity: 1, scale: 1, pointerEvents: "auto" }
      }
      // Already faded out by the × — leave at once so siblings close the gap.
      exit={{
        ...hidden,
        pointerEvents: "none",
        transition: { duration: leaving ? 0 : 0.12, ease: EASE_OUT },
      }}
      transition={
        leaving
          ? { duration: 0.14, ease: EASE_OUT }
          : reduce
            ? { duration: 0.12 }
            : { ...SPRING_PANEL, layout: SPRING_LAYOUT }
      }
      onAnimationComplete={finishRemove}
      className={cn(
        "inline-flex shrink-0 select-none items-center whitespace-nowrap rounded-full border font-medium leading-none",
        SIZE[size],
        variantClass(variant, tone),
        removable && (size === "sm" ? "pr-0.5" : "pr-1"),
        className,
      )}
    >
      {dot ? (
        <Dot pulse={dot === "pulse" && !reduce} />
      ) : icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
      {removable ? (
        <button
          type="button"
          data-badge-remove=""
          aria-label={removeLabel ?? (text ? `Remove ${text}` : "Remove")}
          onClick={(event) => startRemove(event.detail === 0)}
          onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
            if (event.key === "Backspace" || event.key === "Delete") {
              event.preventDefault();
              startRemove(true);
            }
          }}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full opacity-70 outline-none transition-[opacity,background-color] hover:bg-current/15 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-current/40",
            size === "sm" ? "size-4" : "size-[18px]",
          )}
        >
          <X aria-hidden="true" strokeWidth={2.4} className="size-3!" />
        </button>
      ) : null}
    </motion.span>
  );
}

/** The × of the next chip in the row, else the previous one. */
function neighbourRemoveButton(node: HTMLElement | null) {
  if (!node) return null;
  const pick = (el: Element | null) =>
    el?.querySelector<HTMLElement>("[data-badge-remove]") ?? null;
  let next = node.nextElementSibling;
  while (next && !pick(next)) next = next.nextElementSibling;
  if (next) return pick(next);
  let prev = node.previousElementSibling;
  while (prev && !pick(prev)) prev = prev.previousElementSibling;
  return prev ? pick(prev) : null;
}

// One pulse cycle of the dot's radiating ring, in seconds. Slow on purpose:
// an ambient "live" signal, not feedback, so it sits well outside UI timing.
const PULSE_DURATION = 1.6;

function Dot({ pulse }: { pulse: boolean }) {
  return (
    <span aria-hidden="true" className="relative inline-flex size-1.5 shrink-0">
      {pulse ? (
        <motion.span
          className="absolute inset-0 rounded-full bg-current"
          initial={{ scale: 1, opacity: 0.55 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{
            duration: PULSE_DURATION,
            ease: EASE_OUT,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ) : null}
      <span className="relative size-1.5 rounded-full bg-current" />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Count badge                                */
/* -------------------------------------------------------------------------- */

function CountBadge({
  count,
  max = 99,
  showZero = false,
  countLabel,
  variant = "destructive",
  tone = "solid",
  size = "md",
  className,
}: BadgeProps & { count: number }) {
  const reduce = useReducedMotion() ?? false;
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const value = Math.max(0, Math.round(count));
  const visible = value > 0 || showZero;
  const text = value > max ? `${max}+` : String(value);

  // Direction is derived during render (not in an effect) so the very render
  // that swaps the digits already rolls them the right way.
  const [seen, setSeen] = useState(value);
  const [direction, setDirection] = useState<1 | -1>(1);
  if (value !== seen) {
    setSeen(value);
    setDirection(value > seen ? 1 : -1);
  }

  // Rising counts bump the pill (not on the pop-in from zero, which has its
  // own entrance).
  const previous = useRef(value);
  useEffect(() => {
    const prev = previous.current;
    previous.current = value;
    if (value > prev && prev > 0 && !reduce && scope.current) {
      animate(scope.current, { scale: [1, 1.18, 1] }, { duration: 0.32, ease: EASE_OUT });
    }
  }, [value, reduce, animate, scope]);

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.span
          key="count"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.1 } }
              : { opacity: 0, scale: 0.4, transition: { duration: 0.14, ease: EASE_OUT } }
          }
          transition={reduce ? { duration: 0.12 } : SPRING_PANEL}
          className={cn("inline-flex shrink-0", className)}
        >
          <span
            ref={scope}
            data-badge-count=""
            className={cn(
              "inline-flex items-center justify-center rounded-full border font-semibold leading-none tabular-nums",
              COUNT_SIZE[size],
              variantClass(variant, tone),
            )}
          >
            <span className="sr-only">{countLabel ? countLabel(value) : text}</span>
            <RollingCount text={text} direction={direction} reduce={reduce} />
          </span>
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}

const roll: Variants = {
  enter: (dir: 1 | -1) => ({ y: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { y: "0%", opacity: 1 },
  exit: (dir: 1 | -1) => ({
    y: dir > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: { duration: 0.14, ease: EASE_OUT },
  }),
};

const fade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

/**
 * Direction-aware digit roll. `NumberTicker` spins each digit along a 0–9
 * strip, so 9 → 10 would roll the ones digit backwards; here every changed
 * glyph slides in from the direction of change instead.
 */
function RollingCount({
  text,
  direction,
  reduce,
}: {
  text: string;
  direction: 1 | -1;
  reduce: boolean;
}) {
  const chars = text.split("");
  // Keyed by place value from the right so a digit keeps its slot as the
  // number grows on the left.
  const glyphs = chars.map((char, i) => ({ char, place: chars.length - 1 - i }));
  return (
    <span aria-hidden="true" className="inline-flex">
      {glyphs.map(({ char, place }) => (
        <span
          key={place}
          className="relative inline-flex h-[1.2em] items-center justify-center overflow-hidden"
        >
          <span className="invisible">{char}</span>
          <AnimatePresence initial={false} custom={direction}>
            <motion.span
              key={char}
              custom={direction}
              variants={reduce ? fade : roll}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduce ? { duration: 0.12 } : SPRING_SWAP}
              className="absolute inset-0 flex items-center justify-center"
            >
              {char}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
