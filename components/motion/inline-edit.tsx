"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Loader } from "@/components/motion/loader";
import { EASE_OUT, SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type InlineEditClassNames = {
  root?: string;
  display?: string;
  input?: string;
  placeholder?: string;
  errorMessage?: string;
};

export interface InlineEditProps {
  /** Accessible name of the field ("Name", "Bio"); also used in the edit hint. */
  label: string;
  value?: string;
  defaultValue?: string;
  /**
   * Commit handler. Return a promise to show a pending spinner; the shown value
   * rolls back (with a shake and the rejection message) if it rejects.
   * Controlled callers update `value` here.
   */
  onSave?: (next: string) => unknown;
  onCancel?: () => void;
  onEditingChange?: (editing: boolean) => void;
  /** Return an error message to block the save and keep the editor open. */
  validate?: (next: string) => string | null | undefined | false;
  /** Edit in an auto-growing textarea; Enter saves, Shift+Enter adds a line. */
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
  /** Select the whole text when the editor opens (default) or put the caret at the end. */
  selectOnEdit?: boolean;
  disabled?: boolean;
  className?: string;
  classNames?: InlineEditClassNames;
}

type Status = "idle" | "pending" | "saved";

const SHAKE = { x: [0, -6, 6, -4, 4, -2, 0] };
const SAVED_FLASH_MS = 1400;

function messageOf(reason: unknown) {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason) return reason;
  return "Couldn't save. Try again.";
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

export function InlineEdit({
  label,
  value: valueProp,
  defaultValue,
  onSave,
  onCancel,
  onEditingChange,
  validate,
  multiline = false,
  placeholder = "Empty",
  maxLength,
  selectOnEdit = true,
  disabled,
  className,
  classNames,
}: InlineEditProps) {
  const id = useId();
  const reduce = useReducedMotion();

  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const value = controlled ? (valueProp ?? "") : internal;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<Status>("idle");
  const [pendingValue, setPendingValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Refs gate commit/cancel so the blur fired while the editor unmounts can't
  // save a second time.
  const editingRef = useRef(false);
  const restoreFocusRef = useRef(false);
  const saveIdRef = useRef(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const boxRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const shake = useCallback(() => {
    if (!boxRef.current || reduce) return;
    animate(boxRef.current, SHAKE, { duration: 0.45 });
  }, [reduce]);

  const setEditingState = (next: boolean) => {
    editingRef.current = next;
    setEditing(next);
    onEditingChange?.(next);
  };

  // Focus the editor as it opens; return focus to the text after a
  // keyboard commit or cancel (not after blur — that would steal focus).
  useEffect(() => {
    if (editing) {
      const field = fieldRef.current;
      if (!field) return;
      field.focus();
      if (selectOnEdit) field.select();
      else field.setSelectionRange(field.value.length, field.value.length);
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      displayRef.current?.focus();
    }
  }, [editing, selectOnEdit]);

  const startEditing = () => {
    if (disabled || editingRef.current || status === "pending") return;
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setStatus("idle");
    setDraft(value);
    setError(null);
    setEditingState(true);
  };

  const cancel = () => {
    if (!editingRef.current) return;
    restoreFocusRef.current = true;
    setDraft(value);
    setError(null);
    setEditingState(false);
    onCancel?.();
  };

  const flashSaved = () => {
    setStatus("saved");
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      if (mountedRef.current) setStatus("idle");
    }, SAVED_FLASH_MS);
  };

  const commit = (via: "key" | "blur") => {
    if (!editingRef.current) return;
    const next = draft;
    if (next === value) {
      if (via === "key") restoreFocusRef.current = true;
      setError(null);
      setEditingState(false);
      return;
    }
    const invalid = validate?.(next);
    if (invalid) {
      setError(invalid);
      shake();
      return;
    }

    if (via === "key") restoreFocusRef.current = true;
    setError(null);
    setEditingState(false);

    const result = onSave?.(next);
    if (!isThenable(result)) {
      if (!controlled) setInternal(next);
      flashSaved();
      return;
    }

    const saveId = ++saveIdRef.current;
    setPendingValue(next);
    setStatus("pending");
    Promise.resolve(result).then(
      () => {
        if (!mountedRef.current || saveId !== saveIdRef.current) return;
        if (!controlled) setInternal(next);
        flashSaved();
      },
      (reason: unknown) => {
        if (!mountedRef.current || saveId !== saveIdRef.current) return;
        setStatus("idle");
        setError(messageOf(reason));
        shake();
      },
    );
  };

  const onFieldKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    } else if (event.key === "Enter" && !(multiline && event.shiftKey)) {
      event.preventDefault();
      commit("key");
    }
  };

  const shown = status === "pending" ? pendingValue : value;
  const errorId = `${id}-error`;
  // Display and editor share this box model exactly, so swapping them never
  // moves the text. The -mx-2 hangs the padding outside so text aligns with
  // surrounding content.
  const textBox = cn(
    "w-full rounded-lg px-2 py-1 pr-8 text-left",
    multiline ? "whitespace-pre-wrap break-words" : "",
  );
  const iconSlot = cn(
    "pointer-events-none absolute right-2 z-10 flex size-4 items-center justify-center",
    multiline ? "top-[calc(0.25rem+0.5lh)] -translate-y-1/2" : "top-1/2 -translate-y-1/2",
  );

  const motionIn = reduce
    ? { opacity: 1 }
    : { opacity: 1, scale: 1 };
  const motionOut = reduce
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.6 };

  return (
    <div
      data-state={editing ? "editing" : status}
      className={cn("relative -mx-2", className, classNames?.root)}
    >
      <div ref={boxRef} className="group relative">
        {/* Field surface: fades and settles in under the text while editing. */}
        <motion.span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 rounded-lg border bg-background ring-2",
            error
              ? "border-destructive ring-destructive/25"
              : "border-foreground/30 ring-ring/40",
          )}
          initial={false}
          animate={
            editing
              ? motionIn
              : reduce
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.98 }
          }
          transition={{ duration: editing ? 0.2 : 0.12, ease: EASE_OUT }}
        />

        {editing ? (
          multiline ? (
            <div className="relative grid">
              <span
                aria-hidden="true"
                className={cn(
                  textBox,
                  "invisible [grid-area:1/1]",
                  classNames?.input,
                )}
              >
                {`${draft} `}
              </span>
              <textarea
                ref={fieldRef}
                aria-label={label}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                rows={1}
                value={draft}
                maxLength={maxLength}
                placeholder={placeholder}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={onFieldKeyDown}
                onBlur={() => commit("blur")}
                className={cn(
                  textBox,
                  "relative resize-none overflow-hidden bg-transparent text-foreground caret-foreground outline-none [grid-area:1/1] placeholder:text-muted-foreground/60",
                  classNames?.input,
                )}
              />
            </div>
          ) : (
            <input
              ref={fieldRef}
              aria-label={label}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              value={draft}
              maxLength={maxLength}
              placeholder={placeholder}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={onFieldKeyDown}
              onBlur={() => commit("blur")}
              className={cn(
                textBox,
                "relative block bg-transparent text-foreground caret-foreground outline-none placeholder:text-muted-foreground/60",
                classNames?.input,
              )}
            />
          )
        ) : (
          <button
            ref={displayRef}
            type="button"
            disabled={disabled}
            aria-describedby={error ? errorId : undefined}
            onClick={startEditing}
            onKeyDown={(event) => {
              if (event.key === "F2") {
                event.preventDefault();
                startEditing();
              }
            }}
            className={cn(
              textBox,
              "relative block cursor-text transition-[background-color,opacity] duration-150",
              "outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/50",
              !multiline && "truncate",
              status === "pending" && "opacity-70",
              disabled && "cursor-not-allowed hover:bg-transparent",
              classNames?.display,
            )}
          >
            {shown ? (
              shown
            ) : (
              <span
                className={cn(
                  "text-muted-foreground/70 italic",
                  classNames?.placeholder,
                )}
              >
                {placeholder}
              </span>
            )}
            <span className="sr-only">, edit {label}</span>
          </button>
        )}

        <span className={iconSlot}>
          <AnimatePresence initial={false} mode="popLayout">
            {status === "pending" ? (
              <motion.span
                key="pending"
                className="flex"
                initial={motionOut}
                animate={motionIn}
                exit={motionOut}
                transition={SPRING_SWAP}
              >
                <Loader
                  variant="spinner"
                  size={14}
                  label="Saving"
                  className="text-muted-foreground"
                />
              </motion.span>
            ) : status === "saved" ? (
              <motion.span
                key="saved"
                className="flex size-4 items-center justify-center rounded-full bg-success text-background"
                initial={motionOut}
                animate={motionIn}
                exit={{ opacity: 0 }}
                transition={SPRING_PRESS}
              >
                <svg viewBox="0 0 24 24" fill="none" className="size-3" aria-hidden="true">
                  <motion.path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.05 }}
                  />
                </svg>
              </motion.span>
            ) : !editing && !disabled ? (
              <motion.span
                key="pencil"
                className="flex text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span className="flex opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </span>
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </div>

      <span className="sr-only" aria-live="polite">
        {status === "pending" ? "Saving" : status === "saved" ? "Saved" : ""}
      </span>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            id={errorId}
            role="alert"
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, y: -4, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, y: -4, filter: "blur(4px)" }
            }
            transition={{ duration: 0.2 }}
            className={cn(
              "px-2 pt-1 text-xs text-destructive",
              classNames?.errorMessage,
            )}
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
