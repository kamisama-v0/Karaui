"use client";

import { MessageSquare, Pencil, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { EmptyState } from "@/components/motion/empty-state";
import { InlineEdit } from "@/components/motion/inline-edit";
import { ScrollArea } from "@/components/motion/scroll-area";
import { Skeleton } from "@/components/motion/skeleton";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface Conversation {
  id: string;
  title: string;
  /** Last activity. ISO string, epoch ms or Date. */
  updatedAt: string | number | Date;
  pinned?: boolean;
  /** The title is still being generated: shows a blinking caret after it. */
  streaming?: boolean;
}

export type ConversationGroup = "pinned" | "today" | "yesterday" | "week" | "older";

export interface ConversationHistoryProps {
  conversations?: Conversation[];
  defaultConversations?: Conversation[];
  onConversationsChange?: (conversations: Conversation[]) => void;
  activeId?: string | null;
  defaultActiveId?: string | null;
  onActiveIdChange?: (id: string) => void;
  /** Called after a rename commits; return a promise to keep the editor's spinner until it settles. */
  onRename?: (id: string, title: string) => unknown;
  onPinChange?: (id: string, pinned: boolean) => void;
  onDelete?: (id: string) => void;
  /** Renders the "New chat" button. The parent inserts the conversation (usually `streaming`). */
  onNewChat?: () => void;
  /** Override "today" (otherwise read after mount so server and client markup match). */
  now?: Date;
  searchable?: boolean;
  labels?: Partial<Record<ConversationGroup, string>>;
  /** Max height of the scrolling list. Default 320. */
  maxHeight?: number;
  emptyState?: ReactNode;
  className?: string;
}

const GROUP_LABELS: Record<ConversationGroup, string> = {
  pinned: "Pinned",
  today: "Today",
  yesterday: "Yesterday",
  week: "Previous 7 days",
  older: "Older",
};

const GROUP_ORDER: ConversationGroup[] = ["pinned", "today", "yesterday", "week", "older"];
const DAY_MS = 86_400_000;

function toTime(value: Conversation["updatedAt"]) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/** Bucket a conversation by calendar day relative to `now` (local time). */
export function groupConversation(conversation: Conversation, now: Date): ConversationGroup {
  if (conversation.pinned) return "pinned";
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = toTime(conversation.updatedAt);
  if (t >= startOfToday) return "today";
  if (t >= startOfToday - DAY_MS) return "yesterday";
  if (t >= startOfToday - 7 * DAY_MS) return "week";
  return "older";
}

function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange: ((next: T) => void) | undefined,
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

export function ConversationHistory({
  conversations: conversationsProp,
  defaultConversations = [],
  onConversationsChange,
  activeId: activeIdProp,
  defaultActiveId = null,
  onActiveIdChange,
  onRename,
  onPinChange,
  onDelete,
  onNewChat,
  now: nowProp,
  searchable = true,
  labels,
  maxHeight = 320,
  emptyState,
  className,
}: ConversationHistoryProps) {
  const uid = useId();
  const reduce = useReducedMotion() ?? false;
  const [conversations, setConversations] = useControllable(
    conversationsProp,
    defaultConversations,
    onConversationsChange,
  );
  const [activeId, setActiveId] = useControllable<string | null>(
    activeIdProp,
    defaultActiveId,
    onActiveIdChange as ((id: string | null) => void) | undefined,
  );
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // "Today" is only known on the client; grouping waits for it so the server
  // render never disagrees with the first client render.
  const [mountedNow, setMountedNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!nowProp) setMountedNow(new Date());
  }, [nowProp]);
  const now = nowProp ?? mountedNow;

  const groups = useMemo(() => {
    if (!now) return [];
    const q = query.trim().toLowerCase();
    const buckets = new Map<ConversationGroup, Conversation[]>();
    const sorted = [...conversations].sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));
    for (const c of sorted) {
      if (q && !c.title.toLowerCase().includes(q)) continue;
      const g = groupConversation(c, now);
      const list = buckets.get(g) ?? [];
      list.push(c);
      buckets.set(g, list);
    }
    return GROUP_ORDER.filter((g) => buckets.has(g)).map((g) => ({
      id: g,
      items: buckets.get(g) ?? [],
    }));
  }, [conversations, now, query]);

  const focusRow = (id: string) => {
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-conversation-id="${CSS.escape(id)}"]`)
        ?.focus();
    });
  };

  const update = (id: string, patch: Partial<Conversation>) =>
    setConversations(conversations.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const remove = (id: string) => {
    const flat = groups.flatMap((g) => g.items);
    const index = flat.findIndex((c) => c.id === id);
    const neighbour = flat[index + 1] ?? flat[index - 1];
    setConversations(conversations.filter((c) => c.id !== id));
    onDelete?.(id);
    if (neighbour) focusRow(neighbour.id);
  };

  // Up/Down (and Home/End) move between conversation rows.
  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const target = event.target as HTMLElement;
    if (!target.dataset.conversationId) return;
    const rows = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[data-conversation-id]") ?? [],
    );
    const i = rows.indexOf(target);
    const next =
      event.key === "Home"
        ? rows[0]
        : event.key === "End"
          ? rows[rows.length - 1]
          : rows[i + (event.key === "ArrowDown" ? 1 : -1)];
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {(onNewChat || searchable) && (
        <div className="flex items-center gap-2">
          {searchable && (
            <label className="relative flex h-9 min-w-0 flex-1 items-center rounded-lg border border-border bg-muted/50 focus-within:border-border-strong focus-within:ring-2 focus-within:ring-ring/30">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats"
                aria-label="Search chats"
                className="h-full w-full bg-transparent pl-8 pr-2 text-sm text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
          )}
          {onNewChat && (
            <button
              type="button"
              onClick={onNewChat}
              aria-label="New chat"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              <Plus aria-hidden="true" className="size-4" />
              <span className={searchable ? "sr-only sm:not-sr-only" : undefined}>New chat</span>
            </button>
          )}
        </div>
      )}

      <ScrollArea
        aria-label="Conversation history"
        fadeEdges
        className="w-full"
        viewportClassName="max-h-[var(--ch-max)]"
        style={{ "--ch-max": `${maxHeight}px` } as CSSProperties}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: delegates arrow keys to the row buttons inside */}
        <div ref={listRef} onKeyDown={onListKeyDown} className="flex flex-col gap-3 p-1">
          {!now ? (
            <div aria-busy="true" className="flex flex-col gap-2 px-1">
              <Skeleton shape="text" width="30%" />
              {[72, 58, 80, 64].map((w) => (
                <Skeleton key={w} height={32} width={`${w}%`} />
              ))}
            </div>
          ) : total === 0 ? (
            (emptyState ?? (
              <EmptyState
                size="sm"
                icon={<MessageSquare aria-hidden="true" className="size-5" />}
                title={query ? "No matching chats" : "No conversations yet"}
                description={query ? `Nothing matches “${query}”.` : "Start a new chat to see it here."}
              />
            ))
          ) : (
            <LayoutGroup id={uid}>
              <AnimatePresence initial={false} mode="popLayout">
                {groups.map((group) => (
                  <motion.section
                    key={group.id}
                    layout={reduce ? false : "position"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    transition={SPRING_LAYOUT}
                    aria-labelledby={`${uid}-${group.id}`}
                    className="flex flex-col gap-0.5"
                  >
                    <h3
                      id={`${uid}-${group.id}`}
                      className="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {group.id === "pinned" && <Pin aria-hidden="true" className="size-3" />}
                      {labels?.[group.id] ?? GROUP_LABELS[group.id]}
                    </h3>
                    <ul className="flex flex-col gap-0.5">
                      <AnimatePresence initial={false} mode="popLayout">
                        {group.items.map((conversation) => (
                          <ConversationRow
                            key={conversation.id}
                            uid={uid}
                            conversation={conversation}
                            active={conversation.id === activeId}
                            renaming={renamingId === conversation.id}
                            reduce={reduce}
                            onSelect={() => setActiveId(conversation.id)}
                            onStartRename={() => setRenamingId(conversation.id)}
                            onEndRename={() => {
                              setRenamingId(null);
                              focusRow(conversation.id);
                            }}
                            onRename={(title) => {
                              update(conversation.id, { title });
                              return onRename?.(conversation.id, title);
                            }}
                            onTogglePin={() => {
                              const pinned = !conversation.pinned;
                              update(conversation.id, { pinned });
                              onPinChange?.(conversation.id, pinned);
                              focusRow(conversation.id);
                            }}
                            onDelete={() => remove(conversation.id)}
                          />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </motion.section>
                ))}
              </AnimatePresence>
            </LayoutGroup>
          )}
        </div>
      </ScrollArea>
      <p aria-live="polite" className="sr-only">
        {query && now ? `${total} conversation${total === 1 ? "" : "s"} found` : ""}
      </p>
    </div>
  );
}

interface ConversationRowProps {
  uid: string;
  conversation: Conversation;
  active: boolean;
  renaming: boolean;
  reduce: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onEndRename: () => void;
  onRename: (title: string) => unknown;
  onTogglePin: () => void;
  onDelete: () => void;
}

function ConversationRow({
  uid,
  conversation,
  active,
  renaming,
  reduce,
  onSelect,
  onStartRename,
  onEndRename,
  onRename,
  onTogglePin,
  onDelete,
}: ConversationRowProps) {
  const editRef = useRef<HTMLDivElement>(null);

  // InlineEdit opens from its own display button; press it once so the
  // Rename action lands straight in the editor.
  useEffect(() => {
    if (renaming) editRef.current?.querySelector<HTMLButtonElement>("button")?.click();
  }, [renaming]);

  return (
    <motion.li
      layout={reduce ? false : "position"}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        reduce
          ? { opacity: 0, transition: { duration: 0.12 } }
          : { opacity: 0, x: -24, transition: { duration: 0.18, ease: EASE_OUT } }
      }
      transition={SPRING_LAYOUT}
      className="group/row relative"
    >
      {active && (
        <motion.span
          aria-hidden="true"
          layoutId={`${uid}-active`}
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="absolute inset-0 rounded-lg bg-muted ring-1 ring-border"
        />
      )}
      {renaming ? (
        <div ref={editRef} className="relative px-2 py-0.5 text-sm">
          <InlineEdit
            label="Conversation title"
            defaultValue={conversation.title}
            maxLength={80}
            validate={(next) => (next.trim() ? null : "Title can't be empty")}
            onSave={(next) => onRename(next.trim())}
            onEditingChange={(editing) => {
              if (!editing) onEndRename();
            }}
            className="mx-0"
          />
        </div>
      ) : (
        <>
          <button
            type="button"
            data-conversation-id={conversation.id}
            aria-current={active ? "page" : undefined}
            onClick={onSelect}
            onKeyDown={(e) => {
              if (e.key === "F2") {
                e.preventDefault();
                onStartRename();
              } else if (e.key === "Delete") {
                e.preventDefault();
                onDelete();
              }
            }}
            className={cn(
              "relative flex h-9 w-full items-center rounded-lg px-2.5 pr-2 text-left text-sm outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring",
              active ? "text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <span className="min-w-0 flex-1 truncate group-focus-within/row:pr-20 group-hover/row:pr-20">
              {conversation.title ||
                (conversation.streaming ? (
                  <span className="text-muted-foreground">New chat</span>
                ) : (
                  "Untitled"
                ))}
              {conversation.streaming && (
                <motion.span
                  aria-hidden="true"
                  className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-foreground"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                />
              )}
            </span>
            {conversation.streaming && <span className="sr-only">(generating title)</span>}
          </button>
          <div
            className={cn(
              "absolute inset-y-0 right-1 flex items-center gap-0.5 opacity-0 transition-opacity duration-150",
              "group-focus-within/row:opacity-100 group-hover/row:opacity-100 pointer-coarse:opacity-100",
            )}
          >
            <RowAction label={conversation.pinned ? "Unpin" : "Pin"} onClick={onTogglePin}>
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={conversation.pinned ? "off" : "on"}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: -30 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: reduce ? 1 : 0.5 }}
                  transition={SPRING_SWAP}
                  className="flex"
                >
                  {conversation.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                </motion.span>
              </AnimatePresence>
            </RowAction>
            <RowAction label="Rename" onClick={onStartRename}>
              <Pencil className="size-3.5" />
            </RowAction>
            <RowAction label="Delete" destructive onClick={onDelete}>
              <Trash2 className="size-3.5" />
            </RowAction>
          </div>
        </>
      )}
    </motion.li>
  );
}

function RowAction({
  label,
  destructive,
  onClick,
  children,
}: {
  label: string;
  destructive?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring",
        destructive
          ? "hover:bg-destructive/10 hover:text-destructive"
          : "hover:bg-foreground/10 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
