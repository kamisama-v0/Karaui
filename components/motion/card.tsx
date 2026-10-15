"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ComponentPropsWithoutRef,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  type ReactElement,
  useCallback,
  useContext,
  useId,
  useState,
} from "react";
import { EASE_OUT, SPRING_PRESS } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

// Card is the plain building block: a surface plus shadcn-compatible slots
// (CardHeader / CardTitle / CardDescription / CardAction / CardContent /
// CardFooter). `TiltCard` adds cursor-tracked 3D tilt, `StatCard` is a KPI
// readout and `BentoCard` a marketing tile; reach for those for their effect,
// and for this one when you just need a well-behaved container.

export type CardVariant = "default" | "outline" | "elevated" | "interactive";

const variantClass: Record<CardVariant, string> = {
  default: "border border-border bg-card shadow-sm",
  outline: "border border-border bg-transparent",
  elevated: "border border-border bg-card shadow-md",
  interactive: cn(
    "cursor-pointer border border-border bg-card shadow-sm outline-none transition-[border-color,box-shadow] duration-200",
    "hover:border-border-strong hover:shadow-md",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ),
};

/* ------------------------------------------------------------------------ */
/* Expand state                                                              */
/* ------------------------------------------------------------------------ */

interface CardContextValue {
  expanded: boolean;
  setExpanded: (next: boolean) => void;
  contentId: string;
}

const CardContext = createContext<CardContextValue | null>(null);

function useCardContext(part: string) {
  const ctx = useContext(CardContext);
  if (!ctx) throw new Error(`${part} must be used inside <Card>.`);
  return ctx;
}

/* ------------------------------------------------------------------------ */
/* Card                                                                      */
/* ------------------------------------------------------------------------ */

type ClonableChild = ReactElement<{ className?: string }>;

export interface CardProps extends ComponentPropsWithoutRef<"div"> {
  variant?: CardVariant;
  /**
   * Merge the card surface onto the single child element instead of
   * rendering a `<div>` — e.g. `<Card variant="interactive" asChild><a href="…">…</a></Card>`
   * or a router `<Link>` / `<button>`. Keep other links and buttons out of an
   * interactive card's children so interactive elements never nest.
   */
  asChild?: boolean;
  /** Controlled open state for `CardExpandTrigger` / `CardExpandContent`. */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

const surfaceBase = "group/card relative flex flex-col gap-5 rounded-xl py-5 text-card-foreground";

/**
 * Card surface. `variant="interactive"` lifts on hover (pointer devices only)
 * and dips on press with `SPRING_PRESS`; pair it with `asChild` so the whole
 * card is one link or button.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = "default",
    asChild = false,
    expanded,
    defaultExpanded = false,
    onExpandedChange,
    className,
    children,
    ...rest
  },
  ref,
) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const contentId = useId();
  const [internal, setInternal] = useState(defaultExpanded);
  const isExpanded = expanded ?? internal;
  const setExpanded = useCallback(
    (next: boolean) => {
      if (expanded === undefined) setInternal(next);
      onExpandedChange?.(next);
    },
    [expanded, onExpandedChange],
  );

  const surfaceClass = cn(surfaceBase, variantClass[variant], className);
  const dataExpanded = isExpanded ? "true" : undefined;

  let surface: ReactElement;
  if (asChild && isValidElement(children)) {
    const child = children as ClonableChild;
    surface = cloneElement(child, {
      ...rest,
      "data-slot": "card",
      "data-expanded": dataExpanded,
      className: cn(surfaceClass, variant === "interactive" && "w-full", child.props.className),
    } as Partial<{ className: string }>);
  } else {
    surface = (
      <div
        ref={variant === "interactive" ? undefined : ref}
        data-slot="card"
        data-expanded={dataExpanded}
        className={cn(surfaceClass, variant === "interactive" && "w-full")}
        {...rest}
      >
        {children}
      </div>
    );
  }

  const content =
    variant === "interactive" ? (
      // Presentational wrapper carries the transform so the surface (often a
      // link or router component) needs no motion props of its own.
      <motion.div
        ref={ref}
        className="flex rounded-xl"
        whileHover={reduce || !canHover ? undefined : { y: -3 }}
        whileTap={reduce ? undefined : { scale: 0.985 }}
        transition={SPRING_PRESS}
      >
        {surface}
      </motion.div>
    ) : (
      surface
    );

  return (
    <CardContext.Provider value={{ expanded: isExpanded, setExpanded, contentId }}>
      {content}
    </CardContext.Provider>
  );
});

/* ------------------------------------------------------------------------ */
/* Slots                                                                     */
/* ------------------------------------------------------------------------ */

export function CardHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-5",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-semibold leading-snug tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Top-right slot inside `CardHeader` (a menu, badge or dismiss button). */
export function CardAction({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div data-slot="card-content" className={cn("px-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-2 px-5", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------------ */
/* Expandable                                                                */
/* ------------------------------------------------------------------------ */

export interface CardExpandTriggerProps
  extends Omit<ComponentPropsWithoutRef<"button">, "type"> {
  /** Hide the rotating chevron. */
  hideIcon?: boolean;
}

/** Toggles the card's `CardExpandContent`; a real button with `aria-expanded`. */
export function CardExpandTrigger({
  hideIcon = false,
  className,
  children,
  onClick,
  ...props
}: CardExpandTriggerProps) {
  const ctx = useCardContext("CardExpandTrigger");
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      data-slot="card-expand-trigger"
      aria-expanded={ctx.expanded}
      aria-controls={ctx.expanded ? ctx.contentId : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) ctx.setExpanded(!ctx.expanded);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        className,
      )}
      {...props}
    >
      {children}
      {hideIcon ? null : (
        <motion.span
          aria-hidden
          className="inline-flex"
          animate={{ rotate: ctx.expanded ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : SPRING_PRESS}
        >
          <ChevronDown className="size-4" />
        </motion.span>
      )}
    </button>
  );
}

/** Collapsible region of the card, revealed by `CardExpandTrigger`. */
export function CardExpandContent({
  className,
  children,
  ...props
}: Omit<
  ComponentPropsWithoutRef<"div">,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd" | "onDragOver"
>) {
  const ctx = useCardContext("CardExpandContent");
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {ctx.expanded ? (
        // Height is animated on purpose: disclosing content is this part's
        // layout job. Reduced motion skips the height morph and only fades.
        <motion.div
          key="content"
          id={ctx.contentId}
          data-slot="card-expand-content"
          initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.12 } }
              : { height: 0, opacity: 0, transition: { duration: 0.18, ease: EASE_OUT } }
          }
          transition={{ duration: 0.26, ease: EASE_OUT }}
          // -mt-5 cancels the card's flex gap so the region grows from zero
          // without a jump; the inner pt-5 restores that gap once open.
          className="-mt-5 overflow-hidden"
        >
          <div className={cn("px-5 pt-5", className)} {...props}>
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
