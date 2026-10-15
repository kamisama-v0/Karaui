"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ToggleGroup } from "@/components/motion/segmented-control";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  /** Date, epoch ms or ISO string. */
  timestamp: Date | number | string;
  level: LogLevel;
  service: string;
  message: string;
  /** Structured context shown as JSON in the detail panel. */
  fields?: Record<string, unknown>;
}

export interface LogExplorerProps {
  /** Log lines, oldest first (they are sorted defensively). */
  logs: LogEntry[];
  /** Controlled live-tail mode. While on, new lines follow the bottom. */
  live?: boolean;
  defaultLive?: boolean;
  onLiveChange?: (live: boolean) => void;
  /** Histogram buckets across the time span. Default 32. */
  buckets?: number;
  /** IANA zone for timestamps. Default "UTC" so server and client agree. */
  timeZone?: string;
  /** Default "en-US". */
  locale?: string;
  /** Height of the scrolling log body in px. Default 240. */
  height?: number;
  /** Fixed row height in px (rows are virtualized). Default 28. */
  rowHeight?: number;
  className?: string;
}

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

// Token colors mixed toward the foreground so text keeps contrast in both themes.
const LEVEL_BADGE: Record<LogLevel, string> = {
  debug: "bg-foreground/5 text-muted-foreground",
  info: "bg-[color-mix(in_oklab,var(--chart-1)_14%,transparent)] text-[color-mix(in_oklab,var(--chart-1)_70%,var(--foreground))]",
  warn: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,var(--foreground))]",
  error:
    "bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]",
};
const LEVEL_DOT: Record<LogLevel, string> = {
  debug: "bg-muted-foreground",
  info: "bg-[var(--chart-1)]",
  warn: "bg-[var(--warning)]",
  error: "bg-[var(--destructive)]",
};

function toMs(t: LogEntry["timestamp"]) {
  return t instanceof Date ? t.getTime() : typeof t === "number" ? t : Date.parse(t);
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps every case-insensitive occurrence of `query` in <mark>. */
function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: split segments never reorder.
      <mark key={i} className="rounded-sm bg-[color-mix(in_oklab,var(--warning)_40%,transparent)] px-px text-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

const JSON_TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

/** Pretty JSON with keys, strings, numbers and literals tinted by theme tokens. */
function JsonView({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2) ?? "undefined";
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(JSON_TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const cls = m[2]
      ? "text-muted-foreground"
      : m[1]
        ? "text-[color-mix(in_oklab,var(--success)_60%,var(--foreground))]"
        : m[3]
          ? "text-[color-mix(in_oklab,var(--chart-5)_70%,var(--foreground))]"
          : "text-[color-mix(in_oklab,var(--chart-1)_75%,var(--foreground))]";
    out.push(
      <span key={at} className={cls}>
        {m[1] ?? m[0]}
      </span>,
    );
    if (m[2]) out.push(m[2]);
    last = at + m[0].length;
  }
  out.push(text.slice(last));
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-background/70 p-2 font-mono text-[11px] leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {out}
    </pre>
  );
}

/**
 * Log stream viewer: a volume histogram you can click or brush to narrow the
 * time window, level toggles, a text query with highlighted matches, and a
 * virtualized table. Live tail follows new lines (they slide in) until you
 * scroll up, then a "Jump to latest" pill counts what arrived. Clicking a row
 * opens a detail panel with the structured fields as JSON.
 */
