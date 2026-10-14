"use client";

import { ChevronDown, Send } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { type ButtonState, StatefulButton } from "@/components/motion/button";
import { EASE_OUT_CSS, SPRING_PRESS } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export interface FooterLink {
  label: ReactNode;
  href: string;
}

export interface FooterLinkColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterSocialLink {
  /** Accessible name, e.g. "GitHub". */
  label: string;
  href: string;
  icon: ReactNode;
}

export interface FooterNewsletter {
  title?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  buttonLabel?: ReactNode;
  successMessage?: ReactNode;
}

export interface FooterSectionProps {
  logo?: ReactNode;
  tagline?: ReactNode;
  socials?: FooterSocialLink[];
  columns?: FooterLinkColumn[];
  /** Newsletter copy. Shown when `onSubscribe` is set. */
  newsletter?: FooterNewsletter;
  /** Resolve to confirm the signup; reject (or throw) to show the error state. */
  onSubscribe?: (email: string) => Promise<void> | void;
  /** Owner after the © sign, e.g. "Acme Inc." */
  copyright?: ReactNode;
  /** Pass the year in; it is never computed during render. */
  year?: number;
  legalLinks?: FooterLink[];
  /** Slot at the end of the bottom bar, e.g. a theme toggle. */
  themeToggle?: ReactNode;
  className?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

function SocialLink({ social }: { social: FooterSocialLink }) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const lift = !reduce && canHover;
  return (
    <motion.a
      href={social.href}
      aria-label={social.label}
      target="_blank"
      rel="noreferrer noopener"
      whileHover={lift ? { y: -3 } : undefined}
      whileTap={reduce ? undefined : { scale: 0.92 }}
      transition={SPRING_PRESS}
      className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4"
    >
      {social.icon}
    </motion.a>
  );
}

function LinkColumn({ column }: { column: FooterLinkColumn }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const listId = `${id}-links`;

  return (
    <div className="border-b border-border @md:border-b-0">
      {/* Narrow containers: the title is a disclosure button. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between text-left text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 @md:hidden"
      >
        {column.title}
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      {/* Wide containers: a plain heading, list always shown. */}
      <h3 className="hidden text-sm font-medium text-foreground @md:block">
        {column.title}
      </h3>
      {/* Grid-row 0fr→1fr is a layout animation on purpose: the collapsed
          column has to push the following ones down. `invisible` keeps
          closed links out of tab order and the a11y tree on narrow widths. */}
      <div
        id={listId}
        style={{ transitionTimingFunction: EASE_OUT_CSS }}
        className={cn(
          "grid transition-[grid-template-rows,visibility] duration-300 motion-reduce:transition-none @md:visible @md:grid-rows-[1fr]",
          open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]",
        )}
      >
        <ul className="flex flex-col gap-2.5 overflow-hidden pb-4 @md:mt-4 @md:pb-0">
          {column.links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function NewsletterForm({
  newsletter,
  onSubscribe,
}: {
  newsletter: FooterNewsletter;
  onSubscribe: (email: string) => Promise<void> | void;
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
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setState("loading");
    try {
      await onSubscribe(email.trim());
      setState("success");
    } catch {
      setState("error");
      setError("Something went wrong. Try again.");
      timer.current = window.setTimeout(() => setState("idle"), 2400);
    }
  };

  const done = state === "success";

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-foreground">
        {newsletter.title ?? "Stay in the loop"}
      </h3>
      {newsletter.description ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {newsletter.description}
        </p>
      ) : null}
      <form noValidate onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
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
              if (error && isValidEmail(event.target.value)) setError(null);
            }}
            placeholder={newsletter.placeholder ?? "you@example.com"}
            className={cn(
              "h-10 min-w-0 flex-1 rounded-full border bg-card px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 disabled:opacity-60",
              error
                ? "border-destructive focus-visible:ring-destructive/30"
                : "border-border focus-visible:border-border-strong focus-visible:ring-ring/40",
            )}
          />
          <StatefulButton
            type="submit"
            state={state}
            loadingText="Joining"
            successText="Subscribed"
            errorText="Retry"
            icon={<Send aria-hidden className="size-3.5" />}
            className="shrink-0"
          >
            {newsletter.buttonLabel ?? "Subscribe"}
          </StatefulButton>
        </div>
        <p
          id={`${id}-status`}
          aria-live="polite"
          className={cn(
            "min-h-5 text-xs",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error ??
            (done
              ? (newsletter.successMessage ?? "Thanks! Check your inbox to confirm.")
              : "")}
        </p>
      </form>
    </div>
  );
}

/**
 * Site footer: brand column (logo, tagline, social icons that lift on hover),
 * link columns that collapse into disclosures in narrow containers, a
 * newsletter signup with idle/loading/success/error states driven by the
 * `onSubscribe` promise, and a bottom bar with copyright, legal links and an
 * optional theme toggle slot. Layout follows the footer's own container.
 */
export function FooterSection({
  logo,
  tagline,
  socials = [],
  columns = [],
  newsletter = {},
  onSubscribe,
  copyright,
  year,
  legalLinks = [],
  themeToggle,
  className,
}: FooterSectionProps) {
  const hasNewsletter = Boolean(onSubscribe);

  return (
    <footer
      className={cn(
        "@container w-full border-t border-border text-foreground",
        className,
      )}
    >
      <div
        className={cn(
          "grid gap-8 py-10 @xl:grid-cols-2 @xl:gap-x-10",
          hasNewsletter
            ? "@4xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.2fr)]"
            : "@4xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
        )}
      >
        <div className="order-1 flex flex-col gap-4">
          {logo ? <div className="flex items-center">{logo}</div> : null}
          {tagline ? (
            <p className="max-w-xs text-pretty text-sm leading-6 text-muted-foreground">
              {tagline}
            </p>
          ) : null}
          {socials.length ? (
            <ul className="flex flex-wrap items-center gap-2">
              {socials.map((social) => (
                <li key={social.href}>
                  <SocialLink social={social} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {columns.length ? (
          <nav
            aria-label="Footer"
            className={cn(
              "order-2 grid @md:grid-cols-3 @md:gap-6",
              hasNewsletter && "@xl:order-3 @xl:col-span-2 @4xl:order-2 @4xl:col-span-1",
            )}
          >
            {columns.map((column) => (
              <LinkColumn key={column.title} column={column} />
            ))}
          </nav>
        ) : null}

        {onSubscribe ? (
          <div className="order-3 @xl:order-2 @4xl:order-3">
            <NewsletterForm newsletter={newsletter} onSubscribe={onSubscribe} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-border py-5 text-xs text-muted-foreground @md:flex-row @md:items-center @md:justify-between">
        <p>
          &copy; {year !== undefined ? `${year} ` : ""}
          {copyright}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {legalLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {link.label}
            </a>
          ))}
          {themeToggle ? <div className="flex items-center">{themeToggle}</div> : null}
        </div>
      </div>
    </footer>
  );
}
