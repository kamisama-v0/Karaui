"use client";

import { ChevronDown, Download, Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, type Ref, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/motion/button";
import { seriesColor } from "@/components/motion/chart/shared";
import { EmptyState } from "@/components/motion/empty-state";
import { MultiSelect } from "@/components/motion/multi-select";
import { SegmentedControl } from "@/components/motion/segmented-control";
import { Skeleton } from "@/components/motion/skeleton";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type AuditSeverity = "info" | "notice" | "warning" | "critical";
export type AuditActionType = "create" | "update" | "delete" | "access";

export interface AuditActor {
  id: string;
  name: string;
  /** Avatar image URL. Initials on a categorical tint otherwise. */
  avatar?: string;
}

export interface AuditChange {
  field: string;
  before?: ReactNode;
  after?: ReactNode;
}

export interface AuditEntry {
  id: string;
  actor: AuditActor;
  /** Past-tense verb shown between actor and target, e.g. "updated". */
  action: string;
  /** Bucket used by the action-type filter. */
  type: AuditActionType;
  /** What was acted on, e.g. "billing-plan" or "API key ••4f2a". */
  target: string;
  /** Date, epoch ms or ISO string. */
  timestamp: Date | number | string;
  severity?: AuditSeverity;
  /** Free-form area, e.g. "Billing", "Security". */
  category?: string;
  /** Field-level diff shown when the entry is expanded. */
  changes?: AuditChange[];
}

export interface AuditTrailProps {
  entries: AuditEntry[];
  /** Export button handler, called with the currently filtered entries. Hidden when omitted. */
  onExport?: (entries: AuditEntry[]) => void;
  /** Heading. Default "Audit log". */
  title?: ReactNode;
  /** Locale for dates and relative times. Default "en-US" so server and client agree. */
  locale?: string;
  /** Height of the scrolling list. Default "22rem". */
  listHeight?: string;
  className?: string;
}

const DAY = 86_400_000;

const TYPE_OPTIONS: { value: "all" | AuditActionType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "access", label: "Access" },
];

// Theme tokens mixed toward the foreground so the text keeps contrast on both
// light and dark cards (same recipe as Alert).
const SEVERITY_CLASS: Record<AuditSeverity, string> = {
  info: "bg-foreground/5 text-muted-foreground",
  notice:
    "bg-[color-mix(in_oklab,var(--chart-1)_12%,transparent)] text-[color-mix(in_oklab,var(--chart-1)_70%,var(--foreground))]",
  warning:
    "bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,var(--foreground))]",
  critical:
    "bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)] text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]",
};

