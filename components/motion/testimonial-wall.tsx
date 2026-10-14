"use client";

import { Star } from "lucide-react";
import { useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { Marquee } from "@/components/motion/marquee";
import { cn } from "@/lib/utils";

export interface Testimonial {
  id: string;
  quote: ReactNode;
  name: string;
  role?: ReactNode;
  /** Image URL. Falls back to initials derived from `name`. */
  avatar?: string;
  /** Override the derived initials. */
  initials?: string;
  /** 0–5 stars. Omit to hide the rating row. */
  rating?: number;
}

export interface TestimonialWallProps {
  testimonials: Testimonial[];
  /** "marquee" scrolls columns in alternating directions; "grid" is static. */
  variant?: "marquee" | "grid";
  /** Maximum number of columns at the widest container size (1–4). Default 3. */
  columns?: 1 | 2 | 3 | 4;
  /** Seconds for one loop of the first column. Others vary slightly. Default 40. */
  speed?: number;
  /** Height of the marquee viewport. Default 32rem. Ignored by `grid`. */
  height?: number | string;
  /** Pause a column while it is hovered or holds focus. Default true. */
  pauseOnHover?: boolean;
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  className?: string;
}

// Show/hide classes for the 1/2/3/4-lane layouts. Lane counts step up with
// the block's own container width (not the viewport): 2 at @md, 3 at @3xl,
// 4 at @5xl. Spelled out in full so Tailwind can see every class.
const SHOW_AT = ["flex", "hidden @md:flex", "hidden @3xl:flex", "hidden @5xl:flex"];
const HIDE_AT = ["", "@md:hidden", "@3xl:hidden", "@5xl:hidden"];
const GRID_COLUMNS = [
  "columns-1",
  "columns-1 @md:columns-2",
  "columns-1 @md:columns-2 @3xl:columns-3",
  "columns-1 @md:columns-2 @3xl:columns-3 @5xl:columns-4",
];

const FADE_MASK =
  "[mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)]";

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Deterministic palette slot so a person keeps the same avatar tint. */
function tintOf(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 5) + 1;
}

function distribute<T>(items: T[], lanes: number): T[][] {
  const out: T[][] = Array.from({ length: lanes }, () => []);
  items.forEach((item, index) => {
    out[index % lanes]?.push(item);
  });
  return out;
}

/** Repeat a short lane until it has at least `min` cards. */
function fillLane<T>(lane: T[], min = 4) {
  const out: { item: T; copy: number }[] = lane.map((item) => ({ item, copy: 0 }));
  if (lane.length === 0) return out;
  let copy = 1;
  while (out.length < min) {
    for (const item of lane) {
      if (out.length >= min) break;
      out.push({ item, copy });
    }
    copy += 1;
  }
  return out;
}

