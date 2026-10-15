"use client";

import {
  Archive,
  ArrowLeft,
  Inbox,
  MailOpen,
  Search,
  Star,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type PanInfo,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Checkbox } from "@/components/motion/checkbox";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface InboxFolder {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Virtual folder (e.g. Starred): decides membership instead of `message.folder`. */
  filter?: (message: InboxMessage) => boolean;
}

function inFolder(message: InboxMessage, folder: InboxFolder) {
  return folder.filter ? folder.filter(message) : message.folder === folder.id;
}

export interface InboxMessage {
  id: string;
  folder: string;
  from: { name: string; email?: string };
  subject: string;
  /** One-line preview shown in the list. */
  preview: string;
  /** Full body for the reading pane. Strings keep their line breaks. */
  body?: ReactNode;
  /** ISO date string; formatted with `locale` + `timeZone`. */
  date: string;
  unread?: boolean;
  starred?: boolean;
}

export type InboxAction = "archive" | "delete";

export interface InboxAppProps {
  folders: InboxFolder[];
  /** Controlled messages. */
  messages?: InboxMessage[];
  /** Uncontrolled initial messages. */
  defaultMessages?: InboxMessage[];
  onMessagesChange?: (messages: InboxMessage[]) => void;
  /** Controlled open folder. */
  folder?: string;
  defaultFolder?: string;
  onFolderChange?: (folder: string) => void;
  /** Controlled open message id. */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
  /** Fires after archive/delete with the affected ids (before any undo). */
  onAction?: (action: InboxAction, ids: string[]) => void;
  /** Fires when an archive/delete is undone. */
  onUndo?: (action: InboxAction, ids: string[]) => void;
  /** Folder that archived mail moves to. Default "archive". */
  archiveFolder?: string;
  /** Folder that deleted mail moves to; deleting inside it removes for good. Default "trash". */
  trashFolder?: string;
  /** How long the undo bar stays, in ms. Default 5000. */
  undoTimeout?: number;
  /** Default "en-US" so server and client agree. */
  locale?: string;
  /** Default "UTC" so server and client agree. */
  timeZone?: string;
  className?: string;
}

// Past this drag distance (px) a row commits to archive (right) or delete (left).
const SWIPE_COMMIT = 96;

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

type UndoState = {
  key: number;
  action: InboxAction;
  ids: string[];
  previous: InboxMessage[];
};

/**
 * Mail client block: folder rail with unread counts, a searchable message
 * list (unread dots, stars, checkboxes, gliding selection) and a reading pane
 * that cross-fades between messages. Rows swipe right to archive and left to
 * delete (or use the toolbar), slide out, and an undo bar restores them.
 */
