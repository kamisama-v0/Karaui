"use client";

import { Check, Send } from "lucide-react";
import { motion, type Transition, useReducedMotion } from "motion/react";
import {
  type ElementType,
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  Button,
  ButtonLink,
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button";
import { TextReveal } from "@/components/motion/text-reveal";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface CtaAction {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Trailing icon. */
  icon?: ReactNode;
}

export interface CtaEmailCapture {
  /** Resolve to show success; reject to show the retry state. */
  onSubscribe: (email: string) => Promise<void> | void;
  placeholder?: string;
  buttonLabel?: ReactNode;
  successMessage?: ReactNode;
  /** Small print under the field, e.g. "Unsubscribe any time." */
  note?: ReactNode;
}

export interface CtaSectionProps {
  /** "centered" stacks everything in one card; "split" puts copy left and a visual or email capture right. */
  variant?: "centered" | "split";
  eyebrow?: ReactNode;
  /** Revealed word by word when the section scrolls into view. */
  headline: string | string[];
  description?: ReactNode;
  primaryAction?: CtaAction;
  secondaryAction?: CtaAction;
  /** Short reassurance list ("No credit card", "Cancel any time"). */
  checklist?: ReactNode[];
  /** Email field with a stateful submit button. */
  emailCapture?: CtaEmailCapture;
  /** Right column for `variant="split"` (mock UI, illustration). When omitted, the email capture takes that slot. */
  visual?: ReactNode;
  /** Card decoration: rotating gradient beam on the border, a dotted field, or nothing. Default "beam". */
  background?: "beam" | "dots" | "none";
  /** Heading element for the headline. Default "h2". */
  headingAs?: ElementType;
  className?: string;
  cardClassName?: string;
}

const WORD_STAGGER = 0.05;
const ENTER: Transition = { duration: 0.5, ease: EASE_OUT };

// Beam sweep: decorative and slow so the border never pulls focus from the
// copy; linear so the light travels at a constant speed around the card.
const BEAM_TRANSITION: Transition = {
  duration: 8,
  ease: "linear",
  repeat: Number.POSITIVE_INFINITY,
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function wordCount(text: string | string[]) {
  return (Array.isArray(text) ? text.join(" ") : text)
    .split(/\s+/)
    .filter(Boolean).length;
}

function ActionButton({
  action,
  variant,
}: {
  action: CtaAction;
  variant: "primary" | "secondary";
}) {
  const content = (
    <>
      {action.label}
      {action.icon ?? null}
    </>
  );
  return action.href ? (
    <ButtonLink href={action.href} onClick={action.onClick} variant={variant}>
      {content}
    </ButtonLink>
  ) : (
    <Button onClick={action.onClick} variant={variant}>
      {content}
    </Button>
  );
}

function EmailCapture({
  capture,
  align,
}: {
  capture: CtaEmailCapture;
  align: "center" | "left";
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ButtonState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "loading" || state === "success") return;
    if (!isEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setState("loading");
    try {
      await capture.onSubscribe(email.trim());
      setState("success");
    } catch {
      setState("error");
      setError("Something went wrong. Try again.");
      timer.current = window.setTimeout(() => setState("idle"), 2400);
    }
  };

  const done = state === "success";

  return (
    <form
      noValidate
      onSubmit={submit}
      className={cn(
        "flex w-full max-w-md flex-col gap-2",
        align === "center" && "mx-auto",
      )}
    >
      <div className="flex flex-col gap-2 @sm:flex-row @sm:items-center">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          disabled={done}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-status`}
          onChange={(event) => {
            setEmail(event.target.value);
            if (error && isEmail(event.target.value)) setError(null);
          }}
          placeholder={capture.placeholder ?? "you@company.com"}
          className={cn(
            "h-10 min-w-0 flex-1 rounded-full border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 disabled:opacity-60",
            error
              ? "border-destructive focus-visible:ring-destructive/30"
              : "border-border focus-visible:border-border-strong focus-visible:ring-ring/40",
          )}
        />
        <StatefulButton
          type="submit"
          state={state}
          loadingText="Sending"
          successText="You're in"
          errorText="Retry"
          icon={<Send aria-hidden className="size-3.5" />}
          className="shrink-0"
        >
          {capture.buttonLabel ?? "Get started"}
        </StatefulButton>
      </div>
      <p
        id={`${id}-status`}
        aria-live="polite"
        className={cn(
          "min-h-5 text-xs",
          align === "center" && "text-center",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {error ??
          (done
            ? (capture.successMessage ?? "Thanks! Check your inbox.")
            : (capture.note ?? ""))}
      </p>
    </form>
  );
}

function CardBackground({
  background,
  reduce,
}: {
  background: "beam" | "dots" | "none";
  reduce: boolean | null;
}) {
  if (background === "none") return null;
  if (background === "dots") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--border-strong)_1px,transparent_1px)] bg-[size:18px_18px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_40%,black,transparent)]"
      />
    );
  }
  // Beam: an oversized conic gradient spins behind the card; the card body
  // sits 1px inside it, so only a moving sliver shows along the border.
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[max(200%,40rem)] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_250deg,var(--chart-1)_300deg,var(--chart-2)_330deg,transparent_360deg)]"
      style={{ x: "-50%", y: "-50%" }}
      initial={{ rotate: 0 }}
      animate={reduce ? { rotate: 0 } : { rotate: 360 }}
      transition={reduce ? { duration: 0 } : BEAM_TRANSITION}
    />
  );
}

/**
 * Closing call-to-action band. `centered` puts a large headline, supporting
 * copy, two CTAs and an optional reassurance checklist inside one card;
 * `split` sets the copy beside a visual or an email capture. The headline
 * reveals word by word on view and the rest follows. The card can carry a
 * rotating gradient beam along its border or a soft dotted field. Layout
 * reads the section's own container width.
 */
export function CtaSection({
  variant = "centered",
  eyebrow,
  headline,
  description,
  primaryAction,
  secondaryAction,
  checklist,
  emailCapture,
  visual,
  background = "beam",
  headingAs = "h2",
  className,
  cardClassName,
}: CtaSectionProps) {
  const reduce = useReducedMotion();
  const centered = variant === "centered";
  const align = centered ? "center" : "left";
  const after = Math.min(1, 0.15 + wordCount(headline) * WORD_STAGGER);

  const enter = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    whileInView: reduce ? { opacity: 1 } : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.4 },
    transition: { ...ENTER, delay },
  });

  // In split mode the email capture fills the right column unless a visual
  // claims it; then it moves under the copy.
  const captureInAside = !centered && !visual && Boolean(emailCapture);

  const copy = (
    <div
      className={cn(
        "relative flex flex-col gap-4",
        centered ? "items-center text-center" : "items-start text-left",
      )}
    >
      {eyebrow ? (
        <motion.p
          {...enter(0)}
          className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          {eyebrow}
        </motion.p>
      ) : null}
      <TextReveal
        as={headingAs}
        text={headline}
        whileInView
        stagger={WORD_STAGGER}
        delay={0.05}
        blur={8}
        yOffset="30%"
        className={cn(
          "text-balance font-display font-semibold leading-[1.1] tracking-tight text-foreground",
          centered
            ? "text-3xl @lg:text-4xl @3xl:text-5xl"
            : "text-2xl @lg:text-3xl @3xl:text-4xl",
        )}
      />
      {description ? (
        <motion.p
          {...enter(after)}
          className="max-w-xl text-pretty text-sm leading-6 text-muted-foreground @md:text-base @md:leading-7"
        >
          {description}
        </motion.p>
      ) : null}
      {primaryAction || secondaryAction ? (
        <motion.div
          {...enter(after + 0.08)}
          className={cn(
            "mt-1 flex flex-wrap items-center gap-3",
            centered && "justify-center",
          )}
        >
          {primaryAction ? (
            <ActionButton action={primaryAction} variant="primary" />
          ) : null}
          {secondaryAction ? (
            <ActionButton action={secondaryAction} variant="secondary" />
          ) : null}
        </motion.div>
      ) : null}
      {emailCapture && !captureInAside ? (
        <motion.div {...enter(after + 0.12)} className="mt-1 w-full">
          <EmailCapture capture={emailCapture} align={align} />
        </motion.div>
      ) : null}
      {checklist?.length ? (
        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={{
            show: {
              transition: { staggerChildren: 0.06, delayChildren: after + 0.16 },
            },
          }}
          className={cn(
            "flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground @md:text-sm",
            centered && "justify-center",
          )}
        >
          {checklist.map((item, index) => (
            <motion.li
              // biome-ignore lint/suspicious/noArrayIndexKey: checklist is a static positional list.
              key={index}
              variants={{
                hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0, transition: ENTER },
              }}
              className="inline-flex items-center gap-1.5"
            >
              <span className="grid size-4 place-items-center rounded-full bg-primary/10 text-primary">
                <Check aria-hidden className="size-3" strokeWidth={3} />
              </span>
              {item}
            </motion.li>
          ))}
        </motion.ul>
      ) : null}
    </div>
  );

  return (
    <section className={cn("@container w-full", className)}>
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-3xl",
          background === "beam"
            ? "bg-border p-px"
            : "border border-border bg-card",
          cardClassName,
        )}
      >
        <CardBackground background={background} reduce={reduce} />
        <div
          className={cn(
            "relative overflow-hidden",
            background === "beam" && "rounded-[calc(var(--radius-3xl)-1px)] bg-card",
            centered
              ? "px-6 py-12 @3xl:px-12 @3xl:py-16"
              : "grid items-center gap-8 p-6 @2xl:grid-cols-[1.15fr_1fr] @3xl:p-10",
          )}
        >
          {/* Soft top glow so the card reads as lit from the beam side. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklab,var(--foreground)_6%,transparent),transparent)]"
          />
          {copy}
          {!centered && (visual || captureInAside) ? (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ ...ENTER, delay: 0.2 }}
              className="relative @container"
            >
              {visual ??
                (emailCapture ? (
                  <div className="rounded-2xl border border-border bg-background/60 p-5 shadow-sm">
                    <EmailCapture capture={emailCapture} align="left" />
                  </div>
                ) : null)}
            </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
