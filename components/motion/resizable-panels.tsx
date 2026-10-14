"use client";

import {
  animate,
  type MotionValue,
  motion,
  motionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  Children,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { SPRING_LAYOUT } from "@/lib/ease";
import { capturePointer, releasePointer, TOUCH_GESTURE_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

export type ResizableDirection = "horizontal" | "vertical";

export interface ResizablePanelProps {
  /** Initial size in percent. Panels without one share what is left. */
  defaultSize?: number;
  /** Minimum size in percent while expanded. */
  minSize?: number;
  /** Maximum size in percent. */
  maxSize?: number;
  /** Snap shut when dragged below `collapseThreshold`. */
  collapsible?: boolean;
  /** Size in percent the panel rests at when collapsed. */
  collapsedSize?: number;
  /** Drag below this size (percent) to collapse. Defaults to half of `minSize`. */
  collapseThreshold?: number;
  /** Accessible name for the handle that resizes this panel (the handle after it). */
  handleLabel?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Declarative panel. `ResizablePanels` reads these props and renders the
 * panel itself, so this component only renders when used on its own.
 */
export function ResizablePanel({ className, children }: ResizablePanelProps) {
  return <div className={cn("min-h-0 min-w-0", className)}>{children}</div>;
}

export interface ResizablePanelsProps {
  direction?: ResizableDirection;
  /** Sizes in percent (controlled), one per panel, summing to 100. */
  sizes?: number[];
  /** Overrides each panel's `defaultSize`. */
  defaultSizes?: number[];
  onSizesChange?: (sizes: number[]) => void;
  /** Show a grip pill on each handle. */
  withHandle?: boolean;
  className?: string;
  /** `ResizablePanel` elements. Handles are inserted between them. */
  children: ReactNode;
}

type PanelConfig = Required<
  Pick<
    ResizablePanelProps,
    "minSize" | "maxSize" | "collapsible" | "collapsedSize" | "collapseThreshold"
  >
> & {
  defaultSize?: number;
  handleLabel?: string;
  className?: string;
  children?: ReactNode;
};

const KEY_STEP = 2;
const KEY_STEP_LARGE = 10;
const EPSILON = 0.01;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 100) / 100;

function resolveDefaults(configs: PanelConfig[], override?: number[]) {
  if (override && override.length === configs.length) return override;
  const fixed = configs.reduce((sum, c) => sum + (c.defaultSize ?? 0), 0);
  const free = configs.filter((c) => c.defaultSize === undefined).length;
  const share = free ? Math.max(0, 100 - fixed) / free : 0;
  return configs.map((c) => c.defaultSize ?? share);
}

function PanelFrame({
  id,
  size,
  config,
  collapsed,
}: {
  id: string;
  size: MotionValue<number>;
  config: PanelConfig;
  collapsed: boolean;
}) {
  // Flex-grow proportional to the percentage: handles keep their pixel width
  // and the panels split exactly what is left.
  const flex = useTransform(size, (v) => `${Math.max(v, 0)} 1 0px`);
  return (
    <motion.div
      id={id}
      data-collapsed={collapsed || undefined}
      inert={collapsed}
      style={{ flex }}
      className={cn("relative min-h-0 min-w-0 overflow-hidden", config.className)}
    >
      {config.children}
    </motion.div>
  );
}

export function ResizablePanels({
  direction = "horizontal",
  sizes: sizesProp,
  defaultSizes,
  onSizesChange,
  withHandle = true,
  className,
  children,
}: ResizablePanelsProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const horizontal = direction === "horizontal";

  const configs = useMemo<PanelConfig[]>(
    () =>
      Children.toArray(children)
        .filter((child): child is ReactElement<ResizablePanelProps> =>
          isValidElement(child),
        )
        .map(({ props }) => {
          const minSize = props.minSize ?? 10;
          return {
            defaultSize: props.defaultSize,
            minSize,
            maxSize: props.maxSize ?? 100,
            collapsible: props.collapsible ?? false,
            collapsedSize: props.collapsedSize ?? 0,
            collapseThreshold:
              props.collapseThreshold ??
              ((props.collapsedSize ?? 0) + minSize) / 2,
            handleLabel: props.handleLabel,
            className: props.className,
            children: props.children,
          };
        }),
    [children],
  );

  const [initial] = useState(() => resolveDefaults(configs, defaultSizes));
  const [internal, setInternal] = useState(initial);
  const controlled = sizesProp !== undefined;
  const sizes = controlled ? sizesProp : internal;

  // One motion value per panel drives layout; React state stays the source
  // of truth for aria values. Created once per panel slot.
  const motionSizes = useRef<MotionValue<number>[]>([]);
  if (motionSizes.current.length !== configs.length) {
    motionSizes.current = configs.map(
      (_, i) => motionSizes.current[i] ?? motionValue(sizes[i] ?? 0),
    );
  }
  const targets = useRef<number[]>([...sizes]);
  const animateNext = useRef(new Set<number>());

  useEffect(() => {
    sizes.forEach((size, i) => {
      const mv = motionSizes.current[i];
      if (!mv || Math.abs((targets.current[i] ?? -1) - size) < EPSILON) return;
      targets.current[i] = size;
      if (animateNext.current.has(i) && !reduce) {
        animate(mv, size, SPRING_LAYOUT);
      } else {
        mv.stop();
        mv.set(size);
      }
    });
    animateNext.current.clear();
  }, [sizes, reduce]);

  const commit = useCallback(
    (next: number[], animated: number[] = []) => {
      for (const i of animated) animateNext.current.add(i);
      const rounded = next.map(round);
      if (!controlled) setInternal(rounded);
      onSizesChange?.(rounded);
    },
    [controlled, onSizesChange],
  );

  const isCollapsed = useCallback(
    (i: number, value = sizes[i] ?? 0) => {
      const config = configs[i];
      return Boolean(
        config?.collapsible && value <= config.collapsedSize + EPSILON,
      );
    },
    [configs, sizes],
  );

  /**
   * Resolve a requested size for panel `i` against the pair (i, i + 1):
   * clamps to min/max on both sides and snaps collapsible panels shut below
   * their threshold.
   */
  const resolvePair = useCallback(
    (base: number[], i: number, requested: number) => {
      const a = configs[i];
      const b = configs[i + 1];
      if (!a || !b) return base;
      const total = (base[i] ?? 0) + (base[i + 1] ?? 0);

      const settle = (config: PanelConfig, raw: number) => {
        if (raw < config.minSize) {
          if (config.collapsible && raw < config.collapseThreshold) {
            return config.collapsedSize;
          }
          return config.minSize;
        }
        return Math.min(raw, config.maxSize);
      };

      let nextA = settle(a, clamp(requested, 0, total));
      let nextB = settle(b, total - nextA);
      nextA = total - nextB;
      // If B's limits pushed A out of its own range, re-settle A and give B the rest.
      if (nextA > a.maxSize || (nextA < a.minSize && !isCollapsedFor(a, nextA))) {
        nextA = settle(a, nextA);
        nextB = total - nextA;
      }

      const next = [...base];
      next[i] = nextA;
      next[i + 1] = nextB;
      return next;
    },
    [configs],
  );

  const drag = useRef<{
    index: number;
    pointerId: number;
    start: number;
    length: number;
    base: number[];
  } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>, index: number) => {
    if (event.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.currentTarget.focus();
    capturePointer(event.currentTarget, event.pointerId);
    drag.current = {
      index,
      pointerId: event.pointerId,
      start: horizontal ? event.clientX : event.clientY,
      length: horizontal ? rect.width : rect.height,
      base: [...sizes],
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId || !state.length) return;
    const delta =
      (((horizontal ? event.clientX : event.clientY) - state.start) /
        state.length) *
      100;
    const next = resolvePair(
      state.base,
      state.index,
      (state.base[state.index] ?? 0) + delta,
    );
    if (next.every((v, i) => Math.abs(v - (sizes[i] ?? 0)) < EPSILON)) return;
    // Snaps animate only when the collapsed state flips relative to now.
    const pair = [state.index, state.index + 1];
    const flipped = pair.some((i) => isCollapsed(i, next[i]) !== isCollapsed(i));
    commit(next, flipped ? pair : []);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    releasePointer(event.currentTarget, event.pointerId);
    drag.current = null;
  };

  const resizeBy = (index: number, requested: number) => {
    commit(resolvePair(sizes, index, requested), [index, index + 1]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    const config = configs[index];
    if (!config) return;
    const current = sizes[index] ?? 0;
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const decrease = horizontal ? "ArrowLeft" : "ArrowUp";
    const increase = horizontal ? "ArrowRight" : "ArrowDown";
    switch (event.key) {
      case decrease:
        event.preventDefault();
        // From the minimum, one more step snaps a collapsible panel shut.
        resizeBy(
          index,
          config.collapsible && current - step < config.minSize
            ? config.collapsedSize
            : current - step,
        );
        return;
      case increase:
        event.preventDefault();
        resizeBy(
          index,
          isCollapsed(index) ? Math.max(config.minSize, current + step) : current + step,
        );
        return;
      case "Home":
        event.preventDefault();
        resizeBy(index, config.collapsible ? config.collapsedSize : config.minSize);
        return;
      case "End":
        event.preventDefault();
        resizeBy(index, config.maxSize);
        return;
      case "Enter":
        if (!config.collapsible) return;
        event.preventDefault();
        resizeBy(
          index,
          isCollapsed(index)
            ? (initial[index] ?? config.minSize) > config.collapsedSize
              ? (initial[index] ?? config.minSize)
              : config.minSize
            : config.collapsedSize,
        );
        return;
      default:
        return;
    }
  };

  const resetAll = () => {
    commit(
      [...initial],
      initial.map((_, i) => i),
    );
  };

  const items: ReactNode[] = [];
  configs.forEach((config, i) => {
    const mv = motionSizes.current[i];
    if (!mv) return;
    const panelId = `${baseId}-panel-${i}`;
    items.push(
      <PanelFrame
        key={panelId}
        id={panelId}
        size={mv}
        config={config}
        collapsed={isCollapsed(i)}
      />,
    );
    if (i < configs.length - 1) {
      const value = Math.round(sizes[i] ?? 0);
      items.push(
        // biome-ignore lint/a11y/useSemanticElements: a focusable window splitter (WAI-ARIA) is a separator widget; <hr> cannot take focus or children.
        <div
          key={`${panelId}-handle`}
          role="separator"
          tabIndex={0}
          aria-orientation={horizontal ? "vertical" : "horizontal"}
          aria-controls={panelId}
          aria-label={config.handleLabel ?? "Resize panels"}
          aria-valuenow={value}
          aria-valuemin={Math.round(
            config.collapsible ? config.collapsedSize : config.minSize,
          )}
          aria-valuemax={Math.round(config.maxSize)}
          onPointerDown={(event) => onPointerDown(event, i)}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => onKeyDown(event, i)}
          onDoubleClick={resetAll}
          className={cn(
            "group/handle relative z-10 flex shrink-0 touch-none items-center justify-center bg-border outline-none",
            TOUCH_GESTURE_CLASS,
            horizontal
              ? "w-px cursor-col-resize before:absolute before:inset-y-0 before:-inset-x-1.5 before:content-['']"
              : "h-px cursor-row-resize before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']",
            "transition-colors hover:bg-ring/60 focus-visible:bg-ring",
          )}
        >
          {withHandle ? (
            <span
              aria-hidden
              className={cn(
                "pointer-events-none relative rounded-full border border-border-strong bg-background shadow-sm transition-transform duration-150",
                "group-hover/handle:scale-110 group-focus-visible/handle:border-ring",
                horizontal ? "h-6 w-1.5" : "h-1.5 w-6",
              )}
            />
          ) : null}
        </div>,
      );
    }
  });

  return (
    <div
      ref={containerRef}
      data-direction={direction}
      className={cn(
        "flex h-full w-full overflow-hidden",
        horizontal ? "flex-row" : "flex-col",
        className,
      )}
    >
      {items}
    </div>
  );
}

function isCollapsedFor(config: PanelConfig, value: number) {
  return config.collapsible && value <= config.collapsedSize + EPSILON;
}
