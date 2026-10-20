"use client";

import { Minus, Plus } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { TOUCH_GESTURE_CLASS, TOUCH_TARGET_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

export interface NumberStepperProps {
  /** Controlled value. */
  value?: number;
  /** Uncontrolled initial value. Default `min` when finite, else 0. */
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** Default 0. */
  min?: number;
  /** Default Infinity. */
  max?: number;
  /** Default 1. */
  step?: number;
  /** PageUp/PageDown stride. Default `step * 10`. */
  largeStep?: number;
  /** Display formatting, e.g. `{ style: "currency", currency: "USD" }`. */
  formatOptions?: Intl.NumberFormatOptions;
  /** Formatting locale. Fixed default so server and client render the same text. */
  locale?: string;
  /** Visible label above the control. */
  label?: string;
  "aria-label"?: string;
  disabled?: boolean;
  className?: string;
}

// Press-and-hold: first repeat after HOLD_DELAY, then each interval shrinks by
// HOLD_ACCEL down to HOLD_MIN — slow enough to stop on a target, fast enough
// to cross large ranges.
const HOLD_DELAY = 400;
const HOLD_START = 140;
const HOLD_ACCEL = 0.85;
const HOLD_MIN = 30;

const SHAKE = { x: [0, -5, 5, -3, 3, 0] };

const decimalsOf = (n: number) => {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  const e = s.indexOf("e-");
  if (e >= 0) return Number(s.slice(e + 2));
  const dot = s.indexOf(".");
  return dot < 0 ? 0 : s.length - dot - 1;
};

export function NumberStepper({
  value: valueProp,
  defaultValue,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  largeStep,
  formatOptions,
  locale = "en-US",
  label,
  "aria-label": ariaLabel,
  disabled = false,
  className,
}: NumberStepperProps) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const reduce = useReducedMotion() ?? false;

  const lo = min;
  const hi = max >= min ? max : min;
  const stride = step > 0 ? step : 1;
  const big = largeStep && largeStep > 0 ? largeStep : stride * 10;
  const decimals = Math.max(decimalsOf(stride), decimalsOf(lo));

  const clampRound = (n: number) =>
    Number(Math.min(hi, Math.max(lo, n)).toFixed(decimals));

  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState(() =>
    clampRound(defaultValue ?? (Number.isFinite(lo) ? lo : 0)),
  );
  const value = clampRound(controlled ? valueProp : internal);

  const [draft, setDraft] = useState<string | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Hold-to-repeat runs on timers, so it reads the latest value from here.
  const valueRef = useRef(value);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    },
    [],
  );

  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, formatOptions),
    [locale, formatOptions],
  );
  const formatted = formatter.format(value);
  const percent = formatOptions?.style === "percent";

  const shake = () => {
    if (reduce || !fieldRef.current) return;
    animate(fieldRef.current, SHAKE, { duration: 0.32, ease: EASE_OUT });
  };

  const commit = (next: number) => {
    const current = valueRef.current;
    if (next === current) return;
    setDirection(next > current ? 1 : -1);
    valueRef.current = next;
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  /** Steps from `from`; returns false (and shakes) when pinned at a bound. */
  const stepFrom = (from: number, delta: number) => {
    const next = clampRound(from + delta);
    if (next === from) {
      shake();
      return false;
    }
    commit(next);
    return true;
  };

  const parse = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.-]/g, "");
    if (!cleaned || cleaned === "-" || cleaned === ".") return Number.NaN;
    const n = Number(cleaned);
    return percent ? n / 100 : n;
  };

  /** Applies typed text; returns the value it settled on. */
  const commitDraft = () => {
    if (draft === null) return valueRef.current;
    setDraft(null);
    const parsed = parse(draft);
    if (Number.isNaN(parsed)) {
      shake();
      return valueRef.current;
    }
    const clean = clampRound(parsed);
    if (clean !== Number(parsed.toFixed(decimals))) shake();
    commit(clean);
    return clean;
  };

  const stopHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const startHold = (delta: number) => {
    stopHold();
    if (!stepFrom(commitDraft(), delta)) return;
    let interval = HOLD_START;
    const tick = () => {
      if (!stepFrom(valueRef.current, delta)) {
        holdTimer.current = null;
        return;
      }
      interval = Math.max(HOLD_MIN, interval * HOLD_ACCEL);
      holdTimer.current = setTimeout(tick, interval);
    };
    holdTimer.current = setTimeout(tick, HOLD_DELAY);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const deltas: Record<string, number> = {
      ArrowUp: stride,
      ArrowDown: -stride,
      PageUp: big,
      PageDown: -big,
    };
    if (e.key in deltas) {
      e.preventDefault();
      stepFrom(commitDraft(), deltas[e.key]);
      inputRef.current?.select();
      return;
    }
    if (e.key === "Home" && Number.isFinite(lo)) {
      e.preventDefault();
      setDraft(null);
      if (valueRef.current === lo) shake();
      commit(lo);
    } else if (e.key === "End" && Number.isFinite(hi)) {
      e.preventDefault();
      setDraft(null);
      if (valueRef.current === hi) shake();
      commit(hi);
    } else if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
      inputRef.current?.select();
    } else if (e.key === "Escape") {
      setDraft(null);
    }
  };

  const atMin = value <= lo;
  const atMax = value >= hi;
  const editing = draft !== null;
  const integerOnly = decimals === 0 && !percent;

  const button = (dir: 1 | -1) => {
    const pinned = dir > 0 ? atMax : atMin;
    const Icon = dir > 0 ? Plus : Minus;
    return (
      <motion.button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        // aria-disabled, not disabled, at a bound: the button must still
        // receive the press so it can shake back at the user.
        aria-disabled={pinned || undefined}
        aria-label={dir > 0 ? "Increase" : "Decrease"}
        aria-controls={inputId}
        whileTap={reduce || pinned ? undefined : { scale: 0.86 }}
        transition={SPRING_PRESS}
        onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
          if (disabled || e.button !== 0) return;
          startHold(dir * stride);
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(e: MouseEvent) => e.preventDefault()}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          // Pointer presses already stepped on pointerdown; this is the
          // keyboard / assistive-tech path.
          if (e.detail === 0 && !disabled) stepFrom(commitDraft(), dir * stride);
        }}
        className={cn(
          "relative grid size-9 shrink-0 place-items-center rounded-full text-foreground outline-none transition-colors duration-150",
          "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
          pinned && "text-muted-foreground/50 hover:bg-transparent",
          TOUCH_GESTURE_CLASS,
          TOUCH_TARGET_CLASS,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </motion.button>
    );
  };

  return (
    <div className={cn("inline-flex flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={inputId}
          className="px-1 text-sm font-medium text-foreground"
        >
          {label}
        </label>
      ) : null}
      <div
        ref={fieldRef}
        className={cn(
          "flex h-12 items-center gap-1 rounded-full border border-border bg-background p-1 transition-colors duration-200",
          "focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-ring/40",
          disabled && "opacity-60",
        )}
      >
        {button(-1)}
        <div className="relative flex h-full min-w-16 flex-1 items-center justify-center">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="spinbutton"
            inputMode={integerOnly && lo >= 0 ? "numeric" : "decimal"}
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            aria-label={label ? undefined : (ariaLabel ?? "Value")}
            aria-valuenow={value}
            aria-valuemin={Number.isFinite(lo) ? lo : undefined}
            aria-valuemax={Number.isFinite(hi) ? hi : undefined}
            aria-valuetext={formatted}
            value={draft ?? formatted}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commitDraft()}
            onKeyDown={onInputKeyDown}
            size={Math.max(formatted.length, 2)}
            className={cn(
              "h-full w-full bg-transparent text-center text-lg font-semibold tabular-nums outline-none selection:bg-ring/30 disabled:cursor-not-allowed",
              // Until the user types, the rolling digits on top do the talking.
              editing ? "text-foreground" : "text-transparent caret-foreground",
            )}
          />
          {editing ? null : (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-semibold text-foreground">
              <RollingText
                text={formatted}
                direction={direction}
                reduce={reduce}
              />
            </span>
          )}
        </div>
        {button(1)}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Rolling text                                */
