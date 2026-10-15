"use client";

import {
  Check,
  CreditCard,
  Inbox,
  KeyRound,
  Plane,
  RotateCcw,
  Rocket,
  ShoppingCart,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@/components/motion/animated-toast-stack";
import { Button } from "@/components/motion/button";
import { Checkbox } from "@/components/motion/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/motion/dialog";
import { EmptyState } from "@/components/motion/empty-state";
import { Kbd } from "@/components/motion/kbd";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalPriority = "low" | "normal" | "high" | "urgent";
export type ApprovalKind = "expense" | "access" | "deploy" | "purchase" | "time-off";

export interface ApprovalRequest {
  id: string;
  kind: ApprovalKind;
  title: string;
  requester: { name: string; avatar?: string };
  /** Amount in major units (e.g. dollars). Omit for non-monetary requests. */
  amount?: number;
  /** ISO 4217 code. Default: the component's `currency`. */
  currency?: string;
  /** One-line context, e.g. "prod · v2.14.0" or "Admin on billing". */
  details?: string;
  /** Date, epoch ms or ISO string — drives the age column. */
  createdAt: Date | number | string;
  priority: ApprovalPriority;
  status: ApprovalStatus;
  /** Set when rejected. */
  reason?: string;
}

export interface ApprovalQueueProps {
  /** Controlled list. Decisions call `onRequestsChange` with updated statuses. */
  requests?: ApprovalRequest[];
  /** Uncontrolled initial list. */
  defaultRequests?: ApprovalRequest[];
  onRequestsChange?: (requests: ApprovalRequest[]) => void;
  onApprove?: (ids: string[]) => void;
  onReject?: (ids: string[], reason: string) => void;
  /** Fired when a decision is undone from the toast or reopened. */
  onUndo?: (ids: string[]) => void;
  /** Default currency for amounts. Default "USD". */
  currency?: string;
  /** Locale for numbers. Default "en-US". */
  locale?: string;
  /** Height of the scrolling list. Default "16rem". */
  listHeight?: string;
  /** Show the j/k/a/r keyboard legend. Default true. */
  showShortcuts?: boolean;
  className?: string;
}

const KIND_ICON: Record<ApprovalKind, typeof CreditCard> = {
  expense: CreditCard,
  access: KeyRound,
  deploy: Rocket,
  purchase: ShoppingCart,
  "time-off": Plane,
};

const PRIORITY_CLASS: Record<ApprovalPriority, string> = {
  low: "bg-foreground/5 text-muted-foreground",
  normal:
    "bg-[color-mix(in_oklab,var(--chart-1)_12%,transparent)] text-[color-mix(in_oklab,var(--chart-1)_70%,var(--foreground))]",
  high: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,var(--foreground))]",
  urgent:
    "bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)] text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]",
};

const REASONS = ["Over budget", "Needs more detail", "Duplicate request", "Not now"];

function toMs(t: ApprovalRequest["createdAt"]) {
  return t instanceof Date ? t.getTime() : typeof t === "number" ? t : Date.parse(t);
}

