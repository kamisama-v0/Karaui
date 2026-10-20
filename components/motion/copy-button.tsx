"use client";

import { Check, Copy, X } from "lucide-react";
import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { EASE_OUT, SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { TOUCH_TARGET_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

export type CopyButtonStatus = "idle" | "copied" | "error";
export type CopyButtonVariant = "secondary" | "ghost" | "outline" | "primary";
export type CopyButtonSize = "sm" | "md" | "icon";

export interface CopyButtonLabels {
  idle: string;
  copied: string;
  error: string;
}

export interface CopyButtonProps
  extends Omit<
    HTMLMotionProps<"button">,
    "value" | "children" | "onCopy" | "onError" | "onClick"
  > {
  /** Text to copy, or a (possibly async) getter evaluated on click. */
  value: string | (() => string | Promise<string>);
  /** Show a text label next to the icon that swaps with the status. */
  showLabel?: boolean;
  /** Label text per status. Also used for the accessible name and announcement. */
  labels?: Partial<CopyButtonLabels>;
  /** How long the copied/error state lingers before resetting, in ms. */
  timeout?: number;
  variant?: CopyButtonVariant;
  size?: CopyButtonSize;
  /** Override the idle / copied / error icons. */
  icons?: Partial<Record<CopyButtonStatus, ReactNode>>;
  onCopy?: (text: string) => void;
  onCopyError?: (error: unknown) => void;
  onStatusChange?: (status: CopyButtonStatus) => void;
}

const DEFAULT_LABELS: CopyButtonLabels = {
  idle: "Copy",
  copied: "Copied",
  error: "Failed",
};

const VARIANT_CLASS: Record<CopyButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "border border-border bg-card text-muted-foreground hover:text-foreground",
  ghost: "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
  outline:
    "border border-border bg-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground",
};

const SIZE_CLASS: Record<CopyButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-full px-3 text-xs",
  md: "h-10 gap-2 rounded-full px-4 text-sm",
  icon: "size-8 rounded-lg",
};

const SWAP_BLUR = "blur(6px)";

const ICON_VARIANTS: Variants = {
  initial: { opacity: 0, scale: 0.3, filter: SWAP_BLUR },
  animate: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: SPRING_SWAP,
  },
  exit: {
    opacity: 0,
    scale: 0.3,
    filter: SWAP_BLUR,
    transition: { duration: 0.12, ease: EASE_OUT },
  },
};

const LABEL_VARIANTS: Variants = {
  initial: { opacity: 0, y: "60%", filter: SWAP_BLUR },
  animate: {
    opacity: 1,
    y: "0%",
    filter: "blur(0px)",
    transition: SPRING_SWAP,
  },
  exit: {
    opacity: 0,
    y: "-60%",
    filter: SWAP_BLUR,
    transition: { duration: 0.12, ease: EASE_OUT },
  },
};

const FADE_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

/** `document.execCommand("copy")` fallback for insecure contexts and old browsers. */
function legacyCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  const selection = document.getSelection();
  const previous =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
    if (previous && selection) {
      selection.removeAllRanges();
      selection.addRange(previous);
    }
  }
  if (!ok) throw new Error("Copy command was rejected");
}

/** Copy text with the async Clipboard API, falling back to execCommand. */
export async function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Permission denied or insecure context — try the legacy path.
    }
  }
  legacyCopy(text);
}

export function CopyButton({
  value,
  showLabel = false,
  labels,
  timeout = 1600,
  variant = "secondary",
  size,
  icons,
  onCopy,
  onCopyError,
  onStatusChange,
  className,
  disabled,
  type = "button",
  ...props
}: CopyButtonProps) {
  const reduce = useReducedMotion() ?? false;
  const [status, setStatus] = useState<CopyButtonStatus>("idle");
  const timer = useRef<number | undefined>(undefined);
  const text = { ...DEFAULT_LABELS, ...labels };
  const resolvedSize = size ?? (showLabel ? "sm" : "icon");

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const update = useCallback(
    (next: CopyButtonStatus) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange],
  );

  const handleClick = async () => {
    if (timer.current) window.clearTimeout(timer.current);
    try {
      const resolved = typeof value === "function" ? await value() : value;
      await copyToClipboard(resolved);
      update("copied");
      onCopy?.(resolved);
    } catch (error) {
      update("error");
      onCopyError?.(error);
    }
    timer.current = window.setTimeout(() => update("idle"), timeout);
  };

  const iconNode: Record<CopyButtonStatus, ReactNode> = {
    idle: icons?.idle ?? <Copy />,
    copied: icons?.copied ?? <Check className="text-(--color-success)" />,
    error: icons?.error ?? <X className="text-destructive" />,
  };

  const iconVariants = reduce ? FADE_VARIANTS : ICON_VARIANTS;
  const labelVariants = reduce ? FADE_VARIANTS : LABEL_VARIANTS;

  return (
    <>
    <motion.button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      whileTap={reduce || disabled ? undefined : { scale: 0.9 }}
      transition={SPRING_PRESS}
      aria-label={showLabel ? undefined : text[status]}
      data-status={status}
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        TOUCH_TARGET_CLASS,
        VARIANT_CLASS[variant],
        SIZE_CLASS[resolvedSize],
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="relative grid size-3.5 place-items-center [&_svg]:size-3.5">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={status}
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="col-start-1 row-start-1 grid place-items-center"
          >
            {iconNode[status]}
          </motion.span>
        </AnimatePresence>
      </span>
      {showLabel ? (
        <span className="relative grid overflow-hidden">
          {/* Every label sits invisibly in the same cell so the button keeps
              the width of the longest one and never reflows mid-swap. */}
          {(Object.keys(text) as CopyButtonStatus[]).map((key) => (
            <span
              key={key}
              aria-hidden="true"
              className="invisible col-start-1 row-start-1 whitespace-nowrap"
            >
              {text[key]}
            </span>
          ))}
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={status}
              variants={labelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="col-start-1 row-start-1 whitespace-nowrap text-left"
            >
              {text[status]}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : null}
    </motion.button>
    {/* Outside the button so the announcement never joins its accessible name. */}
    <span aria-live="polite" className="sr-only">
      {status === "copied"
        ? `${text.copied} to clipboard`
        : status === "error"
          ? `${text.error} to copy`
          : ""}
    </span>
    </>
  );
}
