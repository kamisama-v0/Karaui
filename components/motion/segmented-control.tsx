"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { SPRING_LAYOUT, SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

// SegmentedControl vs Tabs: `Tabs` (tabs.tsx, variants pill/segment/underline)
// switches *panels* with tablist/tab semantics. `SegmentedControl` is a form
// control: it picks one *value* with radiogroup/radio semantics, can post that
// value with a form via `name`, supports disabled options, icon-only options
// and a full-width layout, and its thumb is a raised card surface rather than
// a filled accent pill. Reach for Tabs when each option owns content below it.

export type SegmentedControlSize = "sm" | "md" | "lg";

export interface SegmentedControlOption {
  value: string;
  label?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  /** Required when the option has only an icon. */
  "aria-label"?: string;
}

const trackSize: Record<SegmentedControlSize, string> = {
  sm: "h-8 p-0.5 text-xs",
  md: "h-10 p-1 text-sm",
  lg: "h-12 p-1 text-sm",
};

const itemSize: Record<SegmentedControlSize, string> = {
  sm: "gap-1.5 px-2.5 [&_svg]:size-3.5",
  md: "gap-2 px-3.5 [&_svg]:size-4",
  lg: "gap-2 px-5 [&_svg]:size-[18px]",
};

function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange: ((next: T) => void) | undefined,
) {
  const [internal, setInternal] = useState<T>(defaultValue);
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

/** Index of the next enabled option from `from` in `dir`, wrapping around. */
function nextEnabled(options: { disabled?: boolean }[], from: number, dir: 1 | -1) {
  const n = options.length;
  for (let step = 1; step <= n; step++) {
    const i = (((from + dir * step) % n) + n) % n;
    if (!options[i].disabled) return i;
  }
  return from;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: SegmentedControlSize;
  /** Stretch to the container width with equal-width segments. */
  fullWidth?: boolean;
  disabled?: boolean;
  /** When set, a hidden input posts the value with the surrounding form. */
  name?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  thumbClassName?: string;
}

export function SegmentedControl({
  options,
  value,
  defaultValue,
  onValueChange,
  size = "md",
  fullWidth = false,
  disabled = false,
  name,
  className,
  thumbClassName,
  ...aria
}: SegmentedControlProps) {
  const [current, setValue] = useControllable(
    value,
    defaultValue ?? options.find((o) => !o.disabled)?.value ?? "",
    onValueChange,
  );
  const reduce = useReducedMotion();
  const layoutId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const items = options.map((o) => ({ ...o, disabled: disabled || o.disabled }));
  const selectedIndex = items.findIndex((o) => o.value === current);
  // Roving tab stop: the checked radio, or the first enabled one when none is.
  const tabStop = selectedIndex >= 0 && !items[selectedIndex].disabled
    ? selectedIndex
    : items.findIndex((o) => !o.disabled);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = nextEnabled(items, index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = nextEnabled(items, index, -1);
        break;
      case "Home":
        next = nextEnabled(items, -1, 1);
        break;
      case "End":
        next = nextEnabled(items, items.length, -1);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next === null || items[next].disabled) return;
    // Selection follows focus, as the WAI-ARIA radio group pattern prescribes.
    refs.current[next]?.focus();
    if (items[next].value !== current) setValue(items[next].value);
  };

  return (
    // layoutRoot keeps the thumb's shared-layout projection local, so scrolled
    // or fixed ancestors never leak offsets into its glide.
    <motion.div
      layoutRoot
      role="radiogroup"
      aria-disabled={disabled || undefined}
      {...aria}
      className={cn(
        "relative isolate items-stretch rounded-xl border border-border bg-muted",
        fullWidth ? "flex w-full" : "inline-flex",
        trackSize[size],
        disabled && "opacity-60",
        className,
      )}
    >
      {name ? <input type="hidden" name={name} value={current} /> : null}
      {items.map((option, index) => {
        const checked = option.value === current;
        const iconOnly = !option.label;
        return (
          <motion.button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option["aria-label"]}
            disabled={option.disabled}
            tabIndex={index === tabStop ? 0 : -1}
            data-state={checked ? "checked" : "unchecked"}
            onClick={() => !checked && setValue(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            whileTap={reduce || option.disabled ? undefined : { scale: 0.96 }}
            transition={SPRING_PRESS}
            className={cn(
              "relative inline-flex min-w-0 select-none items-center justify-center whitespace-nowrap rounded-[9px] font-medium outline-none transition-colors duration-200",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-muted",
              "disabled:cursor-not-allowed disabled:opacity-50",
              fullWidth && "flex-1",
              itemSize[size],
              iconOnly && "aspect-square px-0",
              checked
                ? "text-foreground"
                : "text-muted-foreground enabled:hover:text-foreground",
            )}
          >
            {checked ? (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                className={cn(
                  "absolute inset-0 -z-10 rounded-[9px] border border-border bg-card shadow-sm",
                  thumbClassName,
                )}
              />
            ) : null}
            {option.icon ? (
              <span aria-hidden className="inline-flex shrink-0">
                {option.icon}
              </span>
            ) : null}
            {option.label ? <span className="truncate">{option.label}</span> : null}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

/* ------------------------------------------------------------------------ */
/* ToggleGroup                                                               */
/* ------------------------------------------------------------------------ */

export interface ToggleGroupItem {
  value: string;
  label?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  /** Required when the item has only an icon. */
  "aria-label"?: string;
}

type ToggleGroupBase = {
  items: ToggleGroupItem[];
  size?: SegmentedControlSize;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
};

export type ToggleGroupSingleProps = ToggleGroupBase & {
  type: "single";
  /** The pressed item, or `""` when none is pressed. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Disallow un-pressing the active item, so one is always pressed. */
  required?: boolean;
};

export type ToggleGroupMultipleProps = ToggleGroupBase & {
  type: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

const toggleSize: Record<SegmentedControlSize, string> = {
  sm: "h-7 min-w-7 gap-1.5 px-2 text-xs [&_svg]:size-3.5",
  md: "h-9 min-w-9 gap-2 px-2.5 text-sm [&_svg]:size-4",
  lg: "h-11 min-w-11 gap-2 px-3.5 text-sm [&_svg]:size-[18px]",
};

export function ToggleGroup(props: ToggleGroupProps) {
  const { items, size = "md", disabled = false, className } = props;
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  // Normalise both modes to a string[] internally.
  const single = props.type === "single";
  const [current, setCurrent] = useControllable<string[]>(
    props.value === undefined ? undefined : single ? (props.value ? [props.value as string] : []) : (props.value as string[]),
    single
      ? props.defaultValue
        ? [props.defaultValue as string]
        : []
      : ((props.defaultValue as string[] | undefined) ?? []),
    (next) => {
      if (props.type === "single") props.onValueChange?.(next[0] ?? "");
      else props.onValueChange?.(next);
    },
  );

  const list = items.map((i) => ({ ...i, disabled: disabled || i.disabled }));
  const firstEnabled = list.findIndex((i) => !i.disabled);
  const tabStop =
    focusIndex !== null && !list[focusIndex]?.disabled ? focusIndex : firstEnabled;

  const toggle = (itemValue: string) => {
    const pressed = current.includes(itemValue);
    if (props.type === "single") {
      if (pressed && props.required) return;
      setCurrent(pressed ? [] : [itemValue]);
    } else {
      setCurrent(pressed ? current.filter((v) => v !== itemValue) : [...current, itemValue]);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = nextEnabled(list, index, 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = nextEnabled(list, index, -1);
    else if (event.key === "Home") next = nextEnabled(list, -1, 1);
    else if (event.key === "End") next = nextEnabled(list, list.length, -1);
    if (next === null) return;
    event.preventDefault();
    // Focus moves; pressing stays on Space/Enter (toggle buttons, not radios).
    setFocusIndex(next);
    refs.current[next]?.focus();
  };

  return (
    <motion.div
      role="group"
      aria-label={props["aria-label"]}
      aria-labelledby={props["aria-labelledby"]}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-border bg-card p-1",
        disabled && "opacity-60",
        className,
      )}
    >
      {list.map((item, index) => {
        const pressed = current.includes(item.value);
        return (
          <motion.button
            key={item.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            aria-pressed={pressed}
            aria-label={item["aria-label"]}
            disabled={item.disabled}
            tabIndex={index === tabStop ? 0 : -1}
            data-state={pressed ? "on" : "off"}
            onClick={() => {
              setFocusIndex(index);
              toggle(item.value);
            }}
            onFocus={() => setFocusIndex(index)}
            onKeyDown={(e) => onKeyDown(e, index)}
            whileTap={reduce || item.disabled ? undefined : { scale: 0.88 }}
            transition={SPRING_PRESS}
            className={cn(
              "relative isolate inline-flex select-none items-center justify-center rounded-lg font-medium outline-none transition-colors duration-200",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
              "disabled:cursor-not-allowed disabled:opacity-50",
              toggleSize[size],
              pressed
                ? "text-foreground"
                : "text-muted-foreground enabled:hover:bg-muted/60 enabled:hover:text-foreground",
            )}
          >
            <AnimatePresence initial={false}>
              {pressed ? (
                <motion.span
                  key="on"
                  aria-hidden
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.75, transition: { duration: 0.12 } }}
                  transition={SPRING_SWAP}
                  className="absolute inset-0 -z-10 rounded-lg bg-muted ring-1 ring-border-strong"
                />
              ) : null}
            </AnimatePresence>
            {item.icon ? (
              <span aria-hidden className="inline-flex shrink-0">
                {item.icon}
              </span>
            ) : null}
            {item.label ? <span>{item.label}</span> : null}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
