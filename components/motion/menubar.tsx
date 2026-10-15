"use client";

import { Check, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  type MutableRefObject,
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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { KbdCombo } from "@/components/motion/kbd";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL } from "@/lib/ease";
import { useDismiss } from "@/lib/hooks/use-dismiss";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

/** Where focus lands when a panel opens. */
type FocusIntent = "first" | "last" | "content" | "none";

// Same hover-intent timings as `dropdown-menu`: a pointer passing over a sub
// trigger shouldn't flash its submenu, and a diagonal move toward an open
// submenu that clips a neighbouring row shouldn't snap it shut.
const SUB_OPEN_DELAY = 100;
const SUB_CLOSE_DELAY = 220;
const TYPEAHEAD_RESET = 500;
// A click that lands this soon after hover already switched to that menu is
// the same gesture finishing, not a request to close it.
const HOVER_CLICK_GRACE = 350;
const VIEWPORT_MARGIN = 8;

const ITEM_SELECTOR = '[data-menubar-item]:not([data-disabled="true"])';
const TRIGGER_SELECTOR = "[data-menubar-trigger]";

function getItems(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
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


/* -------------------------------------------------------------------------- */
/*                                Bar context                                 */
/* -------------------------------------------------------------------------- */

interface BarContextValue {
  baseId: string;
  active: string | null;
  reduce: boolean;
  /** Open `value` (or close with null) and say where focus should land. */
  openMenu: (value: string, intent: FocusIntent, viaHover?: boolean) => void;
  closeMenu: (restoreFocus: boolean) => void;
  /** Open the menu `dir` steps from the active one, focusing its first item. */
  move: (dir: 1 | -1) => void;
  /** Roving focus between triggers while every menu is closed. */
  focusTrigger: (from: string, to: "next" | "prev" | "first" | "last") => void;
  tabStop: string | null;
  setTabStop: (value: string) => void;
  /** True when a hover switched to `value` a moment ago. */
  hoverOpenedRecently: (value: string) => boolean;
  host: HTMLDivElement | null;
  triggers: MutableRefObject<Map<string, HTMLElement>>;
  contents: MutableRefObject<Map<string, HTMLElement>>;
  /** Content sizes changed — re-measure the shared panel. */
  remeasure: () => void;
}

const BarContext = createContext<BarContextValue | null>(null);

function useBar(component: string) {
  const ctx = useContext(BarContext);
  if (!ctx) throw new Error(`${component} must be used within <Menubar>`);
  return ctx;
}

interface MenuContextValue {
  value: string;
  triggerId: string;
  contentId: string;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenu(component: string) {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error(`${component} must be used within <MenubarMenu>`);
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*                                   Levels                                   */
/* -------------------------------------------------------------------------- */

/**
 * One open panel: a top-level menu or a submenu. Items, the active-row
 * highlight and keyboard navigation read the nearest level, so a submenu is
 * the same machinery one step down.
 */
interface MenuLevel {
  levelId: string;
  open: boolean;
  isSub: boolean;
  triggerRef: MutableRefObject<HTMLElement | null>;
  contentRef: MutableRefObject<HTMLElement | null>;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  openSub: string | null;
  setOpenSub: (id: string | null) => void;
  scheduleSubClose: () => void;
  cancelSubClose: () => void;
  /** Close this level (a submenu) — or, at the top, the whole menubar. */
  close: (restoreFocus: boolean) => void;
}

const LevelContext = createContext<MenuLevel | null>(null);

function useLevel(component: string) {
  const level = useContext(LevelContext);
  if (!level) throw new Error(`${component} must be used within <MenubarContent>`);
  return level;
}

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

  // Reset the highlight when the panel opens, not when it closes: dropping a
  // layoutId highlight mid-exit can stall the exit (see dropdown-menu).
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
    () => ({ activeId, setActiveId, openSub, setOpenSub, scheduleSubClose, cancelSubClose }),
    [activeId, openSub, setOpenSub, scheduleSubClose, cancelSubClose],
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Root                                    */
/* -------------------------------------------------------------------------- */

export interface MenubarProps {
  children: ReactNode;
  /** Controlled open menu (`MenubarMenu` value), or null when closed. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Gap between the bar and the panel, in px. Default 6. */
  sideOffset?: number;
  "aria-label"?: string;
  className?: string;
  /** Extra classes for the shared floating panel. */
  panelClassName?: string;
}

interface PanelGeometry {
  top: number;
  left: number;
  x: number;
  width: number;
  height: number;
  /** First frame after opening: jump into place instead of gliding. */
  snap: boolean;
}

/**
 * Desktop-app menubar (File / Edit / View …) following the WAI-ARIA menubar
 * pattern. Every menu renders into one shared floating panel: once a menu is
 * open, hovering another title (or ArrowLeft/ArrowRight) switches instantly
 * and the panel glides and resizes to the new menu.
 */
export function Menubar({
  children,
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  sideOffset = 6,
  "aria-label": ariaLabel,
  className,
  panelClassName,
}: MenubarProps) {
  const [internal, setInternal] = useState<string | null>(defaultValue);
  const controlled = controlledValue !== undefined;
  const active = controlled ? controlledValue : internal;
  const open = active !== null;
  const baseId = useId();
  const reduce = useReducedMotion() ?? false;
  const barRef = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<string, HTMLElement>());
  const contents = useRef(new Map<string, HTMLElement>());
  const intent = useRef<FocusIntent>("content");
  const hoverOpened = useRef<{ value: string; at: number } | null>(null);
  const lastActive = useRef<string | null>(active);
  const opened = useRef(false);
  const [tabStop, setTabStop] = useState<string | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [geo, setGeo] = useState<PanelGeometry | null>(null);
  const [measureTick, setMeasureTick] = useState(0);

  useEffect(() => setMounted(true), []);
  if (active !== null) lastActive.current = active;

  const setActive = useCallback(
    (next: string | null) => {
      if (!controlled) setInternal(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange],
  );

  const orderedValues = useCallback(() => {
    const nodes = barRef.current?.querySelectorAll<HTMLElement>(
      `${TRIGGER_SELECTOR}:not(:disabled)`,
    );
    return Array.from(nodes ?? []).map((node) => node.dataset.value ?? "");
  }, []);

  const openMenu = useCallback(
    (value: string, nextIntent: FocusIntent, viaHover = false) => {
      intent.current = nextIntent;
      hoverOpened.current = viaHover ? { value, at: performance.now() } : null;
      setTabStop(value);
      if (value === active) {
        focusByIntent(contents.current.get(value) ?? null, nextIntent);
        return;
      }
      setActive(value);
    },
    [active, setActive],
  );

  const closeMenu = useCallback(
    (restoreFocus: boolean) => {
      const was = lastActive.current;
      setActive(null);
      if (restoreFocus && was) {
        triggers.current.get(was)?.focus({ preventScroll: true });
      }
    },
    [setActive],
  );

  const move = useCallback(
    (dir: 1 | -1) => {
      const values = orderedValues();
      if (values.length === 0) return;
      const index = active ? values.indexOf(active) : -1;
      const next = values[(index + dir + values.length) % values.length];
      if (next !== undefined) openMenu(next, "first");
    },
    [active, openMenu, orderedValues],
  );

  const focusTrigger = useCallback(
    (from: string, to: "next" | "prev" | "first" | "last") => {
      const values = orderedValues();
      if (values.length === 0) return;
      const index = values.indexOf(from);
      const target =
        to === "first"
          ? values[0]
          : to === "last"
            ? values[values.length - 1]
            : values[(index + (to === "next" ? 1 : -1) + values.length) % values.length];
      if (target === undefined) return;
      setTabStop(target);
      triggers.current.get(target)?.focus();
    },
    [orderedValues],
  );

  const hoverOpenedRecently = useCallback((value: string) => {
    const record = hoverOpened.current;
    return Boolean(
      record && record.value === value && performance.now() - record.at < HOVER_CLICK_GRACE,
    );
  }, []);

  const remeasure = useCallback(() => setMeasureTick((n) => n + 1), []);

  // The first enabled trigger is the bar's tab stop until another is focused.
  useLayoutEffect(() => {
    if (tabStop !== null) return;
    const first = orderedValues()[0];
    if (first !== undefined) setTabStop(first);
  }, [tabStop, orderedValues]);

  const dismiss = useCallback(() => setActive(null), [setActive]);
  const insideBar = useCallback(
    (target: Element) => Boolean(target.closest(`[data-menubar="${baseId}"]`)),
    [baseId],
  );
  // Escape is answered by the focused panel (a submenu closes one level).
  useDismiss(open, dismiss, null, { escape: false, ignore: insideBar });

  // Measure the active menu and place the shared panel under its trigger.
  // `measureTick` re-runs this when any menu's content resizes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: measureTick is a deliberate re-measure signal
  useLayoutEffect(() => {
    if (active === null) {
      opened.current = false;
      return;
    }
    const measure = () => {
      const bar = barRef.current;
      const trigger = triggers.current.get(active);
      const content = contents.current.get(active);
      if (!bar || !trigger || !content) return;
      const barRect = bar.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      // +2 for the panel's 1px border (border-box sizing).
      const width = content.offsetWidth + 2;
      const height = content.offsetHeight + 2;
      const maxX = window.innerWidth - VIEWPORT_MARGIN - width - barRect.left;
      const minX = VIEWPORT_MARGIN - barRect.left;
      const x = Math.max(minX, Math.min(triggerRect.left - barRect.left, maxX));
      const snap = !opened.current;
      opened.current = true;
      setGeo({ top: barRect.bottom + sideOffset, left: barRect.left, x, width, height, snap });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, sideOffset, measureTick]);

  // Focus moves into the newly active menu: its first/last item for keyboard
  // opens, the menu itself for pointer opens so arrows work immediately.
  useEffect(() => {
    if (active === null) return;
    const frame = requestAnimationFrame(() =>
      focusByIntent(contents.current.get(active) ?? null, intent.current),
    );
    return () => cancelAnimationFrame(frame);
  }, [active]);

  const ctx = useMemo<BarContextValue>(
    () => ({
      baseId,
      active,
      reduce,
      openMenu,
      closeMenu,
      move,
      focusTrigger,
      tabStop,
      setTabStop,
      hoverOpenedRecently,
      host,
      triggers,
      contents,
      remeasure,
    }),
    [
      baseId,
      active,
      reduce,
      openMenu,
      closeMenu,
      move,
      focusTrigger,
      tabStop,
      hoverOpenedRecently,
      host,
      remeasure,
    ],
  );

  const shown = open && geo !== null;
  const glide = geo?.snap || reduce ? { duration: 0 } : SPRING_LAYOUT;

  return (
    <BarContext.Provider value={ctx}>
      <div
        ref={barRef}
        role="menubar"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        data-menubar={baseId}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-xl border border-border bg-card p-1",
          className,
        )}
      >
        {children}
      </div>
      {mounted
        ? createPortal(
            <motion.div
              data-menubar={baseId}
              inert={!open}
              initial={false}
              animate={{
                opacity: shown ? 1 : 0,
                scale: shown || reduce ? 1 : 0.96,
                // Flips at the start of the close, so a fading panel can never
                // be hovered or clicked through.
                pointerEvents: shown ? "auto" : "none",
                x: geo?.x ?? 0,
                // Sizing is animated on purpose: the panel morphing between
                // menus is this component's layout.
                width: geo?.width ?? 0,
                height: geo?.height ?? 0,
              }}
              transition={{
                opacity: shown
                  ? { duration: 0.16, ease: EASE_OUT }
                  : { duration: 0.12, ease: EASE_OUT },
                scale: reduce ? { duration: 0 } : shown ? SPRING_PANEL : { duration: 0.12, ease: EASE_OUT },
                pointerEvents: { duration: 0 },
                x: glide,
                width: glide,
                height: glide,
              }}
              style={{
                top: geo?.top ?? 0,
                left: geo?.left ?? 0,
                transformOrigin: "0% 0%",
              }}
              className={cn(
                "fixed z-[100] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg",
                panelClassName,
              )}
            >
              <div ref={setHost} className="relative" />
            </motion.div>,
            document.body,
          )
        : null}
    </BarContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Menu + trigger                               */
/* -------------------------------------------------------------------------- */

export interface MenubarMenuProps {
  /** Identifies the menu for `value`/`onValueChange`. */
  value: string;
  children: ReactNode;
}

export function MenubarMenu({ value, children }: MenubarMenuProps) {
  const id = useId();
  const ctx = useMemo<MenuContextValue>(
    () => ({ value, triggerId: `${id}-trigger`, contentId: `${id}-content` }),
    [value, id],
  );
  return <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>;
}

export interface MenubarTriggerProps {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function MenubarTrigger({ children, disabled = false, className }: MenubarTriggerProps) {
  const bar = useBar("MenubarTrigger");
  const menu = useMenu("MenubarTrigger");
  const isOpen = bar.active === menu.value;
  const anyOpen = bar.active !== null;
  const { triggers } = bar;
  const { value } = menu;

  const ref = useCallback(
    (node: HTMLButtonElement | null) => {
      if (node) triggers.current.set(value, node);
      else triggers.current.delete(value);
    },
    [triggers, value],
  );

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      id={menu.triggerId}
      disabled={disabled}
      tabIndex={bar.tabStop === value ? 0 : -1}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-controls={menu.contentId}
      data-menubar-trigger=""
      data-value={value}
      data-state={isOpen ? "open" : "closed"}
      onFocus={() => bar.setTabStop(value)}
      onPointerEnter={(event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.pointerType === "touch" || disabled) return;
        if (anyOpen && !isOpen) bar.openMenu(value, "content", true);
      }}
      onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
        // `detail` is 0 for a click synthesized by the keyboard; keys are
        // handled in onKeyDown.
        if (event.detail === 0) return;
        if (isOpen) {
          if (!bar.hoverOpenedRecently(value)) bar.closeMenu(false);
          return;
        }
        bar.openMenu(value, "content");
      }}
      onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
        const { key } = event;
        if (key === "ArrowDown" || key === "Enter" || key === " ") {
          event.preventDefault();
          bar.openMenu(value, "first");
        } else if (key === "ArrowUp") {
          event.preventDefault();
          bar.openMenu(value, "last");
        } else if (key === "ArrowRight" || key === "ArrowLeft") {
          event.preventDefault();
          if (anyOpen) bar.move(key === "ArrowRight" ? 1 : -1);
          else bar.focusTrigger(value, key === "ArrowRight" ? "next" : "prev");
        } else if (key === "Home" || key === "End") {
          event.preventDefault();
          bar.focusTrigger(value, key === "Home" ? "first" : "last");
        }
      }}
      className={cn(
        "relative inline-flex h-7 select-none items-center rounded-lg px-2.5 text-[13px] font-medium text-foreground outline-none transition-colors",
        "hover:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-ring",
        "data-[state=open]:bg-foreground/[0.08] disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Panels                                   */
/* -------------------------------------------------------------------------- */

function usePanelKeys(level: MenuLevel) {
  const bar = useBar("MenubarContent");
  const typeahead = useRef("");
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
    },
    [],
  );

  return (event: ReactKeyboardEvent<HTMLElement>) => {
    // React bubbles events through portals: a submenu's keys would reach its
    // parent panel too. Only answer keys pressed inside this panel's DOM.
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (event.defaultPrevented) return;
    const { key } = event;
    const container = level.contentRef.current;

    if (key === "Escape") {
      event.preventDefault();
      level.close(true);
      return;
    }
    if (key === "ArrowLeft") {
      event.preventDefault();
      if (level.isSub) level.close(true);
      else bar.move(-1);
      return;
    }
    if (key === "ArrowRight") {
      // A sub trigger already claimed this key (preventDefault) to open.
      event.preventDefault();
      bar.move(1);
      return;
    }
    if (key === "Tab") {
      event.preventDefault();
      bar.closeMenu(true);
      return;
    }
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      const items = getItems(container);
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLElement);
      const dir = key === "ArrowDown" ? 1 : -1;
      const next =
        current < 0
          ? dir === 1
            ? 0
            : items.length - 1
          : (current + dir + items.length) % items.length;
      items[next]?.focus();
      return;
    }
    if (key === "Home" || key === "End") {
      event.preventDefault();
      const items = getItems(container);
      items[key === "Home" ? 0 : items.length - 1]?.focus();
      return;
    }
    const printable = key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    // A leading space is activation, not a search character.
    if (!printable || (key === " " && typeahead.current === "")) return;
    event.preventDefault();
    typeahead.current += key.toLocaleLowerCase();
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
    typeaheadTimer.current = setTimeout(() => {
      typeahead.current = "";
    }, TYPEAHEAD_RESET);
    const items = getItems(container);
    const start = items.indexOf(document.activeElement as HTMLElement);
    // Search from the row after the current one so repeating a letter cycles.
    const ordered =
      typeahead.current.length === 1 && start >= 0
        ? [...items.slice(start + 1), ...items.slice(0, start + 1)]
        : items;
    ordered
      .find((item) =>
        (item.dataset.label ?? item.textContent ?? "")
          .trim()
          .toLocaleLowerCase()
          .startsWith(typeahead.current),
      )
      ?.focus();
  };
}

