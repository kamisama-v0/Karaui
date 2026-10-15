"use client";

import { Mail, Send } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { AvatarGroup, type AvatarGroupItem } from "@/components/motion/avatar-group";
import { type ButtonState, StatefulButton } from "@/components/motion/button";
import { Input } from "@/components/motion/input";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface NewsletterSocialProof {
  /** Avatars shown in an overlapping stack. */
  avatars: AvatarGroupItem[];
  /** Copy beside the stack, e.g. "Join 4,200 readers". */
  label: ReactNode;
  /** Avatars before a "+N" chip. Default 4. */
  max?: number;
}

export interface NewsletterSectionProps {
  /** "card" is a centered bordered panel; "inline" puts copy and form side by side. */
  variant?: "card" | "inline";
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  buttonLabel?: string;
  /** Resolve to confirm; reject (or throw) to show the error state. */
  onSubscribe?: (email: string) => Promise<void> | void;
  /** Small print under the form. Pass null to hide. */
  privacyNote?: ReactNode;
  socialProof?: NewsletterSocialProof;
  successTitle?: ReactNode;
  /** Receives the subscribed address. */
  successMessage?: ReactNode | ((email: string) => ReactNode);
  invalidEmailMessage?: string;
  errorMessage?: string;
  className?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Light check used before `onSubscribe`; the server stays the source of truth. */
export function isValidNewsletterEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

const SWAP_ENTER = { duration: 0.32, ease: EASE_OUT } as const;
const SWAP_EXIT = { duration: 0.16, ease: EASE_OUT } as const;
const ERROR_RESET_MS = 2400;

function SuccessCheck({ reduce }: { reduce: boolean }) {
  return (
    <motion.span
      initial={{ scale: reduce ? 1 : 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduce ? SWAP_ENTER : SPRING_SWAP}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-success/15 text-success"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: EASE_OUT, delay: reduce ? 0 : 0.12 }}
        />
      </svg>
    </motion.span>
  );
}

/**
 * Newsletter signup section: heading, an email field with idle/loading/
 * success/error states driven by the `onSubscribe` promise (with a light
 * client-side email check), a privacy note and optional social-proof avatars.
 * On success the form morphs into a confirmation with a draw-in check. Two
 * layouts: a centered "card" and a side-by-side "inline" band that stacks in
 * narrow containers.
 */
export function NewsletterSection({
  variant = "card",
  eyebrow,
  heading = "Get the weekly digest",
  description = "One short email every Friday with new components, motion notes and the occasional deep dive.",
  placeholder = "you@example.com",
  buttonLabel = "Subscribe",
  onSubscribe,
  privacyNote = "No spam. Unsubscribe with one click.",
  socialProof,
  successTitle = "You're on the list",
  successMessage = (email: string) => (
    <>
      We sent a confirmation to <span className="font-medium text-foreground">{email}</span>.
    </>
  ),
  invalidEmailMessage = "Enter a valid email address.",
  errorMessage = "Something went wrong. Please try again.",
  className,
}: NewsletterSectionProps) {
  const reduce = useReducedMotion() ?? false;
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ButtonState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const done = state === "success";

  // Move focus to the confirmation so keyboard and screen reader users land
  // on the result instead of a removed form.
  useEffect(() => {
    if (done) successRef.current?.focus({ preventScroll: true });
  }, [done]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "loading" || done) return;
    if (!isValidNewsletterEmail(email)) {
      setError(invalidEmailMessage);
      return;
    }
    const value = email.trim();
    setError(null);
    setState("loading");
    try {
      await onSubscribe?.(value);
      setSubscribed(value);
      setState("success");
    } catch {
      setState("error");
      setError(errorMessage);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("idle"), ERROR_RESET_MS);
    }
  };

  const inline = variant === "inline";
  const swapInitial = reduce ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" };
  const swapExit = reduce
    ? { opacity: 0, transition: SWAP_EXIT }
    : { opacity: 0, y: -8, filter: "blur(4px)", transition: SWAP_EXIT };

  const form = (
    <motion.form
      key="form"
      noValidate
      onSubmit={submit}
      initial={swapInitial}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={swapExit}
      transition={SWAP_ENTER}
      className="flex w-full flex-col gap-2"
    >
      <div className="flex w-full flex-col gap-2 @md:flex-row @md:items-start">
        <Input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-label="Email address"
          placeholder={placeholder}
          value={email}
          onChange={(next) => {
            setEmail(next);
            if (error && isValidNewsletterEmail(next)) setError(null);
          }}
          error={error ?? undefined}
          leftIcon={<Mail aria-hidden />}
          className="min-w-0 flex-1"
          classNames={{ field: "bg-background", errorMessage: "text-left" }}
        />
        <StatefulButton
          type="submit"
          state={state}
          loadingText="Subscribing"
          successText="Subscribed"
          errorText="Try again"
          icon={<Send aria-hidden className="size-3.5" />}
          className="h-11 shrink-0"
        >
          {buttonLabel}
        </StatefulButton>
      </div>
      {privacyNote ? (
        <p className={cn("text-xs text-muted-foreground", inline ? "text-left" : "text-center @md:text-left")}>
          {privacyNote}
        </p>
      ) : null}
    </motion.form>
  );

  const confirmation = (
    <motion.div
      key="success"
      ref={successRef}
      tabIndex={-1}
      role="status"
      initial={swapInitial}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={SWAP_ENTER}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <SuccessCheck reduce={reduce} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{successTitle}</p>
        <p className="text-sm text-muted-foreground">
          {typeof successMessage === "function" ? successMessage(subscribed) : successMessage}
        </p>
      </div>
    </motion.div>
  );

  const copy = (
    <div className={cn("flex flex-col gap-3", !inline && "items-center text-center")}>
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
      ) : null}
      {heading ? (
        <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight @3xl:text-3xl">
          {heading}
        </h2>
      ) : null}
      {description ? (
        <p className={cn("text-pretty text-sm leading-6 text-muted-foreground", !inline && "max-w-md")}>
          {description}
        </p>
      ) : null}
    </div>
  );

  const proof = socialProof ? (
    <div className={cn("flex items-center gap-3", !inline && "justify-center")}>
      <AvatarGroup items={socialProof.avatars} max={socialProof.max ?? 4} size="sm" label="Subscribers" ringClassName={inline ? undefined : "ring-card"} />
      <p className="text-xs font-medium text-muted-foreground">{socialProof.label}</p>
    </div>
  ) : null;

  // The form/confirmation swap changes height, so the slot morphs its layout
  // on purpose (the section must grow or shrink with the content).
  const slot = (
    <motion.div
      layout={reduce ? false : "size"}
      transition={{ layout: SPRING_LAYOUT }}
      className="w-full"
    >
      <AnimatePresence mode="wait" initial={false}>
        {done ? confirmation : form}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <section className={cn("@container w-full text-foreground", className)}>
      {inline ? (
        <div className="grid items-center gap-6 border-y border-border py-8 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @2xl:gap-10">
          <div className="flex flex-col gap-4">
            {copy}
            {proof}
          </div>
          {slot}
        </div>
      ) : (
        <div className="relative isolate mx-auto flex max-w-2xl flex-col items-center gap-6 overflow-hidden rounded-3xl border border-border bg-card px-5 py-10 text-card-foreground shadow-sm @md:px-10">
          {/* Decorative dot grid fading out from the top. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--border-strong)_1px,transparent_1px)] bg-[size:18px_18px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
          />
          {copy}
          <div className="w-full max-w-md">{slot}</div>
          {proof}
        </div>
      )}
    </section>
  );
}
