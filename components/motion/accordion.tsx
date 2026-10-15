"use client";

import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  useCollapsible,
} from "@/components/motion/collapsible";
import { SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

// Accordion is the calm, shadcn-compatible stack of disclosures built from
// `Collapsible`. `BouncyAccordion` is the springy single-open variant with icon
// rows; `FaqSection` is a full marketing block. Use this one anywhere a plain
// accordion belongs (settings groups, FAQs, docs sidebars).

interface AccordionContextValue {
  value: string[];
  toggle: (item: string) => void;
  type: "single" | "multiple";
  collapsible: boolean;
  disabled: boolean;
  rootId: string;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordion(component: string) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error(`${component} must be used within <Accordion>.`);
  return context;
}

interface AccordionBaseProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "dir"> {
  disabled?: boolean;
  children?: ReactNode;
}

export interface AccordionSingleProps extends AccordionBaseProps {
  type: "single";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Allow closing the open item so none is open. Default false (shadcn/Radix parity). */
  collapsible?: boolean;
}

export interface AccordionMultipleProps extends AccordionBaseProps {
  type: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  collapsible?: never;
}

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

const toArray = (v: string | string[] | undefined) =>
  v === undefined ? undefined : Array.isArray(v) ? v : v ? [v] : [];

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  props,
  ref,
) {
  const {
    type,
    value: valueProp,
    defaultValue,
    onValueChange,
    collapsible = false,
    disabled = false,
    className,
    children,
    ...rest
  } = props as AccordionBaseProps & {
    type: "single" | "multiple";
    value?: string | string[];
    defaultValue?: string | string[];
    onValueChange?: ((value: string) => void) | ((value: string[]) => void);
    collapsible?: boolean;
  };

  const [internal, setInternal] = useState<string[]>(() => toArray(defaultValue) ?? []);
  const controlled = valueProp !== undefined;
  const value = controlled ? (toArray(valueProp) ?? []) : internal;
  const rootId = useId();

  const toggle = useCallback(
    (item: string) => {
      const isOpen = value.includes(item);
      let next: string[];
      if (type === "single") {
        if (isOpen && !collapsible) return;
        next = isOpen ? [] : [item];
      } else {
        next = isOpen ? value.filter((v) => v !== item) : [...value, item];
      }
      if (!controlled) setInternal(next);
      if (type === "single") {
        (onValueChange as ((v: string) => void) | undefined)?.(next[0] ?? "");
      } else {
        (onValueChange as ((v: string[]) => void) | undefined)?.(next);
      }
    },
    [value, type, collapsible, controlled, onValueChange],
  );

  return (
    <AccordionContext.Provider
      value={{ value, toggle, type, collapsible, disabled, rootId }}
    >
      <div
        ref={ref}
        data-orientation="vertical"
        data-accordion-root={rootId}
        className={cn("w-full", className)}
        {...rest}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
});

export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  function AccordionItem({ value, disabled = false, className, children, ...rest }, ref) {
    const accordion = useAccordion("AccordionItem");
    const open = accordion.value.includes(value);
    const itemDisabled = accordion.disabled || disabled;

    return (
      <Collapsible
        ref={ref}
        open={open}
        onOpenChange={() => accordion.toggle(value)}
        disabled={itemDisabled}
        className={cn("border-b border-border", className)}
        {...rest}
      >
        {children}
      </Collapsible>
    );
  },
);

export interface AccordionTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Replace the rotating chevron, or pass `null` to hide it. */
  icon?: ReactNode;
  /** Heading element wrapping the trigger (WAI-ARIA accordion pattern). */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
}

export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  function AccordionTrigger(
    { icon, headingLevel = 3, className, children, onKeyDown, ...rest },
    ref,
  ) {
    const accordion = useAccordion("AccordionTrigger");
    const { open } = useCollapsible("AccordionTrigger");
    const reduce = useReducedMotion();
    // A single, non-collapsible accordion can't close its open item, so the
    // trigger reports that instead of silently ignoring the press.
    const locked = accordion.type === "single" && !accordion.collapsible && open;
    const Heading = `h${headingLevel}` as const;

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
      if (!keys.includes(event.key)) return;
      const root = event.currentTarget.closest<HTMLElement>(
        `[data-accordion-root="${accordion.rootId}"]`,
      );
      const scope = root ?? document;
      const triggers = Array.from(
        scope.querySelectorAll<HTMLButtonElement>(
          `[data-accordion-trigger="${accordion.rootId}"]`,
        ),
      ).filter((el) => !el.disabled);
      const index = triggers.indexOf(event.currentTarget);
      if (index < 0 || triggers.length === 0) return;
      event.preventDefault();
      const last = triggers.length - 1;
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? last
            : event.key === "ArrowDown"
              ? (index + 1) % triggers.length
              : (index - 1 + triggers.length) % triggers.length;
      triggers[next]?.focus();
    };

    return (
      <Heading className="flex">
        <CollapsibleTrigger
          ref={ref}
          data-accordion-trigger={accordion.rootId}
          aria-disabled={locked || undefined}
          className={cn(
            "group/accordion-trigger flex flex-1 items-center justify-between gap-4 rounded-md py-4 text-left text-sm font-medium text-foreground outline-none transition-colors",
            "hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          onKeyDown={handleKeyDown}
          {...rest}
        >
          {children}
          {icon === null ? null : (
            <motion.span
              aria-hidden
              className="grid size-4 shrink-0 place-items-center text-muted-foreground"
              initial={false}
              animate={{ rotate: open ? 180 : 0 }}
              transition={reduce ? { duration: 0 } : SPRING_SWAP}
            >
              {icon ?? <ChevronDown className="size-4" />}
            </motion.span>
          )}
        </CollapsibleTrigger>
      </Heading>
    );
  },
);

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function AccordionContent({ className, children, ...rest }: AccordionContentProps) {
  useAccordion("AccordionContent");
  return (
    <CollapsibleContent
      region
      innerClassName={cn("pb-4 text-sm leading-6 text-muted-foreground", className)}
      {...rest}
    >
      {children}
    </CollapsibleContent>
  );
}
