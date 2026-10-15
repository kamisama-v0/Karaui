"use client";

import { ArrowUpRight, Clock } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useCallback, useId, useMemo, useState } from "react";
import { Button } from "@/components/motion/button";
import { Loader } from "@/components/motion/loader";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: { name: string; avatar?: string };
  /** ISO date; shown in `locale`, UTC, so server and client agree. */
  date: string;
  /** Minutes. */
  readTime: number;
  /** Cover image URL. Without one a gradient from the theme's chart tokens is drawn. */
  cover?: string;
  href?: string;
  /** The first featured post in the current filter gets the wide card. */
  featured?: boolean;
}

export interface BlogListProps {
  posts: BlogPost[];
  /** Chip order. Default: categories in order of first appearance. */
  categories?: string[];
  /** Controlled category; `"all"` shows everything. */
  category?: string;
  defaultCategory?: string;
  onCategoryChange?: (category: string) => void;
  /** Posts revealed per "Load more". Default 6. */
  pageSize?: number;
  /**
   * Fetch more posts when the local ones run out. Append them to `posts`;
   * the button shows a spinner until the promise settles.
   */
  onLoadMore?: () => Promise<void> | void;
  /** Whether `onLoadMore` can return more. Default false. */
  hasMore?: boolean;
  /** Called for posts without `href`. */
  onPostClick?: (post: BlogPost) => void;
  /** Label of the everything chip. Default "All". */
  allLabel?: string;
  /** Default "en-US". */
  locale?: string;
  className?: string;
}

/** Deterministic token pair for a cover, from the category name. */
function coverStyle(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const a = (hash % 5) + 1;
  // Unsigned shift: `>>` goes negative once the hash passes 2^31.
  const second = ((hash >>> 3) % 5) + 1;
  const b = second === a ? (a % 5) + 1 : second;
  return {
    backgroundImage: `radial-gradient(circle at 80% 15%, color-mix(in oklab, var(--chart-${b}) 80%, transparent), transparent 55%), linear-gradient(135deg, var(--chart-${a}), color-mix(in oklab, var(--chart-${a}) 40%, var(--card)))`,
  };
}

/**
 * Blog index block: category chips with a gliding pill, a wide featured post,
 * and a card grid (gradient or image cover, title, excerpt, author, read time,
 * en-US date) where cards lift on hover. Filtering reflows the grid with
 * shared layout; "Load more" appends the next page with a stagger, then falls
 * back to `onLoadMore` for server pagination.
 */
export function BlogList({
  posts,
  categories: categoriesProp,
  category: categoryProp,
  defaultCategory = "all",
  onCategoryChange,
  pageSize = 6,
  onLoadMore,
  hasMore = false,
  onPostClick,
  allLabel = "All",
  locale = "en-US",
  className,
}: BlogListProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [internal, setInternal] = useState(defaultCategory);
  const category = categoryProp ?? internal;
  const [count, setCount] = useState(pageSize);
  // Index from which cards were just appended; they stagger in from there.
  const [appendFrom, setAppendFrom] = useState(Number.POSITIVE_INFINITY);
  const [loading, setLoading] = useState(false);

  const setCategory = useCallback(
    (next: string) => {
      if (categoryProp === undefined) setInternal(next);
      onCategoryChange?.(next);
      setCount(pageSize);
      setAppendFrom(Number.POSITIVE_INFINITY);
    },
    [categoryProp, onCategoryChange, pageSize],
  );

  const categories = useMemo(
    () => categoriesProp ?? Array.from(new Set(posts.map((p) => p.category))),
    [categoriesProp, posts],
  );

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }),
    [locale],
  );

  const filtered = category === "all" ? posts : posts.filter((p) => p.category === category);
  const featured = filtered.find((p) => p.featured);
  const rest = filtered.filter((p) => p !== featured);
  const shown = rest.slice(0, count);
  const canReveal = count < rest.length;
  const canFetch = !canReveal && Boolean(onLoadMore) && hasMore;

  const loadMore = async () => {
    setAppendFrom(shown.length);
    if (canReveal) {
      setCount(count + pageSize);
      return;
    }
    if (!onLoadMore) return;
    setLoading(true);
    try {
      await onLoadMore();
      setCount(count + pageSize);
    } finally {
      setLoading(false);
    }
  };

  // Entrance/exit/reflow for one grid slot; `delay` staggers appended cards.
  const appear = (delay: number) =>
    ({
      layout: reduce ? false : "position",
      initial: { opacity: 0, y: reduce ? 0 : 14 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT, delay } },
      exit: { opacity: 0, scale: reduce ? 1 : 0.96, transition: { duration: 0.16 } },
      transition: SPRING_LAYOUT,
    }) as const;

  const chips = [{ id: "all", label: allLabel },...categories.map((c) => ({ id: c, label: c }))];

  return (
    <div className={cn("@container flex w-full flex-col gap-4", className)}>
      <LayoutGroup id={`${baseId}-chips`}>
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="sr-only">Filter by category</legend>
          {chips.map((chip) => {
            const active = chip.id === category;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(chip.id)}
                className={cn(
                  "relative h-7 rounded-full px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                  active ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="chip-pill"
                    transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                    className="absolute inset-0 rounded-full bg-primary"
                  />
                ) : null}
                <span className="relative">{chip.label}</span>
              </button>
            );
          })}
        </fieldset>
      </LayoutGroup>

      <LayoutGroup id={`${baseId}-grid`}>
        <AnimatePresence initial={false} mode="popLayout">
          {featured ? (
            <motion.div key={`featured-${featured.id}`} {...appear(0)} className="mb-3">
              <PostCard
                post={featured}
                featured
                date={dateFormat.format(new Date(featured.date))}
                onPostClick={onPostClick}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <ul className="grid grid-cols-1 gap-3 @md:grid-cols-2 @2xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((post, i) => (
              <motion.li
                key={post.id}
                {...appear(i >= appendFrom ? (i - appendFrom) * 0.06 : 0)}
                className="flex"
              >
                <PostCard
                  post={post}
                  date={dateFormat.format(new Date(post.date))}
                  onPostClick={onPostClick}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </LayoutGroup>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No posts in this category yet.</p>
      ) : null}

      {canReveal || canFetch ? (
        <div className="flex justify-center">
          <Button variant="secondary" size="sm" onClick={loadMore} disabled={loading} aria-busy={loading}>
            {loading ? <Loader size={14} label="Loading posts" /> : null}
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {`Showing ${shown.length + (featured ? 1 : 0)} of ${filtered.length} posts`}
      </p>
    </div>
  );
}

