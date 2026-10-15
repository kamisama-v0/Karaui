"use client";

import { Check, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  cloneElement,
  createContext,
  isValidElement,
  type MutableRefObject,
  type ReactElement,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  type PlacementAlign,
  type PlacementSide,
  resolvePlacement,
} from "@/components/motion/anchored-placement";
import { usePopoverPortalPosition } from "@/components/motion/popover-position";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL } from "@/lib/ease";
import { useDismiss } from "@/lib/hooks/use-dismiss";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   Levels                                   */
/* -------------------------------------------------------------------------- */

/** Where focus lands when a panel opens. */
type FocusIntent = "first" | "last" | "content" | "none";

// Hovering a sub trigger waits this long before opening, so a pointer just
// passing over the row on its way down the list doesn't flash a submenu.
const SUB_OPEN_DELAY = 100;
// Leaving the sub trigger (or hovering a sibling) closes the submenu only
// after this grace, so a diagonal move toward the submenu that clips a
// neighbouring row doesn't snap it shut.
const SUB_CLOSE_DELAY = 220;
const TYPEAHEAD_RESET = 500;

/**
 * One open panel: the root menu or a submenu. Items, the active-row
 * highlight and keyboard navigation all read the nearest level, so a submenu
 * is the same machinery one step down.
 */
interface MenuLevel {
  /** Shared by every panel and the trigger of one menu tree (dismissal scope). */
  rootId: string;
  /** Scope for this panel's layoutId highlight. */
  levelId: string;
  open: boolean;
  isSub: boolean;
  triggerId: string;
  contentId: string;
  triggerRef: MutableRefObject<HTMLElement | null>;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  focusIntent: MutableRefObject<FocusIntent>;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  /** Id of the child submenu currently open from this panel. */
  openSub: string | null;
  setOpenSub: (id: string | null) => void;
  scheduleSubClose: () => void;
  cancelSubClose: () => void;
  /** Close this panel only (root: the whole menu). */
  close: (restoreFocus: boolean) => void;
  /** Close the whole menu tree. */
  closeAll: (restoreFocus: boolean) => void;
  /** Open the root menu (used by the trigger). */
  openRoot: () => void;
  reduce: boolean;
}

const MenuLevelContext = createContext<MenuLevel | null>(null);

function useMenuLevel(component: string) {
  const level = useContext(MenuLevelContext);
  if (!level) throw new Error(`${component} must be used within <DropdownMenu>`);
  return level;
}

/** Per-panel state shared by the root and every submenu. */
function useLevelCore(open: boolean) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openSub, setOpenSubState] = useState<string | null>(null);
  const subCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelSubClose = useCallback(() => {
    if (subCloseTimer.current) clearTimeout(subCloseTimer.current);
    subCloseTimer.current = null;
  }, []);

  const setOpenSub = useCallback(
    (id: string | null) => {
      cancelSubClose();
      setOpenSubState(id);
    },
    [cancelSubClose],
  );

  const scheduleSubClose = useCallback(() => {
    cancelSubClose();
    subCloseTimer.current = setTimeout(() => {
      subCloseTimer.current = null;
      setOpenSubState(null);
    }, SUB_CLOSE_DELAY);
  }, [cancelSubClose]);

  // Reset the highlight when the panel opens, not when it closes: removing
  // the layoutId highlight while the panel is still animating out leaves
  // motion waiting on it forever, so the closed panel never unmounts.
  useEffect(() => {
    if (open) {
      setActiveId(null);
      return;
    }
    cancelSubClose();
    setOpenSubState(null);
  }, [open, cancelSubClose]);

  useEffect(() => cancelSubClose, [cancelSubClose]);

  return useMemo(
    () => ({
      activeId,
      setActiveId,
      openSub,
      setOpenSub,
      scheduleSubClose,
      cancelSubClose,
    }),
    [activeId, openSub, setOpenSub, scheduleSubClose, cancelSubClose],
  );
}

function getItems(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-dropdown-menu-item]:not([data-disabled="true"])',
    ),
  );
}

