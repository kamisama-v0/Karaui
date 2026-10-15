"use client";

import { ArrowUpRight, Search, X } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { type CSSProperties, type ReactNode, useId, useMemo, useState } from "react";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface Integration {
  id: string;
  name: string;
  category: string;
  description?: ReactNode;
  /** Icon or logo node; sized to fit a small tile. */
  icon: ReactNode;
  href?: string;
  /** Small label on the card, e.g. "Beta" or "New". */
  badge?: ReactNode;
  /** Extra text matched by search (aliases, keywords). */
  keywords?: string[];
}

export interface IntegrationsSectionProps {
  integrations: Integration[];
  /** The hub at the center of the orbit (your product's logo). */
  centerLogo: ReactNode;
  /** Accessible name for the hub. Default "Our product". */
  centerLabel?: string;
  /** Ids shown on the orbit, inner ring first. Defaults to the first 14 integrations. */
  orbitIds?: string[];
  /** Icons on the inner ring; the rest go on the outer ring. Default 5. */
  innerCount?: number;
  /** Seconds per inner-ring revolution; the outer ring is 1.5× slower and turns the other way. Default 40. */
  speed?: number;
  /** Category chips in order. Derived from `integrations` when omitted. */
  categories?: string[];
  /** Label of the chip that shows everything. Default "All". */
  allLabel?: string;
  /** Controlled category ("" or `allLabel` means all). */
  category?: string;
  defaultCategory?: string;
  onCategoryChange?: (category: string) => void;
  /** Show the search field. Default true. */
  searchable?: boolean;
  searchPlaceholder?: string;
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  className?: string;
  /** Classes for the scrolling card list (e.g. a max height). */
  listClassName?: string;
}

interface OrbitIcon {
  integration: Integration;
  angle: number;
}

function spread(items: Integration[], offset: number): OrbitIcon[] {
  return items.map((integration, index) => ({
    integration,
    angle: offset + (360 / Math.max(1, items.length)) * index,
  }));
}

/** Percent position of a point on a circle inscribed in its box. */
function onCircle(angle: number): CSSProperties {
  const rad = (angle * Math.PI) / 180;
  // Rounded so server and client stringify the same value.
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return {
    left: `${round(50 + 50 * Math.cos(rad))}%`,
    top: `${round(50 + 50 * Math.sin(rad))}%`,
  };
}

function OrbitRing({
  icons,
  inset,
  duration,
  reverse,
  animated,
}: {
  icons: OrbitIcon[];
  inset: string;
  duration: number;
  reverse: boolean;
  animated: boolean;
}) {
  // The whole HTML ring rotates (CSS `spin`); each icon runs the same spin
  // in the opposite direction at the same duration, so it stays upright.
  const spin: CSSProperties = animated
    ? {
        animationDuration: `${duration}s`,
        animationDirection: reverse ? "reverse" : "normal",
      }
    : {};
  const counter: CSSProperties = animated
    ? {
        animationDuration: `${duration}s`,
        animationDirection: reverse ? "normal" : "reverse",
      }
    : {};
  return (
    <div
      style={{ inset, ...spin }}
      className={cn(
        "absolute rounded-full border border-dashed border-border-strong/70",
        animated && "animate-spin group-hover/orbit:[animation-play-state:paused]",
      )}
    >
      {icons.map(({ integration, angle }) => (
        <div
          key={integration.id}
          style={onCircle(angle)}
          className="absolute size-0"
        >
          <div
            style={counter}
            className={cn(
              "absolute -top-5 -left-5 grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground shadow-sm [&_svg]:size-5",
              animated && "animate-spin group-hover/orbit:[animation-play-state:paused]",
            )}
            title={integration.name}
          >
            {integration.icon}
          </div>
        </div>
      ))}
    </div>
  );
}

function Orbit({
  center,
  centerLabel,
  inner,
  outer,
  speed,
  reduce,
}: {
  center: ReactNode;
  centerLabel: string;
  inner: OrbitIcon[];
  outer: OrbitIcon[];
  speed: number;
  reduce: boolean | null;
}) {
  const animated = !reduce;
  return (
    <div
      role="img"
      aria-label={`${centerLabel} connected to ${[...inner, ...outer]
        .map((icon) => icon.integration.name)
        .join(", ")}`}
      className="group/orbit relative mx-auto aspect-square w-full max-w-[19rem]"
    >
      {/* Soft halo behind the hub. */}
      <div
        aria-hidden
        className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--chart-1)_22%,transparent),transparent_70%)]"
      />
      <div aria-hidden className="absolute inset-0">
        {outer.length ? (
          <OrbitRing
            icons={outer}
            inset="5%"
            duration={speed * 1.5}
            reverse
            animated={animated}
          />
        ) : null}
        {inner.length ? (
          <OrbitRing
            icons={inner}
            inset="25%"
            duration={speed}
            reverse={false}
            animated={animated}
          />
        ) : null}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {animated ? (
            <motion.span
              className="absolute inset-0 rounded-2xl bg-primary/25"
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{
                duration: 2.4,
                ease: EASE_OUT,
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
          ) : null}
          <div className="relative grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg [&_svg]:size-7">
            {center}
          </div>
        </div>
      </div>
    </div>
  );
}

