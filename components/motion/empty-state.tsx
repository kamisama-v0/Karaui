"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type EmptyStateSize = "sm" | "md" | "lg";
export type EmptyStateIllustrationVariant = "documents" | "search";

/* -------------------------------------------------------------------------- */
/*                                Illustration                                */
/* -------------------------------------------------------------------------- */

export interface EmptyStateIllustrationProps {
  variant?: EmptyStateIllustrationVariant;
  /** Width in px; height follows the 5:4 viewBox. */
  size?: number;
  className?: string;
}

const draw = (delay: number, reduce: boolean) => ({
  initial: reduce ? { pathLength: 1, opacity: 0 } : { pathLength: 0, opacity: 0 },
  whileInView: { pathLength: 1, opacity: 1 },
  viewport: { once: true },
  transition: reduce
    ? { duration: 0.2 }
    : {
        pathLength: { duration: 0.5, ease: EASE_OUT, delay },
        opacity: { duration: 0.1, delay },
      },
});

// Idle float: translate only (no rotate/scale), so no SVG transform-origin is
// involved. Rotations in the art are static `transform` attributes on an
// inner <g> that motion never touches.
const float = (reduce: boolean, amplitude: number, duration: number, delay: number) =>
  reduce
    ? {}
    : {
        animate: { y: [0, -amplitude, 0] },
        transition: { duration, ease: EASE_IN_OUT, repeat: Infinity, delay },
      };