function toMs(t: AuditEntry["timestamp"]) {
  return t instanceof Date ? t.getTime() : typeof t === "number" ? t : Date.parse(t);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

function textOf(node: ReactNode): string {
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}

/**
 * Chronological activity log grouped by day. Filter by actor, action type and
 * free text; entries with a field diff expand (height morph) to show the old
 * value struck through beside the new one. Entries added after mount slide in
 * at the top. "Now" — and with it day grouping and relative times — is read
 * after mount, so server and client render the same skeleton first.
 */
export function AuditTrail({
  entries,
  onExport,
  title = "Audit log",
  locale = "en-US",
  listHeight = "22rem",
  className,
}: AuditTrailProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const [actors, setActors] = useState<string[]>([]);
  const [type, setType] = useState<"all" | AuditActionType>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Entries present at first render don't animate in; anything added later
  // slides in from the top. A row reads `fresh` only when it mounts, so ids
  // are marked known right after the commit that first rendered them.
  const known = useRef<Set<string> | null>(null);
  if (known.current === null) known.current = new Set(entries.map((e) => e.id));
  const isNew = (id: string) => !known.current?.has(id);
  useEffect(() => {
    if (now === null) return;
    for (const e of entries) known.current?.add(e.id);
  }, [entries, now]);

  const actorOptions = useMemo(() => {
    const seen = new Map<string, AuditActor>();
    for (const e of entries) if (!seen.has(e.actor.id)) seen.set(e.actor.id, e.actor);
    return [...seen.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({ value: a.id, label: a.name }));
  }, [entries]);
  const actorIndex = useMemo(
    () => new Map(actorOptions.map((o, i) => [o.value, i])),
    [actorOptions],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => (actors.length ? actors.includes(e.actor.id) : true))
      .filter((e) => (type === "all" ? true : e.type === type))
      .filter((e) => {
        if (!q) return true;
        const hay = [
          e.actor.name,
          e.action,
          e.target,
          e.category ?? "",
          ...(e.changes ?? []).flatMap((c) => [c.field, textOf(c.before), textOf(c.after)]),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp));
  }, [entries, actors, type, query]);

  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }),
    [locale],
  );
  const fullFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );
  const rtf = useMemo(
    () => new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" }),
    [locale],
  );

  const groups = useMemo(() => {
    if (now === null) return [];
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const today = startOfToday.getTime();
    const out: { key: string; label: string; items: AuditEntry[] }[] = [];
    for (const e of filtered) {
      const d = new Date(toMs(e.timestamp));
      d.setHours(0, 0, 0, 0);
      const start = d.getTime();
      const key = String(start);
      let group = out.at(-1);
      if (!group || group.key !== key) {
        const daysAgo = Math.round((today - start) / DAY);
        const label =
          daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : dayFmt.format(start);
        group = { key, label, items: [] };
        out.push(group);
      }
      group.items.push(e);
    }
    return out;
  }, [filtered, now, dayFmt]);

  const relative = (t: AuditEntry["timestamp"]) => {
    if (now === null) return "";
    const diff = Math.max(0, now - toMs(t));
    const s = Math.round(diff / 1000);
    if (s < 45) return rtf.format(0, "second");
    const m = Math.round(s / 60);
    if (m < 60) return rtf.format(-m, "minute");
    const h = Math.round(m / 60);
    if (h < 24) return rtf.format(-h, "hour");
    return rtf.format(-Math.round(diff / DAY), "day");
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filtersActive = actors.length > 0 || type !== "all" || query.trim() !== "";
  const clearFilters = () => {
    setActors([]);
    setType("all");
    setQuery("");
  };

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className={cn(
        "flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 id={`${baseId}-title`} className="truncate text-sm font-semibold">
            {title}
          </h3>
          <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "event" : "events"}
          </span>
        </div>
        {onExport ? (
          <Button variant="outline" size="sm" onClick={() => onExport(filtered)}>
            <Download className="size-3.5" aria-hidden />
            Export
          </Button>
        ) : null}
      </header>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="relative flex min-h-11 items-center">
          <span className="sr-only">Search events</span>
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actor, target, field…"
            className="h-11 w-full rounded-2xl border border-border bg-background pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/20 focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        <MultiSelect
          options={actorOptions}
          value={actors}
          onValueChange={setActors}
          placeholder={actors.length ? "" : "All actors"}
          aria-label="Filter by actor"
          maxVisibleChips={1}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <SegmentedControl
          size="sm"
          options={TYPE_OPTIONS}
          value={type}
          onValueChange={(v) => setType(v as "all" | AuditActionType)}
          aria-label="Filter by action type"
        />
        <AnimatePresence initial={false}>
          {filtersActive ? (
            <motion.button
              type="button"
              key="clear"
              onClick={clearFilters}
              initial={{ opacity: 0, x: reduce ? 0 : 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3" aria-hidden />
              Clear
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      <div
        className="-mx-1 overflow-y-auto px-1 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
        style={{ height: listHeight }}
      >
        {now === null ? (
          <div className="flex flex-col gap-4 pt-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton shape="circle" width={28} />
                <div className="flex flex-1 flex-col gap-2 pt-1">
                  <Skeleton shape="text" className="w-3/4" />
                  <Skeleton shape="text" className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            size="sm"
            title="No matching events"
            description="Try another actor, action type or search term."
            action={
              filtersActive ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <h4 className="sticky top-0 z-10 bg-card/95 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur-sm">
                  {group.label}
                </h4>
                <ol className="relative">
                  <AnimatePresence initial={false} mode="popLayout">
                    {group.items.map((entry, i) => (
                      <AuditRow
                        key={entry.id}
                        entry={entry}
                        last={i === group.items.length - 1}
                        fresh={isNew(entry.id)}
                        expanded={expanded.has(entry.id)}
                        onToggle={() => toggle(entry.id)}
                        tint={seriesColor({}, actorIndex.get(entry.actor.id) ?? 0)}
                        relative={relative(entry.timestamp)}
                        absolute={fullFmt.format(toMs(entry.timestamp))}
                        iso={new Date(toMs(entry.timestamp)).toISOString()}
                        reduce={reduce}
                        panelId={`${baseId}-${entry.id}`}
                      />
                    ))}
                  </AnimatePresence>
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AuditRow({
  entry,
  last,
  fresh,
  expanded,
  onToggle,
  tint,
  relative,
  absolute,
  iso,
  reduce,
  panelId,
  ref,
}: {
  /** Forwarded so AnimatePresence's popLayout can measure the exiting row. */
  ref?: Ref<HTMLLIElement>;
  entry: AuditEntry;
  last: boolean;
  fresh: boolean;
  expanded: boolean;
  onToggle: () => void;
  tint: string;
  relative: string;
  absolute: string;
  iso: string;
  reduce: boolean;
  panelId: string;
}) {
  const hasDiff = Boolean(entry.changes?.length);
  const severity = entry.severity ?? "info";

  const summary = (
    <>
      <span className="font-medium text-foreground">{entry.actor.name}</span>{" "}
      <span className="text-muted-foreground">{entry.action}</span>{" "}
      <span className="font-mono text-[12px] text-foreground">{entry.target}</span>
    </>
  );

  const meta = (
    <span className="mt-1 flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-semibold capitalize",
          SEVERITY_CLASS[severity],
        )}
      >
        {severity}
      </span>
      {entry.category ? (
        <span className="inline-flex h-5 items-center rounded-full border border-border px-1.5 text-[10px] font-medium text-muted-foreground">
          {entry.category}
        </span>
      ) : null}
      {hasDiff ? (
        <span className="text-[11px] text-muted-foreground">
          {entry.changes?.length} {entry.changes?.length === 1 ? "field" : "fields"}
        </span>
      ) : null}
    </span>
  );

  return (
    <motion.li
      ref={ref}
      layout={reduce ? false : "position"}
      initial={fresh ? { opacity: 0, y: reduce ? 0 : -14 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ default: { duration: 0.32, ease: EASE_OUT }, layout: SPRING_LAYOUT }}
      className="relative flex gap-3 pb-3"
    >
      {/* Rail connecting avatars within a day. */}
      {!last ? (
        <span aria-hidden className="absolute top-8 bottom-0 left-3.5 w-px bg-border-strong" />
      ) : null}
      <span
        aria-hidden
        className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full text-[10px] font-semibold text-foreground ring-2 ring-card"
        style={{ background: `color-mix(in oklab, ${tint} 28%, var(--card))` }}
      >
        {entry.actor.avatar ? (
          // biome-ignore lint/performance/noImgElement: library component; consumers pass any URL.
          <img src={entry.actor.avatar} alt="" className="size-full object-cover" />
        ) : (
          initials(entry.actor.name)
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {hasDiff ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={onToggle}
              className="group -mx-1.5 -my-0.5 flex min-w-0 flex-1 items-start gap-1.5 rounded-lg px-1.5 py-0.5 text-left text-sm outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0 flex-1">
                <span className="block">{summary}</span>
                {meta}
              </span>
              <motion.span
                aria-hidden
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                className="mt-0.5 inline-flex text-muted-foreground group-hover:text-foreground"
              >
                <ChevronDown className="size-4" />
              </motion.span>
            </button>
          ) : (
            <div className="min-w-0 flex-1 text-sm">
              <span className="block">{summary}</span>
              {meta}
            </div>
          )}
          <time
            dateTime={iso}
            title={absolute}
            className="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground"
          >
            {relative}
          </time>
        </div>

        <AnimatePresence initial={false}>
          {hasDiff && expanded ? (
            // Height is animated on purpose: the disclosure's job is to open
            // space in the list, and siblings glide with it.
            <motion.div
              key="diff"
              id={panelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0, transition: { duration: 0.16, ease: EASE_OUT } }}
              transition={reduce ? { duration: 0 } : { duration: 0.26, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-xl border border-border bg-background/60 p-2.5 text-xs">
                {entry.changes?.map((c) => (
                  <div key={c.field} className="contents">
                    <dt className="pt-0.5 font-mono text-muted-foreground">{c.field}</dt>
                    <dd className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {c.before !== undefined && c.before !== null ? (
                        <del className="rounded-md bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] px-1.5 py-0.5 font-mono text-[color-mix(in_oklab,var(--destructive)_70%,var(--foreground))] decoration-1">
                          <span className="sr-only">was </span>
                          {c.before}
                        </del>
                      ) : null}
                      {c.before != null && c.after != null ? (
                        <span aria-hidden className="text-muted-foreground">
                          →
                        </span>
                      ) : null}
                      {c.after !== undefined && c.after !== null ? (
                        <ins className="rounded-md bg-[color-mix(in_oklab,var(--success)_16%,transparent)] px-1.5 py-0.5 font-mono text-[color-mix(in_oklab,var(--success)_55%,var(--foreground))] no-underline">
                          <span className="sr-only">now </span>
                          {c.after}
                        </ins>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}
