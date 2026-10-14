"use client";

import { ArrowRight } from "lucide-react";
import { motion, type Transition, useReducedMotion } from "motion/react";
import type { ElementType, ReactNode } from "react";
import { Button, ButtonLink } from "@/components/motion/button";
import { CopyButton } from "@/components/motion/copy-button";
import { TextReveal } from "@/components/motion/text-reveal";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface HeroAction {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Trailing icon. */
  icon?: ReactNode;
}

export interface HeroBadge {
  label: ReactNode;
  /** Pill before the label. Default "New"; null hides it. */
  pill?: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface HeroSectionProps {
  /** Revealed word by word with a blur-in. */
  headline: string | string[];
  description?: ReactNode;
  badge?: HeroBadge;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  /** Shell command shown in a chip with a copy button. */
  installCommand?: string;
  /** Screenshot, video or mock UI below the copy. Tilts in on view. */
  media?: ReactNode;
  align?: "center" | "left";
  /** CSS-only animated grid with sweeping beams, or nothing. Default "grid". */
  background?: "grid" | "none";
  /** Heading element for the headline. Default "h1". */
  headingAs?: ElementType;
  className?: string;
  mediaClassName?: string;
}

const WORD_STAGGER = 0.06;

const ENTER: Transition = { duration: 0.5, ease: EASE_OUT };

// Media tilt-in: a heavier, slower spring than the UI tokens because it moves
// a large surface through a 3D tilt; the snappier tokens read as a jolt here.
const MEDIA_SPRING: Transition = {
  type: "spring",
  stiffness: 110,
  damping: 22,
  mass: 1,
};

// Beam sweep: decorative, slow and linear so the eye never locks onto it.
const BEAM_TRANSITION: Transition = {
  duration: 7,
  ease: "linear",
  repeat: Number.POSITIVE_INFINITY,
  repeatDelay: 2,
};

function wordCount(text: string | string[]) {
  return (Array.isArray(text) ? text.join(" ") : text)
    .split(/\s+/)
    .filter(Boolean).length;
}

function ActionButton({
  action,
  variant,
}: {
  action: HeroAction;
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

function HeroBackground({ reduce }: { reduce: boolean | null }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_40%,transparent_100%)]"
    >
      {/* 40px grid drawn with two repeating hairline gradients. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-strong)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-strong)_1px,transparent_1px)] bg-[size:40px_40px]" />
      {/* Soft glow at the top. */}
      <div className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklab,var(--foreground)_9%,transparent),transparent)]" />
      {reduce ? null : (
        <>
          {/* Beams ride grid lines (multiples of 40px) and only translate. */}
          <motion.div
            className="absolute top-[120px] left-0 h-px w-1/3 bg-[linear-gradient(to_right,transparent,var(--foreground),transparent)] opacity-40"
            initial={{ x: "-100%" }}
            animate={{ x: "300%" }}
            transition={BEAM_TRANSITION}
          />
          <motion.div
            className="absolute top-0 left-[calc(50%+80px)] h-1/2 w-px bg-[linear-gradient(to_bottom,transparent,var(--foreground),transparent)] opacity-30"
            initial={{ y: "-100%" }}
            animate={{ y: "200%" }}
            transition={{ ...BEAM_TRANSITION, delay: 3 }}
          />
        </>
      )}
    </div>
  );
}

/**
 * Landing hero: an eyebrow badge with a "New" pill, a headline revealed word
 * by word with a blur-in, supporting copy, primary/secondary CTAs, an optional
 * install command with copy, and an optional media slot that tilts up into
 * place on view, over a CSS-only animated grid. Type scales with the
 * section's own container width.
 */
export function HeroSection({
  headline,
  description,
  badge,
  primaryAction,
  secondaryAction,
  installCommand,
  media,
  align = "center",
  background = "grid",
  headingAs = "h1",
  className,
  mediaClassName,
}: HeroSectionProps) {
  const reduce = useReducedMotion();
  const centered = align === "center";
  // Supporting content enters as the headline finishes.
  const after = Math.min(1.2, 0.15 + wordCount(headline) * WORD_STAGGER);

  const enter = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: reduce ? { opacity: 1 } : { opacity: 1, y: 0 },
    transition: { ...ENTER, delay },
  });

  const badgeInner = badge ? (
    <>
      {badge.pill === null ? null : (
        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
          {badge.pill ?? "New"}
        </span>
      )}
      <span className="truncate">{badge.label}</span>
      <ArrowRight
        aria-hidden
        className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </>
  ) : null;
  const badgeClass =
    "group inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card/80 py-1 pr-3 pl-1 text-xs font-medium text-foreground shadow-xs backdrop-blur transition-colors hover:border-border-strong outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <section
      className={cn(
        "@container relative isolate w-full overflow-hidden",
        className,
      )}
    >
      {background === "grid" ? <HeroBackground reduce={reduce} /> : null}

      <div
        className={cn(
          "relative mx-auto flex max-w-3xl flex-col gap-5 px-5 pt-12 pb-10 @3xl:pt-20",
          centered ? "items-center text-center" : "items-start text-left",
          !centered && "mx-0 max-w-2xl",
        )}
      >
        {badge ? (
          <motion.div {...enter(0)}>
            {badge.href ? (
              <a href={badge.href} onClick={badge.onClick} className={badgeClass}>
                {badgeInner}
              </a>
            ) : badge.onClick ? (
              <button type="button" onClick={badge.onClick} className={badgeClass}>
                {badgeInner}
              </button>
            ) : (
              <span className={badgeClass}>{badgeInner}</span>
            )}
          </motion.div>
        ) : null}

        <TextReveal
          as={headingAs}
          text={headline}
          stagger={WORD_STAGGER}
          delay={0.1}
          blur={8}
          yOffset="30%"
          className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-foreground @md:text-4xl @3xl:text-5xl @5xl:text-6xl"
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
              "flex flex-wrap items-center gap-3",
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

        {installCommand ? (
          <motion.div
            {...enter(after + 0.16)}
            className="inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-border bg-card/80 pr-1 pl-4 font-mono text-xs text-foreground backdrop-blur @md:text-sm"
          >
            <span aria-hidden className="select-none text-muted-foreground">
              $
            </span>
            <code className="min-w-0 truncate">{installCommand}</code>
            <CopyButton
              value={installCommand}
              variant="ghost"
              labels={{ idle: "Copy install command" }}
              className="rounded-full"
            />
          </motion.div>
        ) : null}
      </div>

      {media ? (
        <div className="relative px-5 [perspective:1200px]">
          <motion.div
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, rotateX: 22, y: 40, scale: 0.96 }
            }
            whileInView={
              reduce
                ? { opacity: 1 }
                : { opacity: 1, rotateX: 0, y: 0, scale: 1 }
            }
            viewport={{ once: true, amount: 0.2 }}
            transition={
              reduce
                ? { duration: 0.3, ease: EASE_OUT }
                : { ...MEDIA_SPRING, opacity: { duration: 0.5, ease: EASE_OUT } }
            }
            style={{ transformOrigin: "50% 0%" }}
            className={cn(
              "mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/5",
              mediaClassName,
            )}
          >
            {media}
          </motion.div>
        </div>
      ) : null}
    </section>
  );
}