function age(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
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
 * Review queue for pending requests (expenses, access grants, deploys…).
 * Approve or reject one row or a selection: rows swipe out optimistically —
 * right for approve, left for reject — and an undo toast puts them back.
 * Rejecting asks for a reason in a Dialog. Pending/Approved/Rejected tabs
 * roll their counts. Keyboard: j/k move, x selects, a approves, r rejects.
 */
export function ApprovalQueue({
  requests,
  defaultRequests = [],
  onRequestsChange,
  onApprove,
  onReject,
  onUndo,
  currency = "USD",
  locale = "en-US",
  listHeight = "16rem",
  showShortcuts = true,
  className,
}: ApprovalQueueProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const [list, setList] = useControllable(requests, defaultRequests, onRequestsChange);
  const [tab, setTab] = useState<ApprovalStatus>("pending");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  // Direction the next exiting rows swipe: 1 = approve (right), -1 = reject.
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [reason, setReason] = useState("");
  const { toasts, showToast, dismissToast } = useAnimatedToastStack({ defaultDuration: 5000, limit: 3 });

  const rootRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  // Latest list for toast callbacks fired after later decisions.
  const listRef = useRef(list);
  listRef.current = list;

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const r of list) c[r.status]++;
    return c;
  }, [list]);

  const visible = useMemo(
    () =>
      list
        .filter((r) => r.status === tab)
        .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt)),
    [list, tab],
  );
  const pendingTab = tab === "pending";
  const selectedVisible = visible.filter((r) => selected.has(r.id)).map((r) => r.id);

  const money = useMemo(() => {
    const cache = new Map<string, Intl.NumberFormat>();
    return (amount: number, code: string) => {
      let f = cache.get(code);
      if (!f) {
        f = new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumFractionDigits: 0 });
        cache.set(code, f);
      }
      return f.format(amount);
    };
  }, [locale]);

  const focusRow = (id: string | null) => {
    setActiveId(id);
    if (id) requestAnimationFrame(() => rowRefs.current.get(id)?.focus({ preventScroll: false }));
  };

  /** After rows leave, keep the cursor on the next remaining row. */
  const nextActive = (leaving: string[]) => {
    if (!activeId || !leaving.includes(activeId)) return activeId;
    const idx = visible.findIndex((r) => r.id === activeId);
    const rest = visible.filter((r) => !leaving.includes(r.id));
    return rest[Math.min(idx, rest.length - 1)]?.id ?? null;
  };

  const decide = (ids: string[], status: "approved" | "rejected", why?: string) => {
    if (!ids.length) return;
    const before = new Map(list.filter((r) => ids.includes(r.id)).map((r) => [r.id, r]));
    setExitDir(status === "approved" ? 1 : -1);
    const next = nextActive(ids);
    // Moving focus before the rows leave keeps it from landing on <body>.
    const leavingHasFocus = ids.some((id) => rowRefs.current.get(id)?.contains(document.activeElement));
    setList(list.map((r) => (ids.includes(r.id) ? { ...r, status, reason: why } : r)));
    setSelected((prev) => {
      const s = new Set(prev);
      for (const id of ids) s.delete(id);
      return s;
    });
    if (leavingHasFocus) {
      if (next) focusRow(next);
      else rootRef.current?.focus();
    } else setActiveId(next);
    if (status === "approved") onApprove?.(ids);
    else onReject?.(ids, why ?? "");

    const first = before.values().next().value;
    const label = ids.length === 1 && first ? `“${first.title}”` : `${ids.length} requests`;
    const toastId = showToast({
      title: `${status === "approved" ? "Approved" : "Rejected"} ${label}`,
      description: why ? `Reason: ${why}` : undefined,
      status: status === "approved" ? "success" : "error",
      action: {
        label: "Undo",
        onClick: () => {
          setExitDir(status === "approved" ? -1 : 1);
          setList(listRef.current.map((r) => before.get(r.id) ?? r));
          onUndo?.(ids);
          dismissToast(toastId);
        },
      },
    });
  };

  const reopen = (id: string) => {
    setExitDir(tab === "approved" ? -1 : 1);
    setList(list.map((r) => (r.id === id ? { ...r, status: "pending", reason: undefined } : r)));
    onUndo?.([id]);
  };

  const askReject = (ids: string[]) => {
    if (!ids.length) return;
    setReason("");
    setRejecting(ids);
  };
  const confirmReject = () => {
    if (!rejecting) return;
    decide(rejecting, "rejected", reason.trim() || undefined);
    setRejecting(null);
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  const allSelected = visible.length > 0 && selectedVisible.length === visible.length;
  const toggleAll = () =>
    setSelected((prev) => {
      const s = new Set(prev);
      if (allSelected) for (const r of visible) s.delete(r.id);
      else for (const r of visible) s.add(r.id);
      return s;
    });

  // j/k/x/a/r while focus is anywhere inside the queue (not in a text field).
  // Attached natively so the wrapper stays a plain, non-interactive element.
  const keyState = useRef({ visible, activeId, selectedVisible, pendingTab, decide, askReject, toggleSelect, focusRow });
  keyState.current = { visible, activeId, selectedVisible, pendingTab, decide, askReject, toggleSelect, focusRow };
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable='true']")) return;
      const s = keyState.current;
      const idx = s.visible.findIndex((r) => r.id === s.activeId);
      const key = e.key.toLowerCase();
      if (key === "j" || key === "k") {
        e.preventDefault();
        if (!s.visible.length) return;
        const next =
          idx === -1 ? 0 : Math.min(s.visible.length - 1, Math.max(0, idx + (key === "j" ? 1 : -1)));
        s.focusRow(s.visible[next].id);
        return;
      }
      if (!s.pendingTab) return;
      const targets = s.selectedVisible.length ? s.selectedVisible : s.activeId && idx !== -1 ? [s.activeId] : [];
      if (key === "x" && s.activeId && idx !== -1) {
        e.preventDefault();
        s.toggleSelect(s.activeId);
      } else if (key === "a" && targets.length) {
        e.preventDefault();
        s.decide(targets, "approved");
      } else if (key === "r" && targets.length) {
        e.preventDefault();
        s.askReject(targets);
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, []);

  const rowVariants: Variants = {
    initial: { opacity: 0, y: reduce ? 0 : 6 },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: (dir: number) => ({
      opacity: 0,
      x: reduce ? 0 : dir * 96,
      transition: { duration: 0.2, ease: EASE_OUT },
    }),
  };

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={cn(
        "relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 text-card-foreground outline-none",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as ApprovalStatus)} variant="underline">
          <TabsList>
            {(["pending", "approved", "rejected"] as const).map((s) => (
              <TabsTrigger key={s} value={s} className="min-h-9 gap-1.5 px-2 text-xs capitalize sm:text-sm">
                {s}
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-foreground/5 px-1.5 text-[11px] tabular-nums text-muted-foreground">
                  <NumberTicker value={counts[s]} startOnView={false} duration={0.45} stagger={0.02} />
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {pendingTab && visible.length > 0 ? (
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && selectedVisible.length > 0}
            onCheckedChange={toggleAll}
            aria-label="Select all pending requests"
            label="All"
            className="gap-2 text-xs"
          />
        ) : null}
      </div>

      {/* Bulk bar slides down when rows are selected. */}
      <AnimatePresence initial={false}>
        {pendingTab && selectedVisible.length > 0 ? (
          <motion.div
            key="bulk"
            initial={{ opacity: 0, y: reduce ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="flex items-center justify-between gap-2 rounded-xl bg-foreground/[0.04] py-1.5 pr-1.5 pl-3"
          >
            <span className="text-xs font-medium tabular-nums" aria-live="polite">
              {selectedVisible.length} selected
            </span>
            <span className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => askReject(selectedVisible)}>
                <X className="size-3.5" aria-hidden />
                Reject
              </Button>
              <Button size="sm" onClick={() => decide(selectedVisible, "approved")}>
                <Check className="size-3.5" aria-hidden />
                Approve
              </Button>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className="-mx-1 overflow-x-hidden overflow-y-auto px-1 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
        style={{ height: listHeight }}
      >
        {visible.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Inbox className="size-5" />}
            title={pendingTab ? "Queue is clear" : `Nothing ${tab} yet`}
            description={pendingTab ? "New requests will show up here." : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-1" aria-label={`${tab} requests`}>
            <AnimatePresence initial={false} mode="popLayout" custom={exitDir}>
              {visible.map((r) => (
                <ApprovalRow
                  key={r.id}
                  request={r}
                  variants={rowVariants}
                  exitDir={exitDir}
                  active={r.id === activeId}
                  selected={selected.has(r.id)}
                  pendingTab={pendingTab}
                  reduce={reduce}
                  layoutGroup={baseId}
                  ageLabel={now === null ? "" : age(now - toMs(r.createdAt))}
                  amountLabel={r.amount === undefined ? null : money(r.amount, r.currency ?? currency)}
                  registerRow={(el) => {
                    if (el) rowRefs.current.set(r.id, el);
                    else rowRefs.current.delete(r.id);
                  }}
                  onFocusRow={() => setActiveId(r.id)}
                  onToggle={() => toggleSelect(r.id)}
                  onApprove={() => decide([r.id], "approved")}
                  onReject={() => askReject([r.id])}
                  onReopen={() => reopen(r.id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {showShortcuts ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Kbd size="sm">j</Kbd>
            <Kbd size="sm">k</Kbd> move
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd size="sm">x</Kbd> select
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd size="sm">a</Kbd> approve
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd size="sm">r</Kbd> reject
          </span>
        </p>
      ) : null}

      <AnimatedToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        placement="absolute"
        position="bottom-center"
        maxVisible={2}
        className="w-[calc(100%-2rem)]"
      />

      <Dialog open={rejecting !== null} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Reject {rejecting && rejecting.length > 1 ? `${rejecting.length} requests` : "request"}
            </DialogTitle>
            <DialogDescription>
              The requester sees this reason. You can undo right after.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={reason === r}
                  onClick={() => setReason(r)}
                  className={cn(
                    "h-7 rounded-full border border-border px-2.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    reason === r
                      ? "border-foreground/30 bg-foreground/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Reason
              <textarea
                data-dialog-autofocus
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) confirmReject();
                }}
                placeholder="Add context for the requester…"
                className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </label>
          </div>
          <DialogFooter className="mt-5">
            <Button variant="outline" size="sm" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmReject} disabled={!reason.trim()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalRow({
  ref,
  request: r,
  variants,
  exitDir,
  active,
  selected,
  pendingTab,
  reduce,
  layoutGroup,
  ageLabel,
  amountLabel,
  registerRow,
  onFocusRow,
  onToggle,
  onApprove,
  onReject,
  onReopen,
}: {
  /** Forwarded so AnimatePresence's popLayout can measure the exiting row. */
  ref?: Ref<HTMLLIElement>;
  request: ApprovalRequest;
  variants: Variants;
  exitDir: number;
  active: boolean;
  selected: boolean;
  pendingTab: boolean;
  reduce: boolean;
  layoutGroup: string;
  ageLabel: string;
  amountLabel: string | null;
  registerRow: (el: HTMLButtonElement | null) => void;
  onFocusRow: () => void;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onReopen: () => void;
}) {
  const Icon = KIND_ICON[r.kind];
  const description: ReactNode = (
    <>
      {r.requester.name}
      {r.details ? <> · {r.details}</> : null}
    </>
  );

  return (
    <motion.li
      ref={ref}
      layout={reduce ? false : "position"}
      custom={exitDir}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ default: { duration: 0.22, ease: EASE_OUT }, layout: SPRING_LAYOUT }}
      className="group relative flex items-center gap-3 rounded-xl px-2 py-2"
    >
      {active ? (
        <motion.span
          aria-hidden
          layoutId={`${layoutGroup}-active`}
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="absolute inset-0 -z-0 rounded-xl bg-foreground/[0.05] ring-1 ring-border-strong"
        />
      ) : null}
      {pendingTab ? (
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select ${r.title}`}
          className="relative"
        />
      ) : null}
      <span
        aria-hidden
        className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-foreground/5 text-muted-foreground"
      >
        <Icon className="size-4" />
      </span>
      <button
        ref={registerRow}
        type="button"
        onFocus={onFocusRow}
        onClick={pendingTab ? onToggle : onFocusRow}
        aria-pressed={pendingTab ? selected : undefined}
        className="relative min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{r.title}</span>
          <span
            className={cn(
              "inline-flex h-4.5 shrink-0 items-center rounded-full px-1.5 text-[10px] font-semibold capitalize",
              PRIORITY_CLASS[r.priority],
            )}
          >
            {r.priority}
          </span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {description}
          {r.status === "rejected" && r.reason ? <> · “{r.reason}”</> : null}
        </span>
      </button>
      <span className="relative flex shrink-0 flex-col items-end">
        {amountLabel ? <span className="text-sm font-semibold tabular-nums">{amountLabel}</span> : null}
        <span className="text-[11px] tabular-nums text-muted-foreground">
          <span className="sr-only">Waiting </span>
          {ageLabel}
        </span>
      </span>
      <span className="relative flex shrink-0 gap-1">
        {pendingTab ? (
          <>
            <IconAction label={`Reject ${r.title}`} onClick={onReject} tone="reject">
              <X className="size-4" />
            </IconAction>
            <IconAction label={`Approve ${r.title}`} onClick={onApprove} tone="approve">
              <Check className="size-4" />
            </IconAction>
          </>
        ) : (
          <IconAction label={`Move ${r.title} back to pending`} onClick={onReopen}>
            <RotateCcw className="size-3.5" />
          </IconAction>
        )}
      </span>
    </motion.li>
  );
}

function IconAction({
  label,
  onClick,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "approve" | "reject";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-lg border border-border text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        tone === "approve" &&
          "hover:border-[color-mix(in_oklab,var(--success)_40%,transparent)] hover:bg-[color-mix(in_oklab,var(--success)_14%,transparent)] hover:text-[color-mix(in_oklab,var(--success)_55%,var(--foreground))]",
        tone === "reject" &&
          "hover:border-[color-mix(in_oklab,var(--destructive)_40%,transparent)] hover:bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] hover:text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]",
        !tone && "hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <span aria-hidden className="inline-flex">
        {children}
      </span>
    </button>
  );
}