export interface MenubarContentProps {
  children: ReactNode;
  /** Accessible name; defaults to the trigger's text via aria-labelledby. */
  ariaLabel?: string;
  className?: string;
}

/**
 * The menu's items. Rendered into the menubar's shared panel; every menu stays
 * mounted (inert while inactive) so the panel can measure and morph to it.
 */
export function MenubarContent({ children, ariaLabel, className }: MenubarContentProps) {
  const bar = useBar("MenubarContent");
  const menu = useMenu("MenubarContent");
  const open = bar.active === menu.value;
  const core = useLevelCore(open);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const { closeMenu, contents, remeasure, triggers } = bar;
  const { value } = menu;

  triggerRef.current = triggers.current.get(value) ?? null;

  const level = useMemo<MenuLevel>(
    () => ({
      levelId: `${menu.contentId}-level`,
      open,
      isSub: false,
      triggerRef,
      contentRef,
      ...core,
      close: closeMenu,
    }),
    [menu.contentId, open, core, closeMenu],
  );

  const onKeyDown = usePanelKeys(level);

  // Register for measurement and focus; re-measure whenever the menu resizes.
  const setNode = useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (node) contents.current.set(value, node);
      else contents.current.delete(value);
    },
    [contents, value],
  );

  // The content node only exists once the shared panel's host has mounted.
  const { host } = bar;
  useEffect(() => {
    const node = contentRef.current;
    if (!host || !node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => remeasure());
    observer.observe(node);
    return () => observer.disconnect();
  }, [remeasure, host]);

  if (!host) return null;

  return createPortal(
    <LevelContext.Provider value={level}>
      <motion.div
        ref={setNode}
        id={menu.contentId}
        role="menu"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : menu.triggerId}
        aria-orientation="vertical"
        tabIndex={-1}
        inert={!open}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: open ? 0.16 : 0.1, ease: EASE_OUT }}
        onKeyDown={onKeyDown}
        onFocus={(event: ReactFocusEvent<HTMLDivElement>) => {
          if (event.target === event.currentTarget) core.setActiveId(null);
        }}
        className={cn(
          "absolute left-0 top-0 w-max min-w-52 max-w-[calc(100vw-2rem)] p-1.5 outline-none",
          !open && "pointer-events-none",
          className,
        )}
      >
        {children}
      </motion.div>
    </LevelContext.Provider>,
    host,
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
  const level = useLevel("MenubarItem");
  const bar = useBar("MenubarItem");
  const autoId = useId();
  const id = itemId ?? autoId;
  const highlighted = level.activeId === id;
  const checkedProps = role === "menuitem" ? {} : { "aria-checked": ariaChecked ?? false };
  const { onPointerEnter, onPointerLeave, onKeyDown, ref, ...rest } = extraProps ?? {};

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
      data-menubar-item=""
      data-disabled={disabled ? "true" : undefined}
      data-highlighted={highlighted ? "" : undefined}
      data-label={textValue}
      onFocus={() => level.setActiveId(id)}
      onPointerEnter={(event: ReactPointerEvent<HTMLButtonElement>) => {
        onPointerEnter?.(event);
        if (!isSubTrigger && event.pointerType !== "touch") level.scheduleSubClose();
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
        // Focus back to the panel drops the highlight, like native menus.
        if (document.activeElement === event.currentTarget) {
          level.contentRef.current?.focus({ preventScroll: true });
        }
      }}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (disabled) return;
        onActivate?.(event);
        if (closeOnSelect && !event.defaultPrevented) bar.closeMenu(true);
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
          nearest AnimatePresence, and an exiting submenu would otherwise wait
          on the highlight and never unmount (leaving a clickable ghost). */}
      <AnimatePresence initial={false}>
        {highlighted ? (
          <motion.span
            aria-hidden="true"
            layoutId={`${level.levelId}-highlight`}
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 rounded-lg",
              variant === "destructive" ? "bg-destructive/10" : "bg-foreground/[0.07]",
            )}
            transition={bar.reduce ? { duration: 0 } : SPRING_LAYOUT}
          />
        ) : null}
      </AnimatePresence>
      {children}
    </button>
  );
}

