"use client";

import { X } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import {
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Button, type ButtonProps } from "@/components/motion/button";
import { Input, type InputProps } from "@/components/motion/input";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                               Shared plumbing                              */
/* -------------------------------------------------------------------------- */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusable(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.tabIndex >= 0 && !el.closest("[inert]") && el.getClientRects().length > 0,
  );
}

// Open dialogs, innermost last. Only the top one answers Escape and Tab, so an
// AlertDialog opened from inside a Dialog doesn't close both at once.
const dialogStack: string[] = [];

// Reference-counted body scroll lock. The scrollbar's width is put back as
// padding so the page behind doesn't jump sideways when the bar disappears.
let lockCount = 0;
let savedBodyStyle: { overflow: string; paddingRight: string } | null = null;

function lockScroll() {
  lockCount += 1;
  if (lockCount > 1) return;
  const body = document.body;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  savedBodyStyle = {
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  };
  if (scrollbar > 0) {
    const current = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + scrollbar}px`;
  }
  body.style.overflow = "hidden";
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !savedBodyStyle) return;
  document.body.style.overflow = savedBodyStyle.overflow;
  document.body.style.paddingRight = savedBodyStyle.paddingRight;
  savedBodyStyle = null;
}

const SM_QUERY = "(max-width: 639.98px)";

function subscribeSmall(callback: () => void) {
  const mql = window.matchMedia(SM_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/** True below Tailwind's `sm` breakpoint. Always false on the server. */
function useBelowSm() {
  return useSyncExternalStore(
    subscribeSmall,
    () => window.matchMedia(SM_QUERY).matches,
    () => false,
  );
}

const SHAKE_X = [0, -7, 7, -5, 5, -2, 0];

/* -------------------------------------------------------------------------- */
/*                                   Context                                  */
/* -------------------------------------------------------------------------- */

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  alert: boolean;
  contentId: string;
  titleId: string;
  descriptionId: string;
  hasDescription: boolean;
  setHasDescription: (value: boolean) => void;
  /** Type-to-confirm (AlertDialog only). */
  confirmText?: string;
  confirmValue: string;
  setConfirmValue: (value: string) => void;
  confirmValid: boolean;
  confirmAttempted: boolean;
  setConfirmAttempted: (value: boolean) => void;
  confirmFieldRef: RefObject<HTMLDivElement | null>;
  confirmInputRef: RefObject<HTMLInputElement | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(component: string) {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error(`${component} must be used within <Dialog> or <AlertDialog>`);
  }
  return context;
}

export interface DialogProps {
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function DialogRoot({
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  alert,
  confirmText,
}: DialogProps & { alert: boolean; confirmText?: string }) {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : internalOpen;
  const [hasDescription, setHasDescription] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [confirmAttempted, setConfirmAttempted] = useState(false);
  const confirmFieldRef = useRef<HTMLDivElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  // A fresh confirmation every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setConfirmValue("");
    setConfirmAttempted(false);
  }, [open]);

  const confirmValid =
    confirmText === undefined || confirmValue.trim() === confirmText;

  const value = useMemo<DialogContextValue>(
    () => ({
      open,
      setOpen,
      alert,
      contentId: `${id}-content`,
      titleId: `${id}-title`,
      descriptionId: `${id}-description`,
      hasDescription,
      setHasDescription,
      confirmText,
      confirmValue,
      setConfirmValue,
      confirmValid,
      confirmAttempted,
      setConfirmAttempted,
      confirmFieldRef,
      confirmInputRef,
    }),
    [
      open,
      setOpen,
      alert,
      id,
      hasDescription,
      confirmText,
      confirmValue,
      confirmValid,
      confirmAttempted,
    ],
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

/**
 * Modal dialog root. Holds open state (controlled via `open`/`onOpenChange`
 * or uncontrolled via `defaultOpen`) for its Trigger, Content and Close parts.
 */
export function Dialog(props: DialogProps) {
  return <DialogRoot {...props} alert={false} />;
}

export interface AlertDialogProps extends DialogProps {
  /**
   * Require the user to type this exact text (e.g. the project name) into
   * `AlertDialogConfirmInput` before `AlertDialogAction` goes through.
   */
  confirmText?: string;
}

/**
 * Interrupting confirmation. Renders `role="alertdialog"`, never closes on an
 * outside click, and focuses `AlertDialogCancel` first so a stray Enter can't
 * confirm a destructive action.
 */
export function AlertDialog({ confirmText, ...props }: AlertDialogProps) {
  return <DialogRoot {...props} alert confirmText={confirmText} />;
}

/* -------------------------------------------------------------------------- */
/*                               Trigger & Close                              */
/* -------------------------------------------------------------------------- */

type ClonableChild = ReactElement<Record<string, unknown>>;

function composeClick(
  child: ClonableChild,
  action: () => void,
): (event: MouseEvent<HTMLElement>) => void {
  const childOnClick = child.props.onClick as
    | ((event: MouseEvent<HTMLElement>) => void)
    | undefined;
  return (event) => {
    childOnClick?.(event);
    if (!event.defaultPrevented) action();
  };
}

export interface DialogTriggerProps extends ButtonProps {
  /** Merge behaviour onto the single child element instead of rendering a `Button`. */
  asChild?: boolean;
}

/** Opens the dialog. Renders a library `Button`, or wraps its child with `asChild`. */
export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger({ asChild, children, onClick, ...rest }, ref) {
    const context = useDialogContext("DialogTrigger");
    const aria = {
      "aria-haspopup": "dialog" as const,
      "aria-expanded": context.open,
      "aria-controls": context.open ? context.contentId : undefined,
    };

    if (asChild && isValidElement(children)) {
      const child = children as ClonableChild;
      return cloneElement(child, {
        ...aria,
        onClick: composeClick(child, () => context.setOpen(true)),
      });
    }

    return (
      <Button
        ref={ref}
        {...rest}
        {...aria}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) context.setOpen(true);
        }}
      >
        {children}
      </Button>
    );
  },
);

export interface DialogCloseProps extends ButtonProps {
  /** Merge behaviour onto the single child element instead of rendering a `Button`. */
  asChild?: boolean;
}

/** Closes the dialog. Renders a library `Button` (outline by default), or wraps its child. */
export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose(
    { asChild, children, onClick, variant = "outline", ...rest },
    ref,
  ) {
    const context = useDialogContext("DialogClose");

    if (asChild && isValidElement(children)) {
      const child = children as ClonableChild;
      return cloneElement(child, {
        onClick: composeClick(child, () => context.setOpen(false)),
      });
    }

    return (
      <Button
        ref={ref}
        variant={variant}
        {...rest}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) context.setOpen(false);
        }}
      >
        {children}
      </Button>
    );
  },
);

/* -------------------------------------------------------------------------- */
/*                                   Content                                  */
/* -------------------------------------------------------------------------- */

export interface DialogContentProps {
  children: ReactNode;
  className?: string;
  /** Class for the dimmed, blurred backdrop. */
  overlayClassName?: string;
  /** Show the corner close (X) button. Default true for Dialog, false for AlertDialog. */
  showCloseButton?: boolean;
  closeLabel?: string;
  /**
   * Close when the backdrop is pressed. Default true for Dialog; AlertDialog
   * ignores it and never closes on an outside press.
   */
  closeOnOutsideClick?: boolean;
  /** Element to focus on open. Falls back to `[data-dialog-autofocus]`, then the first focusable. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Become a bottom-anchored sheet below the `sm` breakpoint. Default true. */
  sheetOnMobile?: boolean;
  /** Accessible name, when the content has no `DialogTitle`. */
  "aria-label"?: string;
}

const ENTER = { duration: 0.22, ease: EASE_OUT } as const;
const EXIT = { duration: 0.14, ease: EASE_OUT } as const;

function DialogContentInner({
  children,
  className,
  overlayClassName,
  showCloseButton,
  closeLabel = "Close",
  closeOnOutsideClick = true,
  initialFocus,
  sheetOnMobile = true,
  "aria-label": ariaLabel,
}: DialogContentProps) {
  const context = useDialogContext("DialogContent");
  const reduce = useReducedMotion() ?? false;
  const isPresent = useIsPresent();
  const belowSm = useBelowSm();
  const sheet = sheetOnMobile && belowSm;
  const panelRef = useRef<HTMLDivElement>(null);
  const stackId = useId();
  const { setOpen } = context;
  // Read through a ref so a new onOpenChange identity (inline handlers) does
  // not re-run the focus/scroll-lock effect and yank focus mid-typing.
  const setOpenRef = useRef(setOpen);
  const initialFocusRef = useRef(initialFocus);
  useEffect(() => {
    setOpenRef.current = setOpen;
    initialFocusRef.current = initialFocus;
  });
  const dismissOutside = closeOnOutsideClick && !context.alert;
  const withClose = showCloseButton ?? !context.alert;

  // Scroll lock, stack registration, initial focus, focus trap, Escape and
  // focus return. Runs while this panel is mounted *and* present, so the
  // exit animation already behaves like a closed dialog.
  useEffect(() => {
    if (!isPresent) return;
    const returnTo =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogStack.push(stackId);
    lockScroll();

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        initialFocusRef.current?.current ??
        panel.querySelector<HTMLElement>("[data-dialog-autofocus]") ??
        getFocusable(panel).find((el) => !el.hasAttribute("data-dialog-close-x")) ??
        panel;
      target.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== stackId) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenRef.current(false);
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      const focusable = getFocusable(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !panel?.contains(active);
      if (event.shiftKey && (active === first || active === panel || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      const index = dialogStack.lastIndexOf(stackId);
      if (index !== -1) dialogStack.splice(index, 1);
      unlockScroll();
      if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
    };
  }, [isPresent, stackId]);

  const panelInitial = reduce
    ? { opacity: 0 }
    : sheet
      ? { opacity: 0, y: "100%" }
      : { opacity: 0, scale: 0.96 };
  const panelExit = reduce
    ? { opacity: 0, transition: EXIT }
    : sheet
      ? { opacity: 0, y: "100%", transition: { duration: 0.2, ease: EASE_OUT } }
      : { opacity: 0, scale: 0.97, transition: EXIT };

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      style={{ pointerEvents: isPresent ? undefined : "none" }}
    >
      <motion.button
        type="button"
        aria-label={closeLabel}
        tabIndex={-1}
        disabled={!dismissOutside}
        onClick={() => setOpen(false)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: EXIT }}
        transition={ENTER}
        className={cn(
          "pointer-events-auto absolute inset-0 h-full w-full cursor-default bg-black/35 backdrop-blur-sm disabled:cursor-default dark:bg-black/55",
          overlayClassName,
        )}
      />

      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex justify-center",
          sheet ? "items-end" : "items-center p-4",
        )}
      >
        <motion.div
          ref={panelRef}
          id={context.contentId}
          role={context.alert ? "alertdialog" : "dialog"}
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : context.titleId}
          aria-describedby={context.hasDescription ? context.descriptionId : undefined}
          tabIndex={-1}
          initial={panelInitial}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={panelExit}
          transition={reduce ? ENTER : sheet ? { duration: 0.32, ease: EASE_OUT } : ENTER}
          style={{ pointerEvents: isPresent ? "auto" : "none" }}
          className={cn(
            "relative flex w-full flex-col gap-5 overflow-y-auto border-border bg-background p-6 text-foreground shadow-2xl outline-none",
            "[scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]",
            sheet
              ? "max-h-[88dvh] rounded-t-3xl border-t pb-[max(1.5rem,env(safe-area-inset-bottom))]"
              : "max-h-[calc(100dvh-2rem)] max-w-md rounded-3xl border",
            className,
          )}
        >
          {sheet ? (
            <span
              aria-hidden="true"
              className="mx-auto -mt-2 -mb-1 h-1 w-10 shrink-0 rounded-full bg-foreground/15"
            />
          ) : null}
          {children}
          {withClose ? (
            <button
              type="button"
              aria-label={closeLabel}
              data-dialog-close-x=""
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * The modal surface. Portals to `document.body`, fades a blurred backdrop in,
 * scales the panel from 0.96 (fade only under reduced motion), traps focus,
 * closes on Escape and returns focus to whatever opened it.
 */
export function DialogContent(props: DialogContentProps) {
  const context = useDialogContext("DialogContent");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {context.open ? <DialogContentInner key="dialog" {...props} /> : null}
    </AnimatePresence>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/*                                Text & layout                               */
/* -------------------------------------------------------------------------- */

export function DialogHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 pr-8 text-left", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"h2">, "id">) {
  const context = useDialogContext("DialogTitle");
  return (
    <h2
      id={context.titleId}
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"p">, "id">) {
  const context = useDialogContext("DialogDescription");
  const { setHasDescription } = context;
  useEffect(() => {
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);
  return (
    <p
      id={context.descriptionId}
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                              AlertDialog parts                             */
/* -------------------------------------------------------------------------- */

export const AlertDialogTrigger = DialogTrigger;
export type AlertDialogTriggerProps = DialogTriggerProps;
export const AlertDialogHeader = DialogHeader;
export const AlertDialogFooter = DialogFooter;
export const AlertDialogTitle = DialogTitle;
export const AlertDialogDescription = DialogDescription;

export type AlertDialogContentProps = Omit<
  DialogContentProps,
  "closeOnOutsideClick"
>;

export function AlertDialogContent(props: AlertDialogContentProps) {
  return <DialogContent {...props} />;
}

export interface AlertDialogCancelProps extends ButtonProps {}

/** The safe choice. Receives initial focus when the AlertDialog opens. */
export const AlertDialogCancel = forwardRef<HTMLButtonElement, AlertDialogCancelProps>(
  function AlertDialogCancel({ children = "Cancel", ...props }, ref) {
    return (
      <DialogClose ref={ref} data-dialog-autofocus="" {...props}>
        {children}
      </DialogClose>
    );
  },
);

export interface AlertDialogActionProps extends ButtonProps {
  /** `destructive` (default) paints the button in the destructive token. */
  tone?: "destructive" | "default";
}

/**
 * The confirming action. Closes the dialog after `onClick` unless the handler
 * calls `event.preventDefault()`. With `confirmText` set on the AlertDialog it
 * stays `aria-disabled` until the text matches; pressing it early shakes the
 * confirm field and moves focus there.
 */
export const AlertDialogAction = forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  function AlertDialogAction(
    { tone = "destructive", className, onClick, children, ...props },
    ref,
  ) {
    const context = useDialogContext("AlertDialogAction");
    const reduce = useReducedMotion();
    const blocked = !context.confirmValid;

    return (
      <Button
        ref={ref}
        variant="primary"
        aria-disabled={blocked || undefined}
        data-alert-dialog-action=""
        {...props}
        className={cn(
          tone === "destructive" &&
            "bg-destructive text-white hover:bg-destructive/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          blocked && "opacity-55",
          blocked &&
            (tone === "destructive" ? "hover:bg-destructive" : "hover:bg-primary"),
          className,
        )}
        onClick={(event) => {
          if (blocked) {
            event.preventDefault();
            // The field's own error shake plays the first time the message
            // appears; later attempts shake it here instead.
            const errorShowing = context.confirmAttempted;
            context.setConfirmAttempted(true);
            const field = context.confirmFieldRef.current;
            if (field && errorShowing && !reduce) {
              animate(field, { x: SHAKE_X }, { duration: 0.4 });
            }
            context.confirmInputRef.current?.focus();
            return;
          }
          onClick?.(event);
          if (!event.defaultPrevented) context.setOpen(false);
        }}
      >
        {children}
      </Button>
    );
  },
);

export interface AlertDialogConfirmInputProps
  extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "error"> {
  /** Message shown when confirming with a mismatch. */
  mismatchMessage?: string;
}

/**
 * Type-to-confirm field for an `AlertDialog` with `confirmText`. Enter submits
 * through `AlertDialogAction`'s rules.
 */
export function AlertDialogConfirmInput({
  label,
  mismatchMessage = "That doesn't match. Check the spelling and try again.",
  className,
  onKeyDown,
  ...props
}: AlertDialogConfirmInputProps) {
  const context = useDialogContext("AlertDialogConfirmInput");
  const target = context.confirmText ?? "";
  const showError = context.confirmAttempted && !context.confirmValid;

  return (
    <div ref={context.confirmFieldRef} className={className}>
      <Input
        ref={context.confirmInputRef}
        label={label ?? `Type "${target}" to confirm`}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        {...props}
        value={context.confirmValue}
        onChange={context.setConfirmValue}
        error={showError ? mismatchMessage : undefined}
        success={target !== "" && context.confirmValid}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || event.key !== "Enter") return;
          event.preventDefault();
          const panel = event.currentTarget.closest<HTMLElement>("[role='alertdialog']");
          panel?.querySelector<HTMLButtonElement>("[data-alert-dialog-action]")?.click();
        }}
      />
    </div>
  );
}
