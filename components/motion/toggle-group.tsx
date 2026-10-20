"use client";

import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  createContext,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { SPRING_LAYOUT, SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { TOUCH_TARGET_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

// Toggle / ToggleGroup vs SegmentedControl: `SegmentedControl`
// (segmented-control.tsx) is a radiogroup form control that always holds one
// value and ships a data-driven `ToggleGroup` for quick `items` arrays. This
// file is the composable, shadcn-shaped toolbar primitive: a standalone
// `Toggle`, and a `ToggleGroup` you fill with `ToggleGroupItem` children
// (icons, labels, tooltips, anything), with `default`/`outline` variants. In
// single mode one pressed surface glides between items; in multiple mode each
// item pops its own surface in and out.

export type ToggleVariant = "default" | "outline";
export type ToggleSize = "sm" | "md" | "lg";

const sizeClass: Record<ToggleSize, string> = {
  sm: "h-7 min-w-7 gap-1.5 px-2 text-xs [&_svg]:size-3.5",
  md: "h-9 min-w-9 gap-2 px-2.5 text-sm [&_svg]:size-4",
  lg: "h-11 min-w-11 gap-2 px-3.5 text-sm [&_svg]:size-[18px]",
};

const surfaceClass: Record<ToggleVariant, string> = {
  default: "bg-muted ring-1 ring-border-strong",
  outline: "bg-muted",
};

const itemBase =
  "relative isolate inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium outline-none transition-colors duration-200 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

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

type ButtonBaseProps = Omit<HTMLMotionProps<"button">, "children" | "value" | "type">;

/** The pressed surface that pops in and out behind a standalone toggle or a multiple-mode item. */
function PopSurface({ show, variant }: { show: boolean; variant: ToggleVariant }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.span
          key="on"
          aria-hidden
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={
            reduce
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.75, transition: { duration: 0.12 } }
          }
          transition={SPRING_SWAP}
          className={cn("absolute inset-0 -z-10 rounded-[inherit]", surfaceClass[variant])}
        />
      ) : null}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------------ */
/* Toggle                                                                    */
/* ------------------------------------------------------------------------ */

export interface ToggleProps extends ButtonBaseProps {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  variant?: ToggleVariant;
  size?: ToggleSize;
  children?: ReactNode;
}

/** A two-state button (`aria-pressed`) whose pressed surface springs in and out. */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  {
    pressed,
    defaultPressed = false,
    onPressedChange,
    variant = "default",
    size = "md",
    disabled,
    className,
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const reduce = useReducedMotion();
  const [on, setOn] = useControllable(pressed, defaultPressed, onPressedChange);
  return (
    <motion.button
      ref={ref}
      type="button"
      aria-pressed={on}
      data-state={on ? "on" : "off"}
      disabled={disabled}
      whileTap={reduce || disabled ? undefined : { scale: 0.9 }}
      transition={SPRING_PRESS}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOn(!on);
      }}
      className={cn(
        itemBase,
        TOUCH_TARGET_CLASS,
        "rounded-lg focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        sizeClass[size],
        variant === "outline" && "border border-border",
        on
          ? "text-foreground"
          : "text-muted-foreground enabled:hover:bg-muted/60 enabled:hover:text-foreground",
        className,
      )}
      {...rest}
    >
      <PopSurface show={on} variant={variant} />
      {children}
    </motion.button>
  );
});

/* ------------------------------------------------------------------------ */
/* ToggleGroup                                                               */
/* ------------------------------------------------------------------------ */

interface ToggleGroupContextValue {
  type: "single" | "multiple";
  pressed: string[];
  toggle: (value: string) => void;
  variant: ToggleVariant;
  size: ToggleSize;
  disabled: boolean;
  layoutId: string;
  tabStop: string | null;
  setTabStop: (value: string) => void;
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

type ToggleGroupBase = Omit<
  HTMLMotionProps<"div">,
  "children" | "defaultValue" | "onChange" | "dir"
> & {
  variant?: ToggleVariant;
  size?: ToggleSize;
  disabled?: boolean;
  /** Arrow-key axis for roving focus. Default "horizontal" (both axes still work). */
  orientation?: "horizontal" | "vertical";
  children?: ReactNode;
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

const ITEM_SELECTOR = "[data-toggle-group-item]";

function enabledItems(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR)).filter(
    (el) => !el.disabled && el.closest("[data-toggle-group]") === root,
  );
}

/**
 * Toolbar-style group of `ToggleGroupItem`s. `type="single"` behaves like a
 * set of mutually exclusive toggles (deselectable unless `required`) whose
 * pressed surface glides between items; `type="multiple"` presses any subset.
 * One tab stop, arrow keys / Home / End rove between items, Space/Enter press.
 */
