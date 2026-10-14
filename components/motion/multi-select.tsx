"use client";

import { ChevronsUpDown, Plus, X } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDismiss } from "@/lib/hooks/use-dismiss";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
  /** Extra search terms. */
  keywords?: string[];
  disabled?: boolean;
  icon?: ReactNode;
};

export type MultiSelectGroup = {
  label: string;
  options: MultiSelectOption[];
};

export interface MultiSelectProps {
  /** Flat options, groups, or a mix. */
  options: Array<MultiSelectOption | MultiSelectGroup>;
  /** Controlled selected values. */
  value?: string[];
  /** Uncontrolled initial values. */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Most selections allowed. Remaining options disable at the limit. */
  max?: number;
  /** Offer "Create …" when the search matches nothing exactly. */
  creatable?: boolean;
  /**
   * Called with the typed label when creating. Return the new option's value
   * (default: the label itself). Created options are kept in the list.
   */
  onCreate?: (label: string) => string | undefined;
  /** Chips shown before collapsing the rest into "+N". Default 3. */
  maxVisibleChips?: number;
  /** Show the "Select all" / "Clear" bar. Default true. */
  actions?: boolean;
  label?: string;
  placeholder?: string;
  emptyMessage?: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

type FlatOption = MultiSelectOption & { group: number | null };
type Row =
  | { kind: "option"; option: FlatOption; id: string }
  | { kind: "create"; label: string; id: string };

const SHAKE = { x: [0, -5, 5, -3, 3, 0] };

function isGroup(
  entry: MultiSelectOption | MultiSelectGroup,
): entry is MultiSelectGroup {
  return "options" in entry;
}

function matches(option: MultiSelectOption, query: string) {
  if (!query) return true;
  const haystack = [option.label, option.value, ...(option.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

/**
 * Multi-value select whose field is the search input: picked values ride as
 * chips that spring in and glide aside, overflow collapses into "+N", and the
 * grouped listbox toggles options with draw-in checks.
 */
export function MultiSelect({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  max,
  creatable = false,
  onCreate,
  maxVisibleChips = 3,
  actions = true,
  label,
  placeholder = "Select…",
  emptyMessage = "No options found.",
  disabled = false,
  "aria-label": ariaLabel,
  className,
}: MultiSelectProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const inputId = `${uid}-input`;
  const listId = `${uid}-list`;
  const labelId = `${uid}-label`;

  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState<string[]>(defaultValue ?? []);
  const selected = controlled ? valueProp : internal;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const openControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = (openControlled ? openProp : internalOpen) && !disabled;

  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [created, setCreated] = useState<MultiSelectOption[]>([]);
  const [announcement, setAnnouncement] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { groups, flat } = useMemo(() => {
    const groupLabels: string[] = [];
    const all: FlatOption[] = [];
    for (const entry of options) {
      if (isGroup(entry)) {
        groupLabels.push(entry.label);
        for (const option of entry.options)
          all.push({ ...option, group: groupLabels.length - 1 });
      } else {
        all.push({ ...entry, group: null });
      }
    }
    const known = new Set(all.map((o) => o.value));
    for (const option of created)
      if (!known.has(option.value)) all.push({ ...option, group: null });
    return { groups: groupLabels, flat: all };
  }, [options, created]);

  const byValue = useMemo(
    () => new Map(flat.map((option) => [option.value, option])),
    [flat],
  );
  const labelOf = (v: string) => byValue.get(v)?.label ?? v;

  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () => flat.filter((option) => matches(option, needle)),
    [flat, needle],
  );
  const atLimit = max !== undefined && selected.length >= max;
  const isDisabled = (option: MultiSelectOption) =>
    Boolean(option.disabled) || (atLimit && !selectedSet.has(option.value));

  const canCreate =
    creatable &&
    needle.length > 0 &&
    !flat.some((option) => option.label.toLowerCase() === needle);

  // Navigable rows in visual order: ungrouped first, then each group, then create.
  const rows = useMemo<Row[]>(() => {
    const ordered: Row[] = [];
    const push = (option: FlatOption) =>
      ordered.push({
        kind: "option",
        option,
        id: `${listId}-${encodeURIComponent(option.value)}`,
      });
    for (const option of visible) if (option.group === null) push(option);
    groups.forEach((_, index) => {
      for (const option of visible) if (option.group === index) push(option);
    });
    if (canCreate)
      ordered.push({ kind: "create", label: query.trim(), id: `${listId}-create` });
    return ordered;
  }, [visible, groups, canCreate, query, listId]);

  const navigable = rows.filter(
    (row) => row.kind === "create" || !isDisabled(row.option),
  );
  const activeRow =
    rows.find((row) => row.id === activeId && navigable.includes(row)) ?? null;

  const setOpen = useCallback(
    (next: boolean) => {
      if (disabled && next) return;
      if (!openControlled) setInternalOpen(next);
      onOpenChange?.(next);
      if (!next) {
        setQuery("");
        setActiveId(null);
      }
    },
    [disabled, onOpenChange, openControlled],
  );

  const dismiss = useCallback(() => setOpen(false), [setOpen]);
  useDismiss(open, dismiss, rootRef, { escape: false });

  // Keep the active row in view while arrowing through a long list.
  useEffect(() => {
    if (!open || !activeRow) return;
    const list = listRef.current;
    const item = document.getElementById(activeRow.id);
    if (!list || !item) return;
    const itemRect = item.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    if (itemRect.top < listRect.top) list.scrollTop -= listRect.top - itemRect.top + 4;
    else if (itemRect.bottom > listRect.bottom)
      list.scrollTop += itemRect.bottom - listRect.bottom + 4;
  }, [activeRow, open]);

  const commit = (next: string[], message: string) => {
    if (!controlled) setInternal(next);
    onValueChange?.(next);
    setAnnouncement(message);
  };

  const refuse = () => {
    setAnnouncement(`Up to ${max} selections`);
    if (fieldRef.current && !reduce)
      animate(fieldRef.current, SHAKE, { duration: 0.35, ease: EASE_OUT });
  };

  const toggle = (option: MultiSelectOption) => {
    if (option.disabled) return;
    if (selectedSet.has(option.value)) {
      commit(
        selected.filter((v) => v !== option.value),
        `Removed ${option.label}`,
      );
      return;
    }
    if (atLimit) {
      refuse();
      return;
    }
    commit([...selected, option.value], `Added ${option.label}`);
  };

  const create = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    if (atLimit) {
      refuse();
      return;
    }
    const newValue = onCreate?.(text) ?? text;
    if (!byValue.has(newValue))
      setCreated((current) => [...current, { value: newValue, label: text }]);
    if (!selectedSet.has(newValue))
      commit([...selected, newValue], `Created and added ${text}`);
    setQuery("");
  };

  const activate = (row: Row) => {
    if (row.kind === "create") create(row.label);
    else toggle(row.option);
  };

  const removeValue = (v: string) => {
    commit(
      selected.filter((item) => item !== v),
      `Removed ${labelOf(v)}`,
    );
  };

  const selectAll = () => {
    const additions: string[] = [];
    const room = max === undefined ? Number.POSITIVE_INFINITY : max - selected.length;
    for (const option of visible) {
      if (additions.length >= room) break;
      if (!option.disabled && !selectedSet.has(option.value))
        additions.push(option.value);
    }
    if (!additions.length) {
      if (room <= 0) refuse();
      return;
    }
    commit([...selected, ...additions], `Added ${additions.length} options`);
  };

  const clearAll = () => {
    if (!selected.length) return;
    commit(
      selected.filter((v) => byValue.get(v)?.disabled),
      "Cleared selection",
    );
  };

  const move = (direction: 1 | -1 | "first" | "last") => {
    if (!navigable.length) {
      setActiveId(null);
      return;
    }
    if (direction === "first") return setActiveId(navigable[0].id);
    if (direction === "last") return setActiveId(navigable[navigable.length - 1].id);
    const index = activeRow ? navigable.indexOf(activeRow) : -1;
    const next =
      index < 0
        ? direction === 1
          ? 0
          : navigable.length - 1
        : (index + direction + navigable.length) % navigable.length;
    setActiveId(navigable[next].id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || event.nativeEvent.isComposing) return;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        if (!open) {
          setOpen(true);
          setActiveId(null);
          return;
        }
        move(direction);
        return;
      }
      case "Home":
      case "End":
        if (!open || query) return;
        event.preventDefault();
        move(event.key === "Home" ? "first" : "last");
        return;
      case "Enter":
        event.preventDefault();
        if (!open) setOpen(true);
        else if (activeRow) activate(activeRow);
        else if (canCreate) create(query);
        return;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        } else if (query) {
          setQuery("");
        }
        return;
      case "Backspace":
        if (query || !selected.length) return;
        event.preventDefault();
        removeValue(selected[selected.length - 1]);
        return;
      case "Tab":
        if (open) setOpen(false);
        return;
    }
  };

  // Clicks on the field's empty space land in the input and toggle the list.
  const onFieldMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    if (target !== inputRef.current) event.preventDefault();
    inputRef.current?.focus();
    setOpen(!open || target === inputRef.current);
  };

  const visibleChips = selected.slice(0, maxVisibleChips);
  const hidden = selected.slice(maxVisibleChips);
  const chipTransition = reduce ? { duration: 0.15 } : SPRING_SWAP;
  const chipInitial = reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 };
  const chipExit = reduce
    ? { opacity: 0, transition: { duration: 0.1 } }
    : { opacity: 0, scale: 0.6, transition: { duration: 0.14, ease: EASE_OUT } };

  const renderRow = (row: Row) => {
    const isActive = activeRow?.id === row.id;
    const highlight = isActive ? (
      <motion.span
        aria-hidden
        layoutId={`${uid}-active`}
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        className="absolute inset-0 -z-10 rounded-lg bg-muted"
      />
    ) : null;

    if (row.kind === "create") {
      return (
        <button
          key={row.id}
          id={row.id}
          type="button"
          role="option"
          tabIndex={-1}
          aria-selected={false}
          onMouseDown={(event) => event.preventDefault()}
          onPointerMove={() => setActiveId(row.id)}
          onClick={() => create(row.label)}
          className={cn(
            "relative flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm outline-none",
            isActive ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {highlight}
          <span className="grid size-4 shrink-0 place-items-center">
            <Plus className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate">
            Create <span className="font-medium text-foreground">“{row.label}”</span>
          </span>
        </button>
      );
    }

    const { option } = row;
    const checked = selectedSet.has(option.value);
    const off = isDisabled(option);
    return (
      <button
        key={row.id}
        id={row.id}
        type="button"
        role="option"
        tabIndex={-1}
        aria-selected={checked}
        aria-disabled={off || undefined}
        data-active={isActive || undefined}
        onMouseDown={(event) => event.preventDefault()}
        onPointerMove={() => {
          if (!off) setActiveId(row.id);
        }}
        onClick={() => {
          if (off) {
            if (atLimit && !option.disabled) refuse();
            return;
          }
          setActiveId(row.id);
          toggle(option);
        }}
        className={cn(
          "relative flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm outline-none transition-colors duration-150",
          isActive || checked ? "text-foreground" : "text-muted-foreground",
          off && "cursor-not-allowed opacity-45",
        )}
      >
        {highlight}
        <CheckBox checked={checked} reduce={Boolean(reduce)} />
        {option.icon ? (
          <span
            aria-hidden
            className="grid shrink-0 place-items-center [&_svg]:size-4"
          >
            {option.icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
      </button>
    );
  };

  const ungroupedRows = rows.filter(
    (row) => row.kind === "option" && row.option.group === null,
  );
  const createRow = rows.find((row) => row.kind === "create");

  return (
    <div ref={rootRef} className={cn("relative flex w-full flex-col gap-1.5", className)}>
      {label ? (
        <label
          id={labelId}
          htmlFor={inputId}
          className="px-1 text-sm font-medium text-foreground"
        >
          {label}
        </label>
      ) : null}

      {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer convenience only — the combobox input inside owns focus and keyboard. */}
      <div
        ref={fieldRef}
        onMouseDown={onFieldMouseDown}
        data-state={open ? "open" : "closed"}
        className={cn(
          "flex min-h-11 w-full cursor-text items-center gap-2 rounded-2xl border border-border bg-background py-1.5 pr-2 pl-2 transition-colors duration-200 hover:border-foreground/20",
          "focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-ring/40",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleChips.map((v) => (
              <motion.span
                key={v}
                layout={!reduce}
                initial={chipInitial}
                animate={{ opacity: 1, scale: 1 }}
                exit={chipExit}
                transition={{ default: chipTransition, layout: SPRING_LAYOUT }}
                className="inline-flex h-7 max-w-40 items-center gap-1 rounded-full bg-muted pr-1 pl-2.5 text-sm text-foreground"
              >
                <span className="truncate">{labelOf(v)}</span>
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={disabled}
                  aria-label={`Remove ${labelOf(v)}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => removeValue(v)}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </motion.span>
            ))}
            {hidden.length > 0 ? (
              <motion.span
                key="overflow"
                layout={!reduce}
                initial={chipInitial}
                animate={{ opacity: 1, scale: 1 }}
                exit={chipExit}
                transition={{ default: chipTransition, layout: SPRING_LAYOUT }}
                title={hidden.map(labelOf).join(", ")}
                className="inline-flex h-7 items-center rounded-full border border-border px-2.5 text-sm tabular-nums text-muted-foreground"
              >
                <span aria-hidden>+{hidden.length}</span>
                <span className="sr-only">
                  and {hidden.length} more: {hidden.map(labelOf).join(", ")}
                </span>
              </motion.span>
            ) : null}
            <motion.input
              key="input"
              layout={!reduce ? "position" : false}
              transition={{ layout: SPRING_LAYOUT }}
              ref={inputRef}
              id={inputId}
              type="text"
              role="combobox"
              aria-label={label ? undefined : (ariaLabel ?? "Select options")}
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={listId}
              aria-activedescendant={open && activeRow ? activeRow.id : undefined}
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
              value={query}
              placeholder={selected.length ? "Search…" : placeholder}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveId(null);
                if (!open) setOpen(true);
              }}
              onKeyDown={onKeyDown}
              className="h-7 min-w-20 flex-1 bg-transparent px-1 text-sm text-foreground caret-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed"
            />
          </AnimatePresence>
        </div>
        <span aria-hidden className="shrink-0 self-center text-muted-foreground">
          <ChevronsUpDown className="size-4" />
        </span>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.1 } }
                : {
                    opacity: 0,
                    y: -4,
                    scale: 0.98,
                    transition: { duration: 0.12, ease: EASE_OUT },
                  }
            }
            transition={reduce ? { duration: 0.15 } : SPRING_SWAP}
            style={{ transformOrigin: "top" }}
            className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg"
          >
            {actions ? (
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-xs">
                <span className="tabular-nums text-muted-foreground">
                  {selected.length}
                  {max !== undefined ? `/${max}` : ""} selected
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={selectAll}
                    className="rounded-md px-2 py-1 font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    disabled={!selected.length}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={clearAll}
                    className="rounded-md px-2 py-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : null}
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-multiselectable
              aria-labelledby={label ? labelId : undefined}
              aria-label={label ? undefined : (ariaLabel ?? "Options")}
              className="relative isolate max-h-60 overflow-y-auto overscroll-contain p-1.5 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
            >
              {ungroupedRows.map(renderRow)}
              {groups.map((groupLabel, index) => {
                const groupRows = rows.filter(
                  (row) => row.kind === "option" && row.option.group === index,
                );
                if (!groupRows.length) return null;
                return (
                  <fieldset
                    // biome-ignore lint/suspicious/noArrayIndexKey: group order is the identity here.
                    key={index}
                    className="m-0 min-w-0 border-0 p-0 py-0.5"
                  >
                    <legend className="w-full px-2 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {groupLabel}
                    </legend>
                    {groupRows.map(renderRow)}
                  </fieldset>
                );
              })}
              {createRow ? renderRow(createRow) : null}
              {rows.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

function CheckBox({ checked, reduce }: { checked: boolean; reduce: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors duration-150",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/40 bg-transparent text-transparent",
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-3" aria-hidden="true">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT }}
        />
      </svg>
    </span>
  );
}
