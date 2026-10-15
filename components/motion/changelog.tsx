"use client";

import { ChevronDown, Mail } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useCallback, useId, useMemo, useRef, useState } from "react";
import { Badge, type BadgeVariant } from "@/components/motion/badge";
import { type ButtonState, StatefulButton } from "@/components/motion/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/motion/collapsible";
import { EmptyState } from "@/components/motion/empty-state";
import { Input } from "@/components/motion/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/motion/toggle-group";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type ChangelogTag = "new" | "improved" | "fixed";
export type ChangelogFilter = ChangelogTag | "all";

export interface ChangelogChange {
  tag: ChangelogTag;
  text: ReactNode;
}

export interface ChangelogEntry {
  id: string;
  version: string;
  /** `YYYY-MM-DD`, formatted in UTC so server and client agree. */
  date: string;
  title: ReactNode;
  summary?: ReactNode;
  changes: ChangelogChange[];
}

export interface ChangelogProps {
  entries: ChangelogEntry[];
  filter?: ChangelogFilter;
  defaultFilter?: ChangelogFilter;
  onFilterChange?: (filter: ChangelogFilter) => void;
  /** Ids of expanded entries. Default: the newest entry. */
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** Shows the subscribe field. Reject (or throw) to show an error state. */
  onSubscribe?: (email: string) => Promise<unknown> | unknown;
  subscribeLabel?: string;
  locale?: string;
  className?: string;
}

const TAGS: ChangelogTag[] = ["new", "improved", "fixed"];

const TAG_LABEL: Record<ChangelogTag, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