export function LogExplorer({
  logs,
  live: liveProp,
  defaultLive = false,
  onLiveChange,
  buckets: bucketCount = 32,
  timeZone = "UTC",
  locale = "en-US",
  height = 240,
  rowHeight = 28,
  className,
}: LogExplorerProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const [liveState, setLiveState] = useState(defaultLive);
  const live = liveProp ?? liveState;
  const setLive = (next: boolean) => {
    if (liveProp === undefined) setLiveState(next);
    onLiveChange?.(next);
  };

  const [levels, setLevels] = useState<string[]>(LEVELS);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<[number, number] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      logs
        .map((l) => ({ ...l, ms: toMs(l.timestamp) }))
        .sort((a, b) => a.ms - b.ms),
    [logs],
  );
  const q = query.trim();
  const matches = useMemo(() => {
    const lower = q.toLowerCase();
    return sorted.filter(
      (l) =>
        levels.includes(l.level) &&
        (!lower ||
          l.message.toLowerCase().includes(lower) ||
          l.service.toLowerCase().includes(lower)),
    );
  }, [sorted, levels, q]);

  // Histogram over the full time span, counting lines that pass level + query.
  const domain = useMemo<[number, number]>(() => {
    if (!sorted.length) return [0, 1];
    const lo = sorted[0].ms;
    const hi = sorted[sorted.length - 1].ms;
    return [lo, hi > lo ? hi : lo + 1];
  }, [sorted]);
  const bucketMs = (domain[1] - domain[0]) / bucketCount;
  const histogram = useMemo(() => {
    const bins = Array.from({ length: bucketCount }, () => ({ total: 0, warn: 0, error: 0 }));
    for (const l of matches) {
      const i = Math.min(bucketCount - 1, Math.floor((l.ms - domain[0]) / bucketMs));
      bins[i].total++;
      if (l.level === "warn") bins[i].warn++;
      if (l.level === "error") bins[i].error++;
    }
    return bins;
  }, [matches, domain, bucketMs, bucketCount]);
  const peak = Math.max(1, ...histogram.map((b) => b.total));
  const edge = (i: number) => domain[0] + i * bucketMs;
  const inRange = (i: number) =>
    range !== null && edge(i + 1) > range[0] && edge(i) < range[1];

  const rows = useMemo(
    () => (range ? matches.filter((l) => l.ms >= range[0] && l.ms < range[1]) : matches),
    [matches, range],
  );
  const errorCount = rows.filter((r) => r.level === "error").length;

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hourCycle: "h23",
        timeZone,
      }),
    [locale, timeZone],
  );
  const shortFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
        timeZone,
      }),
    [locale, timeZone],
  );

  // ── brushing ────────────────────────────────────────────────────────────
  const brush = useRef<{ anchor: number; moved: boolean; prev: [number, number] | null } | null>(null);
  const [focusBar, setFocusBar] = useState(0);
  const barRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectBars = useCallback(
    (a: number, b: number) => {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      setRange([domain[0] + lo * bucketMs, domain[0] + (hi + 1) * bucketMs]);
    },
    [domain, bucketMs],
  );
  // Read through a ref so one window listener always sees the latest domain.
  const brushEnd = useRef(() => {});
  brushEnd.current = () => {
    const b = brush.current;
    brush.current = null;
    if (!b || b.moved) return;
    // A plain click on the bar that is already the whole selection clears it.
    if (b.prev && b.prev[0] === edge(b.anchor) && b.prev[1] === edge(b.anchor + 1)) setRange(null);
  };
  useEffect(() => {
    const end = () => brushEnd.current();
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);
  const onBarKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = Math.min(bucketCount - 1, i + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, i - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = bucketCount - 1;
    else if (e.key === "Escape" && range) {
      e.preventDefault();
      setRange(null);
      return;
    }
    if (next === null) return;
    e.preventDefault();
    setFocusBar(next);
    barRefs.current[next]?.focus();
    if (e.shiftKey) selectBars(brush.current?.anchor ?? i, next);
  };

  // ── list, follow-the-tail ───────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });
  const stick = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const prev = useRef({ logs, count: rows.length });

  const scrollToEnd = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stick.current = true;
    setAtBottom(true);
    setUnseen(0);
  }, []);

  // Lines that arrive after the first render slide in; the flag is read only
  // when a row mounts, so ids are marked known right after each commit.
  const known = useRef<Set<string> | null>(null);
  if (known.current === null) known.current = new Set(logs.map((l) => l.id));
  useEffect(() => {
    for (const l of logs) known.current?.add(l.id);
  }, [logs]);

  useLayoutEffect(() => {
    const p = prev.current;
    prev.current = { logs, count: rows.length };
    // Only new data counts; a filter change that reveals more rows doesn't.
    if (p.logs === logs) return;
    const added = rows.length - p.count;
    if (added <= 0) return;
    if (live && stick.current) {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } else if (!stick.current) {
      setUnseen((n) => n + added);
    }
  }, [logs, rows.length, live]);

  // Start at the newest line, like `tail`.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < rowHeight;
    stick.current = bottom;
    setAtBottom(bottom);
    if (bottom) setUnseen(0);
  };

  // ── detail panel ────────────────────────────────────────────────────────
  const open = openId ? (sorted.find((l) => l.id === openId) ?? null) : null;
  const panelRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const openRow = (id: string, el: HTMLElement) => {
    returnFocus.current = el;
    setOpenId(id);
  };
  const closePanel = () => {
    setOpenId(null);
    returnFocus.current?.focus({ preventScroll: true });
  };
  // Keyed by id: `open` is a fresh object on every live update.
  useEffect(() => {
    if (openId) requestAnimationFrame(() => panelRef.current?.focus());
  }, [openId]);

  const columns = "grid-cols-[5.75rem_3.25rem_5.5rem_minmax(0,1fr)]";
  const virtualRows = virtualizer.getVirtualItems();

  return (
    <section
      aria-label="Log explorer"
      className={cn(
        "flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-3 text-card-foreground",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-36 flex-1 items-center">
          <span className="sr-only">Filter messages</span>
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter messages…"
            className="h-9 w-full rounded-xl border border-border bg-background pr-2 pl-8 font-mono text-xs outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground hover:border-foreground/20 focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        <ToggleGroup
          type="multiple"
          size="sm"
          aria-label="Log levels"
          value={levels}
          onValueChange={setLevels}
          items={LEVELS.map((l) => ({
            value: l,
            label: l,
            icon: <span className={cn("size-1.5 rounded-full", LEVEL_DOT[l])} />,
          }))}
          className="p-0.5"
        />
        <button
          type="button"
          aria-pressed={live}
          onClick={() => {
            const next = !live;
            setLive(next);
            if (next) scrollToEnd();
          }}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            live
              ? "border-[color-mix(in_oklab,var(--success)_45%,transparent)] bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="relative grid size-2 place-items-center">
            {live ? (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[var(--success)]"
                animate={reduce ? { opacity: [1, 0.4, 1] } : { opacity: [0.7, 0], scale: [1, 2.4] }}
                transition={{ duration: 1.4, ease: EASE_OUT, repeat: Number.POSITIVE_INFINITY }}
              />
            ) : null}
            <span
              aria-hidden
              className={cn("relative size-2 rounded-full", live ? "bg-[var(--success)]" : "bg-muted-foreground/50")}
            />
          </span>
          Live
        </button>
      </div>

      {/* Histogram — click a bar or drag across bars to narrow the window. */}
      <div>
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="tabular-nums" aria-live="polite">
            {rows.length.toLocaleString(locale)} lines
            {errorCount ? (
              <>
                {" · "}
                <span className="text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]">
                  {errorCount} errors
                </span>
              </>
            ) : null}
          </span>
          <AnimatePresence initial={false}>
            {range ? (
              <motion.button
                key="range"
                type="button"
                onClick={() => setRange(null)}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={SPRING_LAYOUT}
                className="inline-flex h-5 items-center gap-1 rounded-full bg-foreground/5 pr-1 pl-2 font-mono tabular-nums text-foreground outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {shortFmt.format(range[0])}–{shortFmt.format(range[1])}
                <X className="size-3" aria-hidden />
                <span className="sr-only">Clear time range</span>
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: a strip of toggle bars, not a form; group names it */}
        <div
          role="group"
          aria-label="Log volume over time. Arrow keys move, Enter selects, Shift extends."
          className="flex h-12 touch-none items-end gap-px select-none"
        >
          {histogram.map((bin, i) => {
            const selected = inRange(i);
            const dim = range !== null && !selected;
            const label = `${shortFmt.format(edge(i))} to ${shortFmt.format(edge(i + 1))}: ${bin.total} lines, ${bin.error} errors`;
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: buckets are positional.
                key={i}
                ref={(el) => {
                  barRefs.current[i] = el;
                }}
                type="button"
                aria-label={label}
                aria-pressed={selected}
                title={label}
                tabIndex={i === focusBar ? 0 : -1}
                onFocus={() => setFocusBar(i)}
                onKeyDown={(e) => onBarKey(e, i)}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  // Touch captures the pointer to the first bar; release it so
                  // pointerenter fires on the bars the finger crosses.
                  e.currentTarget.releasePointerCapture?.(e.pointerId);
                  brush.current = { anchor: i, moved: false, prev: range };
                  selectBars(i, i);
                }}
                onPointerEnter={() => {
                  const b = brush.current;
                  if (!b) return;
                  b.moved = b.moved || i !== b.anchor;
                  selectBars(b.anchor, i);
                }}
                onClick={(e) => {
                  // Keyboard activation (pointer clicks are handled above).
                  if (e.detail !== 0) return;
                  if (e.shiftKey && range) {
                    const anchor = Math.floor((range[0] - domain[0]) / bucketMs);
                    selectBars(anchor, i);
                  } else if (selected && range && edge(i) === range[0] && edge(i + 1) === range[1]) {
                    setRange(null);
                  } else selectBars(i, i);
                }}
                className="group relative flex h-full min-w-0 flex-1 items-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-0 rounded-sm transition-colors",
                    selected ? "bg-foreground/[0.06]" : "group-hover:bg-foreground/[0.04]",
                  )}
                />
                {/* scaleY from the bottom edge: transform only, HTML element. */}
                <motion.span
                  aria-hidden
                  initial={false}
                  animate={{ scaleY: bin.total / peak, opacity: dim ? 0.35 : 1 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.35, ease: EASE_OUT }}
                  className="relative flex h-full w-full origin-bottom flex-col justify-end overflow-hidden rounded-t-xs"
                >
                  <span
                    className={cn("w-full flex-1", selected ? "bg-[var(--chart-1)]" : "bg-foreground/25")}
                  />
                  {bin.total ? (
                    <>
                      <span
                        className="w-full bg-[var(--warning)]"
                        style={{ height: `${(bin.warn / bin.total) * 100}%` }}
                      />
                      <span
                        className="w-full bg-[var(--destructive)]"
                        style={{ height: `${(bin.error / bin.total) * 100}%` }}
                      />
                    </>
                  ) : null}
                </motion.span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
          <span>{sorted.length ? shortFmt.format(domain[0]) : ""}</span>
          <span>{sorted.length ? shortFmt.format((domain[0] + domain[1]) / 2) : ""}</span>
          <span>{sorted.length ? shortFmt.format(domain[1]) : ""}</span>
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-background/40">
        <div
          aria-hidden
          className={cn(
            "grid gap-2 border-b border-border px-2.5 py-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase",
            columns,
          )}
        >
          <span>Time ({timeZone === "UTC" ? "UTC" : "local"})</span>
          <span>Level</span>
          <span>Service</span>
          <span>Message</span>
        </div>
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="relative overflow-y-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
          style={{ height }}
        >
          {rows.length === 0 ? (
            <p className="grid h-full place-items-center text-xs text-muted-foreground">
              No lines match these filters.
            </p>
          ) : (
            <ul
              aria-label={`${rows.length} log lines`}
              className="relative w-full"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualRows.map((v) => {
                const l = rows[v.index];
                const fresh = !known.current?.has(l.id);
                return (
                  <motion.li
                    key={l.id}
                    initial={fresh ? { opacity: 0, y: reduce ? 0 : 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: EASE_OUT }}
                    className="absolute left-0 w-full"
                    style={{ top: v.start, height: rowHeight }}
                  >
                    <button
                      type="button"
                      onClick={(e) => openRow(l.id, e.currentTarget)}
                      aria-expanded={openId === l.id}
                      className={cn(
                        "grid h-full w-full items-center gap-2 px-2.5 text-left text-xs outline-none transition-colors focus-visible:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                        columns,
                        openId === l.id
                          ? "bg-foreground/[0.07]"
                          : l.level === "error"
                            ? "bg-[color-mix(in_oklab,var(--destructive)_6%,transparent)] hover:bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)]"
                            : "hover:bg-foreground/[0.04]",
                      )}
                    >
                      <time
                        dateTime={new Date(l.ms).toISOString()}
                        className="font-mono text-[11px] tabular-nums text-muted-foreground"
                      >
                        {timeFmt.format(l.ms)}
                      </time>
                      <span
                        className={cn(
                          "inline-flex h-4.5 w-fit items-center rounded-sm px-1 font-mono text-[10px] font-semibold uppercase",
                          LEVEL_BADGE[l.level],
                        )}
                      >
                        {l.level}
                      </span>
                      <span className="truncate text-muted-foreground">{highlight(l.service, q)}</span>
                      <span className="truncate font-mono text-[11.5px] text-foreground">{highlight(l.message, q)}</span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>

        <AnimatePresence>
          {!atBottom && (live || unseen > 0) ? (
            <motion.button
              key="jump"
              type="button"
              onClick={scrollToEnd}
              initial={{ opacity: 0, y: reduce ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : 6, transition: { duration: 0.14 } }}
              transition={SPRING_PANEL}
              className="absolute bottom-3 left-1/2 z-10 -ml-[4.5rem] inline-flex h-8 w-36 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-medium text-primary-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowDown className="size-3.5" aria-hidden />
              Jump to latest
              {unseen > 0 ? <span className="tabular-nums opacity-70">+{unseen}</span> : null}
            </motion.button>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {open ? (
            <motion.aside
              key="detail"
              ref={panelRef}
              aria-labelledby={`${baseId}-detail`}
              tabIndex={-1}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  closePanel();
                }
              }}
              initial={{ x: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduce ? 0 : "100%", opacity: reduce ? 0 : 1, transition: { duration: 0.18, ease: EASE_OUT } }}
              transition={reduce ? { duration: 0.15 } : SPRING_PANEL}
              className="absolute inset-y-0 right-0 z-20 flex w-[min(20rem,85%)] flex-col gap-2 overflow-y-auto border-l border-border bg-card p-3 shadow-2xl outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-5 items-center rounded-sm px-1.5 font-mono text-[10px] font-semibold uppercase",
                      LEVEL_BADGE[open.level],
                    )}
                  >
                    {open.level}
                  </span>
                  <h4 id={`${baseId}-detail`} className="text-sm font-semibold">
                    {open.service}
                  </h4>
                </span>
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Close details"
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <p className="font-mono text-xs break-words text-foreground">{open.message}</p>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[11px]">
                <dt className="text-muted-foreground">timestamp</dt>
                <dd className="font-mono tabular-nums">{new Date(open.ms).toISOString()}</dd>
                <dt className="text-muted-foreground">id</dt>
                <dd className="truncate font-mono">{open.id}</dd>
              </dl>
              <JsonView
                value={{ level: open.level, service: open.service, message: open.message, ...open.fields }}
              />
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
