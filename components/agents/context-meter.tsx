"use client";

import { Loader2, Minimize2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/motion/badge";
import { Button } from "@/components/motion/button";
import {
  MorphPopover,
  MorphPopoverContent,
} from "@/components/motion/popover-morph";
import { EASE_OUT } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export interface ContextSegment {
  id: string;
  label: string;
  tokens: number;
  /** Any CSS color. Defaults to `--chart-1..5` by position. */
  color?: string;
}

export type ContextMeterStatus = "ok" | "warning" | "critical";

export interface ContextMeterProps {
  /** Usage breakdown, e.g. system / conversation / files / tools. */
  segments: ContextSegment[];
  /** Context window size in tokens. */
  limit: number;
  /** Fraction of the window at which the meter turns to a warning. Default 0.8. */
  warnAt?: number;
  /** Fraction at which it turns critical. Default 0.95. */
  criticalAt?: number;
  /** Shows a "Compact conversation" action. May return a promise. */
  onCompact?: () => void | Promise<void>;
  compactLabel?: string;
  /** Controlled panel state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Open the breakdown on hover (hover-capable pointers only). Default true. */
  openOnHover?: boolean;
  side?: "top" | "bottom";
  align?: "start" | "end";
  title?: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** 84213 → "84.2k", 200000 → "200k", 1000000 → "1M". */
export function formatTokens(tokens: number) {
  const trim = (n: number) =>
    n >= 100 || Number.isInteger(n) ? Math.round(n).toString() : n.toFixed(1);
  if (tokens >= 1_000_000) return `${trim(tokens / 1_000_000)}M`;
  if (tokens >= 1000) return `${trim(tokens / 1000)}k`;
  return Math.round(tokens).toString();
}

const STATUS_COLOR: Record<ContextMeterStatus, string> = {
  ok: "var(--foreground)",
  warning: "var(--warning)",
  critical: "var(--destructive)",
};

const HOVER_OPEN_DELAY = 120;
const HOVER_CLOSE_DELAY = 220;
const RING_RADIUS = 7;

export function ContextMeter({
  segments,
  limit,
  warnAt = 0.8,
  criticalAt = 0.95,
  onCompact,
  compactLabel = "Compact conversation",
  open,
  defaultOpen = false,
  onOpenChange,
  openOnHover = true,
  side = "top",
  align = "start",
  title = "Context window",
  className,
  contentClassName,
}: ContextMeterProps) {
  const reduce = useReducedMotion() ?? false;
  const canHover = useHoverCapable();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  // Hover-opened panels close on leave; a click pins the panel open.
  const hoverOpened = useRef(false);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [compacting, setCompacting] = useState(false);
  const isOpen = open ?? internalOpen;

  const used = segments.reduce((sum, segment) => sum + segment.tokens, 0);
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0;
  const percent = Math.round(ratio * 100);
  const status: ContextMeterStatus =
    ratio >= criticalAt ? "critical" : ratio >= warnAt ? "warning" : "ok";
  const free = Math.max(limit - used, 0);

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const setOpen = (next: boolean) => {
    window.clearTimeout(hoverTimer.current);
    if (!next) {
      hoverOpened.current = false;
      // Focus would be stranded in the panel as it unmounts; return it.
      if (panelRef.current?.contains(document.activeElement)) {
        triggerRef.current?.focus({ preventScroll: true });
      }
    }
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const hoverEnabled = openOnHover && canHover;

  const scheduleOpen = () => {
    if (!hoverEnabled) return;
    window.clearTimeout(hoverTimer.current);
    if (isOpen) return;
    hoverTimer.current = window.setTimeout(() => {
      hoverOpened.current = true;
      setOpen(true);
    }, HOVER_OPEN_DELAY);
  };

  const scheduleClose = () => {
    if (!hoverEnabled) return;
    window.clearTimeout(hoverTimer.current);
    if (!isOpen || !hoverOpened.current) return;
    hoverTimer.current = window.setTimeout(
      () => setOpen(false),
      HOVER_CLOSE_DELAY,
    );
  };

  const compact = async () => {
    if (!onCompact || compacting) return;
    setCompacting(true);
    try {
      await onCompact();
    } finally {
      setCompacting(false);
    }
  };

  // Each segment is a full-width bar scaled to its share and translated to
  // where the previous ones end: transform-only, so changes glide smoothly.
  let offset = 0;
  const bars = segments.map((segment, index) => {
    const share = limit > 0 ? segment.tokens / limit : 0;
    const start = Math.min(offset, 1);
    offset += share;
    return {
      ...segment,
      color: segment.color ?? `var(--chart-${(index % 5) + 1})`,
      share,
      start,
      width: Math.max(Math.min(share, 1 - start), 0),
    };
  });

  const label = `Context: ${formatTokens(used)} of ${formatTokens(limit)} tokens used (${percent}%)`;

  return (
    <MorphPopover
      open={isOpen}
      onOpenChange={setOpen}
      className={cn("max-w-full", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label}
        data-status={status}
        onClick={() => {
          if (isOpen && hoverOpened.current) {
            hoverOpened.current = false;
            window.clearTimeout(hoverTimer.current);
            return;
          }
          setOpen(!isOpen);
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") scheduleOpen();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") scheduleClose();
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 18 18"
          className="size-4 shrink-0 -rotate-90"
        >
          <circle
            cx="9"
            cy="9"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2.25"
            className="stroke-foreground/12"
          />
          <motion.circle
            cx="9"
            cy="9"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2.25"
            strokeLinecap="round"
            initial={false}
            animate={{
              pathLength: Math.max(ratio, 0.001),
              stroke: STATUS_COLOR[status],
            }}
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE_OUT }}
          />
        </svg>
        <span
          className={cn(
            "font-mono tabular-nums",
            status === "warning" &&
              "text-[color-mix(in_oklab,var(--warning)_60%,var(--foreground))]",
            status === "critical" && "text-destructive",
          )}
        >
          {formatTokens(used)}
          <span className="text-muted-foreground/60"> / {formatTokens(limit)}</span>
        </span>
      </button>

      <MorphPopoverContent
        side={side}
        align={align}
        radius={14}
        className={cn("w-[min(18rem,calc(100vw-2rem))]", contentClassName)}
      >
        <div
          ref={panelRef}
          onPointerEnter={() => {
            if (hoverEnabled) window.clearTimeout(hoverTimer.current);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") scheduleClose();
          }}
          className="p-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{title}</p>
            {status !== "ok" ? (
              <Badge
                size="sm"
                variant={status === "critical" ? "destructive" : "warning"}
                dot={status === "critical" ? "pulse" : true}
              >
                {status === "critical" ? "Almost full" : "Near limit"}
              </Badge>
            ) : (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {percent}%
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums text-foreground">
              {used.toLocaleString("en-US")}
            </span>{" "}
            of {limit.toLocaleString("en-US")} tokens
            {status !== "ok" ? ` · ${percent}%` : ""}
          </p>

          <div
            aria-hidden="true"
            className="relative mt-3 h-2 overflow-hidden rounded-full bg-foreground/10"
          >
            {bars.map((bar, index) => (
              <motion.span
                key={bar.id}
                className="absolute inset-0 origin-left"
                style={{ backgroundColor: bar.color }}
                initial={
                  reduce
                    ? { opacity: 0, x: `${bar.start * 100}%`, scaleX: bar.width }
                    : { opacity: 1, x: `${bar.start * 100}%`, scaleX: 0 }
                }
                animate={{
                  opacity: 1,
                  x: `${bar.start * 100}%`,
                  scaleX: bar.width,
                }}
                transition={
                  reduce
                    ? { duration: 0.15 }
                    : { duration: 0.45, ease: EASE_OUT, delay: 0.08 + index * 0.06 }
                }
              />
            ))}
          </div>

          <ul className="mt-3 space-y-1.5">
            {bars.map((bar) => (
              <li key={bar.id} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: bar.color }}
                />
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {bar.label}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {formatTokens(bar.tokens)}
                </span>
                <span className="w-9 text-right font-mono tabular-nums text-muted-foreground/70">
                  {limit > 0 ? `${((bar.tokens / limit) * 100).toFixed(bar.share < 0.1 ? 1 : 0)}%` : "0%"}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-sm bg-foreground/10"
              />
              <span className="flex-1 text-muted-foreground">Free space</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {formatTokens(free)}
              </span>
              <span className="w-9 text-right font-mono tabular-nums text-muted-foreground/70">
                {100 - percent}%
              </span>
            </li>
          </ul>

          {onCompact ? (
            <div className="mt-3 border-t border-border pt-3">
              {status !== "ok" ? (
                <p className="mb-2.5 text-xs leading-5 text-muted-foreground">
                  Older turns will soon be dropped. Compacting summarizes them to
                  free space.
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant={status === "ok" ? "outline" : "primary"}
                disabled={compacting}
                onClick={compact}
                className="w-full"
              >
                {compacting ? (
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <Minimize2 aria-hidden="true" className="size-3.5" />
                )}
                {compacting ? "Compacting…" : compactLabel}
              </Button>
            </div>
          ) : null}
        </div>
      </MorphPopoverContent>
    </MorphPopover>
  );
}