export function TestimonialCard({
  testimonial,
  className,
}: {
  testimonial: Testimonial;
  className?: string;
}) {
  const { quote, name, role, avatar, rating } = testimonial;
  const tint = tintOf(name);
  const stars =
    rating === undefined ? null : Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <figure
      className={cn(
        "flex w-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xs transition-colors hover:border-border-strong",
        className,
      )}
    >
      {stars !== null ? (
        <div className="flex items-center gap-0.5">
          <span className="sr-only">{`Rated ${stars} out of 5`}</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              aria-hidden
              className={cn(
                "size-3.5",
                i < stars
                  ? "fill-(--chart-4) text-(--chart-4)"
                  : "fill-muted text-muted",
              )}
            />
          ))}
        </div>
      ) : null}
      <blockquote className="text-pretty text-sm leading-6 text-foreground">
        {quote}
      </blockquote>
      <figcaption className="flex items-center gap-3">
        {avatar ? (
          // biome-ignore lint/performance/noImgElement: library component; consumers may not use next/image.
          <img
            src={avatar}
            alt=""
            width={36}
            height={36}
            loading="lazy"
            className="size-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            style={
              {
                "--tint": `var(--chart-${tint})`,
              } as CSSProperties
            }
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--tint)_22%,transparent)] text-xs font-semibold text-foreground ring-1 ring-[color-mix(in_oklab,var(--tint)_45%,transparent)]"
          >
            {testimonial.initials ?? initialsOf(name)}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">
            {name}
          </div>
          {role ? (
            <div className="truncate text-xs text-muted-foreground">{role}</div>
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}

/**
 * Testimonial wall: masonry-like columns of quote cards. The marquee variant
 * scrolls each column vertically in alternating directions behind top and
 * bottom fade masks, pausing a column on hover or focus; reduced motion and
 * `variant="grid"` render the same cards as a static masonry. Column count
 * follows the block's own container width.
 */
export function TestimonialWall({
  testimonials,
  variant = "marquee",
  columns = 3,
  speed = 40,
  height = "32rem",
  pauseOnHover = true,
  eyebrow,
  heading,
  description,
  className,
}: TestimonialWallProps) {
  const reduce = useReducedMotion();
  const maxLanes = Math.max(1, Math.min(4, columns));
  const animated = variant === "marquee" && !reduce;

  const header =
    eyebrow || heading || description ? (
      <div className="mx-auto mb-8 flex max-w-xl flex-col items-center gap-3 text-center">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        {heading ? (
          <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground @3xl:text-3xl">
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

  const grid = (
    <div className={cn("gap-3", GRID_COLUMNS[maxLanes - 1])}>
      {testimonials.map((t) => (
        <TestimonialCard key={t.id} testimonial={t} className="mb-3 break-inside-avoid" />
      ))}
    </div>
  );

  return (
    <section className={cn("@container w-full", className)}>
      {header}
      {variant === "grid" ? (
        grid
      ) : !animated ? (
        // Reduced motion: same viewport, static masonry that scrolls by hand.
        <div
          style={{ height }}
          className={cn(
            "overflow-y-auto px-px [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]",
            FADE_MASK,
          )}
        >
          <div className="py-6">{grid}</div>
        </div>
      ) : (
        <div style={{ height }} className={cn("relative overflow-hidden", FADE_MASK)}>
          {Array.from({ length: maxLanes }, (_, i) => i + 1).map((laneCount) => (
            <div
              key={laneCount}
              className={cn(
                "h-full gap-3",
                SHOW_AT[laneCount - 1],
                laneCount < maxLanes && HIDE_AT[laneCount],
              )}
            >
              {distribute(testimonials, laneCount).map((lane, laneIndex) => (
                <Marquee
                  // biome-ignore lint/suspicious/noArrayIndexKey: lanes are positional slots.
                  key={laneIndex}
                  direction={laneIndex % 2 === 0 ? "up" : "down"}
                  // Slightly different loop lengths keep the columns from
                  // moving in lockstep.
                  // Duration scales with the lane's length so a single
                  // narrow column holding every card moves at the same pace.
                  speed={
                    (speed * Math.max(lane.length, 4) * (1 + laneIndex * 0.12)) /
                    Math.max(4, Math.ceil(testimonials.length / maxLanes))
                  }
                  gap="0.75rem"
                  fade={false}
                  pauseOnHover={pauseOnHover}
                  className={cn(
                    "h-full min-w-0 flex-1 [&>div]:w-full [&>div]:items-stretch",
                    pauseOnHover &&
                      "[&:focus-within>div]:[animation-play-state:paused]",
                  )}
                >
                  {fillLane(lane).map(({ item, copy }) =>
                    copy ? (
                      // Padding copies only exist so a short lane still
                      // covers the viewport; hide them from assistive tech.
                      <div key={`${item.id}-${copy}`} aria-hidden>
                        <TestimonialCard testimonial={item} />
                      </div>
                    ) : (
                      <TestimonialCard key={item.id} testimonial={item} />
                    ),
                  )}
                </Marquee>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
