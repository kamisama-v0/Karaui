"use client";

import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  HardDrive,
  LayoutGrid,
  List,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/motion/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/motion/dropdown-menu";
import { Progress } from "@/components/motion/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/motion/toggle-group";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type FileKind =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "code"
  | "archive"
  | "spreadsheet"
  | "other";

export interface FileNode {
  id: string;
  name: string;
  kind: FileKind;
  /** Bytes. Folders show their item count instead. */
  size?: number;
  /** ISO date string, formatted with `locale` in UTC. */
  modified?: string;
  children?: FileNode[];
}

export type FileView = "grid" | "list";
export type FileSortKey = "name" | "modified" | "size" | "kind";
export type FileSort = { key: FileSortKey; direction: "asc" | "desc" };

export interface FileManagerProps {
  /** The root folder. Dropped files are added to the internal copy. */
  root: FileNode;
  /** Controlled path: ids from the root's child down to the open folder. */
  path?: string[];
  defaultPath?: string[];
  onPathChange?: (path: string[]) => void;
  view?: FileView;
  defaultView?: FileView;
  onViewChange?: (view: FileView) => void;
  /** Controlled selection (ids in the open folder). */
  selection?: string[];
  defaultSelection?: string[];
  onSelectionChange?: (ids: string[]) => void;
  defaultSort?: FileSort;
  /** Fires when a file (not a folder) is opened by double-click or Enter. */
  onOpenFile?: (file: FileNode, path: string[]) => void;
  /** Fires with dropped files and the folder they landed in. */
  onUpload?: (files: File[], folderId: string) => void;
  /** Storage meter in bytes. Omit to hide the footer meter. */
  storage?: { used: number; total: number };
  /** Default "en-US" so server and client agree. */
  locale?: string;
  className?: string;
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

const KIND_ICON: Record<FileKind, typeof File> = {
  folder: Folder,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
  code: FileCode,
  archive: FileArchive,
  spreadsheet: FileSpreadsheet,
  other: File,
};

// Each kind tints its icon with one chart token so types read at a glance.
const KIND_TINT: Record<FileKind, string> = {
  folder: "text-chart-1",
  image: "text-chart-5",
  video: "text-chart-2",
  audio: "text-chart-3",
  document: "text-muted-foreground",
  code: "text-chart-3",
  archive: "text-chart-4",
  spreadsheet: "text-chart-3",
  other: "text-muted-foreground",
};

const EXT_KIND: Record<string, FileKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image",
  mp4: "video", mov: "video", webm: "video",
  mp3: "audio", wav: "audio", flac: "audio",
  pdf: "document", doc: "document", docx: "document", txt: "document", md: "document",
  ts: "code", tsx: "code", js: "code", json: "code", css: "code", html: "code", py: "code",
  zip: "archive", gz: "archive", tar: "archive", rar: "archive",
  csv: "spreadsheet", xls: "spreadsheet", xlsx: "spreadsheet",
};

/** Best-guess kind from a file name's extension. */
export function fileKindFromName(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_KIND[ext] ?? "other";
}

/** "1.2 MB"-style size, en-US digits. */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

function findFolder(root: FileNode, path: string[]) {
  const trail: FileNode[] = [root];
  let node = root;
  for (const id of path) {
    const next = node.children?.find((c) => c.id === id && c.kind === "folder");
    if (!next) break;
    trail.push(next);
    node = next;
  }
  return trail;
}

function addToFolder(node: FileNode, folderId: string, files: FileNode[]): FileNode {
  if (node.id === folderId) return { ...node, children: [...(node.children ?? []), ...files] };
  if (!node.children) return node;
  return { ...node, children: node.children.map((c) => addToFolder(c, folderId, files)) };
}

const SORT_LABEL: Record<FileSortKey, string> = {
  name: "Name",
  modified: "Date modified",
  size: "Size",
  kind: "Type",
};

/**
 * File browser block: breadcrumb path, grid/list toggle, sort menu, folders
 * that slide in from the side you travel (deeper from the right, up from the
 * left), click / Cmd-Ctrl-click / Shift-click range selection, kind icons,
 * a storage meter, and a drop overlay that adds dragged-in files to the open
 * folder.
 */
