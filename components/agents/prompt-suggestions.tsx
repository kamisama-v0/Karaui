"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface PromptSuggestion {
  id: string;
  title: string;
  subtitle?: string;
  /** Text handed to `onSelect`. Defaults to `title`. */
  prompt?: string;
  icon?: ReactNode;
}

export type PromptSuggestionsVariant = "card" | "chip";

export interface PromptSuggestionsProps {
  suggestions: PromptSuggestion[];
  /** Current composer text; suggestions filter to those matching every word. */
  query?: string;
  onSelect?: (prompt: string, suggestion: PromptSuggestion) => void;
  /** `card` shows icon + title + subtitle in a grid; `chip` is a wrapping pill row. */
  variant?: PromptSuggestionsVariant;
  /** Card grid columns from the `sm` breakpoint. Default 2. */
  columns?: 1 | 2 | 3;
  /** Maximum suggestions shown at once. */
  limit?: number;
  /** Highlight the matched words. Default true. */
  highlight?: boolean;
  /** Shown when nothing matches; pass `null` to collapse instead. */
  emptyMessage?: ReactNode;
  /** Seconds between each item's entrance. Default 0.05. */
  stagger?: number;
  "aria-label"?: string;
  className?: string;
  itemClassName?: string;
}

function tokenize(query: string) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function Highlighted({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length) return <>{text}</>;
  const escaped = tokens.map((token) =>
    token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark
            // biome-ignore lint/suspicious/noArrayIndexKey: split order is stable for a given text.
            key={index}
            className="rounded-sm bg-primary/12 px-px text-foreground"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

const GRID_COLUMNS = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
} as const;

export function PromptSuggestions({
  suggestions,
  query = "",
  onSelect,
  variant = "card",
  columns = 2,
  limit,
  highlight = true,
  emptyMessage = "No suggestions match — press Enter to send your own.",
  stagger = 0.05,
  "aria-label": ariaLabel = "Suggested prompts",
  className,
  itemClassName,
}: PromptSuggestionsProps) {
  const reduce = useReducedMotion() ?? false;
  const listRef = useRef<HTMLUListElement>(null);
  // Only the first reveal staggers; filtering afterwards should feel instant.
  const [settled, setSettled] = useState(false);

  const tokens = useMemo(() => tokenize(query), [query]);
  const visible = useMemo(() => {
    const filtered = suggestions.filter((suggestion) => {
      const haystack = [suggestion.title, suggestion.subtitle, suggestion.prompt]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
    return limit ? filtered.slice(0, limit) : filtered;
  }, [suggestions, tokens, limit]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSettled(true),
      (suggestions.length * stagger + 0.4) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [suggestions.length, stagger]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-prompt-suggestion]",
      ) ?? [],
    );
    const index = items.indexOf(event.currentTarget);
    if (index < 0) return;
    const cols =
      variant === "card" && listRef.current
        ? getComputedStyle(listRef.current)
            .gridTemplateColumns.split(" ")
            .filter(Boolean).length
        : 1;
    let next = index;
    switch (event.key) {
      case "ArrowRight":
        next = index + 1;
        break;
      case "ArrowLeft":
        next = index - 1;
        break;
      case "ArrowDown":
        next = index + (variant === "card" ? cols : 1);
        break;
      case "ArrowUp":
        next = index - (variant === "card" ? cols : 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    items[Math.max(0, Math.min(items.length - 1, next))]?.focus();
  };

  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, y: 8, scale: 0.97, filter: "blur(4px)" };
  const shown = { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };

  return (
    <div className={cn("w-full", className)}>
      <ul
        ref={listRef}
        aria-label={ariaLabel}
        className={cn(
          "m-0 list-none p-0",
          variant === "card"
            ? cn("grid gap-2", GRID_COLUMNS[columns])
            : "flex flex-wrap justify-center gap-2",
        )}
      >
        <AnimatePresence initial={!reduce} mode="popLayout">
          {visible.map((suggestion, index) => (
            <motion.li
              key={suggestion.id}
              layout={reduce ? false : "position"}
              initial={hidden}
              animate={shown}
              exit={{
                ...hidden,
                transition: { duration: 0.12, ease: EASE_OUT },
              }}
              transition={
                reduce
                  ? { duration: 0.15 }
                  : {
                      ...SPRING_PANEL,
                      filter: { duration: 0.25, ease: EASE_OUT },
                      layout: SPRING_LAYOUT,
                      delay: settled ? 0 : index * stagger,
                    }
              }
              className="min-w-0"
            >
              <button
                type="button"
                data-prompt-suggestion=""
                onClick={() =>
                  onSelect?.(suggestion.prompt ?? suggestion.title, suggestion)
                }
                onKeyDown={onKeyDown}
                className={cn(
                  "group/suggestion w-full text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  variant === "card"
                    ? "flex h-full items-start gap-3 rounded-xl border border-border bg-card p-3 hover:border-border-strong hover:bg-muted/50"
                    : "inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm text-foreground hover:bg-muted",
                  itemClassName,
                )}
              >
                {suggestion.icon ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid shrink-0 place-items-center text-muted-foreground transition-colors group-hover/suggestion:text-foreground",
                      variant === "card"
                        ? "size-8 rounded-lg bg-muted [&_svg]:size-4"
                        : "[&_svg]:size-3.5",
                    )}
                  >
                    {suggestion.icon}
                  </span>
                ) : null}
                {variant === "card" ? (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {highlight ? (
                          <Highlighted text={suggestion.title} tokens={tokens} />
                        ) : (
                          suggestion.title
                        )}
                      </span>
                      {suggestion.subtitle ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {highlight ? (
                            <Highlighted
                              text={suggestion.subtitle}
                              tokens={tokens}
                            />
                          ) : (
                            suggestion.subtitle
                          )}
                        </span>
                      ) : null}
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/0 transition-[color,translate] duration-200 group-hover/suggestion:translate-x-0.5 group-hover/suggestion:-translate-y-0.5 group-hover/suggestion:text-muted-foreground group-focus-visible/suggestion:text-muted-foreground motion-reduce:transition-none motion-reduce:group-hover/suggestion:translate-x-0 motion-reduce:group-hover/suggestion:translate-y-0"
                    />
                  </>
                ) : (
                  <span className="truncate">
                    {highlight ? (
                      <Highlighted text={suggestion.title} tokens={tokens} />
                    ) : (
                      suggestion.title
                    )}
                  </span>
                )}
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <AnimatePresence initial={false}>
        {visible.length === 0 && emptyMessage !== null ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="py-3 text-center text-xs text-muted-foreground"
          >
            {emptyMessage}
          </motion.p>
        ) : null}
      </AnimatePresence>
      <p aria-live="polite" className="sr-only">
        {tokens.length
          ? `${visible.length} suggestion${visible.length === 1 ? "" : "s"}`
          : ""}
      </p>
    </div>
  );
}