function PostCard({
  post,
  featured = false,
  date,
  onPostClick,
}: {
  post: BlogPost;
  featured?: boolean;
  date: string;
  onPostClick?: (post: BlogPost) => void;
}) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const lift = canHover && !reduce;
  const titleId = useId();

  const initials = post.author.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  // Stretched target: the title is the one link/button, its ::after covers the card.
  const stretched =
    "outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-primary";

  return (
    <motion.article
      aria-labelledby={titleId}
      whileHover={lift ? { y: -4 } : undefined}
      transition={SPRING_PRESS}
      className={cn(
        "group relative flex overflow-hidden rounded-2xl border border-border bg-card text-card-foreground transition-shadow hover:shadow-md",
        featured ? "flex-col @md:flex-row" : "w-full flex-col",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          featured ? "h-36 @md:h-auto @md:w-[45%]" : "h-24",
        )}
        style={post.cover ? undefined : coverStyle(post.category)}
      >
        {post.cover ? (
          // biome-ignore lint/performance/noImgElement: library component, framework-agnostic.
          <img
            src={post.cover}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <span className="absolute top-2.5 left-2.5 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
          {post.category}
        </span>
        {featured ? (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            Featured
          </span>
        ) : null}
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col", featured ? "p-4 @md:p-5" : "p-3.5")}>
        <h3
          id={titleId}
          className={cn("font-semibold leading-snug tracking-tight", featured ? "text-lg" : "text-sm")}
        >
          {post.href ? (
            <a href={post.href} className={stretched}>
              {post.title}
            </a>
          ) : (
            <button type="button" onClick={() => onPostClick?.(post)} className={cn("text-left", stretched)}>
              {post.title}
            </button>
          )}
        </h3>
        <p
          className={cn(
            "mt-1.5 text-muted-foreground",
            featured ? "line-clamp-3 text-sm" : "line-clamp-2 text-xs",
          )}
        >
          {post.excerpt}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-muted-foreground">
          {post.author.avatar ? (
            // biome-ignore lint/performance/noImgElement: library component, framework-agnostic.
            <img src={post.author.avatar} alt="" className="size-5 rounded-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="grid size-5 place-items-center rounded-full bg-primary/15 text-[9px] font-semibold text-foreground"
            >
              {initials}
            </span>
          )}
          <span className="min-w-0 truncate font-medium text-foreground/80">{post.author.name}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.date} className="shrink-0">
            {date}
          </time>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1">
            <Clock aria-hidden className="size-3" />
            {post.readTime} min
          </span>
          {featured ? (
            <ArrowUpRight
              aria-hidden
              className="size-4 shrink-0 text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