function focusByIntent(container: HTMLElement | null, intent: FocusIntent) {
  if (!container || intent === "none") return;
  const items = getItems(container);
  const target =
    intent === "first"
      ? items[0]
      : intent === "last"
        ? items[items.length - 1]
        : container;
  (target ?? container).focus({ preventScroll: true });
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as MutableRefObject<T | null>).current = value;
}

/* -------------------------------------------------------------------------- */
/*                                    Root                                    */
/* -------------------------------------------------------------------------- */

export interface DropdownMenuProps {
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Composable dropdown menu following the WAI-ARIA menu button pattern. The
 * panel scales out of the trigger side, an active-row highlight glides
 * between items, and submenus open on hover intent or ArrowRight.
 */
export function DropdownMenu({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : internalOpen;
  const baseId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const focusIntent = useRef<FocusIntent>("content");
  const reduce = useReducedMotion() ?? false;
  const core = useLevelCore(open);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  const closeAll = useCallback(
    (restoreFocus: boolean) => {
      setOpen(false);
      if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
    },
    [setOpen],
  );

  const dismiss = useCallback(() => setOpen(false), [setOpen]);
  const openRoot = useCallback(() => setOpen(true), [setOpen]);
  const insideTree = useCallback(
    (target: Element) =>
      Boolean(target.closest(`[data-dropdown-menu="${baseId}"]`)),
    [baseId],
  );
  // Escape is handled by the focused panel, which knows whether it is a
  // submenu (close one level) or the root (close and refocus the trigger).
  useDismiss(open, dismiss, null, { escape: false, ignore: insideTree });

  // Focus moves into the panel on open: the first/last item for keyboard
  // opens, the panel itself for pointer opens so arrows work immediately.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      focusByIntent(contentRef.current, focusIntent.current),
    );
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const level = useMemo<MenuLevel>(
    () => ({
      rootId: baseId,
      levelId: `${baseId}-root`,
      open,
      isSub: false,
      triggerId: `${baseId}-trigger`,
      contentId: `${baseId}-content`,
      triggerRef,
      contentRef,
      focusIntent,
      ...core,
      close: closeAll,
      closeAll,
      openRoot,
      reduce,
    }),
    [baseId, open, core, closeAll, openRoot, reduce],
  );

  return (
    <MenuLevelContext.Provider value={level}>
      <div className={cn("relative inline-flex", className)}>{children}</div>
    </MenuLevelContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Trigger                                   */
/* -------------------------------------------------------------------------- */

type TriggerChildProps = React.HTMLAttributes<HTMLElement> & {
  ref?: Ref<HTMLElement>;
  [key: `data-${string}`]: string | undefined;
};

export interface DropdownMenuTriggerProps {
  /** A single element, normally a `<button>`. Its own handlers still run. */
  children: ReactElement<TriggerChildProps>;
  className?: string;
}

export function DropdownMenuTrigger({
  children,
  className,
}: DropdownMenuTriggerProps) {
  const level = useMenuLevel("DropdownMenuTrigger");
  if (!isValidElement(children)) {
    throw new Error("<DropdownMenuTrigger> requires a single React element");
  }
  const childProps = children.props;
  const childRef = childProps.ref;

  const openWith = (intent: FocusIntent) => {
    level.focusIntent.current = intent;
    if (!level.open) {
      level.openRoot();
    } else {
      focusByIntent(level.contentRef.current, intent);
    }
  };

  return cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      level.triggerRef.current = node;
      assignRef(childRef, node);
    },
    id: level.triggerId,
    "aria-haspopup": "menu",
    "aria-expanded": level.open,
    "aria-controls": level.open ? level.contentId : undefined,
    "data-state": level.open ? "open" : "closed",
    "data-dropdown-menu": level.rootId,
    className: cn(childProps.className, className),
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      childProps.onClick?.(event);
      if (event.defaultPrevented) return;
      if (level.open) {
        level.closeAll(false);
        return;
      }
      // `detail` is 0 for a click synthesized by the keyboard.
      openWith(event.detail === 0 ? "first" : "content");
    },
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
      childProps.onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        openWith("first");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        openWith("last");
      }
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                                   Panel                                    */
/* -------------------------------------------------------------------------- */

interface MenuPanelProps {
  level: MenuLevel;
  children: ReactNode;
  side: PlacementSide;
  align: PlacementAlign;
  sideOffset: number;
  alignOffset: number;
  className?: string;
  ariaLabel?: string;
  onPanelEnter?: () => void;
}

function MenuPanel({
  level,
  children,
  side,
  align,
  sideOffset,
  alignOffset,
  className,
  ariaLabel,
  onPanelEnter,
}: MenuPanelProps) {
  const [portalReady, setPortalReady] = useState(false);
  const typeahead = useRef("");
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layout = usePopoverPortalPosition(
    level.triggerRef,
    level.contentRef,
    portalReady && level.open,
  );

  useEffect(() => setPortalReady(true), []);
  useEffect(
    () => () => {
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
    },
    [],
  );

  const moveFocus = (direction: 1 | -1) => {
    const items = getItems(level.contentRef.current);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
      current < 0
        ? direction === 1
          ? 0
          : items.length - 1
        : (current + direction + items.length) % items.length;
    items[next]?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // React bubbles events through portals: a submenu's keys would reach its
    // parent panel too. Only answer keys pressed inside this panel's DOM.
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (event.defaultPrevented) return;
    const { key } = event;

    if (key === "Escape") {
      event.preventDefault();
      level.close(true);
      return;
    }
    if (key === "ArrowLeft" && level.isSub) {
      event.preventDefault();
      level.close(true);
      return;
    }
    if (key === "Tab") {
      event.preventDefault();
      level.closeAll(true);
      return;
    }
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      moveFocus(key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (key === "Home" || key === "End") {
      event.preventDefault();
      const items = getItems(level.contentRef.current);
      items[key === "Home" ? 0 : items.length - 1]?.focus();
      return;
    }
    const printable =
      key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    // A leading space is activation, not a search character.
    if (!printable || (key === " " && typeahead.current === "")) return;
    event.preventDefault();
    typeahead.current += key.toLocaleLowerCase();
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
    typeaheadTimer.current = setTimeout(() => {
      typeahead.current = "";
    }, TYPEAHEAD_RESET);
    const items = getItems(level.contentRef.current);
    const start = items.indexOf(document.activeElement as HTMLElement);
    // Search from the row after the current one so repeating a letter cycles.
    const ordered =
      typeahead.current.length === 1 && start >= 0
        ? [...items.slice(start + 1), ...items.slice(0, start + 1)]
        : items;
    const match = ordered.find((item) =>
      (item.dataset.label ?? item.textContent ?? "")
        .trim()
        .toLocaleLowerCase()
        .startsWith(typeahead.current),
    );
    match?.focus();
  };

  if (!portalReady) return null;

  const placement = layout
    ? resolvePlacement(layout, { side, align, sideOffset, alignOffset })
    : null;

  return createPortal(
    <AnimatePresence>
      {level.open ? (
        <motion.div
          ref={level.contentRef}
          id={level.contentId}
          role="menu"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : level.triggerId}
          aria-orientation="vertical"
          tabIndex={-1}
          data-dropdown-menu={level.rootId}
          data-side={placement?.side ?? side}
          initial={level.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          // pointerEvents flips at the start of the exit, so a closing panel
          // can never be hovered or clicked through.
          exit={
            level.reduce
              ? { opacity: 0, pointerEvents: "none", transition: { duration: 0.1 } }
              : {
                  opacity: 0,
                  scale: 0.96,
                  pointerEvents: "none",
                  transition: { duration: 0.12, ease: EASE_OUT },
                }
          }
          transition={
            level.reduce
              ? { duration: 0.12, ease: EASE_OUT }
              : { ...SPRING_PANEL, opacity: { duration: 0.16, ease: EASE_OUT } }
          }
          style={{
            left: placement?.left ?? 0,
            top: placement?.top ?? 0,
            // The panel grows out of the trigger's side — transform-origin on
            // an HTML element is safe for motion's scale.
            transformOrigin: placement?.origin ?? "50% 0%",
            visibility: placement ? "visible" : "hidden",
          }}
          onKeyDown={onKeyDown}
          onFocus={(event: ReactFocusEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) level.setActiveId(null);
            else onPanelEnter?.();
          }}
          onPointerEnter={onPanelEnter}
          className={cn(
            "fixed z-[100] min-w-52 rounded-xl border border-border bg-card p-1.5 text-foreground shadow-[0_18px_40px_-12px_rgba(0,0,0,0.28)] outline-none",
            className,
          )}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export interface DropdownMenuContentProps {
  children: ReactNode;
  /** Preferred side; flips when the viewport lacks room. Default "bottom". */
  side?: "bottom" | "top";
  /** Alignment against the trigger. Default "start". */
  align?: PlacementAlign;
  /** Gap between trigger and panel, in px. Default 6. */
  sideOffset?: number;
  alignOffset?: number;
  /** Accessible name; defaults to the trigger's text via aria-labelledby. */
  ariaLabel?: string;
  className?: string;
}

export function DropdownMenuContent({
  children,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  alignOffset = 0,
  ariaLabel,
  className,
}: DropdownMenuContentProps) {
  const level = useMenuLevel("DropdownMenuContent");
  return (
    <MenuPanel
      level={level}
      side={side}
      align={align}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      ariaLabel={ariaLabel}
      className={className}
    >
      {children}
    </MenuPanel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Items                                    */
/* -------------------------------------------------------------------------- */

type ItemVariant = "default" | "destructive";

interface ItemBaseProps {
  children: ReactNode;
  itemId?: string;
  role?: "menuitem" | "menuitemcheckbox" | "menuitemradio";
  ariaChecked?: boolean;
  disabled?: boolean;
  variant?: ItemVariant;
  inset?: boolean;
  textValue?: string;
  className?: string;
  closeOnSelect: boolean;
  onActivate?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  isSubTrigger?: boolean;
  extraProps?: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    ref?: Ref<HTMLButtonElement>;
    [key: `data-${string}`]: string | undefined;
  };
}

function ItemBase({
  children,
  itemId,
  role = "menuitem",
  ariaChecked,
  disabled = false,
  variant = "default",
  inset = false,
  textValue,
  className,
  closeOnSelect,
  onActivate,
  isSubTrigger = false,
  extraProps,
}: ItemBaseProps) {
  const level = useMenuLevel("DropdownMenuItem");
  const autoId = useId();
  const id = itemId ?? autoId;
  const highlighted = level.activeId === id;
  const checkedProps =
    role === "menuitem" ? {} : { "aria-checked": ariaChecked ?? false };
  const { onPointerEnter, onPointerLeave, onKeyDown, ref, ...rest } =
    extraProps ?? {};

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      id={id}
      role={role}
      {...checkedProps}
      disabled={disabled}
      tabIndex={-1}
      data-dropdown-menu-item=""
      data-disabled={disabled ? "true" : undefined}
      data-highlighted={highlighted ? "" : undefined}
      data-label={textValue}
      onFocus={() => level.setActiveId(id)}
      onPointerEnter={(event: ReactPointerEvent<HTMLButtonElement>) => {
        onPointerEnter?.(event);
        if (!isSubTrigger && event.pointerType !== "touch") {
          level.scheduleSubClose();
        }
      }}
      onPointerMove={(event: ReactPointerEvent<HTMLButtonElement>) => {
        if (disabled || event.pointerType === "touch") return;
        if (document.activeElement !== event.currentTarget) {
          event.currentTarget.focus({ preventScroll: true });
        }
      }}
      onPointerLeave={(event: ReactPointerEvent<HTMLButtonElement>) => {
        onPointerLeave?.(event);
        if (event.pointerType === "touch" || isSubTrigger) return;
        // Clearing focus to the panel drops the highlight when the pointer
        // leaves the rows, the way native menus behave.
        if (document.activeElement === event.currentTarget) {
          level.contentRef.current?.focus({ preventScroll: true });
        }
      }}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (disabled) return;
        onActivate?.(event);
        if (closeOnSelect && !event.defaultPrevented) level.closeAll(true);
      }}
      className={cn(
        "relative isolate flex w-full select-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] outline-none",
        "disabled:pointer-events-none disabled:opacity-40",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        inset && "pl-8",
        variant === "destructive"
          ? "text-destructive [&_svg]:text-destructive"
          : "text-foreground [&_svg]:text-muted-foreground",
        className,
      )}
    >
      {/* Its own presence boundary: a layoutId element registers with the
          nearest AnimatePresence, and the panel's exit would otherwise wait
          on the highlight's layout animation and never unmount. */}
      <AnimatePresence initial={false}>
        {highlighted ? (
          <motion.span
            aria-hidden="true"
            layoutId={`${level.levelId}-highlight`}
            className={cn(
              "absolute inset-0 -z-10 rounded-lg",
              variant === "destructive"
                ? "bg-destructive/10"
                : "bg-foreground/[0.07]",
            )}
            transition={level.reduce ? { duration: 0 } : SPRING_LAYOUT}
          />
        ) : null}
      </AnimatePresence>
      {children}
    </button>
  );
}

function Shortcut({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="ml-auto pl-4 font-mono text-[11px] tracking-wide text-muted-foreground"
    >
      {children}
    </span>
  );
}

export interface DropdownMenuItemProps {
  children: ReactNode;
  /** Leading icon (sized to 16px). */
  icon?: ReactNode;
  /** Trailing shortcut hint, e.g. "⌘K" or a `KbdCombo`. Decorative. */
  shortcut?: ReactNode;
  variant?: ItemVariant;
  disabled?: boolean;
  /** Indent to line up with checkbox/radio rows. */
  inset?: boolean;
  /** Text used by typeahead when children aren't plain text. */
  textValue?: string;
  /** Call `event.preventDefault()` to keep the menu open. */
  onSelect?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  /** Default true. */
  closeOnSelect?: boolean;
  className?: string;
}

export function DropdownMenuItem({
  children,
  icon,
  shortcut,
  onSelect,
  closeOnSelect = true,
  ...props
}: DropdownMenuItemProps) {
  return (
    <ItemBase {...props} closeOnSelect={closeOnSelect} onActivate={onSelect}>
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <Shortcut>{shortcut}</Shortcut> : null}
    </ItemBase>
  );
}

function Indicator({
  checked,
  kind,
  reduce,
}: {
  checked: boolean;
  kind: "check" | "dot";
  reduce: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="absolute left-2.5 flex size-4 items-center justify-center"
    >
      <AnimatePresence initial={false}>
        {checked ? (
          <motion.span
            key={kind}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            transition={reduce ? { duration: 0.08 } : SPRING_PANEL}
            className="flex items-center justify-center text-foreground"
          >
            {kind === "check" ? (
              <Check className="size-3.5! text-foreground!" strokeWidth={2.6} />
            ) : (
              <span className="size-1.5 rounded-full bg-current" />
            )}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

export interface DropdownMenuCheckboxItemProps
  extends Omit<DropdownMenuItemProps, "onSelect" | "inset" | "icon"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/** A toggle row. Stays open on select by default so several can be flipped. */
export function DropdownMenuCheckboxItem({
  children,
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  shortcut,
  closeOnSelect = false,
  ...props
}: DropdownMenuCheckboxItemProps) {
  const level = useMenuLevel("DropdownMenuCheckboxItem");
  const [internal, setInternal] = useState(defaultChecked);
  const checked = controlledChecked ?? internal;
  return (
    <ItemBase
      {...props}
      inset
      role="menuitemcheckbox"
      ariaChecked={checked}
      closeOnSelect={closeOnSelect}
      onActivate={() => {
        if (controlledChecked === undefined) setInternal(!checked);
        onCheckedChange?.(!checked);
      }}
    >
      <Indicator checked={checked} kind="check" reduce={level.reduce} />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <Shortcut>{shortcut}</Shortcut> : null}
    </ItemBase>
  );
}

interface RadioGroupContextValue {
  value: string | undefined;
  select: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface DropdownMenuRadioGroupProps {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible name for the group. */
  ariaLabel?: string;
  className?: string;
}

export function DropdownMenuRadioGroup({
  children,
  value: controlledValue,
  defaultValue,
  onValueChange,
  ariaLabel,
  className,
}: DropdownMenuRadioGroupProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlledValue ?? internal;
  const ctx = useMemo<RadioGroupContextValue>(
    () => ({
      value,
      select: (next) => {
        if (controlledValue === undefined) setInternal(next);
        onValueChange?.(next);
      },
    }),
    [value, controlledValue, onValueChange],
  );
  return (
    <RadioGroupContext.Provider value={ctx}>
      <fieldset
        aria-label={ariaLabel}
        className={cn("m-0 min-w-0 border-0 p-0", className)}
      >
        {children}
      </fieldset>
    </RadioGroupContext.Provider>
  );
}

export interface DropdownMenuRadioItemProps
  extends Omit<DropdownMenuItemProps, "onSelect" | "inset" | "icon"> {
  value: string;
}

export function DropdownMenuRadioItem({
  children,
  value,
  shortcut,
  closeOnSelect = false,
  ...props
}: DropdownMenuRadioItemProps) {
  const level = useMenuLevel("DropdownMenuRadioItem");
  const group = useContext(RadioGroupContext);
  if (!group) {
    throw new Error(
      "DropdownMenuRadioItem must be used within <DropdownMenuRadioGroup>",
    );
  }
  const checked = group.value === value;
  return (
    <ItemBase
      {...props}
      inset
      role="menuitemradio"
      ariaChecked={checked}
      closeOnSelect={closeOnSelect}
      onActivate={() => group.select(value)}
    >
      <Indicator checked={checked} kind="dot" reduce={level.reduce} />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <Shortcut>{shortcut}</Shortcut> : null}
    </ItemBase>
  );
}

export interface DropdownMenuLabelProps {
  children: ReactNode;
  inset?: boolean;
  className?: string;
}

export function DropdownMenuLabel({
  children,
  inset = false,
  className,
}: DropdownMenuLabelProps) {
  return (
    <div
      className={cn(
        "px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground",
        inset && "pl-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface DropdownMenuGroupProps {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
}

export function DropdownMenuGroup({
  children,
  ariaLabel,
  className,
}: DropdownMenuGroupProps) {
  return (
    <fieldset
        aria-label={ariaLabel}
        className={cn("m-0 min-w-0 border-0 p-0", className)}
      >
      {children}
    </fieldset>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <hr className={cn("-mx-1.5 my-1.5 h-px border-0 bg-border", className)} />;
}

/* -------------------------------------------------------------------------- */
/*                                  Submenus                                  */
/* -------------------------------------------------------------------------- */

interface SubContextValue {
  level: MenuLevel;
  parent: MenuLevel;
  triggerItemId: string;
  openTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  openWith: (intent: FocusIntent) => void;
}

const SubContext = createContext<SubContextValue | null>(null);

function useSub(component: string) {
  const sub = useContext(SubContext);
  if (!sub) throw new Error(`${component} must be used within <DropdownMenuSub>`);
  return sub;
}

export interface DropdownMenuSubProps {
  children: ReactNode;
}

/** A nested menu opened from a `DropdownMenuSubTrigger` row. */
export function DropdownMenuSub({ children }: DropdownMenuSubProps) {
  const parent = useMenuLevel("DropdownMenuSub");
  const subId = useId();
  const open = parent.open && parent.openSub === subId;
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const focusIntent = useRef<FocusIntent>("none");
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const core = useLevelCore(open);
  const triggerItemId = `${subId}-trigger`;

  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current);
    },
    [],
  );

  // Open submenus take focus only when asked to (keyboard); a hover open
  // leaves it on the trigger row.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      focusByIntent(contentRef.current, focusIntent.current),
    );
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const { setOpenSub } = parent;
  const close = useCallback(
    (restoreFocus: boolean) => {
      setOpenSub(null);
      if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
    },
    [setOpenSub],
  );

  const openWith = useCallback(
    (intent: FocusIntent) => {
      if (openTimer.current) clearTimeout(openTimer.current);
      openTimer.current = null;
      focusIntent.current = intent;
      if (open) focusByIntent(contentRef.current, intent);
      else setOpenSub(subId);
    },
    [open, setOpenSub, subId],
  );

  const level = useMemo<MenuLevel>(
    () => ({
      rootId: parent.rootId,
      levelId: `${subId}-level`,
      open,
      isSub: true,
      triggerId: triggerItemId,
      contentId: `${subId}-content`,
      triggerRef,
      contentRef,
      focusIntent,
      ...core,
      close,
      closeAll: parent.closeAll,
      openRoot: parent.openRoot,
      reduce: parent.reduce,
    }),
    [
      parent.rootId,
      parent.closeAll,
      parent.openRoot,
      parent.reduce,
      subId,
      open,
      triggerItemId,
      core,
      close,
    ],
  );

  const ctx = useMemo<SubContextValue>(
    () => ({ level, parent, triggerItemId, openTimer, openWith }),
    [level, parent, triggerItemId, openWith],
  );

  return <SubContext.Provider value={ctx}>{children}</SubContext.Provider>;
}

export interface DropdownMenuSubTriggerProps {
  children: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  inset?: boolean;
  textValue?: string;
  className?: string;
}

export function DropdownMenuSubTrigger({
  children,
  icon,
  ...props
}: DropdownMenuSubTriggerProps) {
  const { level, parent, triggerItemId, openTimer, openWith } = useSub(
    "DropdownMenuSubTrigger",
  );

  const clearOpenTimer = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = null;
  };

  return (
    <ItemBase
      {...props}
      itemId={triggerItemId}
      isSubTrigger
      closeOnSelect={false}
      onActivate={(event) => openWith(event.detail === 0 ? "first" : "none")}
      extraProps={{
        ref: (node: HTMLButtonElement | null) => {
          level.triggerRef.current = node;
        },
        "aria-haspopup": "menu",
        "aria-expanded": level.open,
        "aria-controls": level.open ? level.contentId : undefined,
        "data-state": level.open ? "open" : "closed",
        onPointerEnter: (event) => {
          if (event.pointerType === "touch" || props.disabled) return;
          parent.cancelSubClose();
          if (level.open) return;
          clearOpenTimer();
          openTimer.current = setTimeout(() => {
            openTimer.current = null;
            openWith("none");
          }, SUB_OPEN_DELAY);
        },
        onPointerLeave: (event) => {
          if (event.pointerType === "touch") return;
          clearOpenTimer();
          parent.scheduleSubClose();
        },
        onKeyDown: (event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            openWith("first");
          }
        },
      }}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ChevronRight
        aria-hidden="true"
        className="-mr-1 ml-auto size-3.5! text-muted-foreground"
      />
    </ItemBase>
  );
}

export interface DropdownMenuSubContentProps {
  children: ReactNode;
  /** Preferred side; flips when the viewport lacks room. Default "right". */
  side?: "right" | "left";
  /** Gap from the parent panel, in px. Default 8. */
  sideOffset?: number;
  /** Shift so the first row lines up with the trigger row. Default -7. */
  alignOffset?: number;
  ariaLabel?: string;
  className?: string;
}

export function DropdownMenuSubContent({
  children,
  side = "right",
  sideOffset = 8,
  alignOffset = -7,
  ariaLabel,
  className,
}: DropdownMenuSubContentProps) {
  const { level, parent, triggerItemId } = useSub("DropdownMenuSubContent");
  const { cancelSubClose, setActiveId } = parent;
  // While the pointer or focus is in the submenu, its trigger row keeps the
  // parent's highlight and the pending close is called off.
  const onPanelEnter = useCallback(() => {
    cancelSubClose();
    setActiveId(triggerItemId);
  }, [cancelSubClose, setActiveId, triggerItemId]);

  return (
    <MenuLevelContext.Provider value={level}>
      <MenuPanel
        level={level}
        side={side}
        align="start"
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        ariaLabel={ariaLabel}
        className={cn("min-w-44", className)}
        onPanelEnter={onPanelEnter}
      >
        {children}
      </MenuPanel>
    </MenuLevelContext.Provider>
  );
}