/** Key tokens (`["mod", "s"]`) render as `KbdCombo`; anything else as given. */
export type MenubarShortcut = string[] | ReactNode;

function Shortcut({ shortcut }: { shortcut: MenubarShortcut }) {
  return (
    <span aria-hidden="true" className="ml-auto inline-flex shrink-0 pl-6">
      {Array.isArray(shortcut) &&
      shortcut.every((key): key is string => typeof key === "string") ? (
        <KbdCombo
          keys={shortcut}
          size="sm"
          className="[&_kbd]:border-b [&_kbd]:bg-transparent [&_kbd]:text-[10.5px]"
        />
      ) : (
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
          {shortcut}
        </span>
      )}
    </span>
  );
}

export interface MenubarItemProps {
  children: ReactNode;
  /** Leading icon (sized to 16px). */
  icon?: ReactNode;
  /** Trailing shortcut hint: key tokens for `KbdCombo` or any node. Decorative. */
  shortcut?: MenubarShortcut;
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

export function MenubarItem({
  children,
  icon,
  shortcut,
  onSelect,
  closeOnSelect = true,
  ...props
}: MenubarItemProps) {
  return (
    <ItemBase {...props} closeOnSelect={closeOnSelect} onActivate={onSelect}>
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <Shortcut shortcut={shortcut} /> : null}
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
    <span aria-hidden="true" className="absolute left-2.5 flex size-4 items-center justify-center">
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

export interface MenubarCheckboxItemProps
  extends Omit<MenubarItemProps, "onSelect" | "inset" | "icon"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/** A toggle row. Stays open on select by default so several can be flipped. */
export function MenubarCheckboxItem({
  children,
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  shortcut,
  closeOnSelect = false,
  ...props
}: MenubarCheckboxItemProps) {
  const bar = useBar("MenubarCheckboxItem");
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
      <Indicator checked={checked} kind="check" reduce={bar.reduce} />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <Shortcut shortcut={shortcut} /> : null}
    </ItemBase>
  );
}

