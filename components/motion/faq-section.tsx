"use client";

import { Plus, Search, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
} from "motion/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface FaqItem {
  /** Stable id. Also the element id / URL hash when `deepLink` is on. */
  id: string;
  question: string;
  answer: ReactNode;
  /**
   * Plain-text version of `answer` used for search when `answer` is not a
   * string. String answers are searched (and highlighted) directly.
   */
  searchText?: string;
}

export interface FaqSectionProps {
  items: FaqItem[];
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  /** "single" keeps one answer open at a time; "multiple" lets several stay open. */
  type?: "single" | "multiple";
  /** Controlled open item ids. */
  value?: string[];
  /** Uncontrolled initial open item ids. */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Show a search field that narrows and highlights questions. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Rendered when the search matches nothing. Receives the query. */
  emptyState?: (query: string) => ReactNode;
  /** "Still have questions?" slot under the header column. */
  cta?: ReactNode;
  /**
   * Give each item `id={item.id}`, open the item named by `location.hash`
   * (on mount and on hashchange) and write the hash when an item opens.
   */
  deepLink?: boolean;
  className?: string;
}

const PANEL_TRANSITION: Transition = { duration: 0.32, ease: EASE_OUT };
const PANEL_EXIT_TRANSITION: Transition = { duration: 0.22, ease: EASE_OUT };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wrap every case-insensitive occurrence of `query` in a <mark>. */
function highlight(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  const lower = q.toLowerCase();
  let offset = 0;
  return parts.map((part) => {
    const key = `${offset}-${part}`;
    offset += part.length;
    return part.toLowerCase() === lower ? (
      <mark
        key={key}
        className="rounded-[4px] bg-primary/15 px-0.5 text-foreground"
      >
        {part}
      </mark>
    ) : (
      part
    );
  });
}

function matches(item: FaqItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const answerText =
    typeof item.answer === "string" ? item.answer : (item.searchText ?? "");
  return (
    item.question.toLowerCase().includes(q) ||
    answerText.toLowerCase().includes(q)
  );
}

/**
 * FAQ page section: a header column (eyebrow, heading, description, optional
 * search and a CTA slot) beside an accordion of questions. Searching narrows
 * the list with layout animation and highlights matches; items can be
 * deep-linked by hash. Columns sit side by side once the section's own
 * container is wide enough and stack below that.
 */