export function InboxApp({
  folders,
  messages: messagesProp,
  defaultMessages = [],
  onMessagesChange,
  folder: folderProp,
  defaultFolder,
  onFolderChange,
  selectedId: selectedProp,
  defaultSelectedId = null,
  onSelectedChange,
  onAction,
  onUndo,
  archiveFolder = "archive",
  trashFolder = "trash",
  undoTimeout = 5000,
  locale = "en-US",
  timeZone = "UTC",
  className,
}: InboxAppProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [messages, setMessages] = useControllable(
    messagesProp,
    defaultMessages,
    onMessagesChange,
  );
  const [folder, setFolder] = useControllable(
    folderProp,
    defaultFolder ?? folders[0]?.id ?? "",
    onFolderChange,
  );
  const [selectedId, setSelectedId] = useControllable<string | null>(
    selectedProp,
    defaultSelectedId,
    onSelectedChange,
  );
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const [undo, setUndo] = useState<UndoState | null>(null);
  // Narrow containers show either the list or the reader.
  const [reading, setReading] = useState(false);
  const undoKey = useRef(0);

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone }),
    [locale, timeZone],
  );
  const fullDateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
      }),
    [locale, timeZone],
  );

  const activeFolder = folders.find((f) => f.id === folder);

  const unreadByFolder = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of folders) {
      counts[f.id] = messages.filter((m) => m.unread && inFolder(m, f)).length;
    }
    return counts;
  }, [messages, folders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages
      .filter((m) => (activeFolder ? inFolder(m, activeFolder) : m.folder === folder))
      .filter(
        (m) =>
          !q ||
          m.subject.toLowerCase().includes(q) ||
          m.from.name.toLowerCase().includes(q) ||
          m.preview.toLowerCase().includes(q),
      )
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [messages, folder, query, activeFolder]);

  const selected = visible.find((m) => m.id === selectedId) ?? null;

  // Undo bar auto-dismisses; a new action restarts the timer via its key.
  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), undoTimeout);
    return () => window.clearTimeout(timer);
  }, [undo, undoTimeout]);

  const patch = useCallback(
    (ids: string[], change: Partial<InboxMessage>) => {
      const set = new Set(ids);
      setMessages(messages.map((m) => (set.has(m.id) ? { ...m, ...change } : m)));
    },
    [messages, setMessages],
  );

  const open = (id: string) => {
    setSelectedId(id);
    setReading(true);
    const target = messages.find((m) => m.id === id);
    if (target?.unread) patch([id], { unread: false });
  };

  const run = (action: InboxAction, ids: string[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    const destination = action === "archive" ? archiveFolder : trashFolder;
    const permanent = action === "delete" && folder === trashFolder;
    const next = permanent
      ? messages.filter((m) => !set.has(m.id))
      : messages.map((m) => (set.has(m.id) ? { ...m, folder: destination } : m));
    // Archive slides right, delete slides left — matching the swipe directions.
    setExitDir(action === "archive" ? 1 : -1);
    setMessages(next);
    setChecked((prev) => {
      const copy = new Set(prev);
      for (const id of ids) copy.delete(id);
      return copy;
    });
    if (selectedId && set.has(selectedId)) {
      // Move the reader to the next message left in the list, if any.
      const order = visible.map((m) => m.id);
      const at = order.indexOf(selectedId);
      const remaining = order.filter((id) => !set.has(id));
      setSelectedId(remaining[Math.min(at, remaining.length - 1)] ?? null);
      if (remaining.length === 0) setReading(false);
    }
    undoKey.current += 1;
    setUndo({ key: undoKey.current, action, ids, previous: messages });
    onAction?.(action, ids);
  };

  const restore = () => {
    if (!undo) return;
    setExitDir(undo.action === "archive" ? 1 : -1);
    setMessages(undo.previous);
    onUndo?.(undo.action, undo.ids);
    setUndo(null);
  };

  const checkedIds = visible.filter((m) => checked.has(m.id)).map((m) => m.id);
  const allChecked = visible.length > 0 && checkedIds.length === visible.length;

  const toggleChecked = (id: string) =>
    setChecked((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });

  const switchFolder = (id: string) => {
    setFolder(id);
    setChecked(new Set());
    setSelectedId(null);
    setReading(false);
  };

  const fade = { duration: 0.2, ease: EASE_OUT };

  return (
    <div
      className={cn(
        "@container relative flex h-[26rem] w-full overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {/* Folder rail */}
      <nav
        aria-label="Mail folders"
        className="hidden w-36 shrink-0 flex-col gap-0.5 border-r border-border bg-muted/40 p-2 @lg:flex"
      >
        <LayoutGroup id={`${baseId}-folders`}>
          {folders.map((f) => {
            const active = f.id === folder;
            const count = unreadByFolder[f.id] ?? 0;
            return (
              <button
                key={f.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => switchFolder(f.id)}
                className={cn(
                  "relative flex h-8 items-center gap-2 rounded-lg px-2 text-left text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="folder-pill"
                    transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                    className="absolute inset-0 rounded-lg border border-border bg-background shadow-sm"
                  />
                ) : null}
                <span className="relative shrink-0 [&_svg]:size-3.5">
                  {f.icon ?? <Inbox aria-hidden />}
                </span>
                <span className="relative min-w-0 flex-1 truncate">{f.label}</span>
                {count > 0 ? (
                  <span className="relative tabular-nums text-[10px] text-muted-foreground">
                    {count}
                    <span className="sr-only"> unread</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </LayoutGroup>
      </nav>

      {/* Message list */}
      <section
        aria-label="Messages"
        className={cn(
          "flex min-w-0 flex-1 flex-col border-r border-border @xl:w-60 @xl:flex-none",
          reading ? "hidden @xl:flex" : "flex",
        )}
      >
        <div className="flex flex-col gap-2 border-b border-border p-2">
          {/* Narrow containers swap the folder rail for a select. */}
          <select
            aria-label="Folder"
            value={folder}
            onChange={(e) => switchFolder(e.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs @lg:hidden"
          >
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
                {unreadByFolder[f.id] ? ` (${unreadByFolder[f.id]})` : ""}
              </option>
            ))}
          </select>
          <label className="flex h-8 items-center gap-2 rounded-lg border border-border bg-background px-2 text-xs focus-within:ring-2 focus-within:ring-primary">
            <Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="sr-only">Search mail</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mail"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="rounded text-muted-foreground hover:text-foreground"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            ) : null}
          </label>
          <div className="flex h-6 items-center gap-2 px-1">
            <Checkbox
              aria-label={allChecked ? "Deselect all" : "Select all"}
              checked={allChecked}
              indeterminate={checkedIds.length > 0 && !allChecked}
              onCheckedChange={() =>
                setChecked(allChecked ? new Set() : new Set(visible.map((m) => m.id)))
              }
              className="[&>button]:size-4"
            />
            <AnimatePresence initial={false} mode="popLayout">
              {checkedIds.length > 0 ? (
                <motion.div
                  key="bulk"
                  initial={{ opacity: 0, x: reduce ? 0 : -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: reduce ? 0 : -6 }}
                  transition={fade}
                  className="flex flex-1 items-center gap-1 text-xs"
                >
                  <span className="mr-auto tabular-nums text-muted-foreground">
                    {checkedIds.length} selected
                  </span>
                  <IconButton label="Archive selected" onClick={() => run("archive", checkedIds)}>
                    <Archive aria-hidden />
                  </IconButton>
                  <IconButton label="Delete selected" onClick={() => run("delete", checkedIds)}>
                    <Trash2 aria-hidden />
                  </IconButton>
                </motion.div>
              ) : (
                <motion.span
                  key="count"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fade}
                  className="text-xs text-muted-foreground"
                >
                  {visible.length} {visible.length === 1 ? "conversation" : "conversations"}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <ul
          aria-label="Message list"
          className="relative flex-1 overflow-y-auto overflow-x-hidden p-1 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
        >
          <LayoutGroup id={`${baseId}-rows`}>
            <AnimatePresence initial={false} mode="popLayout" custom={exitDir}>
              {visible.map((m) => (
                <MessageRow
                  key={m.id}
                  message={m}
                  active={m.id === selected?.id}
                  checked={checked.has(m.id)}
                  date={dateFormat.format(new Date(m.date))}
                  reduce={Boolean(reduce)}
                  onOpen={() => open(m.id)}
                  onCheck={() => toggleChecked(m.id)}
                  onStar={() => patch([m.id], { starred: !m.starred })}
                  onSwipe={(action) => run(action, [m.id])}
                />
              ))}
            </AnimatePresence>
          </LayoutGroup>
          {visible.length === 0 ? (
            <li className="flex h-full flex-col items-center justify-center gap-1 px-4 py-10 text-center text-xs text-muted-foreground">
              <MailOpen aria-hidden className="size-5" />
              {query ? `No mail matches “${query}”` : "Nothing here"}
            </li>
          ) : null}
        </ul>
      </section>

      {/* Reading pane */}
      <section
        aria-label="Reading pane"
        className={cn(
          "relative min-w-0 flex-1 flex-col",
          reading ? "flex" : "hidden @xl:flex",
        )}
      >
        <AnimatePresence initial={false} mode="wait">
          {selected ? (
            <motion.article
              key={selected.id}
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -4, transition: { duration: 0.12 } }}
              transition={fade}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex items-center gap-1 border-b border-border p-2">
                <IconButton
                  label="Back to list"
                  onClick={() => setReading(false)}
                  className="@xl:hidden"
                >
                  <ArrowLeft aria-hidden />
                </IconButton>
                <IconButton label="Archive" onClick={() => run("archive", [selected.id])}>
                  <Archive aria-hidden />
                </IconButton>
                <IconButton label="Delete" onClick={() => run("delete", [selected.id])}>
                  <Trash2 aria-hidden />
                </IconButton>
                <IconButton
                  label="Mark as unread"
                  onClick={() => {
                    patch([selected.id], { unread: true });
                    setSelectedId(null);
                    setReading(false);
                  }}
                >
                  <MailOpen aria-hidden />
                </IconButton>
                <IconButton
                  label={selected.starred ? "Unstar" : "Star"}
                  pressed={Boolean(selected.starred)}
                  onClick={() => patch([selected.id], { starred: !selected.starred })}
                  className="ml-auto"
                >
                  <Star aria-hidden className={cn(selected.starred && "fill-current text-chart-4")} />
                </IconButton>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
                <h2 className="text-base font-semibold leading-snug">{selected.subject}</h2>
                <div className="mt-3 flex items-center gap-2.5">
                  <Initials name={selected.from.name} />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="truncate font-medium">{selected.from.name}</p>
                    {selected.from.email ? (
                      <p className="truncate text-muted-foreground">{selected.from.email}</p>
                    ) : null}
                  </div>
                  <time dateTime={selected.date} className="shrink-0 text-[11px] text-muted-foreground">
                    {fullDateFormat.format(new Date(selected.date))}
                  </time>
                </div>
                <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                  {selected.body ?? selected.preview}
                </div>
              </div>
            </motion.article>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
              className="flex flex-1 flex-col items-center justify-center gap-2 text-xs text-muted-foreground"
            >
              <span className="grid size-10 place-items-center rounded-full bg-muted">
                <MailOpen aria-hidden className="size-4" />
              </span>
              Select a message to read
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Undo bar */}
      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <AnimatePresence>
          {undo ? (
            <motion.div
              key={undo.key}
              initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduce ? 0 : 8, transition: { duration: 0.15 } }}
              transition={SPRING_LAYOUT}
              className="pointer-events-auto flex items-center gap-3 rounded-full bg-foreground py-1.5 pl-4 pr-1.5 text-xs text-background shadow-lg"
            >
              <span>
                {undo.ids.length === 1 ? "Conversation" : `${undo.ids.length} conversations`}{" "}
                {undo.action === "archive" ? "archived" : "deleted"}
              </span>
              <button
                type="button"
                onClick={restore}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-background/15 px-2.5 font-medium outline-none hover:bg-background/25 focus-visible:ring-2 focus-visible:ring-background"
              >
                <Undo2 aria-hidden className="size-3.5" />
                Undo
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  active,
  checked,
  date,
  reduce,
  onOpen,
  onCheck,
  onStar,
  onSwipe,
}: {
  message: InboxMessage;
  active: boolean;
  checked: boolean;
  date: string;
  reduce: boolean;
  onOpen: () => void;
  onCheck: () => void;
  onStar: () => void;
  onSwipe: (action: InboxAction) => void;
}) {
  const x = useMotionValue(0);
  const archiveOpacity = useTransform(x, [0, SWIPE_COMMIT], [0, 1]);
  const deleteOpacity = useTransform(x, [-SWIPE_COMMIT, 0], [1, 0]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_COMMIT) onSwipe("archive");
    else if (info.offset.x < -SWIPE_COMMIT) onSwipe("delete");
  };

  return (
    <motion.li
      layout={reduce ? false : "position"}
      variants={{
        exit: (dir: number) => ({
          opacity: 0,
          x: reduce ? 0 : `${dir * 100}%`,
          transition: { duration: 0.22, ease: EASE_OUT },
        }),
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit="exit"
      transition={SPRING_LAYOUT}
      className="relative mb-0.5 overflow-hidden rounded-lg"
    >
      {/* Swipe hints behind the row */}
      <motion.span
        aria-hidden
        style={{ opacity: archiveOpacity }}
        className="absolute inset-0 flex items-center rounded-lg bg-chart-2/20 pl-3 text-foreground"
      >
        <Archive className="size-4" />
      </motion.span>
      <motion.span
        aria-hidden
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 flex items-center justify-end rounded-lg bg-destructive/20 pr-3 text-destructive"
      >
        <Trash2 className="size-4" />
      </motion.span>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        dragSnapToOrigin
        onDragEnd={onDragEnd}
        style={{ x }}
        className="relative flex cursor-grab items-start gap-2 rounded-lg bg-card px-2 py-2 active:cursor-grabbing"
      >
        {active ? (
          <motion.span
            layoutId="row-highlight"
            transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
            className="absolute inset-0 rounded-lg bg-primary/10 ring-1 ring-primary/30"
          />
        ) : checked ? (
          <span className="absolute inset-0 rounded-lg bg-muted" />
        ) : null}
        <div className="relative mt-0.5 flex flex-col items-center gap-1.5">
          <Checkbox
            aria-label={`Select ${message.subject}`}
            checked={checked}
            onCheckedChange={onCheck}
            className="[&>button]:size-4"
          />
          <button
            type="button"
            aria-label={message.starred ? "Unstar" : "Star"}
            aria-pressed={Boolean(message.starred)}
            onClick={onStar}
            className="rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
          >
            <motion.span
              key={message.starred ? "on" : "off"}
              initial={reduce ? false : { scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={SPRING_LAYOUT}
              className="block"
            >
              <Star
                aria-hidden
                className={cn("size-3.5", message.starred && "fill-current text-chart-4")}
              />
            </motion.span>
          </button>
        </div>
        <button
          type="button"
          onClick={onOpen}
          aria-current={active ? "true" : undefined}
          className="relative min-w-0 flex-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex items-center gap-1.5">
            <AnimatePresence initial={false}>
              {message.unread ? (
                <motion.span
                  key="dot"
                  initial={{ scale: reduce ? 1 : 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: reduce ? 1 : 0, opacity: 0 }}
                  transition={SPRING_LAYOUT}
                  className="size-1.5 shrink-0 rounded-full bg-primary"
                />
              ) : null}
            </AnimatePresence>
            {message.unread ? <span className="sr-only">Unread. </span> : null}
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs",
                message.unread ? "font-semibold" : "font-medium text-foreground/80",
              )}
            >
              {message.from.name}
            </span>
            <time dateTime={message.date} className="shrink-0 text-[10px] text-muted-foreground">
              {date}
            </time>
          </span>
          <span
            className={cn(
              "mt-0.5 block truncate text-xs",
              message.unread ? "font-medium text-foreground" : "text-foreground/80",
            )}
          >
            {message.subject}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {message.preview}
          </span>
        </button>
      </motion.div>
    </motion.li>
  );
}

function IconButton({
  label,
  onClick,
  children,
  pressed,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary [&_svg]:size-3.5",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Initials({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-foreground"
    >
      {letters}
    </span>
  );
}