interface RadioGroupContextValue {
  value: string | undefined;
  select: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface MenubarRadioGroupProps {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible name for the group. */
  ariaLabel?: string;
  className?: string;
}

export function MenubarRadioGroup({
  children,
  value: controlledValue,
  defaultValue,
  onValueChange,
  ariaLabel,
  className,
}: MenubarRadioGroupProps) {
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
      <fieldset aria-label={ariaLabel} className={cn("m-0 min-w-0 border-0 p-0", className)}>
        {children}
      </fieldset>
    </RadioGroupContext.Provider>
  );
}

export interface MenubarRadioItemProps
  extends Omit<MenubarItemProps, "onSelect" | "inset" | "icon"> {
  value: string;
}

/** One choice of a `MenubarRadioGroup`; stays open on select by default. */
export function MenubarRadioItem({
  children,
  value,
  shortcut,
  closeOnSelect = false,
  ...props
}: MenubarRadioItemProps) {
  const bar = useBar("MenubarRadioItem");
  const group = useContext(RadioGroupContext);
  if (!group) throw new Error("MenubarRadioItem must be used within <MenubarRadioGroup>");
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
      <Indicator checked={checked} kind="dot" reduce={bar.reduce} />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <Shortcut shortcut={shortcut} /> : null}
    </ItemBase>
  );
}