export function FaqSection({
  items,
  eyebrow = "FAQ",
  heading = "Frequently asked questions",
  description,
  type = "single",
  value,
  defaultValue = [],
  onValueChange,
  searchable = false,
  searchPlaceholder = "Search questions",
  emptyState,
  cta,
  deepLink = false,
  className,
}: FaqSectionProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [internal, setInternal] = useState<string[]>(defaultValue);
  const open = value ?? internal;
  const [query, setQuery] = useState("");

  const setOpen = useCallback(
    (next: string[]) => {
      if (value === undefined) setInternal(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  const toggle = useCallback(
    (id: string) => {
      const isOpen = open.includes(id);
      const next = isOpen
        ? open.filter((x) => x !== id)
        : type === "single"
          ? [id]
          : [...open, id];
      setOpen(next);
      if (deepLink && !isOpen && typeof window !== "undefined") {
        window.history.replaceState(null, "", `#${id}`);
      }
    },
    [open, type, setOpen, deepLink],
  );

  // Latest state for the hash listener, read through a ref so the listener
  // subscribes once and never re-scrolls to the hash item on every toggle.
  const latest = useRef({ open, type, setOpen, reduce });
  latest.current = { open, type, setOpen, reduce };

  // Deep links: read the hash after mount (never during render) and follow
  // later hash changes.
  useEffect(() => {
    if (!deepLink) return;
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || !items.some((item) => item.id === id)) return;
      const { open: current, type: mode, setOpen: set, reduce: still } =
        latest.current;
      if (!current.includes(id)) {
        set(mode === "single" ? [id] : [...current, id]);
      }
      document.getElementById(id)?.scrollIntoView({
        block: "nearest",
        behavior: still ? "auto" : "smooth",
      });
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [deepLink, items]);

  const filtered = useMemo(
    () => items.filter((item) => matches(item, query)),
    [items, query],
  );

  const layoutTransition = reduce ? { duration: 0 } : SPRING_LAYOUT;

  return (
    <section
      className={cn(
        "@container w-full text-foreground",
        className,
      )}
    >
      <div className="grid gap-8 @xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @xl:gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
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
            {description ? (
              <p className="text-pretty text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          {searchable ? (
            <div className="relative">
              <label htmlFor={`${baseId}-search`} className="sr-only">
                {searchPlaceholder}
              </label>
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id={`${baseId}-search`}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="h-10 w-full rounded-full border border-border bg-card pr-10 pl-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:appearance-none"
              />
              <AnimatePresence initial={false}>
                {query ? (
                  <motion.button
                    key="clear"
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
                    transition={SPRING_SWAP}
                    className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <X className="size-3.5" />
                  </motion.button>
                ) : null}
              </AnimatePresence>
              <p aria-live="polite" className="sr-only">
                {query
                  ? `${filtered.length} of ${items.length} questions shown`
                  : ""}
              </p>
            </div>
          ) : null}

          {cta ? <div className="hidden @xl:block">{cta}</div> : null}
        </div>

        <div className="flex flex-col gap-4">
          {/* layoutRoot keeps the rows' layout animation measured relative to
              this list, so page scroll never replays as movement. */}
          <motion.div layoutRoot className="relative flex flex-col gap-2">
            <AnimatePresence initial={false} mode="popLayout">
              {filtered.map((item) => (
                <FaqRow
                  key={item.id}
                  item={item}
                  baseId={baseId}
                  open={open.includes(item.id)}
                  query={query}
                  deepLink={deepLink}
                  reduce={reduce}
                  layoutTransition={layoutTransition}
                  onToggle={() => toggle(item.id)}
                />
              ))}
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className="rounded-2xl border border-dashed border-border-strong px-5 py-8 text-center text-sm text-muted-foreground"
                >
                  {emptyState ? (
                    emptyState(query)
                  ) : (
                    <>
                      No questions match &ldquo;{query.trim()}&rdquo;.{" "}
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        Clear search
                      </button>
                    </>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          {cta ? <div className="@xl:hidden">{cta}</div> : null}
        </div>
      </div>
    </section>
  );
}

function FaqRow({
  item,
  baseId,
  open,
  query,
  deepLink,
  reduce,
  layoutTransition,
  onToggle,
}: {
  item: FaqItem;
  baseId: string;
  open: boolean;
  query: string;
  deepLink: boolean;
  reduce: boolean | null;
  layoutTransition: Transition;
  onToggle: () => void;
}) {
  const triggerId = `${baseId}-${item.id}-trigger`;
  const panelId = `${baseId}-${item.id}-panel`;

  return (
    // Layout animation is the point here: rows glide into the gaps left by
    // filtered-out questions and by answers opening/closing.
    <motion.div
      layout="position"
      id={deepLink ? item.id : undefined}
      initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: reduce ? 1 : 0.97,
        transition: { duration: 0.15, ease: EASE_OUT },
      }}
      transition={{ layout: layoutTransition, duration: 0.22, ease: EASE_OUT }}
      data-state={open ? "open" : "closed"}
      className={cn(
        "scroll-mt-6 overflow-hidden rounded-2xl border bg-card text-card-foreground transition-colors",
        open ? "border-border-strong" : "border-border",
      )}
    >
      <h3 className="m-0">
        <button
          id={triggerId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-h-[52px] w-full items-center gap-4 px-5 py-3 text-left text-[15px] font-medium text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40"
        >
          <span className="min-w-0 flex-1 text-pretty">
            {highlight(item.question, query)}
          </span>
          <motion.span
            aria-hidden
            initial={false}
            animate={{ rotate: open ? 45 : 0 }}
            transition={reduce ? { duration: 0 } : SPRING_SWAP}
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full transition-colors",
              open
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Plus className="size-3.5" />
          </motion.span>
        </button>
      </h3>
      {/* Height is animated on purpose: the accordion's job is to disclose
          content in flow, which has to push the following rows down. */}
      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        inert={!open}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : open
              ? PANEL_TRANSITION
              : PANEL_EXIT_TRANSITION
        }
        className="overflow-hidden"
      >
        <div className="px-5 pb-4 text-sm leading-6 text-muted-foreground">
          {typeof item.answer === "string"
            ? highlight(item.answer, query)
            : item.answer}
        </div>
      </motion.div>
    </motion.div>
  );
}