export function FileManager({
  root,
  path: pathProp,
  defaultPath = [],
  onPathChange,
  view: viewProp,
  defaultView = "grid",
  onViewChange,
  selection: selectionProp,
  defaultSelection = [],
  onSelectionChange,
  defaultSort = { key: "name", direction: "asc" },
  onOpenFile,
  onUpload,
  storage,
  locale = "en-US",
  className,
}: FileManagerProps) {
  const reduce = useReducedMotion();
  const [tree, setTree] = useState(root);
  const [path, setPathState] = useControllable(pathProp, defaultPath, onPathChange);
  const [view, setView] = useControllable(viewProp, defaultView, onViewChange);
  const [selection, setSelection] = useControllable(
    selectionProp,
    defaultSelection,
    onSelectionChange,
  );
  const [sort, setSort] = useState<FileSort>(defaultSort);
  const [dir, setDir] = useState<1 | -1>(1);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const anchor = useRef<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const trail = findFolder(tree, path);
  const folder = trail[trail.length - 1];
  const folderKey = trail.map((n) => n.id).join("/");

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }),
    [locale],
  );

  const items = useMemo(() => {
    const list = [...(folder.children ?? [])];
    const sign = sort.direction === "asc" ? 1 : -1;
    list.sort((a, b) => {
      // Folders always first, like every desktop file manager.
      if ((a.kind === "folder") !== (b.kind === "folder")) return a.kind === "folder" ? -1 : 1;
      let cmp = 0;
      if (sort.key === "name") cmp = a.name.localeCompare(b.name, locale);
      else if (sort.key === "modified") cmp = (a.modified ?? "").localeCompare(b.modified ?? "");
      else if (sort.key === "size") cmp = (a.size ?? 0) - (b.size ?? 0);
      else cmp = a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name, locale);
      return cmp * sign;
    });
    return list;
  }, [folder, sort, locale]);

  const selected = new Set(selection);

  const navigate = (next: string[]) => {
    setDir(next.length >= path.length ? 1 : -1);
    setPathState(next);
    setSelection([]);
    anchor.current = null;
  };

  const open = (item: FileNode) => {
    if (item.kind === "folder") navigate([...trail.slice(1).map((n) => n.id), item.id]);
    else onOpenFile?.(item, path);
  };

  const select = (item: FileNode, event: MouseEvent | KeyboardEvent) => {
    const ids = items.map((i) => i.id);
    if (event.shiftKey && anchor.current && ids.includes(anchor.current)) {
      const a = ids.indexOf(anchor.current);
      const b = ids.indexOf(item.id);
      const range = ids.slice(Math.min(a, b), Math.max(a, b) + 1);
      const base = event.metaKey || event.ctrlKey ? selection : [];
      setSelection(Array.from(new Set([...base, ...range])));
      return;
    }
    anchor.current = item.id;
    if (event.metaKey || event.ctrlKey) {
      setSelection(
        selected.has(item.id) ? selection.filter((id) => id !== item.id) : [...selection, item.id],
      );
    } else setSelection([item.id]);
  };

  const onContainerKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      setSelection(items.map((i) => i.id));
    } else if (event.key === "Escape") setSelection([]);
    else if (event.key === "Backspace" && event.altKey && path.length > 0) {
      navigate(path.slice(0, -1));
    }
  };

  const onItemKey = (event: KeyboardEvent<HTMLButtonElement>, item: FileNode, i: number) => {
    if (event.key === "Enter") {
      event.preventDefault();
      open(item);
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      select(item, event);
      return;
    }
    const columns =
      view === "grid" && gridRef.current
        ? getComputedStyle(gridRef.current).gridTemplateColumns.split(" ").length
        : 1;
    const delta: Record<string, number> = {
      ArrowRight: view === "grid" ? 1 : 0,
      ArrowLeft: view === "grid" ? -1 : 0,
      ArrowDown: columns,
      ArrowUp: -columns,
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    const target = items[Math.min(items.length - 1, Math.max(0, i + move))];
    const buttons = gridRef.current?.querySelectorAll<HTMLButtonElement>("[data-file-item]");
    buttons?.[items.indexOf(target)]?.focus();
    if (event.shiftKey) select(target, event);
  };

  // Drop zone: only react to real file drags (not text or links).
  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");
  const dropHandlers = {
    onDragEnter: (event: DragEvent<HTMLDivElement>) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (event: DragEvent<HTMLDivElement>) => {
      if (!hasFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;
      // "Now" is read inside the event handler, never during render.
      const stamp = new Date().toISOString();
      const nodes: FileNode[] = files.map((f, i) => ({
        id: `upload-${stamp}-${i}-${f.name}`,
        name: f.name,
        kind: fileKindFromName(f.name),
        size: f.size,
        modified: stamp,
      }));
      setTree((t) => addToFolder(t, folder.id, nodes));
      setSelection(nodes.map((n) => n.id));
      onUpload?.(files, folder.id);
    },
  };

  const slide = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 32 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -32 }),
  };

  return (
    <div
      {...dropHandlers}
      className={cn(
        "@container relative flex h-[26rem] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Breadcrumb className="min-w-0 flex-1 text-xs">
          <BreadcrumbList className="flex-nowrap overflow-hidden">
            {trail.map((node, i) => {
              const last = i === trail.length - 1;
              const target = trail.slice(1, i + 1).map((n) => n.id);
              return (
                <BreadcrumbCrumb key={node.id} first={i === 0}>
                  {last ? (
                    <BreadcrumbPage className="truncate">{node.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href="#"
                      render={({ className: linkClass, children }) => (
                        <button
                          type="button"
                          className={cn(linkClass, "truncate")}
                          onClick={() => navigate(target)}
                        >
                          {children}
                        </button>
                      )}
                    >
                      {node.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbCrumb>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <button
              type="button"
              aria-label={`Sort by ${SORT_LABEL[sort.key]}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            >
              {sort.direction === "asc" ? (
                <ArrowUpNarrowWide aria-hidden className="size-3.5" />
              ) : (
                <ArrowDownWideNarrow aria-hidden className="size-3.5" />
              )}
              <span className="hidden @md:inline">{SORT_LABEL[sort.key]}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              ariaLabel="Sort by"
              value={sort.key}
              onValueChange={(key) => setSort({ ...sort, key: key as FileSortKey })}
            >
              {(Object.keys(SORT_LABEL) as FileSortKey[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {SORT_LABEL[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              ariaLabel="Order"
              value={sort.direction}
              onValueChange={(direction) =>
                setSort({ ...sort, direction: direction as FileSort["direction"] })
              }
            >
              <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToggleGroup
          type="single"
          required
          size="sm"
          variant="outline"
          value={view}
          onValueChange={(v) => v && setView(v as FileView)}
          aria-label="View"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid aria-hidden />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List aria-hidden />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Items */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard shortcuts (select all, clear, up) for the item grid; items are real buttons. */}
      <div
        onKeyDown={onContainerKey}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
      >
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.div
            key={`${folderKey}:${view}`}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="p-2"
          >
            {items.length === 0 ? (
              <div className="flex h-60 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                <Upload aria-hidden className="size-5" />
                This folder is empty — drop files here
              </div>
            ) : view === "grid" ? (
              <div
                ref={gridRef}
                className="grid grid-cols-3 gap-1 @md:grid-cols-4 @xl:grid-cols-5"
              >
                {items.map((item, i) => (
                  <ItemButton
                    key={item.id}
                    item={item}
                    view="grid"
                    selected={selected.has(item.id)}
                    meta={meta(item, dateFormat)}
                    index={i}
                    reduce={Boolean(reduce)}
                    onClick={(e) => select(item, e)}
                    onDoubleClick={() => open(item)}
                    onKeyDown={(e) => onItemKey(e, item, i)}
                  />
                ))}
              </div>
            ) : (
              <div ref={gridRef} className="flex flex-col">
                <div className="grid grid-cols-[1fr_5rem] gap-3 px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground @md:grid-cols-[1fr_7rem_5rem]">
                  <span>Name</span>
                  <span className="hidden @md:block">Modified</span>
                  <span className="text-right">Size</span>
                </div>
                {items.map((item, i) => (
                  <ItemButton
                    key={item.id}
                    item={item}
                    view="list"
                    selected={selected.has(item.id)}
                    meta={meta(item, dateFormat)}
                    index={i}
                    reduce={Boolean(reduce)}
                    onClick={(e) => select(item, e)}
                    onDoubleClick={() => open(item)}
                    onKeyDown={(e) => onItemKey(e, item, i)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span aria-live="polite" className="shrink-0 tabular-nums">
          {selection.length > 0
            ? `${selection.length} of ${items.length} selected`
            : `${items.length} ${items.length === 1 ? "item" : "items"}`}
        </span>
        {storage ? (
          <div className="ml-auto flex w-40 items-center gap-2 @md:w-56">
            <HardDrive aria-hidden className="size-3.5 shrink-0" />
            <Progress
              value={storage.used}
              max={storage.total}
              size="sm"
              trackClassName="bg-foreground/10"
              aria-label="Storage used"
              className="flex-1"
            />
            <span className="shrink-0 tabular-nums">
              {formatBytes(storage.used)} / {formatBytes(storage.total)}
            </span>
          </div>
        ) : null}
      </div>

      {/* Drop overlay */}
      <AnimatePresence>
        {dragging ? (
          <motion.div
            key="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-background/85 backdrop-blur-sm"
          >
            <motion.span
              initial={reduce ? false : { y: 8, scale: 0.9 }}
              animate={reduce ? undefined : { y: [0, -4, 0], scale: 1 }}
              transition={
                reduce
                  ? undefined
                  : { y: { duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: EASE_OUT } }
              }
              className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-md"
            >
              <Upload aria-hidden className="size-5" />
            </motion.span>
            <p className="text-sm font-medium">Drop to upload to {folder.name}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function BreadcrumbCrumb({ first, children }: { first: boolean; children: ReactNode }) {
  return (
    <>
      {first ? null : <BreadcrumbSeparator />}
      <BreadcrumbItem className="min-w-0">{children}</BreadcrumbItem>
    </>
  );
}

function meta(item: FileNode, dateFormat: Intl.DateTimeFormat) {
  const size =
    item.kind === "folder"
      ? `${item.children?.length ?? 0} ${item.children?.length === 1 ? "item" : "items"}`
      : item.size !== undefined
        ? formatBytes(item.size)
        : "—";
  const modified = item.modified ? dateFormat.format(new Date(item.modified)) : "—";
  return { size, modified };
}

function ItemButton({
  item,
  view,
  selected,
  meta: info,
  index,
  reduce,
  onClick,
  onDoubleClick,
  onKeyDown,
}: {
  item: FileNode;
  view: FileView;
  selected: boolean;
  meta: { size: string; modified: string };
  index: number;
  reduce: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onDoubleClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const Icon = KIND_ICON[item.kind];
  const tint = KIND_TINT[item.kind];
  const label = `${item.name}, ${item.kind === "folder" ? "folder" : item.kind}, ${info.size}`;

  return (
    <motion.button
      type="button"
      data-file-item=""
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      // Shift-click must not select page text.
      onMouseDown={(e) => e.shiftKey && e.preventDefault()}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT, delay: reduce ? 0 : Math.min(index, 12) * 0.02 }}
      className={cn(
        "group relative rounded-lg text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
        view === "grid"
          ? "flex flex-col items-center gap-1.5 px-2 pt-3 pb-2"
          : "grid grid-cols-[1fr_5rem] items-center gap-3 px-2 py-1.5 @md:grid-cols-[1fr_7rem_5rem]",
        selected ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted",
      )}
    >
      {view === "grid" ? (
        <>
          <span
            className={cn(
              "grid size-12 place-items-center rounded-xl bg-muted transition-transform group-hover:-translate-y-0.5",
              selected && "bg-primary/15",
            )}
          >
            <Icon aria-hidden className={cn("size-6", tint)} />
          </span>
          <span className="w-full truncate text-center text-xs font-medium">{item.name}</span>
          <span className="text-[10px] text-muted-foreground">{info.size}</span>
        </>
      ) : (
        <>
          <span className="flex min-w-0 items-center gap-2">
            <Icon aria-hidden className={cn("size-4 shrink-0", tint)} />
            <span className="truncate text-xs font-medium">{item.name}</span>
          </span>
          <span className="hidden truncate text-[11px] text-muted-foreground @md:block">
            {info.modified}
          </span>
          <span className="text-right text-[11px] tabular-nums text-muted-foreground">
            {info.size}
          </span>
        </>
      )}
    </motion.button>
  );
}
