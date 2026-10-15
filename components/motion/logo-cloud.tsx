"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Marquee } from "@/components/motion/marquee";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface LogoCloudItem {
  id: string;
  /** Accessible name of the company or product. */
  name: string;
  /** SVG or any node. Use `currentColor` so it follows the muted/hover tint. */
  logo: ReactNode;
  href?: string;
}

export interface LogoCloudProps {
  logos: LogoCloudItem[];
  /** "marquee" scrolls one infinite row; "grid" lays logos out and fades them in. Default "marquee". */
  variant?: "marquee" | "grid";
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  /** Seconds for one marquee loop. Default 30. */
  speed?: number;
  /** Marquee direction. Default "left". */
  direction?: "left" | "right";
  /** Pause the marquee on hover or keyboard focus. Default true. */
  pauseOnHover?: boolean;
  /** Logos start muted (grayscale, dimmed) and take their own colors on hover. Default true. */
  colorize?: boolean;
  /** Grid columns at the widest container size. Default 4. */
  columns?: 3 | 4 | 5 | 6;
  className?: string;
  /** Classes for each logo tile (sizing, padding). */
  itemClassName?: string;
}

// Static class maps: Tailwind only ships classes it can see written out.
const GRID_COLUMNS: Record<3 | 4 | 5 | 6, string> = {
  3: "grid-cols-2 @md:grid-cols-3",
  4: "grid-cols-2 @md:grid-cols-4",
  5: "grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-5",
  6: "grid-cols-3 @md:grid-cols-4 @2xl:grid-cols-6",
};

const STAGGER = 0.05;

function LogoMark({
  item,
  colorize,
  lift,
  className,
}: {
  item: LogoCloudItem;
  colorize: boolean;
  lift: boolean;
  className?: string;
}) {
  const classes = cn(
    "group/logo flex h-12 items-center justify-center px-3 text-muted-foreground outline-none transition-[color,filter,opacity,translate,border-color,box-shadow] duration-300 [&_svg]:h-7 [&_svg]:w-auto [&_svg]:max-w-full",
    colorize &&
      "opacity-70 grayscale hover:text-foreground hover:opacity-100 hover:grayscale-0 focus-visible:text-foreground focus-visible:opacity-100 focus-visible:grayscale-0",
    // Tailwind's hover variant only applies on hover-capable pointers, so
    // touch devices never get a stuck lift.
    lift && "hover:-translate-y-1 motion-reduce:hover:translate-y-0",
    item.href && "rounded-xl focus-visible:ring-2 focus-visible:ring-ring/50",
    className,
  );
  const content = (
    <>
      <span aria-hidden className="contents">
        {item.logo}
      </span>
      <span className="sr-only">{item.name}</span>
    </>
  );
  return item.href ? (
    <a href={item.href} className={classes}>
      {content}
    </a>
  ) : (
    <div className={classes}>{content}</div>
  );
}

/**
 * "Trusted by" logo strip. The marquee variant reuses `Marquee` for one
 * infinite row behind edge fade masks, pausing on hover or focus. The grid
 * variant fades logos in with a stagger when it scrolls into view; each
 * logo lifts on hover. Logos start muted and take their own colors on hover.
 * Reduced motion shows the marquee's logos as a static wrapped row.
 */
export function LogoCloud({
  logos,
  variant = "marquee",
  eyebrow,
  heading,
  description,
  speed = 30,
  direction = "left",
  pauseOnHover = true,
  colorize = true,
  columns = 4,
  className,
  itemClassName,
}: LogoCloudProps) {
  const reduce = useReducedMotion();

  const header =
    eyebrow || heading || description ? (
      <div className="mx-auto mb-6 flex max-w-xl flex-col items-center gap-2 text-center">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        {heading ? (
          <h2 className="text-balance font-display text-xl font-semibold leading-tight tracking-tight text-foreground @3xl:text-2xl">
            {heading}
          </h2>
        ) : null}
        {description ? (
          <p className="text-pretty text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    ) : null;

  let body: ReactNode;
  if (variant === "marquee" && !reduce) {
    body = (
      <Marquee
        direction={direction}
        speed={speed}
        pauseOnHover={pauseOnHover}
        gap="1.5rem"
        className={cn(
          "py-2",
          pauseOnHover && "[&:focus-within>div]:[animation-play-state:paused]",
        )}
      >
        {logos.map((item) => (
          <LogoMark
            key={item.id}
            item={item}
            colorize={colorize}
            lift={false}
            className={itemClassName}
          />
        ))}
      </Marquee>
    );
  } else if (variant === "marquee") {
    // Reduced motion: no endless movement, just a centered wrapped row.
    body = (
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        {logos.map((item) => (
          <li key={item.id}>
            <LogoMark item={item} colorize={colorize} lift={false} className={itemClassName} />
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={{ show: { transition: { staggerChildren: STAGGER } } }}
        className={cn("grid gap-3", GRID_COLUMNS[columns])}
      >
        {logos.map((item) => (
          <motion.li
            key={item.id}
            variants={{
              hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 },
              show: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.5, ease: EASE_OUT },
              },
            }}
          >
            <LogoMark
              item={item}
              colorize={colorize}
              lift
              className={cn(
                "h-20 rounded-2xl border border-border bg-card shadow-xs hover:border-border-strong hover:shadow-sm",
                itemClassName,
              )}
            />
          </motion.li>
        ))}
      </motion.ul>
    );
  }

  return (
    <section className={cn("@container w-full", className)}>
      {header}
      {body}
    </section>
  );
}
