"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/components/motion/popover-morph";
import { Tooltip } from "@/components/motion/tooltip";
import { EASE_OUT, SPRING_LAYOUT, SPRING_MOUSE } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export type AvatarStatus = "online" | "away" | "busy" | "offline";

export interface AvatarGroupItem {
  id: string;
  name: string;
  /** Image URL. Falls back to initials on a colored disc. */
  src?: string;
  /** Background for the initials fallback (any CSS color). */
  color?: string;
  status?: AvatarStatus;
  /** Shows a pulsing ring around the avatar. */
  typing?: boolean;
}

export type AvatarGroupSize = "sm" | "md" | "lg";

export interface AvatarGroupProps {
  items: AvatarGroupItem[];
  /** Avatars shown before the rest collapse into a "+N" chip. Default 4. */
  max?: number;
  size?: AvatarGroupSize;
  /** Makes avatars buttons; also used for rows in the overflow list. */
  onSelect?: (item: AvatarGroupItem) => void;
  /** Accessible label for the group. Default "Collaborators". */
  label?: string;
  className?: string;
  /** Ring color separating overlapped avatars; match the surface behind. */
  ringClassName?: string;
}

const SIZES: Record<
  AvatarGroupSize,
  { box: number; overlap: number; fan: number; text: string; dot: number }
> = {
  sm: { box: 28, overlap: 6, fan: 6, text: "text-[10px]", dot: 8 },
  md: { box: 36, overlap: 8, fan: 8, text: "text-xs", dot: 10 },
  lg: { box: 44, overlap: 10, fan: 10, text: "text-sm", dot: 12 },
};

const STATUS_CLASS: Record<AvatarStatus, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-400",
  busy: "bg-rose-500",
  offline: "bg-muted-foreground/60",
};

const STATUS_LABEL: Record<AvatarStatus, string> = {
  online: "online",
  away: "away",
  busy: "busy",
  offline: "offline",
};

const CHART_VARS = [1, 2, 3, 4, 5].map((n) => `var(--chart-${n})`);

