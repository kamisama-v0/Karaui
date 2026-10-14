"use client";

import { Lock } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Input, type InputProps } from "@/components/motion/input";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import {
  MIN_PASSWORD_LENGTH,
  type PasswordStrength,
  passwordStrength,
  STRENGTH_COLORS,
  STRENGTH_LABELS,
} from "@/lib/password-strength";
import { cn } from "@/lib/utils";

export type { PasswordStrength } from "@/lib/password-strength";

export type PasswordRequirement = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

/** Default checklist: length, number, symbol, mixed case. */
export function defaultPasswordRequirements(
  minLength: number = MIN_PASSWORD_LENGTH,
): PasswordRequirement[] {
  return [
    {
      id: "length",
      label: `At least ${minLength} characters`,
      test: (password) => password.length >= minLength,
    },
    { id: "number", label: "A number", test: (password) => /\d/.test(password) },
    {
      id: "symbol",
      label: "A symbol",
      test: (password) => /[^A-Za-z0-9\s]/.test(password),
    },
    {
      id: "case",
      label: "Upper and lowercase letters",
      test: (password) => /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
  ];
}

const STRENGTH_TEXT = [
  "text-destructive",
  "text-destructive",
  "text-amber-600 dark:text-amber-400",
  "text-amber-600 dark:text-amber-400",
  "text-(--color-success)",
] as const;

export interface PasswordInputProps
  extends Omit<InputProps, "type" | "leftIcon" | "rightIcon" | "success"> {
  /** Show the segmented strength meter once something is typed. Default true. */
  strengthMeter?: boolean;
  /**
   * Requirement checklist under the field. `true` uses
   * `defaultPasswordRequirements(minLength)`; pass an array for custom rules.
   */
  requirements?: boolean | PasswordRequirement[];
  /** Length below which the score is 0 ("Too short"). Default 8. */
  minLength?: number;
  /** Fires whenever the 0-4 score changes. */
  onStrengthChange?: (strength: PasswordStrength, label: string) => void;
  /** Allow revealing the password. Default true. */
  revealable?: boolean;
  /** Left icon. Defaults to a lock; pass `null` for none. */
  icon?: ReactNode;
}

/**
 * Password field over `Input`: eye/eye-off morphing reveal toggle, a caps-lock
 * warning, a spring-filled strength meter driven by the shared
 * `passwordStrength` heuristic, and an optional requirement checklist.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      value: valueProp,
      defaultValue,
      onChange,
      onKeyDown,
      onKeyUp,
      onBlur,
      strengthMeter = true,
      requirements = false,
      minLength = MIN_PASSWORD_LENGTH,
      onStrengthChange,
      revealable = true,
      icon,
      disabled,
      autoComplete,
      placeholder = "Enter a password",
      className,
      ...rest
    },
    ref,
  ) {
    const reduce = useReducedMotion();
    const baseId = useId();
    const statusId = `${baseId}-status`;

    const controlled = valueProp !== undefined;
    const [internal, setInternal] = useState(defaultValue ?? "");
    const value = controlled ? valueProp : internal;

    const [revealed, setRevealed] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    const strength = passwordStrength(value, minLength);
    const reported = useRef<number | null>(null);
    const strengthCallback = useRef(onStrengthChange);
    strengthCallback.current = onStrengthChange;
    useEffect(() => {
      if (reported.current === strength) return;
      reported.current = strength;
      strengthCallback.current?.(strength, STRENGTH_LABELS[strength]);
    }, [strength]);

    const rules = useMemo(
      () =>
        requirements === true
          ? defaultPasswordRequirements(minLength)
          : requirements || [],
      [requirements, minLength],
    );

    const readCaps = (event: KeyboardEvent<HTMLInputElement>) => {
      // getModifierState is missing on some synthetic/IME events.
      if (typeof event.getModifierState !== "function") return;
      setCapsLock(event.getModifierState("CapsLock"));
    };

    const showMeter = strengthMeter && value.length > 0;

    return (
      <div className={cn("flex w-full flex-col gap-2", className)}>
        <Input
          {...rest}
          ref={ref}
          type={revealed ? "text" : "password"}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={
            autoComplete ?? (strengthMeter ? "new-password" : "current-password")
          }
          spellCheck={false}
          aria-describedby={showMeter || capsLock ? statusId : undefined}
          leftIcon={icon === undefined ? <Lock /> : icon}
          onChange={(next) => {
            if (!controlled) setInternal(next);
            onChange?.(next);
          }}
          onKeyDown={(event) => {
            readCaps(event);
            onKeyDown?.(event);
          }}
          onKeyUp={(event) => {
            readCaps(event);
            onKeyUp?.(event);
          }}
          onBlur={(event) => {
            setCapsLock(false);
            onBlur?.(event);
          }}
          rightIcon={
            revealable ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setRevealed((prev) => !prev)}
                aria-label={revealed ? "Hide password" : "Show password"}
                aria-pressed={revealed}
                className="text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
              >
                <EyeMorph closed={revealed} reduce={Boolean(reduce)} />
              </button>
            ) : undefined
          }
        />

        <div id={statusId} className="flex flex-col gap-2 px-1">
          <AnimatePresence initial={false}>
            {capsLock ? (
              <motion.p
                key="caps"
                role="status"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduce
                    ? { opacity: 0, transition: { duration: 0.1 } }
                    : { opacity: 0, y: -4, transition: { duration: 0.12 } }
                }
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
              >
                <CapsIcon />
                Caps Lock is on
              </motion.p>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {showMeter ? (
              <motion.div
                key="meter"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduce
                    ? { opacity: 0, transition: { duration: 0.1 } }
                    : { opacity: 0, y: -4, transition: { duration: 0.12 } }
                }
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="flex items-center gap-3"
              >
                <div className="flex flex-1 gap-1.5" aria-hidden>
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted-foreground/20"
                    >
                      {/* scaleX, not width — transform only, off layout. */}
                      <motion.span
                        initial={false}
                        animate={{ scaleX: index < strength ? 1 : 0 }}
                        transition={
                          reduce
                            ? { duration: 0 }
                            : { ...SPRING_LAYOUT, delay: index * 0.03 }
                        }
                        className={cn(
                          "block h-full w-full origin-left rounded-full transition-colors duration-300",
                          STRENGTH_COLORS[strength],
                        )}
                      />
                    </span>
                  ))}
                </div>
                <span
                  aria-live="polite"
                  className="relative grid min-w-16 justify-items-end overflow-hidden text-xs font-medium"
                >
                  <span className="sr-only">Password strength: </span>
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={strength}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={
                        reduce
                          ? { opacity: 0, transition: { duration: 0.08 } }
                          : { opacity: 0, y: -8, transition: { duration: 0.1 } }
                      }
                      transition={reduce ? { duration: 0.12 } : SPRING_SWAP}
                      className={STRENGTH_TEXT[strength]}
                    >
                      {STRENGTH_LABELS[strength]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {rules.length > 0 ? (
            <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Password requirements">
              {rules.map((rule) => {
                const met = rule.test(value);
                return (
                  <li
                    key={rule.id}
                    className={cn(
                      "flex items-center gap-2 text-xs transition-colors duration-200",
                      met ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <RequirementMark met={met} reduce={Boolean(reduce)} />
                    <span>{rule.label}</span>
                    <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    );
  },
);

/** Eye that morphs to eye-off: a slash draws across and the pupil dims. */
function EyeMorph({ closed, reduce }: { closed: boolean; reduce: boolean }) {
  const transition = reduce ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <motion.circle
        cx={12}
        cy={12}
        r={3}
        initial={false}
        animate={{ opacity: closed ? 0.35 : 1 }}
        transition={transition}
      />
      <motion.path
        d="M3 3l18 18"
        initial={false}
        animate={{ pathLength: closed ? 1 : 0, opacity: closed ? 1 : 0 }}
        transition={transition}
      />
    </svg>
  );
}

function RequirementMark({ met, reduce }: { met: boolean; reduce: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-full border transition-colors duration-200",
        met
          ? "border-(--color-success) bg-(--color-success) text-background"
          : "border-muted-foreground/40 bg-transparent text-transparent",
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-3" aria-hidden="true">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: met ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.25, ease: EASE_OUT }}
        />
      </svg>
    </span>
  );
}

function CapsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="M12 4 4 12h4v4h8v-4h4z" />
      <path d="M8 20h8" />
    </svg>
  );
}
