"use client";

import { X } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface TagInputProps {
  /** Controlled tags. */
  value?: string[];
  /** Uncontrolled initial tags. */
  defaultValue?: string[];
  onChange?: (tags: string[]) => void;
  /** Optional suggestion pool, filtered by the typed text. Turns the input into a combobox. */
  suggestions?: string[];
  /** Most suggestions shown at once. Default 6. */
  maxSuggestions?: number;
  /** Refuse new tags once this many exist. */
  maxTags?: number;
  /**
   * Return `false` to reject a tag, or a string to reject it with that message.
   * Rejection shakes the field.
   */
  validate?: (tag: string, tags: string[]) => boolean | string;
  /** Allow the same tag twice (case-insensitive). Default false. */
  allowDuplicates?: boolean;
  placeholder?: string;
  label?: string;
  /** Helper text under the field while there is no error. */
  hint?: string;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

type PendingFocus = number | "input" | null;

const SHAKE = { x: [0, -6, 6, -4, 4, -2, 0] };

/**
 * Chips inside an input-like field. Enter, comma or Tab adds; Backspace on an
 * empty input arms the last chip, a second press removes it; Arrow Left/Right
 * walks the chips and Delete/Backspace removes the focused one.
 */
export function TagInput({
  value: valueProp,
  defaultValue,
  onChange,
  suggestions,
  maxSuggestions = 6,
  maxTags,
  validate,
  allowDuplicates = false,
  placeholder = "Add a tag…",
  label,
  hint,
  disabled = false,
  "aria-label": ariaLabel,
  className,
}: TagInputProps) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const listId = `${uid}-list`;
  const messageId = `${uid}-message`;
  const reduce = useReducedMotion();

  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState<string[]>(defaultValue ?? []);
  const tags = controlled ? valueProp : internal;

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  // Backspace on an empty input arms the last chip first, so one stray press
  // never deletes work.
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<PendingFocus>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable keys that survive duplicates: the nth occurrence of a tag.
  const keys = useMemo(() => {
    const seen = new Map<string, number>();
    return tags.map((tag) => {
      const n = seen.get(tag) ?? 0;
      seen.set(tag, n + 1);
      return `${tag}#${n}`;
    });
  }, [tags]);

  const filtered = useMemo(() => {
    if (!suggestions?.length) return [];
    const q = query.trim().toLowerCase();
    const taken = new Set(tags.map((t) => t.toLowerCase()));
    return suggestions
      .filter(
        (s) =>
          (allowDuplicates || !taken.has(s.toLowerCase())) &&
          (!q || s.toLowerCase().includes(q)),
      )
      .slice(0, maxSuggestions);
  }, [suggestions, query, tags, allowDuplicates, maxSuggestions]);

  const listOpen = open && focused && filtered.length > 0 && !disabled;
  const activeIndex = listOpen && active < filtered.length ? active : -1;
  const atLimit = maxTags !== undefined && tags.length >= maxTags;

  // Focus lands after the render that re-indexes the chips.
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    if (target === "input") inputRef.current?.focus();
    else chipRefs.current.get(keys[target] ?? "")?.focus();
  }, [keys]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const commit = (next: string[]) => {
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  const reject = (message: string, existing?: string) => {
    setError(message);
    if (fieldRef.current && !reduce) {
      animate(fieldRef.current, SHAKE, { duration: 0.4, ease: EASE_OUT });
    }
    if (existing) {
      setFlash(existing);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), 700);
    }
  };

  /** Adds every acceptable entry in one commit; stops at the first rejection. */
  const addMany = (entries: string[]) => {
    const next = [...tags];
    let added = 0;
    for (const raw of entries) {
      const tag = raw.trim();
      if (!tag) continue;
      if (maxTags !== undefined && next.length >= maxTags) {
        reject(`Up to ${maxTags} tags`);
        break;
      }
      if (!allowDuplicates) {
        const existing = next.find((t) => t.toLowerCase() === tag.toLowerCase());
        if (existing) {
          reject(`“${tag}” is already added`, existing);
          break;
        }
      }
      const verdict = validate?.(tag, next);
      if (verdict === false || typeof verdict === "string") {
        reject(typeof verdict === "string" ? verdict : `“${tag}” isn't allowed`);
        break;
      }
      next.push(tag);
      added++;
    }
    if (added === 0) return false;
    commit(next);
    setError(null);
    setArmed(false);
    setActive(-1);
    setAnnouncement(
      added === 1 ? `Added ${next[next.length - 1]}` : `Added ${added} tags`,
    );
    return true;
  };

  const add = (raw: string) => {
    if (addMany([raw])) setQuery("");
  };

  const removeAt = (index: number, focusAfter: PendingFocus) => {
    const removed = tags[index];
    if (removed === undefined) return;
    pendingFocus.current = focusAfter;
    commit(tags.filter((_, i) => i !== index));
    setArmed(false);
    setError(null);
    setAnnouncement(`Removed ${removed}`);
  };

  const focusChip = useCallback(
    (index: number) => {
      chipRefs.current.get(keys[index] ?? "")?.focus();
    },
    [keys],
  );

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || e.nativeEvent.isComposing) return;
    const trimmed = query.trim();
    switch (e.key) {
      case "ArrowDown":
        if (!filtered.length) return;
        e.preventDefault();
        setOpen(true);
        setActive((a) => (listOpen ? (a + 1) % filtered.length : 0));
        return;
      case "ArrowUp":
        if (!listOpen) return;
        e.preventDefault();
        setActive((a) => (a <= 0 ? filtered.length - 1 : a - 1));
        return;
      case "Escape":
        if (listOpen) {
          e.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (armed) {
          setArmed(false);
        }
        return;
      case "Enter":
        if (activeIndex >= 0) {
          e.preventDefault();
          add(filtered[activeIndex]);
        } else if (trimmed) {
          e.preventDefault();
          add(query);
        }
        return;
      case ",":
        e.preventDefault();
        if (trimmed) add(query);
        return;
      case "Tab":
        if (e.shiftKey) return;
        // Tab only completes when there is something to complete; on an empty
        // input it moves focus on as usual.
        if (activeIndex >= 0) {
          e.preventDefault();
          add(filtered[activeIndex]);
        } else if (trimmed) {
          e.preventDefault();
          add(query);
        }
        return;
      case "Backspace":
        if (query !== "" || !tags.length) return;
        e.preventDefault();
        if (armed) removeAt(tags.length - 1, "input");
        else setArmed(true);
        return;
      case "ArrowLeft": {
        const el = e.currentTarget;
        if (!tags.length || el.selectionStart !== 0 || el.selectionEnd !== 0) {
          return;
        }
        e.preventDefault();
        setArmed(false);
        focusChip(tags.length - 1);
        return;
      }
      default:
        if (armed) setArmed(false);
    }
  };

  const onInputChange = (next: string) => {
    setError(null);
    setArmed(false);
    setOpen(true);
    setActive(-1);
    // Soft keyboards often report "Unidentified" for the comma key, so the
    // delimiter is also honoured here.
    if (next.includes(",")) {
      const parts = next.split(",");
      const rest = parts.pop() ?? "";
      if (addMany(parts)) setQuery(rest);
      else setQuery(next.replace(/,/g, ""));
      return;
    }
    setQuery(next);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!/[,\n\t]/.test(text)) return;
    e.preventDefault();
    if (addMany(text.split(/[,\n\t]/))) setQuery("");
  };

  const onChipKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tags.length - 1;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        focusChip(Math.max(index - 1, 0));
        return;
      case "ArrowRight":
        e.preventDefault();
        if (index < last) focusChip(index + 1);
        else inputRef.current?.focus();
        return;
      case "Home":
        e.preventDefault();
        focusChip(0);
        return;
      case "End":
      case "Escape":
        e.preventDefault();
        inputRef.current?.focus();
        return;
      case "Backspace":
        e.preventDefault();
        removeAt(index, index > 0 ? index - 1 : last > 0 ? 0 : "input");
        return;
      case "Delete":
        e.preventDefault();
        removeAt(index, index < last ? index : "input");
        return;
    }
  };

  // Clicks on the field's empty space land in the input, like a native field.
  const onFieldMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled || e.target !== e.currentTarget) return;
    e.preventDefault();
    inputRef.current?.focus();
  };

  const hasSuggestions = Boolean(suggestions?.length);
  const message = error ?? hint;
  const chipTransition = reduce ? { duration: 0.15 } : SPRING_SWAP;

  return (
    <div className={cn("relative flex w-full flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={inputId}
          className="px-1 text-sm font-medium text-foreground"
        >
          {label}
        </label>
      ) : null}

      {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer convenience only — the input inside owns focus and keyboard. */}
      <div
        ref={fieldRef}
        onMouseDown={onFieldMouseDown}
        data-state={error ? "error" : focused ? "focused" : "idle"}
        className={cn(
          "flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-background px-2 py-1.5 transition-colors duration-200",
          focused && !error && "border-foreground/40 ring-2 ring-ring/40",
          error && "border-destructive ring-2 ring-destructive/25",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {tags.map((tag, i) => {
            const key = keys[i];
            const isArmed = armed && i === tags.length - 1;
            const isFlash = flash === tag;
            return (
              <motion.span
                key={key}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  scale: isFlash && !reduce ? [1, 1.12, 1] : 1,
                }}
                exit={
                  reduce
                    ? { opacity: 0, transition: { duration: 0.1 } }
                    : {
                        opacity: 0,
                        scale: 0.6,
                        transition: { duration: 0.14, ease: EASE_OUT },
                      }
                }
                transition={{
                  default: chipTransition,
                  layout: SPRING_LAYOUT,
                  scale: isFlash
                    ? { duration: 0.35, ease: EASE_OUT }
                    : chipTransition,
                }}
                className={cn(
                  "inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-muted pl-2.5 pr-1 text-sm text-foreground transition-colors duration-150",
                  "focus-within:ring-2 focus-within:ring-ring",
                  (isArmed || isFlash) &&
                    "bg-destructive/15 text-destructive ring-1 ring-destructive/40",
                )}
              >
                <span className="truncate">{tag}</span>
                <button
                  ref={(node) => {
                    if (!node) return;
                    chipRefs.current.set(key, node);
                    return () => {
                      if (chipRefs.current.get(key) === node) {
                        chipRefs.current.delete(key);
                      }
                    };
                  }}
                  type="button"
                  tabIndex={-1}
                  disabled={disabled}
                  aria-label={`Remove ${tag}`}
                  onKeyDown={(e) => onChipKeyDown(e, i)}
                  onClick={() => removeAt(i, "input")}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </motion.span>
            );
          })}

          <motion.input
            key="input"
            layout={!reduce ? "position" : false}
            transition={{ layout: SPRING_LAYOUT }}
            ref={inputRef}
            id={inputId}
            type="text"
            value={query}
            disabled={disabled}
            placeholder={atLimit ? "" : placeholder}
            autoComplete="off"
            spellCheck={false}
            aria-label={label ? undefined : (ariaLabel ?? "Add tag")}
            aria-invalid={error ? true : undefined}
            aria-describedby={message ? messageId : undefined}
            role={hasSuggestions ? "combobox" : undefined}
            aria-autocomplete={hasSuggestions ? "list" : undefined}
            aria-expanded={hasSuggestions ? listOpen : undefined}
            aria-controls={hasSuggestions && listOpen ? listId : undefined}
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
            }
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onInputKeyDown}
            onPaste={onPaste}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => {
              setFocused(false);
              setArmed(false);
              setActive(-1);
            }}
            className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm text-foreground caret-foreground outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
          />
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {listOpen ? (
          <motion.div
            id={listId}
            role="listbox"
            aria-label="Suggestions"
            initial={
              reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }
            }
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.1 } }
                : {
                    opacity: 0,
                    y: -4,
                    scale: 0.98,
                    transition: { duration: 0.12, ease: EASE_OUT },
                  }
            }
            transition={reduce ? { duration: 0.15 } : SPRING_SWAP}
            style={{ transformOrigin: "top" }}
            className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-60 overflow-auto rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {filtered.map((item, i) => {
              const selected = i === activeIndex;
              return (
                // Keyboard selection runs through the combobox input
                // (aria-activedescendant), so options stay out of the tab order.
                <button
                  key={item}
                  type="button"
                  tabIndex={-1}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerMove={() => setActive(i)}
                  onClick={() => add(item)}
                  className="relative block w-full cursor-pointer rounded-xl px-3 py-1.5 text-left text-sm outline-none"
                >
                  {selected ? (
                    <motion.span
                      layoutId={`${uid}-active`}
                      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                      className="absolute inset-0 rounded-xl bg-muted"
                    />
                  ) : null}
                  <span className="relative">
                    <Highlight text={item} query={query.trim()} />
                  </span>
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-4 items-start justify-between gap-3 px-1 text-xs">
        <p
          id={messageId}
          aria-live="polite"
          className={cn(error ? "text-destructive" : "text-muted-foreground")}
        >
          {message}
        </p>
        {maxTags !== undefined ? (
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {tags.length}/{maxTags}
          </span>
        ) : null}
      </div>

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="font-semibold text-foreground">
        {text.slice(at, at + query.length)}
      </span>
      {text.slice(at + query.length)}
    </>
  );
}
