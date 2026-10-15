"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useMemo } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { EASE_OUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface ContentStat {
  value: number;
  label: ReactNode;
  /** Short line under the label. */
  description?: ReactNode;
  prefix?: string;
  suffix?: string;
  /** Fixed decimal places while rolling and at rest. Default 0. */
  decimals?: number;
}

export interface ContentQuoteAuthor {
  name: string;
  role?: ReactNode;
  /** Avatar node (image, illustration). Falls back to initials. */
  avatar?: ReactNode;
}

export interface ContentSectionProps {
  /**
   * "split": copy beside media (media sticks while the copy scrolls on wide
   * containers). "stats": copy plus rolling stat callouts. "quote": a pull
   * quote with large quote marks and its author.
   */
  variant?: "split" | "stats" | "quote";
  eyebrow?: ReactNode;
  heading?: ReactNode;
  /** Body copy; each entry is revealed as it scrolls into view. */
  paragraphs?: ReactNode[];
  /** Extra content after the paragraphs (CTA, list). */
  children?: ReactNode;
  /** `variant="split"`: media node (image, mock UI, illustration). */
  media?: ReactNode;
  mediaPosition?: "left" | "right";
  /** `variant="split"`: keep the media pinned while the copy scrolls. Default true. */
  stickyMedia?: boolean;
  /** `variant="stats"`: up to 3 reads best. */
  stats?: ContentStat[];
  /** `variant="quote"`: the quote itself, without quote marks. */
  quote?: ReactNode;
  author?: ContentQuoteAuthor;
  /** Number formatting locale. Default "en-US" so server and client agree. */
  locale?: string;
  className?: string;
}

const REVEAL_DURATION = 0.55;

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: REVEAL_DURATION, ease: EASE_OUT, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Header({
  eyebrow,
  heading,
  center = false,
}: {
  eyebrow?: ReactNode;
  heading?: ReactNode;
  center?: boolean;
}) {
  if (!eyebrow && !heading) return null;
  return (
    <Reveal className={cn("flex flex-col gap-3", center && "items-center text-center")}>
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      {heading ? (
        <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight @3xl:text-3xl">
          {heading}
        </h2>
      ) : null}
    </Reveal>
  );
}

function Paragraphs({ paragraphs }: { paragraphs?: ReactNode[] }) {
  if (!paragraphs?.length) return null;
  return (
    <div className="flex flex-col gap-4">
      {paragraphs.map((paragraph, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs are positional copy.
        <Reveal key={index}>
          <p className="text-pretty text-[15px] leading-7 text-muted-foreground">{paragraph}</p>
        </Reveal>
      ))}
    </div>
  );
}

function StatValue({ stat, locale }: { stat: ContentStat; locale: string }) {
  const decimals = stat.decimals ?? 0;
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [locale, decimals],
  );
  return (
    <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums @3xl:text-4xl">
      {stat.prefix}
      <AnimatedNumber value={stat.value} format={(n) => formatter.format(n)} />
      {stat.suffix}
    </span>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return ((parts[0]?.[0] ?? "") + last).toUpperCase();
}

/**
 * Long-form marketing content block in three variants. "split" sets copy
 * beside a media slot that stays pinned while the copy scrolls (on wide
 * containers); "stats" pairs copy with stat callouts whose numbers roll up
 * when they scroll into view; "quote" is a pull quote framed by large
 * typographic quote marks with its author. Paragraphs reveal on scroll.
 */
export function ContentSection({
  variant = "split",
  eyebrow,
  heading,
  paragraphs,
  children,
  media,
  mediaPosition = "right",
  stickyMedia = true,
  stats = [],
  quote,
  author,
  locale = "en-US",
  className,
}: ContentSectionProps) {
  const reduce = useReducedMotion() ?? false;

  if (variant === "quote") {
    return (
      <section className={cn("@container w-full text-foreground", className)}>
        <figure className="relative mx-auto m-0 flex max-w-3xl flex-col items-center gap-6 px-2 py-6 text-center">
          {eyebrow ? (
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
              </p>
            </Reveal>
          ) : null}
          <div className="relative px-6 @md:px-12">
            {/* Decorative marks: a transform pop on view, nothing else moves. */}
            <motion.span
              aria-hidden
              initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={reduce ? { duration: 0.3, ease: EASE_OUT } : SPRING_SWAP}
              className="pointer-events-none absolute -top-6 left-0 select-none font-serif text-7xl leading-none text-foreground/15 @md:-top-8 @md:text-8xl"
            >
              &ldquo;
            </motion.span>
            <motion.span
              aria-hidden
              initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={
                reduce ? { duration: 0.3, ease: EASE_OUT } : { ...SPRING_SWAP, delay: 0.12 }
              }
              className="pointer-events-none absolute right-0 -bottom-14 select-none font-serif text-7xl leading-none text-foreground/15 @md:-bottom-20 @md:text-8xl"
            >
              &rdquo;
            </motion.span>
            <Reveal delay={0.05}>
              <blockquote className="m-0">
                <p className="text-balance text-xl font-medium leading-snug tracking-tight @md:text-2xl @3xl:text-3xl">
                  {quote}
                </p>
              </blockquote>
            </Reveal>
          </div>
          {author ? (
            <Reveal delay={0.15}>
              <figcaption className="flex items-center gap-3 text-left">
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted text-xs font-semibold text-foreground">
                  {author.avatar ?? initials(author.name)}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{author.name}</span>
                  {author.role ? (
                    <span className="text-xs text-muted-foreground">{author.role}</span>
                  ) : null}
                </span>
              </figcaption>
            </Reveal>
          ) : null}
          {children}
        </figure>
      </section>
    );
  }

  if (variant === "stats") {
    return (
      <section className={cn("@container w-full text-foreground", className)}>
        <div className="flex flex-col gap-8">
          <div className="grid gap-6 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @3xl:gap-10">
            <Header eyebrow={eyebrow} heading={heading} />
            <div className="flex flex-col gap-4">
              <Paragraphs paragraphs={paragraphs} />
              {children}
            </div>
          </div>
          {stats.length > 0 ? (
            <dl className="m-0 grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card @lg:grid-cols-3">
              {stats.map((stat, index) => (
                <Reveal
                  // biome-ignore lint/suspicious/noArrayIndexKey: stats are positional.
                  key={index}
                  delay={index * 0.08}
                  className={cn(
                    "flex flex-col gap-1 p-5",
                    index > 0 && "border-t border-border @lg:border-t-0 @lg:border-l",
                  )}
                >
                  <dt className="order-2 text-sm font-medium text-foreground">{stat.label}</dt>
                  <dd className="order-1 m-0">
                    <StatValue stat={stat} locale={locale} />
                  </dd>
                  {stat.description ? (
                    <dd className="order-3 m-0 text-xs leading-5 text-muted-foreground">
                      {stat.description}
                    </dd>
                  ) : null}
                </Reveal>
              ))}
            </dl>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={cn("@container w-full text-foreground", className)}>
      <div className="grid gap-8 @xl:grid-cols-2 @xl:gap-10 @4xl:gap-14">
        <div className="flex flex-col gap-5">
          <Header eyebrow={eyebrow} heading={heading} />
          <Paragraphs paragraphs={paragraphs} />
          {children}
        </div>
        {media ? (
          <div
            className={cn(
              "@xl:self-start",
              stickyMedia && "@xl:sticky @xl:top-6",
              mediaPosition === "left" && "@xl:order-first",
            )}
          >
            <Reveal>{media}</Reveal>
          </div>
        ) : null}
      </div>
    </section>
  );
}
