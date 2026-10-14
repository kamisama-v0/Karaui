"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Columns3,
  EyeOff,
  GripVertical,
  ListFilter,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Fragment,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Checkbox } from "@/components/motion/checkbox";
import { Pagination } from "@/components/motion/pagination";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL, SPRING_SWAP } from "@/lib/ease";
import { TOUCH_GESTURE_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";
import type { HeaderCellRefs, SortState, TableColumn } from "./types";
import { useColumnReorder } from "./use-column-reorder";
import { alignFlex, alignText, readCell, readSortValue } from "./utils";

/**
 * DataTable is the paginated sibling of the virtualized `Table`. The virtual
 * table positions a recycled window of fixed-height rows, which cannot carry
 * layout-animated reorders or variable-height expanded rows; this one renders
 * a page of real rows so both can move. It reuses the table's column type,
 * cell readers, reorder hook, `Checkbox` and `Pagination`.
 */

export type { SortDirection, SortState } from "./types";

/** `string` filters by "contains" (text); `string[]` keeps rows whose value is one of the options (select). */
export type DataTableFilterValue = string | string[];
export type DataTableFilters = Record<string, DataTableFilterValue>;

export type DataTableColumn<T> = TableColumn<T> & {
  /** Adds a filter to the column menu: a "contains" text field or a multi-select of options. */
  filter?: "text" | "select";
  /** Options for a `select` filter. Defaults to the distinct values in `data`. */
  filterOptions?: string[];
  /** Text used by filters and global search. Falls back to the sort value / `row[key]`. */
  filterValue?: (row: T) => string;
  /** Allow hiding the column from the column menu and the Columns picker (default true). */
  hideable?: boolean;
  /** Include the column in the global search (default true). */
  searchable?: boolean;
};

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  /** Stable id per row — keeps selection, expansion and the reorder animation attached to the right row. */
  getRowId?: (row: T, index: number) => string;
  /** Accessible name of a row, used by its checkbox and expand button. Defaults to the first column's text. */
  getRowLabel?: (row: T) => string;
  /** Sort stack, primary first. Click a header to sort by it alone; Shift+click adds a secondary sort. */
  sort?: SortState[];
  defaultSort?: SortState[];
  onSortChange?: (sort: SortState[]) => void;
  /** Per-column filters keyed by column key. */
  filters?: DataTableFilters;
  defaultFilters?: DataTableFilters;
  onFiltersChange?: (filters: DataTableFilters) => void;
  /** Global search across every `searchable` column. */
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (search: string) => void;
  /** Render the search field in the toolbar (default true). */
  showSearch?: boolean;
  searchPlaceholder?: string;
  /** Keys of hidden columns. */
  hiddenColumns?: string[];
  defaultHiddenColumns?: string[];
  onHiddenColumnsChange?: (keys: string[]) => void;
  /** Column key order. */
  columnOrder?: string[];
  defaultColumnOrder?: string[];
  onColumnOrderChange?: (keys: string[]) => void;
  /** Drag headers by their grip, or use Move left/right in the column menu (default true). */
  reorderable?: boolean;
  /** Renders a chevron column; the returned node fills a height-morphing detail panel under the row. */
  renderExpanded?: (row: T) => ReactNode;
  expandedRowIds?: string[];
  defaultExpandedRowIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
  /** Leading checkbox column; Shift+click selects a range. */
  selectable?: boolean;
  selectedRowIds?: string[];
  defaultSelectedRowIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Extra controls in the selected-count bar, e.g. bulk actions. */
  selectionActions?: (ids: string[]) => ReactNode;
  /** Rows per page; `0` shows every row without pagination (default 10). */
  pageSize?: number;
  /** 1-based page. Resets to 1 when search, filters or sort change. */
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  /** Extra toolbar content, rendered right of the search field. */
  toolbar?: ReactNode;
  emptyState?: ReactNode;
  /** Narrowest a column without an explicit px width may get before the table scrolls (default 120). */
  minColumnWidth?: number;
  className?: string;
}

type Entry<T> = { row: T; id: string };

const SELECT_COL_PX = 44;
const EXPAND_COL_PX = 40;
const PANEL_WIDTH = 232;

