"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from "react";
import { EASE_OUT_CSS, SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type TextareaClassNames = {
  root?: string;
  label?: string;
  description?: string;
  field?: string;
  textarea?: string;
  counter?: string;
  errorMessage?: string;
};

export interface TextareaProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "defaultValue" | "onChange" | "rows"
  > {
  label?: string;
  /** Helper text under the label, linked through aria-describedby. */
  description?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Truthy error triggers a shake, red border and (if a string) a message. */
  error?: string | boolean;
  /** Rows shown when empty; the field never shrinks below this. */
  minRows?: number;
  /** Rows the field grows to before it starts scrolling. */
  maxRows?: number;
  /** Shows the character counter. Defaults to true when `maxLength` is set. */
  showCount?: boolean;
  /** Fraction of `maxLength` at which the counter turns to the warning color. */
  warnAt?: number;
  className?: string;
  classNames?: TextareaClassNames;
}

const SHAKE = { x: [0, -6, 6, -4, 4, -2, 0] };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      description,
      value: valueProp,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      error,
      minRows = 3,
      maxRows = 8,
      maxLength,
      showCount,
      warnAt = 0.9,
      placeholder,
      className,
      classNames,
      disabled,
      id: idProp,
      ...rest
    },
    forwardedRef,
  ) {
    const reactId = useId();
    const id = idProp ?? reactId;
    const reduce = useReducedMotion();

    const controlled = valueProp !== undefined;
    const [internal, setInternal] = useState(defaultValue ?? "");
    const value = controlled ? (valueProp ?? "") : internal;

    const [focused, setFocused] = useState(false);
    const [height, setHeight] = useState<number | null>(null);
    const [scrolls, setScrolls] = useState(false);

    const fieldRef = useRef<HTMLDivElement>(null);
    const counterRef = useRef<HTMLSpanElement>(null);
    const mirrorRef = useRef<HTMLTextAreaElement>(null);
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const hasError = Boolean(error);
    const errorMessage = typeof error === "string" ? error : null;
    const countVisible = showCount ?? maxLength !== undefined;
    const count = value.length;
    const ratio = maxLength ? count / maxLength : 0;
    const atLimit = maxLength !== undefined && count >= maxLength;
    const nearLimit = maxLength !== undefined && ratio >= warnAt && !atLimit;

    // Measure the content with an invisible twin so the real field can
    // transition between pixel heights (resetting it to `auto` would kill the
    // transition). Height is this component's purpose, so it animates layout.
    const measure = useCallback(() => {
      const mirror = mirrorRef.current;
      if (!mirror) return;
      const style = getComputedStyle(mirror);
      const lineHeight = Number.parseFloat(style.lineHeight) || 24;
      const padY =
        Number.parseFloat(style.paddingTop) +
        Number.parseFloat(style.paddingBottom);
      const min = lineHeight * minRows + padY;
      const max = lineHeight * Math.max(minRows, maxRows) + padY;
      const content = mirror.scrollHeight;
      setHeight(Math.min(max, Math.max(min, content)));
      setScrolls(content > max + 1);
    }, [minRows, maxRows]);

    useLayoutEffect(() => {
      if (mirrorRef.current) mirrorRef.current.value = value || " ";
      measure();
    }, [value, measure]);

    // Width changes rewrap the text, so re-measure on resize.
    useEffect(() => {
      const field = fieldRef.current;
      if (!field || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => measure());
      observer.observe(field);
      return () => observer.disconnect();
    }, [measure]);

    // Shake the field when an error appears.
    useEffect(() => {
      if (!fieldRef.current || reduce || !hasError) return;
      animate(fieldRef.current, SHAKE, { duration: 0.45 });
    }, [hasError, reduce]);

    const nudgeCounter = useCallback(() => {
      if (!counterRef.current || reduce) return;
      animate(
        counterRef.current,
        { x: [0, -4, 4, -3, 3, 0] },
        { duration: 0.35 },
      );
    }, [reduce]);

    // Typing or pasting past `maxLength` is blocked natively; catch the
    // attempt first so the counter can shake. Native listener because React's
    // onBeforeInput misses paste and line breaks.
    useEffect(() => {
      const el = innerRef.current;
      if (!el || maxLength === undefined) return;
      const onBeforeInput = (event: InputEvent) => {
        if (!event.inputType.startsWith("insert")) return;
        const data =
          event.data ??
          event.dataTransfer?.getData("text/plain") ??
          (event.inputType === "insertLineBreak" ? "\n" : "");
        const selected = el.selectionEnd - el.selectionStart;
        if (el.value.length - selected + data.length > maxLength) {
          nudgeCounter();
        }
      };
      el.addEventListener("beforeinput", onBeforeInput);
      return () => el.removeEventListener("beforeinput", onBeforeInput);
    }, [maxLength, nudgeCounter]);

    const handleChange = (next: string) => {
      if (!controlled) setInternal(next);
      onChange?.(next);
    };

    const describedBy =
      [
        description ? `${id}-description` : null,
        countVisible ? `${id}-count` : null,
        errorMessage ? `${id}-error` : null,
      ]
        .filter(Boolean)
        .join(" ") || undefined;

    const sharedText =
      "block w-full resize-none bg-transparent px-3.5 py-2.5 text-base leading-6";

    return (
      <div
        className={cn("flex flex-col gap-1.5", className, classNames?.root)}
      >
        {label || description ? (
          <div className="flex flex-col gap-0.5 px-1">
            {label ? (
              <label
                htmlFor={id}
                className={cn(
                  "text-sm font-medium text-foreground",
                  classNames?.label,
                )}
              >
                {label}
              </label>
            ) : null}
            {description ? (
              <p
                id={`${id}-description`}
                className={cn(
                  "text-xs text-muted-foreground",
                  classNames?.description,
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          ref={fieldRef}
          data-state={hasError ? "error" : focused ? "focused" : "idle"}
          className={cn(
            "relative overflow-hidden rounded-2xl border transition-colors duration-200",
            "border-border",
            focused && !hasError && "border-foreground/40 ring-2 ring-ring/40",
            hasError && "border-destructive ring-2 ring-destructive/25",
            disabled && "opacity-60",
            classNames?.field,
          )}
        >
          <textarea
            ref={mirrorRef}
            aria-hidden="true"
            tabIndex={-1}
            readOnly
            rows={1}
            className={cn(
              sharedText,
              "pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden",
              classNames?.textarea,
            )}
          />
          <textarea
            ref={setRefs}
            id={id}
            rows={minRows}
            value={value}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            {...rest}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            style={{
              height: height ?? undefined,
              transition: reduce ? undefined : `height 160ms ${EASE_OUT_CSS}`,
              ...rest.style,
            }}
            className={cn(
              sharedText,
              "text-foreground caret-foreground outline-none",
              "placeholder:text-muted-foreground/60",
              scrolls
                ? "overflow-y-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
                : "overflow-y-hidden",
              disabled && "cursor-not-allowed",
              classNames?.textarea,
            )}
          />

          {countVisible ? (
            <div className="flex justify-end px-3.5 pb-2">
              <span
                ref={counterRef}
                id={`${id}-count`}
                className={cn(
                  "inline-block text-xs tabular-nums text-muted-foreground transition-colors duration-200",
                  nearLimit && "text-warning",
                  atLimit && "text-destructive",
                  classNames?.counter,
                )}
              >
                <motion.span
                  key={atLimit ? "limit" : "count"}
                  className="inline-block"
                  initial={reduce || !atLimit ? false : { scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={SPRING_PRESS}
                >
                  {maxLength !== undefined ? `${count}/${maxLength}` : count}
                </motion.span>
                <span className="sr-only">
                  {maxLength !== undefined
                    ? ` characters used, ${maxLength - count} remaining`
                    : " characters"}
                </span>
              </span>
            </div>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {errorMessage ? (
            <motion.p
              id={`${id}-error`}
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
                "px-1 text-xs text-destructive",
                classNames?.errorMessage,
              )}
            >
              {errorMessage}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    );
  },
);