export interface MenubarLabelProps {
  children: ReactNode;
  inset?: boolean;
  className?: string;
}

export function MenubarLabel({ children, inset = false, className }: MenubarLabelProps) {
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

export function MenubarSeparator({ className }: { className?: string }) {
  return <hr className={cn("-mx-1.5 my-1.5 h-px border-0 bg-border", className)} />;
}

/* -------------------------------------------------------------------------- */
/*                                  Submenus                                  */
/* -------------------------------------------------------------------------- */

interface SubContextValue {
  level: MenuLevel;
  parent: MenuLevel;
  triggerItemId: string;
  contentId: string;
  openTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  openWith: (intent: FocusIntent) => void;
}

const SubContext = createContext<SubContextValue | null>(null);

function useSub(component: string) {
  const sub = useContext(SubContext);
  if (!sub) throw new Error(`${component} must be used within <MenubarSub>`);
  return sub;
}

export interface MenubarSubProps {
  children: ReactNode;
}

/** One level of nested menu, opened from a `MenubarSubTrigger` row. */
export function MenubarSub({ children }: MenubarSubProps) {
  const parent = useLevel("MenubarSub");
  const subId = useId();
  const open = parent.open && parent.openSub === subId;
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
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

  // Submenus take focus only when asked to (keyboard); a hover open leaves
  // it on the trigger row.
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
      levelId: `${subId}-level`,
      open,
      isSub: true,
      triggerRef,
      contentRef,
      ...core,
      close,
    }),
    [subId, open, core, close],
  );

  const ctx = useMemo<SubContextValue>(
    () => ({
      level,
      parent,
      triggerItemId,
      contentId: `${subId}-content`,
      openTimer,
      openWith,
    }),
    [level, parent, triggerItemId, subId, openWith],
  );

  return <SubContext.Provider value={ctx}>{children}</SubContext.Provider>;
}