function matches(integration: Integration, query: string) {
  if (!query) return true;
  const haystack = [
    integration.name,
    integration.category,
    typeof integration.description === "string" ? integration.description : "",
    ...(integration.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/**
 * Integrations section: a hub-and-spoke orbit (your logo at the center,
 * integration icons riding one or two slowly counter-rotating rings, paused
 * on hover and still under reduced motion) beside a searchable grid of
 * integration cards. Category chips filter the grid with a gliding pill, and
 * cards enter, leave and reflow with layout animation.
 */
export function IntegrationsSection({
  integrations,
  centerLogo,
  centerLabel = "Our product",
  orbitIds,
  innerCount = 5,
  speed = 40,
  categories: categoriesProp,
  allLabel = "All",
  category: categoryProp,
  defaultCategory,
  onCategoryChange,
  searchable = true,
  searchPlaceholder = "Search integrations",
  eyebrow,
  heading,
  description,
  className,
  listClassName,
}: IntegrationsSectionProps) {
  const reduce = useReducedMotion();
  const pillId = useId();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [internalCategory, setInternalCategory] = useState(
    defaultCategory ?? allLabel,
  );
  const rawCategory = categoryProp ?? internalCategory;
  const category = rawCategory === "" ? allLabel : rawCategory;

  const categories = useMemo(() => {
    if (categoriesProp) return categoriesProp;
    const seen: string[] = [];
    for (const item of integrations) {
      if (!seen.includes(item.category)) seen.push(item.category);
    }
    return seen;
  }, [categoriesProp, integrations]);

  const { inner, outer } = useMemo(() => {
    const picked = orbitIds
      ? orbitIds
          .map((id) => integrations.find((item) => item.id === id))
          .filter((item): item is Integration => Boolean(item))
      : integrations.slice(0, 14);
    return {
      inner: spread(picked.slice(0, innerCount), -90),
      // Offset half a slot so outer icons sit between inner ones.
      outer: spread(
        picked.slice(innerCount),
        -90 + 180 / Math.max(1, picked.length - innerCount),
      ),
    };
  }, [integrations, orbitIds, innerCount]);

  const visible = useMemo(
    () =>
      integrations.filter(
        (item) =>
          (category === allLabel || item.category === category) &&
          matches(item, query.trim()),
      ),
    [integrations, category, allLabel, query],
  );

  const pick = (next: string) => {
    if (next === category) return;
    if (categoryProp === undefined) setInternalCategory(next);
    onCategoryChange?.(next);
  };

  const header =
    eyebrow || heading || description ? (
      <div className="mx-auto mb-8 flex max-w-xl flex-col items-center gap-3 text-center">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        {heading ? (
          <h2 className="text-balance font-display text-2xl font-semibold leading-tight tracking-tight text-foreground @3xl:text-3xl">
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

  const chips = [allLabel, ...categories];

  return (
    <section className={cn("@container w-full", className)}>
      {header}
      <div className="grid items-center gap-8 @xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        <Orbit
          center={centerLogo}
          centerLabel={centerLabel}
          inner={inner}
          outer={outer}
          speed={speed}
          reduce={reduce}
        />

        <div className="@container/list flex min-w-0 flex-col gap-3">
          {searchable ? (
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                {searchPlaceholder}
              </label>
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="h-10 w-full rounded-full border border-border bg-card pr-10 pl-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}

          <LayoutGroup id={pillId}>
            <fieldset className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <legend className="sr-only">Filter by category</legend>
              {chips.map((chip) => {
                const selected = chip === category;
                return (
                  <button
                    key={chip}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => pick(chip)}
                    className={cn(
                      "relative h-8 shrink-0 rounded-full px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                      selected
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {selected ? (
                      <motion.span
                        layoutId="pill"
                        className="absolute inset-0 rounded-full bg-primary"
                        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                      />
                    ) : null}
                    <span className="relative">{chip}</span>
                  </button>
                );
              })}
            </fieldset>
          </LayoutGroup>

          <p aria-live="polite" className="sr-only">
            {`${visible.length} integration${visible.length === 1 ? "" : "s"}`}
          </p>

          <div
            className={cn(
              "max-h-80 overflow-y-auto overflow-x-hidden px-0.5 py-0.5 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]",
              listClassName,
            )}
          >
            {/* Layout animation is the point here: cards reflow as the
                filter changes, so `layout` (position/size) is intended. */}
            <motion.ul layout={!reduce} className="relative grid grid-cols-1 gap-2 @md/list:grid-cols-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {visible.map((item) => (
                  <motion.li
                    key={item.id}
                    layout={!reduce}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={
                      reduce
                        ? { opacity: 0, transition: { duration: 0.12 } }
                        : { opacity: 0, scale: 0.94, transition: { duration: 0.14, ease: EASE_OUT } }
                    }
                    transition={{
                      layout: SPRING_LAYOUT,
                      opacity: { duration: 0.22, ease: EASE_OUT },
                      scale: SPRING_LAYOUT,
                      y: SPRING_LAYOUT,
                    }}
                    className="group/card relative flex items-start gap-3 rounded-2xl border border-border bg-card p-3 transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-sm"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-background text-foreground [&_svg]:size-4.5">
                      {item.icon}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-1.5">
                        {item.href ? (
                          <a
                            href={item.href}
                            className="truncate text-sm font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring/50"
                          >
                            {item.name}
                          </a>
                        ) : (
                          <span className="truncate text-sm font-medium text-foreground">
                            {item.name}
                          </span>
                        )}
                        {item.badge ? (
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
                            {item.badge}
                          </span>
                        ) : null}
                        {item.href ? (
                          <ArrowUpRight
                            aria-hidden
                            className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5 motion-reduce:transition-none"
                          />
                        ) : null}
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {item.category}
                      </span>
                      {item.description ? (
                        <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
            {visible.length === 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground"
              >
                {query ? `No integrations match "${query.trim()}".` : "No integrations in this category yet."}
              </motion.p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
