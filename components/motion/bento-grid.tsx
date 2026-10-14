"use client";

import { ArrowRight } from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { type MouseEvent, type ReactNode, useState } from "react";
import { EASE_OUT, EASE_OUT_CSS } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export type BentoSpan = 1 | 2 | 3 | 4;

export interface BentoGridProps {
  children: ReactNode;
  /** Columns once the grid's own container is at least 32rem wide. Default 3. */
  columns?: 2 | 3 | 4;
  /** Stagger the cards in when the grid scrolls into view. Default true. */
  animateOnView?: boolean;
  className?: string;
}

// Static class maps: Tailwind only ships classes it can see written out.
const GRID_COLS: Record<2 | 3 | 4, string> = {
  2: "@lg:grid-cols-2",
  3: "@lg:grid-cols-3",
  4: "@lg:grid-cols-4",
};
const COL_SPAN: Record<BentoSpan, string> = {
  1: "",
  2: "@lg:col-span-2",
  3: "@lg:col-span-3",
  4: "@lg:col-span-4",
};
const ROW_SPAN: Record<BentoSpan, string> = {
  1: "",
  2: "@lg:row-span-2",
  3: "@lg:row-span-3",
  4: "@lg:row-span-4",
};

const STAGGER = 0.06;

/**
 * Responsive bento layout. The grid reads its own container width (not the
 * viewport), so it collapses to one column inside a narrow sidebar or card
 * just as it does on a phone. Cards stagger in once when scrolled into view.
 */
export function BentoGrid({
  children,
  columns = 3,
  animateOnView = true,
  className,
}: BentoGridProps) {
  return (
    <div className={cn("@container w-full", className)}>
      <motion.div
        initial={animateOnView ? "hidden" : false}
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ show: { transition: { staggerChildren: STAGGER } } }}
        className={cn(
          "grid grid-cols-1 auto-rows-[minmax(9rem,auto)] gap-3",
          GRID_COLS[columns],
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}

export interface BentoCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** Small icon shown in a tile above the title. */
  icon?: ReactNode;
  /** Decorative visual (mini chart, illustration). Lifts and zooms on hover. */
  visual?: ReactNode;
  /** Makes the whole card a link via the CTA. */
  href?: string;
  /** Makes the whole card a button via the CTA (ignored when `href` is set). */
  onClick?: () => void;
  /** CTA label. Default "Learn more". Only shown with `href` or `onClick`. */
  cta?: ReactNode;
  /** Columns spanned at wide container sizes. Default 1. */
  colSpan?: BentoSpan;
  /** Rows spanned at wide container sizes. Default 1. */
  rowSpan?: BentoSpan;
  /** Spotlight color (any CSS color). Default `var(--primary)`. */
  spotlightColor?: string;
  className?: string;
}

const SPOT_SIZE = 280; // px diameter of the cursor spotlight

/**
 * A bento tile. On hover-capable devices a radial spotlight follows the
 * cursor, lighting the border and faintly washing the surface; the visual
 * slot lifts slightly. With `href`/`onClick` the CTA is the real link or
 * button and stretches over the whole card, so the tile stays one tab stop.
 */
export function BentoCard({
  title,
  description,
  icon,
  visual,
  href,
  onClick,
  cta = "Learn more",
  colSpan = 1,
  rowSpan = 1,
  spotlightColor = "var(--primary)",
  className,
}: BentoCardProps) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  // The spotlight tracks the cursor; it is decorative, so touch devices
  // (phantom hover) skip it. Reduced motion keeps it: it follows the pointer
  // 1:1 with no travel of its own, so nothing moves that the user didn't move.
  const spotlight = canHover;
  const lift = canHover && !reduce;
  const [hovered, setHovered] = useState(false);
  // Spotlight position as transforms on the glow layers, not a re-rendered
  // gradient: the circles translate, so the browser only composites.
  const x = useMotionValue(-SPOT_SIZE);
  const y = useMotionValue(-SPOT_SIZE);

  const onMove = (event: MouseEvent<HTMLElement>) => {
    if (!spotlight) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left - SPOT_SIZE / 2);
    y.set(event.clientY - rect.top - SPOT_SIZE / 2);
  };

  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: EASE_OUT },
    },
  };

  const interactive = Boolean(href || onClick);
  const ctaClass =
    // Stretched link: the CTA stays static so its ::after covers the card
    // (the nearest positioned ancestor), making the whole tile clickable.
    "mt-3 inline-flex w-fit items-center gap-1 rounded-md text-sm font-medium text-foreground outline-none after:absolute after:inset-0 after:z-30 after:rounded-[inherit] after:content-[''] focus-visible:ring-2 focus-visible:ring-primary";
  const ctaInner = (
    <>
      {cta}
      <ArrowRight
        aria-hidden
        className={cn(
          "size-3.5 transition-transform duration-200",
          !reduce && "group-hover/bento:translate-x-0.5 group-focus-within/bento:translate-x-0.5",
        )}
        style={{ transitionTimingFunction: EASE_OUT_CSS }}
      />
    </>
  );

  const spot = (opacityClass: string) => (
    <motion.span
      aria-hidden
      style={{
        x,
        y,
        width: SPOT_SIZE,
        height: SPOT_SIZE,
        background: `radial-gradient(circle closest-side, ${spotlightColor}, transparent)`,
      }}
      className={cn("pointer-events-none absolute left-0 top-0 rounded-full", opacityClass)}
    />
  );

  return (
    <motion.article
      variants={item}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group/bento relative isolate flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 text-card-foreground",
        interactive && "cursor-pointer",
        COL_SPAN[colSpan],
        ROW_SPAN[rowSpan],
        className,
      )}
    >
      {spotlight ? (
        <>
          {/* Surface wash */}
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 overflow-hidden transition-opacity duration-300",
              hovered ? "opacity-[0.07]" : "opacity-0",
            )}
          >
            {spot("")}
          </span>
          {/* Border light: the same circle, masked down to a 1px ring. */}
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit] p-px transition-opacity duration-300 [mask-composite:exclude] [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)]",
              hovered ? "opacity-100" : "opacity-0",
            )}
          >
            {spot("opacity-80")}
          </span>
        </>
      ) : null}

      {visual ? (
        <div
          aria-hidden
          className={cn(
            "relative mb-3 flex min-h-0 flex-1 items-center justify-center transition-transform duration-500",
            lift && "group-hover/bento:-translate-y-1 group-hover/bento:scale-[1.03]",
          )}
          style={{ transitionTimingFunction: EASE_OUT_CSS }}
        >
          {visual}
        </div>
      ) : null}

      <div className={cn("flex flex-col", !visual && "mt-auto")}>
        <div className="flex items-center gap-2">
          {icon ? (
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground [&_svg]:size-3.5">
              {icon}
            </span>
          ) : null}
          <h3 className="text-sm font-semibold leading-snug">{title}</h3>
        </div>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
        {href ? (
          <a href={href} className={ctaClass}>
            {ctaInner}
          </a>
        ) : onClick ? (
          <button type="button" onClick={onClick} className={ctaClass}>
            {ctaInner}
          </button>
        ) : null}
      </div>
    </motion.article>
  );
}