export interface MenubarSubTriggerProps {
  children: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  inset?: boolean;
  textValue?: string;
  className?: string;
}

export function MenubarSubTrigger({ children, icon, ...props }: MenubarSubTriggerProps) {
  const { level, parent, triggerItemId, contentId, openTimer, openWith } =
    useSub("MenubarSubTrigger");

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
        "aria-controls": level.open ? contentId : undefined,
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
      <ChevronRight aria-hidden="true" className="-mr-1 ml-auto size-3.5! text-muted-foreground" />
    </ItemBase>
  );
}

export interface MenubarSubContentProps {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
}

interface SubPosition {
  left: number;
  top: number;
  side: "right" | "left";
}

export function MenubarSubContent({ children, ariaLabel, className }: MenubarSubContentProps) {
  const bar = useBar("MenubarSubContent");
  const { level, parent, triggerItemId, contentId } = useSub("MenubarSubContent");
  const onKeyDown = usePanelKeys(level);
  const [pos, setPos] = useState<SubPosition | null>(null);
  const { cancelSubClose, setActiveId } = parent;
  const { open, triggerRef, contentRef } = level;

  // While the pointer or focus is in the submenu, its trigger row keeps the
  // parent's highlight and the pending close is called off.
  const onPanelEnter = useCallback(() => {
    cancelSubClose();
    setActiveId(triggerItemId);
  }, [cancelSubClose, setActiveId, triggerItemId]);

  // Beside the trigger row, flipping left when the viewport lacks room; the
  // first row lines up with the trigger (panel padding + border = 7px).
  useLayoutEffect(() => {
    // Keep the last position while closed so the exit plays in place.
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      const content = contentRef.current;
      if (!trigger || !content) return;
      const t = trigger.getBoundingClientRect();
      const w = content.offsetWidth;
      const h = content.offsetHeight;
      const gap = 8;
      const fitsRight = t.right + gap + w <= window.innerWidth - VIEWPORT_MARGIN;
      const left = fitsRight ? t.right + gap : Math.max(VIEWPORT_MARGIN, t.left - gap - w);
      const top = Math.max(
        VIEWPORT_MARGIN,
        Math.min(t.top - 7, window.innerHeight - VIEWPORT_MARGIN - h),
      );
      setPos({ left, top, side: fitsRight ? "right" : "left" });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, triggerRef, contentRef]);

  const fromX = pos?.side === "left" ? 6 : -6;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <LevelContext.Provider key="sub" value={level}>
          <motion.div
            ref={(node: HTMLDivElement | null) => {
              contentRef.current = node;
            }}
            id={contentId}
            role="menu"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabel ? undefined : triggerItemId}
            aria-orientation="vertical"
            tabIndex={-1}
            data-menubar={bar.baseId}
            initial={bar.reduce ? { opacity: 0 } : { opacity: 0, x: fromX, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            // pointerEvents flips at the start of the exit, so a closing
            // submenu can never be hovered or clicked through.
            exit={{
              opacity: 0,
              ...(bar.reduce ? {} : { scale: 0.97 }),
              pointerEvents: "none",
              transition: { duration: 0.1, ease: EASE_OUT },
            }}
            transition={
              bar.reduce
                ? { duration: 0.12, ease: EASE_OUT }
                : { ...SPRING_PANEL, opacity: { duration: 0.14, ease: EASE_OUT } }
            }
            style={{
              left: pos?.left ?? 0,
              top: pos?.top ?? 0,
              transformOrigin: pos?.side === "left" ? "100% 0%" : "0% 0%",
              visibility: pos ? "visible" : "hidden",
            }}
            onKeyDown={onKeyDown}
            onFocus={(event: ReactFocusEvent<HTMLDivElement>) => {
              if (event.target === event.currentTarget) level.setActiveId(null);
              else onPanelEnter();
            }}
            onPointerEnter={onPanelEnter}
            className={cn(
              "fixed z-[101] min-w-44 rounded-xl border border-border bg-card p-1.5 text-foreground shadow-lg outline-none",
              className,
            )}
          >
            {children}
          </motion.div>
        </LevelContext.Provider>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