/** Deterministic fallback color from the name, so SSR and client agree. */
function colorFor(item: AvatarGroupItem) {
  if (item.color) return item.color;
  let hash = 0;
  for (const ch of item.name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return CHART_VARS[Math.abs(hash) % CHART_VARS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function describe(item: AvatarGroupItem) {
  const bits = [item.name];
  if (item.status) bits.push(STATUS_LABEL[item.status]);
  if (item.typing) bits.push("typing");
  return bits.join(", ");
}

/**
 * Overlapping avatar stack that fans apart on hover or keyboard focus.
 * Each avatar carries a name tooltip, an optional presence dot and an
 * "is typing" pulse; avatars past `max` collapse into a "+N" chip that opens
 * the full list in a popover.
 */
export function AvatarGroup({
  items,
  max = 4,
  size = "md",
  onSelect,
  label = "Collaborators",
  className,
  ringClassName = "ring-background",
}: AvatarGroupProps) {
  const reduce = useReducedMotion() ?? false;
  const canHover = useHoverCapable();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const s = SIZES[size];

  const shown = items.slice(0, max);
  const hidden = items.slice(max);
  const expanded = (hovered || focused || listOpen) && !reduce;

  return (
    // Hover/focus only drive the decorative fan-out; every control inside is a
    // real button.
    <fieldset
      className={cn("m-0 inline-flex min-w-0 items-center border-0 p-0", className)}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && canHover) setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      <legend className="sr-only">{label}</legend>
      {shown.map((item, i) => (
        <motion.div
          key={item.id}
          className="relative"
          style={{ marginLeft: i === 0 ? 0 : -s.overlap, zIndex: shown.length - i }}
          initial={false}
          animate={{ x: expanded ? i * s.fan : 0 }}
          transition={SPRING_LAYOUT}
        >
          <Tooltip content={item.name} side="top">
            <Avatar
              item={item}
              size={size}
              ringClassName={ringClassName}
              onSelect={onSelect}
              reduce={reduce}
              lift={canHover && !reduce}
            />
          </Tooltip>
        </motion.div>
      ))}
      {hidden.length > 0 ? (
        <motion.div
          className="relative"
          style={{ marginLeft: -s.overlap, zIndex: 0 }}
          initial={false}
          animate={{ x: expanded ? shown.length * s.fan : 0 }}
          transition={SPRING_LAYOUT}
        >
          <MorphPopover open={listOpen} onOpenChange={setListOpen}>
            <MorphPopoverTrigger>
              <button
                type="button"
                aria-label={`Show ${hidden.length} more`}
                className={cn(
                  "grid place-items-center rounded-full bg-muted font-semibold text-foreground ring-2 outline-none transition-colors hover:bg-muted/80 focus-visible:ring-primary",
                  ringClassName,
                  s.text,
                )}
                style={{ width: s.box, height: s.box }}
              >
                +{hidden.length}
              </button>
            </MorphPopoverTrigger>
            <MorphPopoverContent align="start" className="w-56 p-1.5">
              <ul
                aria-label={`All ${items.length} ${label.toLowerCase()}`}
                className="max-h-64 overflow-y-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
              >
                {items.map((item) => {
                  const row = (
                    <>
                      <Avatar
                        item={item}
                        size="sm"
                        ringClassName="ring-background"
                        reduce={reduce}
                        decorative
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {item.name}
                      </span>
                      {item.typing ? (
                        <span className="text-xs text-muted-foreground">
                          typing…
                        </span>
                      ) : item.status ? (
                        <span className="text-xs capitalize text-muted-foreground">
                          {STATUS_LABEL[item.status]}
                        </span>
                      ) : null}
                    </>
                  );
                  return (
                    <li key={item.id}>
                      {onSelect ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(item);
                            setListOpen(false);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                        >
                          {row}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                          {row}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </MorphPopoverContent>
          </MorphPopover>
        </motion.div>
      ) : null}
    </fieldset>
  );
}

// Typing pulse: a slow breathe so it reads as "activity" rather than an alert.
const TYPING_PULSE = {
  duration: 1.4,
  repeat: Number.POSITIVE_INFINITY,
  ease: EASE_OUT,
} as const;

function Avatar({
  item,
  size,
  ringClassName,
  onSelect,
  reduce,
  lift = false,
  decorative = false,
}: {
  item: AvatarGroupItem;
  size: AvatarGroupSize;
  ringClassName: string;
  onSelect?: (item: AvatarGroupItem) => void;
  reduce: boolean;
  lift?: boolean;
  decorative?: boolean;
}) {
  const s = SIZES[size];
  const color = colorFor(item);
  const face = (
    <>
      {item.typing ? (
        reduce ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-1 rounded-full border-2 border-primary/50"
          />
        ) : (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-1 rounded-full border-2 border-primary"
            initial={{ opacity: 0.7, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1.25 }}
            transition={TYPING_PULSE}
          />
        )
      ) : null}
      <span
        className={cn(
          "relative grid size-full place-items-center overflow-hidden rounded-full font-semibold text-white ring-2",
          ringClassName,
          s.text,
        )}
        style={{ background: item.src ? undefined : color }}
      >
        {item.src ? (
          // biome-ignore lint/performance/noImgElement: library component, no framework image loader assumed.
          <img src={item.src} alt="" className="size-full object-cover" draggable={false} />
        ) : (
          initials(item.name)
        )}
      </span>
      {item.status ? (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2",
            ringClassName,
            STATUS_CLASS[item.status],
          )}
          style={{ width: s.dot, height: s.dot }}
        />
      ) : null}
    </>
  );

  const box = { width: s.box, height: s.box };
  const hover = lift ? { y: -3 } : undefined;

  if (decorative) {
    return (
      <span aria-hidden className="relative inline-block shrink-0" style={box}>
        {face}
      </span>
    );
  }

  if (onSelect) {
    return (
      <motion.button
        type="button"
        aria-label={describe(item)}
        onClick={() => onSelect(item)}
        whileHover={hover}
        transition={SPRING_LAYOUT}
        className="relative block shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={box}
      >
        {face}
      </motion.button>
    );
  }

  return (
    <motion.span
      role="img"
      aria-label={describe(item)}
      whileHover={hover}
      transition={SPRING_LAYOUT}
      className="relative block shrink-0"
      style={box}
    >
      {face}
    </motion.span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Live cursors                                */
/* -------------------------------------------------------------------------- */

export interface LiveCursor {
  id: string;
  name: string;
  /** Any CSS color. */
  color: string;
  /** Horizontal position, percent of the container width (0–100). */
  x: number;
  /** Vertical position, percent of the container height (0–100). */
  y: number;
}

export interface LiveCursorsProps {
  cursors: LiveCursor[];
  className?: string;
}

/**
 * Collaboration cursors layered over a `relative` container. Positions arrive
 * as container-relative percentages (e.g. from a presence channel) and each
 * cursor springs toward its latest point, smoothing out sparse updates.
 */
export function LiveCursors({ cursors, className }: LiveCursorsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {size.width > 0
        ? cursors.map((cursor) => (
            <CursorMark
              key={cursor.id}
              cursor={cursor}
              width={size.width}
              height={size.height}
            />
          ))
        : null}
    </div>
  );
}

function CursorMark({
  cursor,
  width,
  height,
}: {
  cursor: LiveCursor;
  width: number;
  height: number;
}) {
  const reduce = useReducedMotion() ?? false;
  const toPx = useCallback(
    (pct: number, extent: number) => (Math.min(Math.max(pct, 0), 100) / 100) * extent,
    [],
  );
  const targetX = useMotionValue(toPx(cursor.x, width));
  const targetY = useMotionValue(toPx(cursor.y, height));
  const springX = useSpring(targetX, SPRING_MOUSE);
  const springY = useSpring(targetY, SPRING_MOUSE);

  useEffect(() => {
    targetX.set(toPx(cursor.x, width));
    targetY.set(toPx(cursor.y, height));
  }, [cursor.x, cursor.y, width, height, targetX, targetY, toPx]);

  return (
    <motion.div
      className="absolute left-0 top-0"
      style={{ x: reduce ? targetX : springX, y: reduce ? targetY : springY }}
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        className="block drop-shadow-sm"
      >
        <path
          d="M2 1.5 L15.5 8.2 L9.4 9.6 L6.6 15.5 Z"
          fill={cursor.color}
          stroke="white"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="ml-3 -mt-0.5 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow-sm"
        style={{ background: cursor.color }}
      >
        {cursor.name}
      </span>
    </motion.div>
  );
}