function useControllable<V>(
  value: V | undefined,
  defaultValue: V,
  onChange?: (next: V) => void,
) {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const set = useCallback(
    (next: V) => {
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set] as const;
}

const EMPTY_SORT: SortState[] = [];
const EMPTY_FILTERS: DataTableFilters = {};
const EMPTY_KEYS: string[] = [];

function labelOf<T>(column: DataTableColumn<T>) {
  return typeof column.header === "string" ? column.header : column.key;
}

function textOf<T>(row: T, column: DataTableColumn<T>): string {
  if (column.filterValue) return column.filterValue(row);
  const value = readSortValue(row, column) as unknown;
  return value == null ? "" : String(value);
}

function isFilterActive(value: DataTableFilterValue | undefined) {
  if (value == null) return false;
  return Array.isArray(value) ? value.length > 0 : value.trim() !== "";
}

/** Next sort stack for a header click. Plain click cycles this column alone (asc → desc → off);
 * Shift+click cycles it inside the stack, appending it as a secondary key when new. */
export function nextSortStack(
  sorts: SortState[],
  key: string,
  additive: boolean,
): SortState[] {
  const existing = sorts.find((s) => s.key === key);
  if (!additive) {
    if (!existing) return [{ key, direction: "asc" }];
    // Part of a multi-sort: collapse to this column alone, flipped.
    if (sorts.length > 1)
      return [
        { key, direction: existing.direction === "asc" ? "desc" : "asc" },
      ];
    return existing.direction === "asc" ? [{ key, direction: "desc" }] : [];
  }
  if (!existing) return [...sorts, { key, direction: "asc" }];
  if (existing.direction === "asc")
    return sorts.map((s) => (s.key === key ? { key, direction: "desc" } : s));
  return sorts.filter((s) => s.key !== key);
}

function compareValues(a: unknown, b: unknown) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  // Explicit locale so server and client sort identically.
  return String(a ?? "").localeCompare(String(b ?? ""), "en-US", {
    numeric: true,
    sensitivity: "base",
  });
}

/* ------------------------------------------------------------------------ */
/* Popover panel (column menu + Columns picker)                              */
/* ------------------------------------------------------------------------ */

type AnchorRect = { left: number; right: number; bottom: number };

function Panel({
  open,
  onClose,
  getAnchor,
  triggerRef,
  label,
  repositionKey,
  children,
}: {
  open: boolean;
  onClose: () => void;
  getAnchor: () => AnchorRect | null;
  triggerRef: RefObject<HTMLButtonElement | null>;
  label: string;
  /** Re-measure the anchor when this changes (the column moved). */
  repositionKey?: string | number;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: repositionKey is the re-measure trigger.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const r = getAnchor();
      if (!r) return;
      const left = Math.min(
        Math.max(8, r.right - PANEL_WIDTH),
        window.innerWidth - PANEL_WIDTH - 8,
      );
      const top = r.bottom + 6;
      setPos((prev) =>
        prev && prev.top === top && prev.left === left ? prev : { top, left },
      );
    };
    measure();
    // After a column move the header glides to its new slot (a layout
    // animation); follow it for a moment so the panel stays attached.
    let frame = 0;
    const until = performance.now() + 600;
    const follow = () => {
      measure();
      if (performance.now() < until) frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [open, getAnchor, repositionKey]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          "input, button:not([disabled]):not([aria-disabled='true'])",
        )
        ?.focus();
    });
    const inside = (target: EventTarget | null) =>
      target instanceof Node &&
      (panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target));
    const onPointer = (e: PointerEvent) => {
      if (!inside(e.target)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      triggerRef.current?.focus();
    };
    // Fixed coordinates go stale once anything outside the panel scrolls.
    const onScroll = (e: Event) => {
      if (!(e.target instanceof Node && panelRef.current?.contains(e.target)))
        onClose();
    };
    document.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open, onClose, triggerRef]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && pos ? (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          onBlur={(e) => {
            const next = e.relatedTarget;
            if (
              next instanceof Node &&
              !panelRef.current?.contains(next) &&
              !triggerRef.current?.contains(next)
            )
              onClose();
          }}
          className="fixed z-50 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground text-sm shadow-xl"
          style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.1 } }
              : {
                  opacity: 0,
                  scale: 0.98,
                  y: -2,
                  transition: { duration: 0.12, ease: EASE_OUT },
                }
          }
          transition={reduce ? { duration: 0.12 } : SPRING_PANEL}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

const PANEL_ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";
const PANEL_HEADING =
  "px-2.5 pt-2 pb-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wide";
const PANEL_DIVIDER = "my-1 h-px bg-border";

/* ------------------------------------------------------------------------ */
/* DataTable                                                                 */
/* ------------------------------------------------------------------------ */