const TAG_VARIANT: Record<ChangelogTag, BadgeVariant> = {
  new: "success",
  improved: "default",
  fixed: "warning",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange: ((next: T) => void) | undefined,
) {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const set = useCallback(
    (next: T) => {
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set] as const;
}

export function Changelog({
  entries,
  filter: filterProp,
  defaultFilter = "all",
  onFilterChange,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  onSubscribe,
  subscribeLabel = "Get release notes by email",
  locale = "en-US",
  className,
}: ChangelogProps) {
  const reduce = useReducedMotion() ?? false;
  const [filter, setFilter] = useControllable(filterProp, defaultFilter, onFilterChange);
  const [expanded, setExpanded] = useControllable(
    expandedProp,
    defaultExpanded ?? (entries[0] ? [entries[0].id] : []),
    onExpandedChange,
  );
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
    [locale],
  );

  const counts = useMemo(() => {
    const c: Record<ChangelogFilter, number> = { all: entries.length, new: 0, improved: 0, fixed: 0 };
    for (const e of entries) for (const t of TAGS) if (e.changes.some((ch) => ch.tag === t)) c[t] += 1;
    return c;
  }, [entries]);

  const visible = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.changes.some((c) => c.tag === filter))),
    [entries, filter],
  );

  return (
    <div className={cn("flex w-full flex-col gap-4 text-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          required
          variant="outline"
          size="sm"
          aria-label="Filter by change type"
          value={filter}
          onValueChange={(v) => v && setFilter(v as ChangelogFilter)}
        >
          {(["all", ...TAGS] as ChangelogFilter[]).map((t) => (
            <ToggleGroupItem key={t} value={t}>
              {t === "all" ? "All" : TAG_LABEL[t]}
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{counts[t]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p aria-live="polite" className="sr-only">
          {visible.length} release{visible.length === 1 ? "" : "s"} shown
        </p>
      </div>

      {onSubscribe && <SubscribeForm label={subscribeLabel} onSubscribe={onSubscribe} />}

      {visible.length === 0 ? (
        <EmptyState size="sm" title="No releases match" description="Try another change type." />
      ) : (
        <ol className="relative flex flex-col">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((entry, i) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                filter={filter}
                last={i === visible.length - 1}
                date={dateFormat.format(new Date(`${entry.date}T00:00:00Z`))}
                open={expanded.includes(entry.id)}
                onOpenChange={(next) =>
                  setExpanded(next ? [...expanded, entry.id] : expanded.filter((id) => id !== entry.id))
                }
                reduce={reduce}
              />
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  filter,
  last,
  date,
  open,
  onOpenChange,
  reduce,
}: {
  entry: ChangelogEntry;
  filter: ChangelogFilter;
  last: boolean;
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reduce: boolean;
}) {
  const tags = TAGS.filter((t) => entry.changes.some((c) => c.tag === t));
  const changes = filter === "all" ? entry.changes : entry.changes.filter((c) => c.tag === filter);

  return (
    <motion.li
      layout={reduce ? false : "position"}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={SPRING_LAYOUT}
      className="grid grid-cols-[5.5rem_1fr] gap-x-4 sm:grid-cols-[7rem_1fr]"
    >
      {/* Version + date rail */}
      <div className="relative flex flex-col items-end pt-1 pr-4 text-right">
        <span className="font-mono text-xs font-semibold text-foreground">{entry.version}</span>
        <time dateTime={entry.date} className="text-[11px] text-muted-foreground">
          {date}
        </time>
        {!last && (
          <span aria-hidden="true" className="absolute -right-px top-4 bottom-0 w-px bg-border" />
        )}
        <span
          aria-hidden="true"
          className={cn(
            "absolute -right-[5px] top-1.5 size-2.5 rounded-full border-2 border-background",
            tags.includes("new") ? "bg-success" : "bg-foreground/30",
          )}
        />
      </div>

      <div className="pb-6">
        <Collapsible open={open} onOpenChange={onOpenChange} className="rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-1.5 px-4 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((t) => (
                <Badge key={t} size="sm" variant={TAG_VARIANT[t]} tone="soft">
                  {TAG_LABEL[t]}
                </Badge>
              ))}
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">{entry.title}</h3>
            {entry.summary && <p className="text-muted-foreground">{entry.summary}</p>}
          </div>
          <CollapsibleTrigger className="mt-1 flex w-full items-center gap-1.5 rounded-b-xl px-4 py-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <motion.span
              aria-hidden="true"
              animate={{ rotate: open ? 180 : 0 }}
              transition={reduce ? { duration: 0 } : SPRING_SWAP}
              className="flex"
            >
              <ChevronDown className="size-3.5" />
            </motion.span>
            {open ? "Hide" : "Show"} {changes.length} change{changes.length === 1 ? "" : "s"}
          </CollapsibleTrigger>
          <CollapsibleContent innerClassName="px-4 pb-4">
            <ul className="flex flex-col gap-2 border-t border-border pt-3">
              {changes.map((change, i) => (
                <motion.li
                  // biome-ignore lint/suspicious/noArrayIndexKey: changes are static per entry
                  key={i}
                  initial={false}
                  animate={open ? { opacity: 1, x: 0 } : { opacity: 0, x: reduce ? 0 : -4 }}
                  transition={{ duration: 0.2, ease: EASE_OUT, delay: open ? i * 0.03 : 0 }}
                  className="flex items-start gap-2"
                >
                  <Badge size="sm" variant={TAG_VARIANT[change.tag]} className="mt-px w-[4.75rem] shrink-0 justify-center">
                    {TAG_LABEL[change.tag]}
                  </Badge>
                  <span className="text-foreground/90">{change.text}</span>
                </motion.li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </motion.li>
  );
}

function SubscribeForm({
  label,
  onSubscribe,
}: {
  label: string;
  onSubscribe: (email: string) => Promise<unknown> | unknown;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [state, setState] = useState<ButtonState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "loading") return;
    if (!EMAIL.test(email.trim())) {
      setError("Enter a valid email");
      return;
    }
    setError(undefined);
    setState("loading");
    try {
      await onSubscribe(email.trim());
      setState("success");
      setEmail("");
    } catch (reason) {
      setState("error");
      setError(reason instanceof Error ? reason.message : "Couldn't subscribe");
    }
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState("idle"), 2400);
  };

  return (
    <form
      onSubmit={submit}
      aria-labelledby={`${id}-label`}
      className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3 sm:flex-row sm:items-start"
    >
      <p id={`${id}-label`} className="sr-only">
        {label}
      </p>
      <Input
        type="email"
        aria-label="Email"
        placeholder={label}
        value={email}
        onChange={(v) => {
          setEmail(v);
          if (error) setError(undefined);
        }}
        error={error}
        leftIcon={<Mail className="size-4" />}
        className="min-w-0 flex-1"
      />
      <StatefulButton
        type="submit"
        size="md"
        state={state}
        loadingText="Subscribing"
        successText="Subscribed"
        errorText="Try again"
        className="shrink-0"
      >
        Subscribe
      </StatefulButton>
    </form>
  );
}