/* -------------------------------------------------------------------------- */

// NumberTicker rolls each digit along a fixed 0–9 column, so 9 → 0 on an
// increment travels backwards. A stepper needs the roll to follow intent —
// up rolls up, down rolls down — hence this direction-aware slot.
const roll: Variants = {
  enter: (dir: number) => ({ y: dir > 0 ? "70%" : "-70%", opacity: 0 }),
  center: { y: "0%", opacity: 1 },
  exit: (dir: number) => ({
    y: dir > 0 ? "-70%" : "70%",
    opacity: 0,
    transition: { duration: 0.14, ease: EASE_OUT },
  }),
};

const fade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

function RollingText({
  text,
  direction,
  reduce,
}: {
  text: string;
  direction: 1 | -1;
  reduce: boolean;
}) {
  // Rendered without entrance on the first paint (and on the server), so the
  // number is visible before hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chars = text.split("");
  // Key by place value from the right, so a digit keeps its slot as the
  // number grows or shrinks on the left.
  const glyphs = chars.map((char, i) => ({ char, place: chars.length - 1 - i }));

  return (
    <span aria-hidden className="inline-flex tabular-nums">
      {glyphs.map(({ char, place }) => (
        <motion.span
          key={place}
          layout={reduce ? false : "position"}
          transition={{ layout: SPRING_LAYOUT }}
          className="relative inline-flex h-[1.4em] items-center justify-center overflow-hidden"
        >
          <span className="invisible">{char}</span>
          <AnimatePresence initial={false} custom={direction}>
            <motion.span
              key={char}
              custom={direction}
              variants={reduce ? fade : roll}
              initial={mounted ? "enter" : false}
              animate="center"
              exit="exit"
              transition={reduce ? { duration: 0.12 } : SPRING_SWAP}
              className="absolute inset-0 flex items-center justify-center"
            >
              {char}
            </motion.span>
          </AnimatePresence>
        </motion.span>
      ))}
    </span>
  );
}