export function ToggleGroup(props: ToggleGroupProps) {
  const {
    type,
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    variant = "default",
    size = "md",
    disabled = false,
    orientation = "horizontal",
    className,
    children,
    onKeyDown,
    ...rest
  } = props;
  // `required` only exists on the single variant; keep it off the DOM.
  const { required: _required, ...domProps } = rest as typeof rest & { required?: boolean };
  const single = props.type === "single";
  const required = props.type === "single" && Boolean(props.required);

  const [pressed, setPressed] = useControllable<string[]>(
    props.value === undefined
      ? undefined
      : props.type === "single"
        ? props.value
          ? [props.value]
          : []
        : props.value,
    props.type === "single"
      ? props.defaultValue
        ? [props.defaultValue]
        : []
      : (props.defaultValue ?? []),
    (next) => {
      if (props.type === "single") props.onValueChange?.(next[0] ?? "");
      else props.onValueChange?.(next);
    },
  );

  const layoutId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [tabStop, setTabStop] = useState<string | null>(pressed[0] ?? null);

  // Keep exactly one reachable tab stop: if the remembered item vanished or
  // got disabled, fall back to the first pressed item, then the first enabled.
  useEffect(() => {
    const items = enabledItems(rootRef.current);
    if (items.some((el) => el.dataset.value === tabStop)) return;
    const fallback =
      items.find((el) => pressed.includes(el.dataset.value ?? "")) ?? items[0];
    const next = fallback?.dataset.value ?? null;
    if (next !== tabStop) setTabStop(next);
  });

  const toggle = (itemValue: string) => {
    const isOn = pressed.includes(itemValue);
    if (single) {
      if (isOn && required) return;
      setPressed(isOn ? [] : [itemValue]);
    } else {
      setPressed(isOn ? pressed.filter((v) => v !== itemValue) : [...pressed, itemValue]);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const items = enabledItems(rootRef.current);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const forward = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    const backward = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    let next: number;
    if (event.key === forward || event.key === "ArrowDown" || event.key === "ArrowRight")
      next = (index + 1) % items.length;
    else if (event.key === backward || event.key === "ArrowUp" || event.key === "ArrowLeft")
      next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    // Focus moves; pressing stays on Space/Enter — these are toggles, not radios.
    items[next].focus();
  };

  return (
    <ToggleGroupContext.Provider
      value={{
        type,
        pressed,
        toggle,
        variant,
        size,
        disabled,
        layoutId,
        tabStop,
        setTabStop,
      }}
    >
      {/* layoutRoot keeps the gliding surface's projection local to the group,
          so scrolled or transformed ancestors never skew the glide. */}
      <motion.div
        ref={rootRef}
        layoutRoot
        role="group"
        data-toggle-group=""
        data-orientation={orientation}
        aria-disabled={disabled || undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex w-fit items-center",
          orientation === "vertical" && "flex-col items-stretch",
          variant === "default"
            ? "gap-0.5 rounded-xl border border-border bg-card p-1"
            : "rounded-lg",
          disabled && "opacity-60",
          className,
        )}
        {...domProps}
      >
        {children}
      </motion.div>
    </ToggleGroupContext.Provider>
  );
}

export interface ToggleGroupItemProps extends ButtonBaseProps {
  value: string;
  children?: ReactNode;
}

export const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  function ToggleGroupItem(
    { value, disabled: itemDisabled, className, children, onClick, onFocus, ...rest },
    ref,
  ) {
    const ctx = useContext(ToggleGroupContext);
    if (!ctx) throw new Error("ToggleGroupItem must be used inside <ToggleGroup>.");
    const reduce = useReducedMotion();
    const disabled = ctx.disabled || Boolean(itemDisabled);
    const on = ctx.pressed.includes(value);
    const outline = ctx.variant === "outline";

    return (
      <motion.button
        ref={ref}
        type="button"
        data-toggle-group-item=""
        data-value={value}
        data-state={on ? "on" : "off"}
        aria-pressed={on}
        disabled={disabled}
        tabIndex={ctx.tabStop === value ? 0 : -1}
        whileTap={reduce || disabled ? undefined : { scale: 0.88 }}
        transition={SPRING_PRESS}
        onFocus={(event) => {
          ctx.setTabStop(value);
          onFocus?.(event);
        }}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          ctx.setTabStop(value);
          ctx.toggle(value);
        }}
        className={cn(
          itemBase,
          TOUCH_TARGET_CLASS,
          sizeClass[ctx.size],
          outline
            ? // Joined segments: neighbours overlap their shared border.
              "rounded-none border border-border bg-card -ml-px first:ml-0 first:rounded-l-lg last:rounded-r-lg in-data-[orientation=vertical]:-mt-px in-data-[orientation=vertical]:ml-0 in-data-[orientation=vertical]:first:mt-0 in-data-[orientation=vertical]:first:rounded-l-none in-data-[orientation=vertical]:first:rounded-t-lg in-data-[orientation=vertical]:last:rounded-r-none in-data-[orientation=vertical]:last:rounded-b-lg"
            : "rounded-lg focus-visible:ring-offset-1 focus-visible:ring-offset-card",
          on
            ? "text-foreground"
            : "text-muted-foreground enabled:hover:bg-muted/60 enabled:hover:text-foreground",
          className,
        )}
        {...rest}
      >
        {ctx.type === "single" ? (
          on ? (
            <motion.span
              layoutId={ctx.layoutId}
              aria-hidden
              transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
              className={cn(
                "absolute inset-0 -z-10 rounded-[inherit]",
                surfaceClass[ctx.variant],
              )}
            />
          ) : null
        ) : (
          <PopSurface show={on} variant={ctx.variant} />
        )}
        {children}
      </motion.button>
    );
  },
);
