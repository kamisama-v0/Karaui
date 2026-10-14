"use client";

import { Archive, Bell, BellOff, Check, CheckCheck } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useAnimate,
  useReducedMotion,
} from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL, SPRING_PRESS } from "@/lib/ease";
import { useDismiss } from "@/lib/hooks/use-dismiss";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** When it happened: Date, epoch ms or an ISO string. */
  timestamp: Date | number | string;
  read?: boolean;
  /** Avatar image URL. */
  avatar?: string;
  /** Sender name — used for the avatar's alt text and initials fallback. */
  name?: string;
  /** Icon shown instead of an avatar (system notifications). */
  icon?: ReactNode;
}

export type NotificationTab = "all" | "unread";

export interface NotificationCenterProps {
  /** Controlled list. Archived items are removed from it via `onNotificationsChange`. */
  notifications?: NotificationItem[];
  /** Uncontrolled initial list. */
  defaultNotifications?: NotificationItem[];
  onNotificationsChange?: (notifications: NotificationItem[]) => void;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onArchive?: (id: string) => void;
  /** Row click. The row is also marked read. */
  onSelect?: (notification: NotificationItem) => void;
  /** Controlled panel open state. */
  open?: boolean;
  /** Uncontrolled initial open state. Default false. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Return true for an outside target that should not close the panel (e.g. a
   * "simulate" or compose button beside it). Must be stable. */
  ignoreOutside?: (target: Element) => boolean;
  /** Panel edge aligned with the bell. Default "end". */
  align?: "start" | "end";
  /** Locale for relative times. Default "en-US" so server and client agree. */
  locale?: string;
  title?: ReactNode;
  emptyLabel?: ReactNode;
  className?: string;
  panelClassName?: string;
}

// The panel grows out of the bell's corner: a clip that keeps only that
// corner, tweened (a sprung clip-path can snap as it resolves).
const clipHidden = (align: "start" | "end") =>
  align === "end"
    ? "inset(0% 0% 92% 88% round 16px)"
    : "inset(0% 88% 92% 0% round 16px)";
const CLIP_SHOWN = "inset(0% 0% 0% 0% round 16px)";
const CLIP_TRANSITION = { duration: 0.32, ease: EASE_OUT } as const;

const DAY = 86_400_000;

