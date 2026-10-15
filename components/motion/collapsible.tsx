"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";
import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

// Collapsible is the unstyled disclosure primitive: one trigger, one panel.
// `Accordion` (accordion.tsx) is built from it; `BouncyAccordion` is the
// springy, single-open icon-row variant. Reach for this when a single region
// should show or hide in flow ("Show 3 more", an expandable activity row).

/** Entrance is a touch longer than the exit — exits should feel faster. */
const OPEN_TRANSITION: Transition = { duration: 0.28, ease: EASE_OUT };
const CLOSE_TRANSITION: Transition = { duration: 0.2, ease: EASE_OUT };

interface CollapsibleContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean;
  triggerId: string;
  contentId: string;
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

export function useCollapsible(component = "useCollapsible") {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error(`${component} must be used within <Collapsible>.`);
  }
  return context;
}

export interface CollapsibleProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Override the generated trigger id (the content is labelled by it). */
  triggerId?: string;
  /** Override the generated content id (the trigger controls it). */
  contentId?: string;
  children?: ReactNode;
}

export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(
  function Collapsible(
    {
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      disabled = false,
      triggerId: triggerIdProp,
      contentId: contentIdProp,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const [internal, setInternal] = useState(defaultOpen);
    const controlled = openProp !== undefined;
    const open = controlled ? openProp : internal;
    const setOpen = useCallback(
      (next: boolean) => {
        if (!controlled) setInternal(next);
        onOpenChange?.(next);
      },
      [controlled, onOpenChange],
    );
    const baseId = useId();
    const triggerId = triggerIdProp ?? `${baseId}-trigger`;
    const contentId = contentIdProp ?? `${baseId}-content`;

    return (
      <CollapsibleContext.Provider
        value={{ open, setOpen, disabled, triggerId, contentId }}
      >
        <div
          ref={ref}
          data-state={open ? "open" : "closed"}
          data-disabled={disabled ? "" : undefined}
          className={cn(className)}
          {...rest}
        >
          {children}
        </div>
      </CollapsibleContext.Provider>
    );
  },
);

type ClonableChild = ReactElement<{
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  [key: string]: unknown;
}>;

export interface CollapsibleTriggerProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Merge trigger behaviour onto the single child element instead of rendering a `<button>`. */
  asChild?: boolean;
}

/** Toggles the nearest `Collapsible`. Unstyled `<button>` by default. */
export const CollapsibleTrigger = forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps
>(function CollapsibleTrigger(
  { asChild, children, onClick, className, disabled: disabledProp, ...rest },
  ref,
) {
  const context = useCollapsible("CollapsibleTrigger");
  const disabled = context.disabled || Boolean(disabledProp);
  const shared = {
    id: context.triggerId,
    "aria-expanded": context.open,
    "aria-controls": context.contentId,
    "data-state": context.open ? "open" : "closed",
    "data-disabled": disabled ? "" : undefined,
  };

  if (asChild && isValidElement(children)) {
    const child = children as ClonableChild;
    return cloneElement(child, {
      ...shared,
      onClick: (event: MouseEvent<HTMLElement>) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented && !disabled) context.setOpen(!context.open);
      },
    });
  }

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={cn(className)}
      {...rest}
      {...shared}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.setOpen(!context.open);
      }}
    >
      {children}
    </button>
  );
});

export interface CollapsibleContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Class for the inner wrapper that holds the children (padding goes here,
   * never on the animated outer element, so the closed height is truly 0). */
  innerClassName?: string;
  /** Set to give the panel `role="region"` labelled by its trigger. */
  region?: boolean;
  children?: ReactNode;
}

/** The disclosed panel. Stays mounted (inert while closed) so `aria-controls` always resolves. */
export function CollapsibleContent({
  className,
  innerClassName,
  region = false,
  children,
  style,
  ...rest
}: CollapsibleContentProps) {
  const { open, triggerId, contentId } = useCollapsible("CollapsibleContent");
  const reduce = useReducedMotion();
  const fade = open ? OPEN_TRANSITION : CLOSE_TRANSITION;

  return (
    // Height is animated on purpose: disclosure is a layout job — the panel
    // has to push the content below it down in flow, which transforms can't.
    // Reduced motion snaps the height and keeps only the opacity fade.
    <motion.div
      {...(rest as Record<string, unknown>)}
      id={contentId}
      role={region ? "region" : undefined}
      aria-labelledby={region ? triggerId : undefined}
      data-state={open ? "open" : "closed"}
      inert={!open}
      initial={false}
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      transition={
        reduce ? { height: { duration: 0 }, opacity: { duration: 0.15 } } : fade
      }
      style={style}
      className={cn("overflow-hidden", className)}
    >
      <div className={innerClassName}>{children}</div>
    </motion.div>
  );
}
