"use client";

import { Star } from "lucide-react";
import { animate, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { SPRING_PRESS } from "@/lib/ease";
import { isHoveringPointer } from "@/lib/touch";
import { cn } from "@/lib/utils";

export interface RatingProps {
  /** Controlled rating. 0 means unrated. */
  value?: number;
  /** Uncontrolled initial rating. Default 0. */
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** Number of icons. Default 5. */
  max?: number;
  /** 1 for whole icons, 0.5 for halves (picked by pointer x within the icon). */
  precision?: 1 | 0.5;
  /** Display only: no hover, click or keyboard. */
  readOnly?: boolean;
  disabled?: boolean;
  /** Clicking the current value clears it to 0. Default true. */
  clearable?: boolean;
  /** Custom icon, rendered for both the empty and filled layer. Defaults to a star. */
  icon?: ReactNode;
  /** Icon box size in px. Default 24. */
  size?: number;
  /** Accessible name for the group. Default "Rating". */
  "aria-label"?: string;
  /** Builds each option's accessible label. */
  getLabel?: (value: number, max: number) => string;
  className?: string;
  /** Classes for the filled layer — set the fill color here. */
  filledClassName?: string;
  /** Classes for the empty layer. */
  emptyClassName?: string;
}

const defaultLabel = (value: number, max: number) =>
  `${value} ${value === 1 ? "star" : "stars"} out of ${max}`;

const round = (n: number, precision: number) =>
  Math.round(n / precision) * precision;

export function Rating({
  value: valueProp,
  defaultValue = 0,
  onChange,
  max = 5,
  precision = 1,
  readOnly = false,
  disabled = false,
  clearable = true,
  icon,
  size = 24,
  "aria-label": ariaLabel = "Rating",
  getLabel = defaultLabel,
  className,
  filledClassName,
  emptyClassName,
}: RatingProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const value = Math.min(
    max,
    Math.max(0, round(controlled ? valueProp : internal, precision)),
  );
  const [hover, setHover] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  // Bounce runs on an inner span so it never fights the button's whileTap.
  const glyphRefs = useRef<(HTMLElement | null)[]>([]);

  const interactive = !readOnly && !disabled;
  const shown = interactive && hover !== null ? hover : value;

  const iconNode = icon ?? (
    <Star className="size-full" fill="currentColor" strokeWidth={0} />
  );

  // A short pop across every icon up to the picked one, staggered outward.
  const bounce = (upTo: number) => {
    if (reduce) return;
    const last = Math.ceil(upTo);
    for (let i = 0; i < last; i++) {
      const el = glyphRefs.current[i];
      if (!el) continue;
      animate(
        el,
        { scale: [i === last - 1 ? 1.3 : 1.12, 1] },
        { ...SPRING_PRESS, delay: i * 0.025 },
      );
    }
  };

  const commit = (next: number, focus = false) => {
    const clean = Math.min(max, Math.max(0, round(next, precision)));
    if (!controlled) setInternal(clean);
    onChange?.(clean);
    if (clean > 0) bounce(clean);
    if (focus) {
      itemRefs.current[Math.max(Math.ceil(clean) - 1, 0)]?.focus();
    }
  };

  const valueAt = (index: number, clientX: number, rect: DOMRect | null) => {
    if (precision === 0.5 && rect && clientX - rect.left < rect.width / 2) {
      return index + 0.5;
    }
    return index + 1;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const floor = clearable ? 0 : precision;
    const map: Record<string, number> = {
      ArrowRight: value + precision,
      ArrowUp: value + precision,
      ArrowLeft: value - precision,
      ArrowDown: value - precision,
      Home: precision,
      End: max,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = Math.min(max, Math.max(floor, map[e.key]));
    if (next !== value) commit(next, true);
  };

  if (readOnly) {
    return (
      <div
        role="img"
        aria-label={`${ariaLabel}: ${getLabel(value, max)}`}
        className={cn("inline-flex items-center gap-1", className)}
      >
        {Array.from({ length: max }, (_, i) => (
          <Glyph
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length row, never reordered.
            key={`${uid}-${i}`}
            fill={Math.min(1, Math.max(0, value - i))}
            size={size}
            icon={iconNode}
            filledClassName={filledClassName}
            emptyClassName={emptyClassName}
          />
        ))}
      </div>
    );
  }

  // Roving tabindex: the checked icon (or the first, when unrated) is the stop.
  const checkedIndex = value > 0 ? Math.ceil(value) - 1 : -1;
  const tabStop = checkedIndex >= 0 ? checkedIndex : 0;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onPointerLeave={() => setHover(null)}
      className={cn(
        "inline-flex items-center gap-1",
        disabled && "opacity-50",
        className,
      )}
    >
      {Array.from({ length: max }, (_, i) => {
        const checked = i === checkedIndex;
        // The checked radio speaks the exact value (halves included).
        const optionValue = checked ? value : i + 1;
        return (
          <motion.button
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length row, never reordered.
            key={`${uid}-${i}`}
            ref={(node) => {
              itemRefs.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={getLabel(optionValue, max)}
            tabIndex={tabStop === i ? 0 : -1}
            disabled={disabled}
            whileTap={reduce ? undefined : { scale: 0.85 }}
            transition={SPRING_PRESS}
            onPointerMove={(e: PointerEvent<HTMLButtonElement>) => {
              if (!isHoveringPointer(e)) return;
              setHover(
                valueAt(i, e.clientX, e.currentTarget.getBoundingClientRect()),
              );
            }}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              // Keyboard activation (detail 0) picks the whole icon.
              const next =
                e.detail === 0
                  ? i + 1
                  : valueAt(i, e.clientX, e.currentTarget.getBoundingClientRect());
              setHover(null);
              if (clearable && next === value) {
                commit(0);
                return;
              }
              commit(next);
            }}
            onKeyDown={onKeyDown}
            className="relative cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
          >
            <span
              ref={(node) => {
                glyphRefs.current[i] = node;
              }}
              className="block"
            >
              <Glyph
                fill={Math.min(1, Math.max(0, shown - i))}
                size={size}
                icon={iconNode}
                preview={hover !== null}
                filledClassName={filledClassName}
                emptyClassName={emptyClassName}
              />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function Glyph({
  fill,
  size,
  icon,
  preview = false,
  filledClassName,
  emptyClassName,
}: {
  fill: number;
  size: number;
  icon: ReactNode;
  preview?: boolean;
  filledClassName?: string;
  emptyClassName?: string;
}) {
  return (
    <span
      aria-hidden
      className="relative block"
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          "absolute inset-0 block text-muted-foreground/30",
          emptyClassName,
        )}
      >
        {icon}
      </span>
      {/* The filled layer is clipped to the fill fraction; its width only
          ever switches between 0, half and full, it is never animated. */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 block overflow-hidden text-amber-400 transition-opacity duration-150",
          preview && "opacity-70",
          filledClassName,
        )}
        style={{ width: `${fill * 100}%` }}
      >
        <span className="block" style={{ width: size, height: size }}>
          {icon}
        </span>
      </span>
    </span>
  );
}