function toMs(t: NotificationItem["timestamp"]) {
  return t instanceof Date ? t.getTime() : typeof t === "number" ? t : Date.parse(t);
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
) {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const set = useCallback(
    (next: T) => {
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set] as const;
}

/**
 * Bell trigger with an unread badge that bumps when the count rises, opening
 * a panel that grows out of the bell. All/Unread tabs with a gliding
 * indicator, Today/Earlier groups, relative times, and per-row mark-read /
 * archive actions — rows leaving the list collapse out while the rest glide
 * up. Times and grouping read the clock only after mount.
 */
export function NotificationCenter({
  notifications,
  defaultNotifications = [],
  onNotificationsChange,
  onMarkRead,
  onMarkAllRead,
  onArchive,
  onSelect,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ignoreOutside,
  align = "end",
  locale = "en-US",
  title = "Notifications",
  emptyLabel = "You're all caught up",
  className,
  panelClassName,
}: NotificationCenterProps) {
  const reduce = useReducedMotion() ?? false;
  const canHover = useHoverCapable();
  const baseId = useId();
  const [list, setList] = useControllable(notifications, defaultNotifications, onNotificationsChange);
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  const [tab, setTab] = useState<NotificationTab>("all");

  // "Now" is read after mount (never during server render) and ticks each
  // minute so relative times stay fresh.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef(false);

  const unread = list.filter((n) => !n.read).length;

  const close = useCallback(() => {
    const focused = document.activeElement;
    const inPanel = focused instanceof HTMLElement && panelRef.current?.contains(focused);
    setOpen(false);
    if (inPanel) triggerRef.current?.focus();
  }, [setOpen]);
  useDismiss(open, close, rootRef, { ignore: ignoreOutside });

  // Focus moves into the panel only when the user opened it — a panel that
  // starts open (defaultOpen) must not steal focus on page load.
  useEffect(() => {
    if (open && now !== null && focusOnOpen.current) {
      focusOnOpen.current = false;
      panelRef.current?.focus();
    }
  }, [open, now]);

  // Badge bump + bell ring when the unread count rises.
  const [badgeScope, animateBadge] = useAnimate<HTMLSpanElement>();
  const [bellScope, animateBell] = useAnimate<HTMLSpanElement>();
  const prevUnread = useRef(unread);
  useEffect(() => {
    const rose = unread > prevUnread.current;
    prevUnread.current = unread;
    if (!rose || reduce) return;
    if (badgeScope.current) {
      animateBadge(badgeScope.current, { scale: 1.35 }, { duration: 0.1, ease: EASE_OUT }).then(
        () => {
          if (badgeScope.current) animateBadge(badgeScope.current, { scale: 1 }, SPRING_PRESS);
        },
      );
    }
    if (bellScope.current) {
      animateBell(
        bellScope.current,
        { rotate: [0, -14, 11, -7, 4, 0] },
        { duration: 0.5, ease: EASE_OUT },
      );
    }
  }, [unread, reduce, animateBadge, animateBell, badgeScope, bellScope]);

  const markRead = useCallback(
    (id: string) => {
      if (!list.some((n) => n.id === id && !n.read)) return;
      setList(list.map((n) => (n.id === id ? { ...n, read: true } : n)));
      onMarkRead?.(id);
    },
    [list, setList, onMarkRead],
  );
  const archive = useCallback(
    (id: string, row: HTMLElement | null) => {
      // The row stays in the DOM while it animates out; don't strand focus on it.
      if (row?.contains(document.activeElement)) panelRef.current?.focus();
      setList(list.filter((n) => n.id !== id));
      onArchive?.(id);
    },
    [list, setList, onArchive],
  );
  const markAllRead = () => {
    if (!unread) return;
    setList(list.map((n) => (n.read ? n : { ...n, read: true })));
    onMarkAllRead?.();
  };

  const visible = tab === "unread" ? list.filter((n) => !n.read) : list;
  const groups = useMemo(() => {
    if (now === null) return [];
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const today: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];
    for (const n of [...visible].sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp))) {
      (toMs(n.timestamp) >= startOfToday.getTime() ? today : earlier).push(n);
    }
    return [
      { id: "today", label: "Today", items: today },
      { id: "earlier", label: "Earlier", items: earlier },
    ].filter((g) => g.items.length > 0);
  }, [visible, now]);

  const rtf = useMemo(
    () => new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" }),
    [locale],
  );
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }),
    [locale],
  );
  const relative = (t: NotificationItem["timestamp"]) => {
    if (now === null) return "";
    const diff = Math.max(0, now - toMs(t));
    const s = Math.round(diff / 1000);
    if (s < 45) return rtf.format(0, "second");
    const m = Math.round(s / 60);
    if (m < 60) return rtf.format(-m, "minute");
    const h = Math.round(m / 60);
    if (h < 24) return rtf.format(-h, "hour");
    const d = Math.round(diff / DAY);
    if (d < 7) return rtf.format(-d, "day");
    return dateFmt.format(toMs(t));
  };

  const tabs: { value: NotificationTab; label: string; count?: number }[] = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread", count: unread },
  ];
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next: NotificationTab = tab === "all" ? "unread" : "all";
    const target = event.key === "Home" ? "all" : event.key === "End" ? "unread" : next;
    setTab(target);
    document.getElementById(`${baseId}-tab-${target}`)?.focus();
  };

  const badgeText = unread > 99 ? "99+" : String(unread);

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${baseId}-panel` : undefined}
        aria-label={unread ? `${typeof title === "string" ? title : "Notifications"}, ${unread} unread` : typeof title === "string" ? title : "Notifications"}
        onClick={() => {
          if (!open) focusOnOpen.current = true;
          setOpen(!open);
        }}
        className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span ref={bellScope} className="inline-flex" style={{ transformOrigin: "50% 15%" }}>
          <Bell aria-hidden className="size-[18px]" />
        </span>
        <AnimatePresence initial={false}>
          {unread > 0 ? (
            <motion.span
              key="badge"
              aria-hidden
              initial={{ opacity: 0, scale: reduce ? 1 : 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.4, transition: { duration: 0.12 } }}
              transition={reduce ? { duration: 0.12 } : SPRING_PRESS}
              className="absolute -right-1 -top-1"
            >
              <span
                ref={badgeScope}
                className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-semibold tabular-nums leading-none text-primary-foreground"
              >
                {badgeText}
              </span>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && now !== null ? (
          <motion.div
            key="panel"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, transition: SPRING_PANEL }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, transition: { duration: 0.16, ease: EASE_OUT } }}
            transition={{ duration: 0.12 }}
            style={{ transformOrigin: align === "end" ? "top right" : "top left" }}
            className={cn(
              "absolute top-full z-50 mt-2 [filter:drop-shadow(0_10px_18px_rgba(0,0,0,0.14))]",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            <motion.div
              ref={panelRef}
              id={`${baseId}-panel`}
              role="dialog"
              aria-label={typeof title === "string" ? title : "Notifications"}
              tabIndex={-1}
              initial={reduce ? false : { clipPath: clipHidden(align) }}
              animate={reduce ? undefined : { clipPath: CLIP_SHOWN, transition: CLIP_TRANSITION }}
              exit={reduce ? undefined : { clipPath: clipHidden(align), transition: CLIP_TRANSITION }}
              className={cn(
                "flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground outline-none",
                panelClassName,
              )}
            >
              <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
                <h2 className="text-sm font-semibold">{title}</h2>
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={!unread}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
                >
                  <CheckCheck aria-hidden className="size-3.5" />
                  Mark all as read
                </button>
              </div>

              {/* layoutRoot: the indicator glides in panel coordinates, so a
                  scrolled page can't replay as movement. */}
              <motion.div
                layoutRoot
                role="tablist"
                aria-label="Filter notifications"
                className="mx-4 flex gap-1 border-b border-border"
              >
                {tabs.map((t) => {
                  const active = tab === t.value;
                  return (
                    <button
                      key={t.value}
                      id={`${baseId}-tab-${t.value}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls={`${baseId}-tabpanel`}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setTab(t.value)}
                      onKeyDown={onTabKey}
                      className={cn(
                        "relative -mb-px inline-flex items-center gap-1.5 px-2 pb-2 pt-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t.label}
                      {t.count ? (
                        <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
                          {t.count}
                        </span>
                      ) : null}
                      {active ? (
                        <motion.span
                          layoutId={`${baseId}-indicator`}
                          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                          className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </motion.div>

              <motion.div
                layoutScroll
                id={`${baseId}-tabpanel`}
                role="tabpanel"
                aria-labelledby={`${baseId}-tab-${tab}`}
                className="relative max-h-[18rem] overflow-y-auto overscroll-contain px-2 py-2 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {groups.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT } }}
                      exit={{ opacity: 0, transition: { duration: 0.12 } }}
                      className="flex flex-col items-center justify-center gap-2 py-10 text-center"
                    >
                      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <BellOff aria-hidden className="size-4" />
                      </span>
                      <p className="text-sm font-medium">{emptyLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {tab === "unread" ? "No unread notifications." : "New notifications will show up here."}
                      </p>
                    </motion.div>
                  ) : (
                    groups.map((group) => (
                      <motion.section
                        key={group.id}
                        layout={reduce ? false : "position"}
                        transition={SPRING_LAYOUT}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        aria-labelledby={`${baseId}-group-${group.id}`}
                        className="mb-1 last:mb-0"
                      >
                        <h3
                          id={`${baseId}-group-${group.id}`}
                          className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                        >
                          {group.label}
                        </h3>
                        <ul className="relative flex flex-col">
                          <AnimatePresence initial={false} mode="popLayout">
                            {group.items.map((n) => (
                              <NotificationRow
                                key={n.id}
                                item={n}
                                time={relative(n.timestamp)}
                                reduce={reduce}
                                alwaysShowActions={!canHover}
                                onSelect={
                                  onSelect
                                    ? () => {
                                        markRead(n.id);
                                        onSelect(n);
                                      }
                                    : undefined
                                }
                                onMarkRead={() => markRead(n.id)}
                                onArchive={(row) => archive(n.id, row)}
                              />
                            ))}
                          </AnimatePresence>
                        </ul>
                      </motion.section>
                    ))
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function NotificationRow({
  item,
  time,
  reduce,
  alwaysShowActions,
  onSelect,
  onMarkRead,
  onArchive,
}: {
  item: NotificationItem;
  time: string;
  reduce: boolean;
  alwaysShowActions: boolean;
  onSelect?: () => void;
  onMarkRead: () => void;
  onArchive: (row: HTMLElement | null) => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const unread = !item.read;

  const body = (
    <>
      <span className="relative mt-0.5 shrink-0">
        {item.icon ? (
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground [&_svg]:size-4">
            {item.icon}
          </span>
        ) : item.avatar ? (
          // biome-ignore lint/performance/noImgElement: library component, framework-agnostic.
          <img src={item.avatar} alt={item.name ?? ""} className="size-8 rounded-full object-cover" />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
            {initials(item.name)}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col pr-1">
        <span className={cn("text-[13px] leading-snug", unread ? "font-medium text-foreground" : "text-muted-foreground")}>
          {item.title}
        </span>
        {item.description ? (
          <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.description}</span>
        ) : null}
        <span className="mt-1 text-[11px] text-muted-foreground">
          {time}
          {unread ? <span className="sr-only">, unread</span> : null}
        </span>
      </span>
    </>
  );

  return (
    <motion.li
      ref={rowRef}
      layout={reduce ? false : "position"}
      initial={{ opacity: 0, y: reduce ? 0 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: reduce ? 0 : 24, transition: { duration: 0.16, ease: EASE_OUT } }}
      transition={reduce ? { duration: 0.15 } : SPRING_LAYOUT}
      className="group/row relative flex items-start gap-3 rounded-xl px-2 py-2 transition-colors focus-within:bg-muted/60 hover:bg-muted/60"
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>
      )}

      <span className="relative flex w-[3.25rem] shrink-0 items-start justify-end self-stretch">
        <AnimatePresence initial={false}>
          {unread ? (
            <motion.span
              key="dot"
              aria-hidden
              initial={{ opacity: 0, scale: reduce ? 1 : 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.4, transition: { duration: 0.12 } }}
              transition={reduce ? { duration: 0.15 } : SPRING_PRESS}
              className={cn(
                "absolute right-1 top-2 size-2 rounded-full bg-primary transition-opacity",
                !alwaysShowActions && "group-focus-within/row:opacity-0 group-hover/row:opacity-0",
              )}
            />
          ) : null}
        </AnimatePresence>
        <span
          className={cn(
            "flex gap-0.5 transition-opacity duration-150",
            alwaysShowActions
              ? "opacity-100"
              : "opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100",
          )}
        >
          {unread ? (
            <RowAction label="Mark as read" onClick={onMarkRead}>
              <Check aria-hidden className="size-3.5" />
            </RowAction>
          ) : null}
          <RowAction label="Archive" onClick={() => onArchive(rowRef.current)}>
            <Archive aria-hidden className="size-3.5" />
          </RowAction>
        </span>
      </span>
    </motion.li>
  );
}

function RowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
    </button>
  );
}