export function DataTable<T>({
  data,
  columns,
  getRowId,
  getRowLabel,
  sort: sortProp,
  defaultSort = EMPTY_SORT,
  onSortChange,
  filters: filtersProp,
  defaultFilters = EMPTY_FILTERS,
  onFiltersChange,
  search: searchProp,
  defaultSearch = "",
  onSearchChange,
  showSearch = true,
  searchPlaceholder = "Search…",
  hiddenColumns: hiddenProp,
  defaultHiddenColumns = EMPTY_KEYS,
  onHiddenColumnsChange,
  columnOrder,
  defaultColumnOrder,
  onColumnOrderChange,
  reorderable = true,
  renderExpanded,
  expandedRowIds,
  defaultExpandedRowIds = EMPTY_KEYS,
  onExpandedChange,
  selectable = false,
  selectedRowIds,
  defaultSelectedRowIds = EMPTY_KEYS,
  onSelectionChange,
  selectionActions,
  pageSize = 10,
  page: pageProp,
  defaultPage = 1,
  onPageChange,
  toolbar,
  emptyState = "No results",
  minColumnWidth = 120,
  className,
}: DataTableProps<T>) {
  const reduce = useReducedMotion() ?? false;
  const uid = useId();
  const thRefs: HeaderCellRefs = useRef<
    Record<string, HTMLTableCellElement | null>
  >({});

  const [sorts, setSorts] = useControllable(sortProp, defaultSort, onSortChange);
  const [filters, setFilters] = useControllable(
    filtersProp,
    defaultFilters,
    onFiltersChange,
  );
  const [search, setSearch] = useControllable(
    searchProp,
    defaultSearch,
    onSearchChange,
  );
  const [hidden, setHidden] = useControllable(
    hiddenProp,
    defaultHiddenColumns,
    onHiddenColumnsChange,
  );
  const [expanded, setExpanded] = useControllable(
    expandedRowIds,
    defaultExpandedRowIds,
    onExpandedChange,
  );
  const [selectedIds, setSelectedIds] = useControllable(
    selectedRowIds,
    defaultSelectedRowIds,
    onSelectionChange,
  );
  const [pageRaw, setPage] = useControllable(pageProp, defaultPage, onPageChange);

  const [announcement, setAnnouncement] = useState("");
  // Rows that mount after the first paint (filter, page, data) fade in; the
  // first render stays static so server and client output match.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const {
    orderedColumns: reorderedColumns,
    dragKey,
    dropIndex,
    startReorder,
    moveReorder,
    endReorder,
    commitOrder,
  } = useColumnReorder({
    columns,
    thRefs,
    order: columnOrder,
    defaultOrder: defaultColumnOrder,
    onColumnOrderChange,
  });

  // The hook returns the same column objects it was given, just reordered.
  const orderedColumns = reorderedColumns as DataTableColumn<T>[];
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const visibleColumns = useMemo(
    () => orderedColumns.filter((c) => !hiddenSet.has(c.key)),
    [orderedColumns, hiddenSet],
  );

  /* ---- data pipeline: rows → search → filters → sort → page ---- */

  const rows = useMemo<Entry<T>[]>(
    () =>
      data.map((row, index) => ({
        row,
        id: getRowId ? getRowId(row, index) : String(index),
      })),
    [data, getRowId],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const searchable = columns.filter((c) => c.searchable !== false);
    const active = columns.filter((c) => isFilterActive(filters[c.key]));
    if (!query && active.length === 0) return rows;
    return rows.filter(({ row }) => {
      if (
        query &&
        !searchable.some((c) => textOf(row, c).toLowerCase().includes(query))
      )
        return false;
      for (const column of active) {
        const value = filters[column.key];
        const text = textOf(row, column);
        if (Array.isArray(value)) {
          if (!value.includes(text)) return false;
        } else if (!text.toLowerCase().includes(value.trim().toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [rows, columns, search, filters]);

  const sortedRows = useMemo(() => {
    const keys = sorts
      .map((s) => ({ s, column: columns.find((c) => c.key === s.key) }))
      .filter(
        (k): k is { s: SortState; column: DataTableColumn<T> } =>
          k.column !== undefined,
      );
    if (keys.length === 0) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      for (const { s, column } of keys) {
        const cmp = compareValues(
          readSortValue(a.row, column),
          readSortValue(b.row, column),
        );
        if (cmp !== 0) return s.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredRows, sorts, columns]);

  const paged = pageSize > 0;
  const pageCount = paged
    ? Math.max(1, Math.ceil(sortedRows.length / pageSize))
    : 1;
  const page = Math.min(Math.max(1, pageRaw), pageCount);
  const pageRows = paged
    ? sortedRows.slice((page - 1) * pageSize, page * pageSize)
    : sortedRows;

  /* ---- sorting ---- */

  const applySort = useCallback(
    (next: SortState[]) => {
      setSorts(next);
      setPage(1);
      const primary = next[0];
      const column = primary && columns.find((c) => c.key === primary.key);
      setAnnouncement(
        column
          ? `Sorted by ${next
              .map((s) => {
                const c = columns.find((col) => col.key === s.key);
                return `${c ? labelOf(c) : s.key} ${s.direction === "asc" ? "ascending" : "descending"}`;
              })
              .join(", then ")}`
          : "Sorting cleared",
      );
    },
    [columns, setSorts, setPage],
  );

  /* ---- filtering ---- */

  const setColumnFilter = useCallback(
    (key: string, value: DataTableFilterValue) => {
      const next = { ...filters };
      if (isFilterActive(value)) next[key] = value;
      else delete next[key];
      setFilters(next);
      setPage(1);
    },
    [filters, setFilters, setPage],
  );

  const activeFilterCount = columns.filter((c) =>
    isFilterActive(filters[c.key]),
  ).length;

  const clearFilters = useCallback(() => {
    setFilters({});
    if (search) setSearch("");
    setPage(1);
  }, [setFilters, search, setSearch, setPage]);

  const selectOptions = useCallback(
    (column: DataTableColumn<T>) => {
      if (column.filterOptions) return column.filterOptions;
      const seen = new Set<string>();
      for (const { row } of rows) seen.add(textOf(row, column));
      return [...seen].sort((a, b) => compareValues(a, b));
    },
    [rows],
  );

  /* ---- columns: visibility + keyboard move ---- */

  const toggleHidden = useCallback(
    (key: string) => {
      if (hiddenSet.has(key)) setHidden(hidden.filter((k) => k !== key));
      else if (visibleColumns.length > 1) setHidden([...hidden, key]);
    },
    [hidden, hiddenSet, setHidden, visibleColumns.length],
  );

  const moveColumn = useCallback(
    (key: string, dir: -1 | 1) => {
      const visibleKeys = visibleColumns.map((c) => c.key);
      const at = visibleKeys.indexOf(key);
      const neighbor = visibleKeys[at + dir];
      if (at === -1 || !neighbor) return;
      const keys = orderedColumns.map((c) => c.key).filter((k) => k !== key);
      const target = keys.indexOf(neighbor) + (dir === 1 ? 1 : 0);
      keys.splice(target, 0, key);
      commitOrder(keys);
      const column = visibleColumns[at];
      setAnnouncement(
        `${labelOf(column)} column moved to position ${at + dir + 1} of ${visibleKeys.length}`,
      );
    },
    [visibleColumns, orderedColumns, commitOrder],
  );

  /* ---- expansion ---- */

  const expandedSet = useMemo(() => new Set(expanded), [expanded]);
  const toggleExpanded = useCallback(
    (id: string) => {
      setExpanded(
        expandedSet.has(id)
          ? expanded.filter((x) => x !== id)
          : [...expanded, id],
      );
    },
    [expanded, expandedSet, setExpanded],
  );

  /* ---- selection (Shift+click selects a range in the current order) ---- */

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const anchorRef = useRef<string | null>(null);
  const shiftRef = useRef(false);
  useEffect(() => {
    if (!selectable) return;
    let held = false;
    const onKey = (e: KeyboardEvent) => {
      held = e.shiftKey;
    };
    // Capture phase runs before the checkbox's own click handler, so the
    // toggle knows whether this click (or Space/Enter press) was shifted.
    const onClick = (e: MouseEvent) => {
      shiftRef.current = e.shiftKey || held;
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("click", onClick, true);
    };
  }, [selectable]);

  const toggleRow = useCallback(
    (id: string, checked: boolean) => {
      const next = new Set(selectedSet);
      const order = sortedRows.map((r) => r.id);
      const from = anchorRef.current ? order.indexOf(anchorRef.current) : -1;
      const to = order.indexOf(id);
      if (shiftRef.current && from !== -1 && to !== -1) {
        const [lo, hi] = from < to ? [from, to] : [to, from];
        for (let i = lo; i <= hi; i++) {
          if (checked) next.add(order[i]);
          else next.delete(order[i]);
        }
      } else if (checked) next.add(id);
      else next.delete(id);
      shiftRef.current = false;
      anchorRef.current = id;
      setSelectedIds([...next]);
    },
    [selectedSet, sortedRows, setSelectedIds],
  );

  const allSelected =
    sortedRows.length > 0 && sortedRows.every((r) => selectedSet.has(r.id));
  const someSelected = sortedRows.some((r) => selectedSet.has(r.id));
  const toggleAll = useCallback(() => {
    const next = new Set(selectedSet);
    for (const r of sortedRows) {
      if (allSelected) next.delete(r.id);
      else next.add(r.id);
    }
    setSelectedIds([...next]);
  }, [allSelected, selectedSet, sortedRows, setSelectedIds]);

  const rowLabel = useCallback(
    (row: T) => {
      if (getRowLabel) return getRowLabel(row);
      const first = visibleColumns[0] ?? columns[0];
      return first ? textOf(row, first) : "row";
    },
    [getRowLabel, visibleColumns, columns],
  );

  /* ---- layout ---- */

  const leadCount = (selectable ? 1 : 0) + (renderExpanded ? 1 : 0);
  const spanAll = visibleColumns.length + leadCount;
  const minTableWidth = useMemo(() => {
    let total =
      (selectable ? SELECT_COL_PX : 0) + (renderExpanded ? EXPAND_COL_PX : 0);
    for (const column of visibleColumns) {
      const px =
        column.width?.endsWith("px") && Number.parseFloat(column.width);
      total += px && Number.isFinite(px) ? px : minColumnWidth;
    }
    return Math.round(total);
  }, [visibleColumns, selectable, renderExpanded, minColumnWidth]);

  const layoutTransition = reduce ? { duration: 0 } : SPRING_LAYOUT;
  const rowLayout = reduce ? false : ("position" as const);
  const firstIndex = paged ? (page - 1) * pageSize : 0;
  const selectedCount = selectedIds.length;
  const numberFormat = useMemo(() => new Intl.NumberFormat("en-US"), []);

  // Index of the visible header showing the drop line (`dropIndex` counts
  // hidden columns too, so translate it to the drawn header's key).
  const dropKey =
    dragKey && dropIndex !== null
      ? (orderedColumns[dropIndex]?.key ?? null)
      : null;
  const dropAtEnd =
    dragKey !== null && dropIndex !== null && dropIndex >= orderedColumns.length;

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border bg-card text-card-foreground text-sm",
        className,
      )}
    >
      {/* Toolbar; the selection bar slides over it while rows are selected. */}
      <div className="relative flex items-center gap-2 border-border border-b p-2">
        {showSearch ? (
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              aria-label="Search rows"
              className="h-8 w-full min-w-0 rounded-lg border border-border bg-background pr-8 pl-8 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
            />
            <AnimatePresence initial={false}>
              {search ? (
                <motion.button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
                  transition={reduce ? { duration: 0.1 } : SPRING_SWAP}
                  className="-translate-y-1/2 absolute top-1/2 right-1.5 grid size-5 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
          >
            <ListFilter className="size-3.5 text-primary" />
            {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"}
            <X className="size-3" />
          </button>
        ) : null}
        {toolbar}
        <ColumnsPicker
          columns={orderedColumns}
          hiddenSet={hiddenSet}
          visibleCount={visibleColumns.length}
          onToggle={toggleHidden}
        />

        <AnimatePresence initial={false}>
          {selectable && selectedCount > 0 ? (
            <motion.div
              key="selection-bar"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: "-100%" }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: "0%" }}
              exit={
                reduce
                  ? { opacity: 0, transition: { duration: 0.1 } }
                  : {
                      opacity: 0,
                      y: "-100%",
                      transition: { duration: 0.16, ease: EASE_OUT },
                    }
              }
              transition={reduce ? { duration: 0.12 } : SPRING_PANEL}
              className="absolute inset-0 flex items-center gap-2 bg-primary px-3 text-primary-foreground"
            >
              <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                <span className="relative inline-grid overflow-hidden">
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={selectedCount}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: "80%" }}
                      animate={{ opacity: 1, y: "0%" }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: "-80%" }}
                      transition={reduce ? { duration: 0.1 } : SPRING_SWAP}
                    >
                      {numberFormat.format(selectedCount)}
                    </motion.span>
                  </AnimatePresence>
                </span>
                selected
              </span>
              <div className="ml-auto flex items-center gap-1">
                {selectionActions?.(selectedIds)}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds([]);
                    anchorRef.current = null;
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 font-medium text-xs transition-colors hover:bg-primary-foreground/15"
                >
                  <X className="size-3.5" />
                  Clear
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="overflow-x-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
        <table
          className="w-full border-collapse"
          style={{ tableLayout: "fixed", minWidth: `max(100%, ${minTableWidth}px)` }}
        >
          <colgroup>
            {selectable ? <col style={{ width: SELECT_COL_PX }} /> : null}
            {renderExpanded ? <col style={{ width: EXPAND_COL_PX }} /> : null}
            {visibleColumns.map((column) => (
              <col
                key={column.key}
                style={
                  column.width && !column.width.endsWith("fr")
                    ? { width: column.width }
                    : undefined
                }
              />
            ))}
          </colgroup>
          <thead>
            <tr className="h-10">
              {selectable ? (
                <th className="border-border border-b bg-muted/60">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={!allSelected && someSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all rows"
                    />
                  </div>
                </th>
              ) : null}
              {renderExpanded ? (
                <th className="border-border border-b bg-muted/60">
                  <span className="sr-only">Expand</span>
                </th>
              ) : null}
              {visibleColumns.map((column, index) => {
                const sortIndex = sorts.findIndex((s) => s.key === column.key);
                const sortState = sortIndex === -1 ? null : sorts[sortIndex];
                const filtered = isFilterActive(filters[column.key]);
                const isDragging = dragKey === column.key;
                const isLast = index === visibleColumns.length - 1;
                return (
                  <motion.th
                    key={column.key}
                    ref={(el: HTMLTableCellElement | null) => {
                      thRefs.current[column.key] = el;
                    }}
                    layout={rowLayout}
                    transition={layoutTransition}
                    scope="col"
                    aria-sort={
                      sortIndex === 0 && sortState
                        ? sortState.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    data-drop={dropKey === column.key || undefined}
                    data-dropend={(dropAtEnd && isLast) || undefined}
                    className={cn(
                      "group/th relative border-border border-b bg-muted/60 p-0 font-medium text-muted-foreground",
                      "data-[drop=true]:before:absolute data-[drop=true]:before:inset-y-1 data-[drop=true]:before:left-0 data-[drop=true]:before:w-0.5 data-[drop=true]:before:rounded-full data-[drop=true]:before:bg-primary",
                      "data-[dropend=true]:after:absolute data-[dropend=true]:after:inset-y-1 data-[dropend=true]:after:right-0 data-[dropend=true]:after:w-0.5 data-[dropend=true]:after:rounded-full data-[dropend=true]:after:bg-primary",
                      isDragging && "opacity-50",
                    )}
                  >
                    <div
                      className={cn(
                        "relative flex h-10 items-center",
                        alignFlex(column.align),
                      )}
                    >
                      {reorderable ? (
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-label={`Drag to reorder ${labelOf(column)} column`}
                          onPointerDown={(e) => startReorder(column.key, e)}
                          onPointerMove={moveReorder}
                          onPointerUp={endReorder}
                          onPointerCancel={endReorder}
                          className={cn(
                            "absolute inset-y-0 left-0 z-[1] flex w-4 cursor-grab touch-none items-center justify-center text-muted-foreground/50 opacity-0 transition-[color,opacity] hover:text-foreground active:cursor-grabbing group-hover/th:opacity-100 [@media(hover:none)]:opacity-100",
                            TOUCH_GESTURE_CLASS,
                          )}
                        >
                          <GripVertical className="size-3.5" />
                        </button>
                      ) : null}
                      {column.sortable ? (
                        <button
                          type="button"
                          title="Click to sort, Shift+click to add a secondary sort"
                          onClick={(e) =>
                            applySort(
                              nextSortStack(sorts, column.key, e.shiftKey),
                            )
                          }
                          className={cn(
                            "flex h-full min-w-0 flex-1 select-none items-center gap-1 outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:underline",
                            "px-4",
                            filtered && "pr-9",
                            alignFlex(column.align),
                            sortState && "text-foreground",
                          )}
                        >
                          <span className="truncate">{column.header}</span>
                          <SortIndicator
                            direction={sortState?.direction ?? null}
                            priority={sorts.length > 1 && sortState ? sortIndex + 1 : null}
                            reduce={reduce}
                          />
                        </button>
                      ) : (
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate",
                            "px-4",
                            filtered && "pr-9",
                            alignText(column.align),
                          )}
                        >
                          {column.header}
                        </span>
                      )}
                      <ColumnMenu
                        column={column}
                        thRefs={thRefs}
                        position={index}
                        sortState={sortState}
                        filtered={filtered}
                        filterValue={filters[column.key]}
                        options={
                          column.filter === "select" ? selectOptions(column) : null
                        }
                        canMoveLeft={reorderable && index > 0}
                        canMoveRight={reorderable && !isLast}
                        reorderable={reorderable}
                        canHide={
                          column.hideable !== false && visibleColumns.length > 1
                        }
                        onSort={(direction) =>
                          applySort(
                            direction
                              ? [{ key: column.key, direction }]
                              : sorts.filter((s) => s.key !== column.key),
                          )
                        }
                        onFilter={(value) => setColumnFilter(column.key, value)}
                        onMove={(dir) => moveColumn(column.key, dir)}
                        onHide={() => toggleHidden(column.key)}
                      />
                    </div>
                  </motion.th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={spanAll}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    {emptyState}
                    {activeFilterCount > 0 || search ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="rounded-md px-2 py-1 font-medium text-foreground text-xs underline-offset-4 hover:underline"
                      >
                        Clear search and filters
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((entry) => {
                const isSelected = selectedSet.has(entry.id);
                const isOpen = expandedSet.has(entry.id);
                const detailId = `${uid}-detail-${entry.id}`;
                const name = rowLabel(entry.row);
                return (
                  <Fragment key={entry.id}>
                    <motion.tr
                      layout={rowLayout}
                      transition={layoutTransition}
                      initial={hydrated ? { opacity: 0 } : false}
                      animate={{ opacity: 1 }}
                      data-selected={isSelected || undefined}
                      data-expanded={isOpen || undefined}
                      className={cn(
                        "h-12 border-border/60 border-b transition-colors hover:bg-muted/40",
                        "data-[selected=true]:bg-primary/[0.06] data-[expanded=true]:border-transparent",
                      )}
                    >
                      {selectable ? (
                        <td className="select-none">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                toggleRow(entry.id, checked)
                              }
                              aria-label={`Select ${name}`}
                            />
                          </div>
                        </td>
                      ) : null}
                      {renderExpanded ? (
                        <td>
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={isOpen ? detailId : undefined}
                              aria-label={`${isOpen ? "Collapse" : "Expand"} ${name}`}
                              onClick={() => toggleExpanded(entry.id)}
                              className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                            >
                              <motion.span
                                aria-hidden
                                className="grid place-items-center"
                                animate={{ rotate: isOpen ? 90 : 0 }}
                                transition={
                                  reduce ? { duration: 0 } : SPRING_SWAP
                                }
                              >
                                <ChevronRight className="size-4" />
                              </motion.span>
                            </button>
                          </div>
                        </td>
                      ) : null}
                      {visibleColumns.map((column) => (
                        <motion.td
                          key={column.key}
                          layout={rowLayout}
                          transition={layoutTransition}
                          className={cn(
                            "truncate px-4 text-foreground",
                            alignText(column.align),
                          )}
                        >
                          {readCell(entry.row, column)}
                        </motion.td>
                      ))}
                    </motion.tr>
                    <AnimatePresence initial={false}>
                      {renderExpanded && isOpen ? (
                        <motion.tr
                          key="detail"
                          layout={rowLayout}
                          transition={layoutTransition}
                          className="border-border/60 border-b"
                        >
                          <td colSpan={spanAll} className="p-0">
                            {/* Height is the point of this panel: it morphs
                                open from 0 to its content height. */}
                            <motion.div
                              id={detailId}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                height: reduce
                                  ? { duration: 0 }
                                  : { duration: 0.26, ease: EASE_OUT },
                                opacity: { duration: reduce ? 0.12 : 0.2 },
                              }}
                              className="overflow-hidden"
                            >
                              <div className="bg-muted/30 px-4 py-3">
                                {renderExpanded(entry.row)}
                              </div>
                            </motion.div>
                          </td>
                        </motion.tr>
                      ) : null}
                    </AnimatePresence>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {paged ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-border border-t px-3 py-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            {sortedRows.length === 0
              ? "0 rows"
              : `${numberFormat.format(firstIndex + 1)}–${numberFormat.format(
                  firstIndex + pageRows.length,
                )} of ${numberFormat.format(sortedRows.length)}`}
          </span>
          {pageCount > 1 ? (
            <Pagination
              total={pageCount}
              page={page}
              onPageChange={setPage}
              siblings={0}
              aria-label="Table pages"
              className="[&_button]:size-8"
            />
          ) : null}
        </div>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Header parts                                                              */
/* ------------------------------------------------------------------------ */

function SortIndicator({
  direction,
  priority,
  reduce,
}: {
  direction: SortState["direction"] | null;
  priority: number | null;
  reduce: boolean;
}) {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center gap-0.5">
      <motion.span
        className="inline-flex"
        initial={false}
        animate={{
          rotate: direction === "desc" ? 180 : 0,
          opacity: direction ? 1 : 0,
          y: direction || reduce ? 0 : 2,
        }}
        transition={reduce ? { duration: 0.12 } : SPRING_SWAP}
      >
        <ArrowUp className="size-3.5" />
      </motion.span>
      <AnimatePresence initial={false}>
        {priority ? (
          <motion.span
            key="priority"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.5 }}
            transition={reduce ? { duration: 0.1 } : SPRING_SWAP}
            className="grid size-3.5 place-items-center rounded-full bg-primary font-semibold text-[9px] text-primary-foreground tabular-nums"
          >
            {priority}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

function ColumnMenu<T>({
  column,
  thRefs,
  position,
  sortState,
  filtered,
  filterValue,
  options,
  canMoveLeft,
  canMoveRight,
  reorderable,
  canHide,
  onSort,
  onFilter,
  onMove,
  onHide,
}: {
  column: DataTableColumn<T>;
  thRefs: HeaderCellRefs;
  position: number;
  sortState: SortState | null;
  filtered: boolean;
  filterValue: DataTableFilterValue | undefined;
  options: string[] | null;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  reorderable: boolean;
  canHide: boolean;
  onSort: (direction: SortState["direction"] | null) => void;
  onFilter: (value: DataTableFilterValue) => void;
  onMove: (dir: -1 | 1) => void;
  onHide: () => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const label = labelOf(column);
  const close = useCallback(() => setOpen(false), []);

  // Anchor to the whole header cell, so the panel lines up with the column.
  const getAnchor = useCallback((): AnchorRect | null => {
    const r = thRefs.current[column.key]?.getBoundingClientRect();
    return r ? { left: r.left, right: r.right, bottom: r.bottom } : null;
  }, [thRefs, column.key]);

  const hasSort = !!column.sortable;
  const hasFilter = !!column.filter;
  const selected = Array.isArray(filterValue) ? filterValue : [];
  const hasAnything = hasSort || hasFilter || reorderable || canHide;
  if (!hasAnything) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label} column options`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "-translate-y-1/2 absolute top-1/2 right-1 grid size-6 place-items-center rounded-md bg-muted outline-none transition-[color,background-color,opacity] hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50",
          filtered || open
            ? "text-primary opacity-100"
            : "opacity-0 group-hover/th:opacity-100 [@media(hover:none)]:opacity-100",
        )}
      >
        {filtered ? (
          <ListFilter className="size-3.5" />
        ) : (
          <MoreHorizontal className="size-3.5" />
        )}
      </button>
      <Panel
        open={open}
        onClose={close}
        getAnchor={getAnchor}
        triggerRef={triggerRef}
        label={`${label} column options`}
        repositionKey={position}
      >
        {hasSort ? (
          <>
            <button
              type="button"
              aria-pressed={sortState?.direction === "asc"}
              onClick={() => onSort("asc")}
              className={PANEL_ITEM}
            >
              <ArrowUp />
              Sort ascending
            </button>
            <button
              type="button"
              aria-pressed={sortState?.direction === "desc"}
              onClick={() => onSort("desc")}
              className={PANEL_ITEM}
            >
              <ArrowUp className="rotate-180" />
              Sort descending
            </button>
            {sortState ? (
              <button
                type="button"
                onClick={() => onSort(null)}
                className={PANEL_ITEM}
              >
                <X />
                Clear sort
              </button>
            ) : null}
          </>
        ) : null}
        {hasFilter ? (
          <>
            {hasSort ? <div className={PANEL_DIVIDER} /> : null}
            <div className={PANEL_HEADING}>Filter</div>
            {column.filter === "text" ? (
              <div className="px-1.5 pb-1.5">
                <input
                  type="text"
                  value={typeof filterValue === "string" ? filterValue : ""}
                  onChange={(e) => onFilter(e.target.value)}
                  placeholder={`${label} contains…`}
                  aria-label={`Filter ${label} (contains)`}
                  className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/30"
                />
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto px-1 pb-1 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
                {(options ?? []).map((option) => (
                  <div
                    key={option}
                    className="rounded-lg px-1.5 py-1 hover:bg-muted"
                  >
                    <Checkbox
                      checked={selected.includes(option)}
                      onCheckedChange={(checked) =>
                        onFilter(
                          checked
                            ? [...selected, option]
                            : selected.filter((o) => o !== option),
                        )
                      }
                      label={option}
                      className="w-full gap-2 text-sm [&_button]:size-4"
                    />
                  </div>
                ))}
              </div>
            )}
            {filtered ? (
              <button
                type="button"
                onClick={() => onFilter(column.filter === "text" ? "" : [])}
                className={PANEL_ITEM}
              >
                <X />
                Clear filter
              </button>
            ) : null}
          </>
        ) : null}
        {reorderable || canHide ? (
          <>
            {hasSort || hasFilter ? <div className={PANEL_DIVIDER} /> : null}
            {reorderable ? (
              <>
                <button
                  type="button"
                  disabled={!canMoveLeft}
                  onClick={() => onMove(-1)}
                  className={PANEL_ITEM}
                >
                  <ArrowLeft />
                  Move left
                </button>
                <button
                  type="button"
                  disabled={!canMoveRight}
                  onClick={() => onMove(1)}
                  className={PANEL_ITEM}
                >
                  <ArrowRight />
                  Move right
                </button>
              </>
            ) : null}
            {canHide ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onHide();
                }}
                className={PANEL_ITEM}
              >
                <EyeOff />
                Hide column
              </button>
            ) : null}
          </>
        ) : null}
      </Panel>
    </>
  );
}

function ColumnsPicker<T>({
  columns,
  hiddenSet,
  visibleCount,
  onToggle,
}: {
  columns: DataTableColumn<T>[];
  hiddenSet: Set<string>;
  visibleCount: number;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const getAnchor = useCallback((): AnchorRect | null => {
    const r = triggerRef.current?.getBoundingClientRect();
    return r ? { left: r.left, right: r.right, bottom: r.bottom } : null;
  }, []);
  const hiddenCount = columns.filter((c) => hiddenSet.has(c.key)).length;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Columns3 className="size-3.5 text-muted-foreground" />
        Columns
        {hiddenCount > 0 ? (
          <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground tabular-nums">
            {hiddenCount} hidden
          </span>
        ) : null}
      </button>
      <Panel
        open={open}
        onClose={close}
        getAnchor={getAnchor}
        triggerRef={triggerRef}
        label="Visible columns"
      >
        <div className={PANEL_HEADING}>Visible columns</div>
        {columns.map((column) => {
          const visible = !hiddenSet.has(column.key);
          const locked =
            column.hideable === false || (visible && visibleCount <= 1);
          return (
            <div key={column.key} className="rounded-lg px-1.5 py-1 hover:bg-muted">
              <Checkbox
                checked={visible}
                disabled={locked}
                onCheckedChange={() => onToggle(column.key)}
                label={labelOf(column)}
                className="w-full gap-2 text-sm [&_button]:size-4"
              />
            </div>
          );
        })}
      </Panel>
    </>
  );
}