/** Small default empty-state art: a floating document stack or a search lens. */
export function EmptyStateIllustration({
  variant = "documents",
  size = 120,
  className,
}: EmptyStateIllustrationProps) {
  const reduce = useReducedMotion() ?? false;
  const lineClass = "stroke-border-strong";

  return (
    <svg
      width={size}
      height={(size * 4) / 5}
      viewBox="0 0 120 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("overflow-visible", className)}
    >
      <ellipse cx="60" cy="88" rx="30" ry="3.5" className="fill-muted" />
      {variant === "documents" ? (
        <>
          <motion.g {...float(reduce, 2, 3.4, 0.4)}>
            <g transform="rotate(-9 46 48)">
              <rect x="24" y="20" width="44" height="56" rx="7" strokeWidth="1.5" className="fill-muted stroke-border-strong" />
            </g>
          </motion.g>
          <motion.g {...float(reduce, 2.5, 3.8, 0.9)}>
            <g transform="rotate(8 74 48)">
              <rect x="52" y="20" width="44" height="56" rx="7" strokeWidth="1.5" className="fill-muted stroke-border-strong" />
            </g>
          </motion.g>
          <motion.g {...float(reduce, 3.5, 3, 0)}>
            <rect x="37" y="16" width="46" height="60" rx="7" strokeWidth="1.5" className="fill-card stroke-border-strong" />
            <motion.path d="M46 30h20" strokeWidth="3" strokeLinecap="round" className="stroke-foreground/70" {...draw(0.25, reduce)} />
            <motion.path d="M46 40h28" strokeWidth="3" strokeLinecap="round" className={lineClass} {...draw(0.35, reduce)} />
            <motion.path d="M46 49h24" strokeWidth="3" strokeLinecap="round" className={lineClass} {...draw(0.45, reduce)} />
            <motion.path d="M46 58h16" strokeWidth="3" strokeLinecap="round" className={lineClass} {...draw(0.55, reduce)} />
            <motion.g
              initial={{ opacity: 0, y: reduce ? 0 : 4 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.6 }}
            >
              <circle cx="84" cy="17" r="9" className="fill-primary" />
              <path d="M84 13v8M80 17h8" strokeWidth="2" strokeLinecap="round" className="stroke-primary-foreground" />
            </motion.g>
          </motion.g>
        </>
      ) : (
        <>
          <motion.g {...float(reduce, 1.5, 3.6, 0.5)}>
            <rect x="22" y="22" width="64" height="50" rx="8" strokeWidth="1.5" className="fill-muted stroke-border-strong" />
            <motion.path d="M32 36h30" strokeWidth="3" strokeLinecap="round" className={lineClass} {...draw(0.2, reduce)} />
            <motion.path d="M32 46h22" strokeWidth="3" strokeLinecap="round" className={lineClass} {...draw(0.3, reduce)} />
            <motion.path d="M32 56h26" strokeWidth="3" strokeLinecap="round" className={lineClass} {...draw(0.4, reduce)} />
          </motion.g>
          <motion.g {...float(reduce, 3.5, 3, 0)}>
            <circle cx="76" cy="48" r="17" strokeWidth="1.5" className="fill-card stroke-border-strong" />
            <motion.circle cx="76" cy="48" r="11" strokeWidth="3" className="stroke-foreground/70" {...draw(0.35, reduce)} />
            <motion.path d="M84.5 56.5 96 68" strokeWidth="5" strokeLinecap="round" className="stroke-foreground/70" {...draw(0.6, reduce)} />
            <motion.path d="M72.5 44.5l7 7M79.5 44.5l-7 7" strokeWidth="2" strokeLinecap="round" className="stroke-muted-foreground" {...draw(0.75, reduce)} />
          </motion.g>
        </>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 EmptyState                                 */
/* -------------------------------------------------------------------------- */

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /**
   * Icon or illustration slot. Defaults to `<EmptyStateIllustration />`;
   * pass `null` for none.
   */
  icon?: ReactNode;
  /** Primary call to action (e.g. a library `Button`). */
  action?: ReactNode;
  /** Secondary call to action, rendered after the primary. */
  secondaryAction?: ReactNode;
  size?: EmptyStateSize;
  /** Dashed border container, for empty regions inside a page. */
  bordered?: boolean;
  /** Heading element for the title. Default `h3`. */
  titleAs?: "h2" | "h3" | "h4" | "p";
  /** Extra content under the actions (links, hints). */
  children?: ReactNode;
  className?: string;
}

const SIZE: Record<
  EmptyStateSize,
  { root: string; title: string; description: string; art: number }
> = {
  sm: { root: "gap-3 px-4 py-6", title: "text-sm", description: "text-xs max-w-[32ch]", art: 88 },
  md: { root: "gap-4 px-6 py-10", title: "text-base", description: "text-sm max-w-[38ch]", art: 120 },
  lg: { root: "gap-5 px-8 py-14", title: "text-lg", description: "text-base max-w-[44ch]", art: 152 },
};

/**
 * Empty-state block: illustration, title, description and actions that
 * stagger in when scrolled into view (opacity + small rise; opacity only under
 * reduced motion).
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  size = "md",
  bordered = false,
  titleAs: Title = "h3",
  children,
  className,
}: EmptyStateProps) {
  const reduce = useReducedMotion();
  const s = SIZE[size];

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
  };

  const art = icon === undefined ? <EmptyStateIllustration size={s.art} /> : icon;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      className={cn(
        "flex w-full flex-col items-center text-center",
        s.root,
        bordered && "rounded-2xl border border-dashed border-border-strong",
        className,
      )}
    >
      {art != null ? (
        <motion.div variants={item} className="flex items-center justify-center text-muted-foreground">
          {art}
        </motion.div>
      ) : null}
      <div className="flex flex-col items-center gap-1.5">
        <motion.div variants={item}>
          <Title className={cn("font-semibold tracking-tight text-foreground", s.title)}>
            {title}
          </Title>
        </motion.div>
        {description != null ? (
          <motion.p variants={item} className={cn("text-muted-foreground text-balance", s.description)}>
            {description}
          </motion.p>
        ) : null}
      </div>
      {action != null || secondaryAction != null ? (
        <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </motion.div>
      ) : null}
      {children != null ? <motion.div variants={item}>{children}</motion.div> : null}
    </motion.div>
  );
}
