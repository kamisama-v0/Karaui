"use client";

import {
  Copy,
  MoreHorizontal,
  RotateCw,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ComponentPropsWithRef,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/motion/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/motion/dropdown-menu";
import {
  MorphPopover,
  MorphPopoverContent,
} from "@/components/motion/popover-morph";
import { Textarea } from "@/components/motion/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/motion/toggle-group";
import { EASE_OUT, SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type MessageFeedback = "up" | "down" | null;

export interface MessageFeedbackReason {
  value: string;
  label: string;
}

export interface MessageFeedbackDetails {
  reasons: string[];
  comment: string;
}

export interface MessageMoreAction {
  value: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export interface MessageActionsProps
  extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** Plain text copied by the copy action. */
  copyText?: string;
  /** Overrides the built-in clipboard write. */
  onCopy?: () => void | Promise<void>;
  /** Shows the regenerate action. A returned promise keeps the icon spinning. */
  onRegenerate?: () => void | Promise<void>;
  feedback?: MessageFeedback;
  defaultFeedback?: MessageFeedback;
  onFeedbackChange?: (feedback: MessageFeedback) => void;
  /** Reasons offered after a thumbs-down. Pass `[]` to skip the popover. */
  feedbackReasons?: MessageFeedbackReason[];
  onFeedbackSubmit?: (details: MessageFeedbackDetails) => void;
  onShare?: () => void;
  moreActions?: MessageMoreAction[];
  onMoreAction?: (value: string) => void;
  /**
   * `hover` reveals the row while the surrounding `Message` / message group is
   * hovered or focused (always visible on touch); `always` keeps it shown —
   * use it for the last message.
   */
  visibility?: "hover" | "always";
}

export const DEFAULT_FEEDBACK_REASONS: MessageFeedbackReason[] = [
  { value: "incorrect", label: "Incorrect" },
  { value: "unhelpful", label: "Not helpful" },
  { value: "incomplete", label: "Incomplete" },
  { value: "instructions", label: "Ignored instructions" },
  { value: "unsafe", label: "Harmful" },
];

function ActionButton({
  label,
  pressed,
  onClick,
  children,
  className,
}: {
  label: string;
  pressed?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      whileTap={reduce ? undefined : { scale: 0.88 }}
      transition={SPRING_PRESS}
      className={cn(
        "relative grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        pressed && "text-foreground",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

function DrawnCheck({ reduce }: { reduce: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 0.28, ease: EASE_OUT, delay: 0.04 }}
      />
    </svg>
  );
}

/** Outline thumb with a filled twin that pops in over it when active. */
function Thumb({
  direction,
  active,
  reduce,
}: {
  direction: "up" | "down";
  active: boolean;
  reduce: boolean;
}) {
  const Icon = direction === "up" ? ThumbsUp : ThumbsDown;
  return (
    <span className="relative grid size-3.5 place-items-center">
      <Icon aria-hidden="true" className="size-3.5" />
      <AnimatePresence initial={false}>
        {active ? (
          <motion.span
            key="fill"
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center"
            initial={
              reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 0 }
            }
            animate={
              reduce
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    scale: [0.4, 1.28, 1],
                    rotate: [0, direction === "up" ? -14 : 14, 0],
                  }
            }
            exit={{ opacity: 0, scale: reduce ? 1 : 0.6, transition: { duration: 0.12 } }}
            transition={
              reduce ? { duration: 0.12 } : { duration: 0.42, ease: EASE_OUT }
            }
          >
            <Icon className="size-3.5 fill-current" />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

export function MessageActions({
  copyText,
  onCopy,
  onRegenerate,
  feedback,
  defaultFeedback = null,
  onFeedbackChange,
  feedbackReasons = DEFAULT_FEEDBACK_REASONS,
  onFeedbackSubmit,
  onShare,
  moreActions = [],
  onMoreAction,
  visibility = "hover",
  className,
  ...props
}: MessageActionsProps) {
  const reduce = useReducedMotion() ?? false;
  const [copied, setCopied] = useState(false);
  const [spins, setSpins] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [internalFeedback, setInternalFeedback] =
    useState<MessageFeedback>(defaultFeedback);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [thanked, setThanked] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const copyTimer = useRef<number | undefined>(undefined);
  const thanksTimer = useRef<number | undefined>(undefined);
  const downRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = feedback ?? internalFeedback;
  const canCopy = Boolean(copyText || onCopy);

  useEffect(
    () => () => {
      window.clearTimeout(copyTimer.current);
      window.clearTimeout(thanksTimer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      if (onCopy) await onCopy();
      else if (copyText) await navigator.clipboard?.writeText(copyText);
    } catch {
      setAnnouncement("Copy failed");
      return;
    }
    setCopied(true);
    setAnnouncement("Copied to clipboard");
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const regenerate = async () => {
    if (!onRegenerate || regenerating) return;
    setSpins((count) => count + 1);
    const result = onRegenerate();
    if (result && typeof result.then === "function") {
      setRegenerating(true);
      try {
        await result;
      } finally {
        setRegenerating(false);
      }
    }
  };

  const setFeedback = (next: MessageFeedback) => {
    if (feedback === undefined) setInternalFeedback(next);
    onFeedbackChange?.(next);
  };

  const openPopover = (next: boolean) => {
    if (!next && panelRef.current?.contains(document.activeElement)) {
      downRef.current?.querySelector("button")?.focus({ preventScroll: true });
    }
    setPopoverOpen(next);
    if (next) {
      setReasons([]);
      setComment("");
      setThanked(false);
    }
  };

  const toggleUp = () => {
    openPopover(false);
    setFeedback(current === "up" ? null : "up");
  };

  const toggleDown = () => {
    if (current === "down") {
      setFeedback(null);
      openPopover(false);
      return;
    }
    setFeedback("down");
    if (feedbackReasons.length) openPopover(true);
  };

  const submit = () => {
    onFeedbackSubmit?.({ reasons, comment: comment.trim() });
    setThanked(true);
    setAnnouncement("Thanks for the feedback");
    window.clearTimeout(thanksTimer.current);
    thanksTimer.current = window.setTimeout(() => openPopover(false), 1100);
  };

  // Move focus into the panel once it has mounted and been measured.
  useEffect(() => {
    if (!popoverOpen) return;
    const frame = requestAnimationFrame(() =>
      panelRef.current
        ?.querySelector<HTMLElement>("[aria-pressed], textarea")
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [popoverOpen]);

  const pinned = visibility === "always" || popoverOpen || menuOpen;

  return (
    <div
      data-slot="message-actions"
      data-visible={pinned || undefined}
      className={cn(
        "flex items-center gap-0.5 transition-[opacity,translate] duration-200 ease-out motion-reduce:translate-y-0",
        pinned
          ? "translate-y-0 opacity-100"
          : "translate-y-0.5 opacity-0 focus-within:translate-y-0 focus-within:opacity-100 group-hover/message:translate-y-0 group-hover/message:opacity-100 group-hover/message-group:translate-y-0 group-hover/message-group:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
        className,
      )}
      {...props}
    >
      {canCopy ? (
        <ActionButton label={copied ? "Copied" : "Copy"} onClick={copy}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={copied ? "check" : "copy"}
              className="grid place-items-center"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={
                reduce
                  ? { opacity: 0, transition: { duration: 0.1 } }
                  : { opacity: 0, scale: 0.6, transition: { duration: 0.1 } }
              }
              transition={reduce ? { duration: 0.12 } : SPRING_SWAP}
            >
              {copied ? (
                <DrawnCheck reduce={reduce} />
              ) : (
                <Copy aria-hidden="true" className="size-3.5" />
              )}
            </motion.span>
          </AnimatePresence>
        </ActionButton>
      ) : null}

      {onRegenerate ? (
        <ActionButton
          label={regenerating ? "Regenerating" : "Regenerate"}
          onClick={regenerate}
        >
          <motion.span
            aria-hidden="true"
            className="grid place-items-center"
            animate={
              reduce
                ? undefined
                : regenerating
                  ? { rotate: [spins * 360, spins * 360 + 360] }
                  : { rotate: spins * 360 }
            }
            transition={
              regenerating
                ? {
                    duration: 0.8,
                    ease: "linear",
                    repeat: Number.POSITIVE_INFINITY,
                  }
                : { duration: 0.55, ease: EASE_OUT }
            }
          >
            <RotateCw className="size-3.5" />
          </motion.span>
        </ActionButton>
      ) : null}

      <ActionButton label="Good response" pressed={current === "up"} onClick={toggleUp}>
        <Thumb direction="up" active={current === "up"} reduce={reduce} />
      </ActionButton>

      <MorphPopover open={popoverOpen} onOpenChange={openPopover}>
        <span ref={downRef} className="inline-flex">
          <ActionButton
            label="Bad response"
            pressed={current === "down"}
            onClick={toggleDown}
          >
            <Thumb direction="down" active={current === "down"} reduce={reduce} />
          </ActionButton>
        </span>
        <MorphPopoverContent side="bottom" align="start" radius={14} className="w-72">
          <div ref={panelRef} className="p-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {thanked ? (
                <motion.div
                  key="thanks"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduce ? { duration: 0.12 } : SPRING_SWAP}
                  className="flex items-center gap-2 py-6 text-sm text-foreground"
                >
                  <span className="mx-auto flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full bg-muted">
                      <DrawnCheck reduce={reduce} />
                    </span>
                    Thanks for the feedback
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                >
                  <p className="text-sm font-medium text-foreground">
                    What went wrong?
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pick any that apply.
                  </p>
                  <ToggleGroup
                    type="multiple"
                    size="sm"
                    variant="default"
                    value={reasons}
                    onValueChange={setReasons}
                    aria-label="Feedback reasons"
                    className="mt-2.5 flex w-full flex-wrap gap-1.5 rounded-none border-0 bg-transparent p-0"
                  >
                    {feedbackReasons.map((reason) => (
                      <ToggleGroupItem
                        key={reason.value}
                        value={reason.value}
                        className="rounded-full border border-border px-2.5"
                      >
                        {reason.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <Textarea
                    value={comment}
                    onChange={setComment}
                    placeholder="Tell us more (optional)"
                    aria-label="Additional feedback"
                    minRows={2}
                    maxRows={4}
                    className="mt-2.5"
                  />
                  <div className="mt-2.5 flex justify-end gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => openPopover(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!reasons.length && !comment.trim()}
                      onClick={submit}
                    >
                      Submit
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </MorphPopoverContent>
      </MorphPopover>

      {onShare ? (
        <ActionButton label="Share" onClick={onShare}>
          <Share aria-hidden="true" className="size-3.5" />
        </ActionButton>
      ) : null}

      {moreActions.length ? (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger>
            <button
              type="button"
              aria-label="More actions"
              title="More actions"
              className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted data-[state=open]:text-foreground"
            >
              <MoreHorizontal aria-hidden="true" className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {moreActions.map((action) => (
              <DropdownMenuItem
                key={action.value}
                icon={action.icon}
                variant={action.destructive ? "destructive" : "default"}
                disabled={action.disabled}
                onSelect={() => onMoreAction?.(action.value)}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
