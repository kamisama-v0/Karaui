"use client";

import { ChevronRight } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Transition,
  useReducedMotion,
} from "motion/react";
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type TreeNode = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  /** Icon shown instead of `icon` while the node is expanded (open folder). */
  expandedIcon?: ReactNode;
  children?: TreeNode[];
  disabled?: boolean;
  /** Plain text used for typeahead when `label` is not a string. */
  textValue?: string;
};

export interface TreeViewProps {
  nodes: TreeNode[];
  /** Selected node id (controlled). */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (id: string | null, node: TreeNode | null) => void;
  /** Expanded node ids (controlled). */
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** Horizontal indent per level, px. */
  indent?: number;
  /** Show vertical guide lines for nested groups. */
  guides?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}

type FlatNode = {
  node: TreeNode;
  depth: number;
  parentId: string | null;
};

// Height morph for opening groups. Close is quicker than open (exits faster
// than entrances); opacity rides a shorter tween so rows never smear.
const GROUP_OPEN: Transition = {
  height: { type: "spring", stiffness: 420, damping: 38, mass: 0.6 },
  opacity: { duration: 0.18, ease: EASE_OUT },
};
const GROUP_CLOSE: Transition = {
  height: { duration: 0.2, ease: EASE_OUT },
  opacity: { duration: 0.12, ease: EASE_OUT },
};
const INSTANT: Transition = { duration: 0 };
const FADE_ONLY: Transition = { duration: 0.15, ease: EASE_OUT };

const TYPEAHEAD_RESET_MS = 500;

function textOf(node: TreeNode) {
  if (node.textValue) return node.textValue;
  return typeof node.label === "string" || typeof node.label === "number"
    ? String(node.label)
    : "";
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

export function TreeView({
  nodes,
  value,
  defaultValue = null,
  onValueChange,
  expanded: expandedProp,
  defaultExpanded = [],
  onExpandedChange,
  indent = 16,
  guides = true,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  className,
}: TreeViewProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [selected, setSelectedRaw] = useControllable<string | null>(
    value,
    defaultValue,
  );
  const [expandedList, setExpanded] = useControllable<string[]>(
    expandedProp,
    defaultExpanded,
    onExpandedChange,
  );
  const expandedSet = useMemo(() => new Set(expandedList), [expandedList]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const typeahead = useRef({ buffer: "", timer: 0 });

  // Index of every node (visible or not) for parent lookups.
  const index = useMemo(() => {
    const map = new Map<string, FlatNode>();
    const walk = (list: TreeNode[], depth: number, parentId: string | null) => {
      for (const node of list) {
        map.set(node.id, { node, depth, parentId });
        if (node.children) walk(node.children, depth + 1, node.id);
      }
    };
    walk(nodes, 0, null);
    return map;
  }, [nodes]);

  // Visible rows in document order — the keyboard moves along this list.
  const visible = useMemo(() => {
    const out: FlatNode[] = [];
    const walk = (list: TreeNode[], depth: number, parentId: string | null) => {
      for (const node of list) {
        out.push({ node, depth, parentId });
        if (node.children?.length && expandedSet.has(node.id)) {
          walk(node.children, depth + 1, node.id);
        }
      }
    };
    walk(nodes, 0, null);
    return out;
  }, [nodes, expandedSet]);

  const visibleIds = useMemo(
    () => new Set(visible.map((entry) => entry.node.id)),
    [visible],
  );

  // Roving tabindex target: last focused row if still visible, else the
  // selection, else the first row.
  const tabStop =
    (focusedId && visibleIds.has(focusedId) && focusedId) ||
    (selected && visibleIds.has(selected) && selected) ||
    visible[0]?.node.id ||
    null;

  const select = useCallback(
    (id: string) => {
      const entry = index.get(id);
      if (!entry || entry.node.disabled) return;
      setSelectedRaw(id);
      onValueChange?.(id, entry.node);
    },
    [index, onValueChange, setSelectedRaw],
  );

  const setOpen = useCallback(
    (id: string, open: boolean) => {
      if (expandedSet.has(id) === open) return;
      setExpanded(
        open
          ? [...expandedList, id]
          : expandedList.filter((existing) => existing !== id),
      );
    },
    [expandedList, expandedSet, setExpanded],
  );

  const focusNode = useCallback((id: string | undefined) => {
    if (!id) return;
    setFocusedId(id);
    itemRefs.current.get(id)?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    // Nested treeitems bubble — only the row that owns focus reacts.
    if (event.target !== event.currentTarget) return;
    const entry = index.get(id);
    if (!entry) return;
    const position = visible.findIndex((item) => item.node.id === id);
    const hasChildren = Boolean(entry.node.children?.length);
    const isOpen = expandedSet.has(id);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusNode(visible[position + 1]?.node.id);
        return;
      case "ArrowUp":
        event.preventDefault();
        focusNode(visible[position - 1]?.node.id);
        return;
      case "ArrowRight":
        event.preventDefault();
        if (!hasChildren) return;
        if (!isOpen) setOpen(id, true);
        else focusNode(entry.node.children?.[0]?.id);
        return;
      case "ArrowLeft":
        event.preventDefault();
        if (hasChildren && isOpen) setOpen(id, false);
        else focusNode(entry.parentId ?? undefined);
        return;
      case "Home":
        event.preventDefault();
        focusNode(visible[0]?.node.id);
        return;
      case "End":
        event.preventDefault();
        focusNode(visible[visible.length - 1]?.node.id);
        return;
      case "Enter":
        event.preventDefault();
        select(id);
        if (hasChildren) setOpen(id, !isOpen);
        return;
      case " ":
        event.preventDefault();
        select(id);
        return;
      case "*": {
        // Expand every sibling of the focused node (WAI-ARIA optional key).
        event.preventDefault();
        const siblings = entry.parentId
          ? (index.get(entry.parentId)?.node.children ?? [])
          : nodes;
        const toOpen = siblings
          .filter((sibling) => sibling.children?.length)
          .map((sibling) => sibling.id)
          .filter((sibling) => !expandedSet.has(sibling));
        if (toOpen.length) setExpanded([...expandedList, ...toOpen]);
        return;
      }
      default:
        break;
    }

    // Typeahead: printable characters jump to the next matching visible row.
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const state = typeahead.current;
      window.clearTimeout(state.timer);
      state.buffer += event.key.toLowerCase();
      state.timer = window.setTimeout(() => {
        state.buffer = "";
      }, TYPEAHEAD_RESET_MS);
      const ordered = [
        ...visible.slice(position + 1),
        ...visible.slice(0, position + 1),
      ];
      const repeated = state.buffer.split("").every((c) => c === state.buffer[0]);
      const query = repeated ? state.buffer[0] : state.buffer;
      const match = ordered.find((item) =>
        textOf(item.node).toLowerCase().startsWith(query),
      );
      if (match) focusNode(match.node.id);
    }
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>, id: string) => {
    event.stopPropagation();
    const entry = index.get(id);
    if (!entry || entry.node.disabled) return;
    setFocusedId(id);
    select(id);
    if (entry.node.children?.length) setOpen(id, !expandedSet.has(id));
  };

  const renderList = (list: TreeNode[], depth: number): ReactNode =>
    list.map((node, i) => {
      const hasChildren = Boolean(node.children?.length);
      const isOpen = hasChildren && expandedSet.has(node.id);
      const isSelected = selected === node.id;
      const groupId = `${baseId}-${node.id}-group`;

      return (
        <div
          key={node.id}
          ref={(el) => {
            if (el) itemRefs.current.set(node.id, el);
            else itemRefs.current.delete(node.id);
          }}
          role="treeitem"
          aria-level={depth + 1}
          aria-setsize={list.length}
          aria-posinset={i + 1}
          aria-expanded={hasChildren ? isOpen : undefined}
          aria-selected={isSelected}
          aria-disabled={node.disabled || undefined}
          tabIndex={tabStop === node.id ? 0 : -1}
          onFocus={(event) => {
            if (event.target === event.currentTarget) setFocusedId(node.id);
          }}
          onKeyDown={(event) => handleKeyDown(event, node.id)}
          onClick={(event) => handleClick(event, node.id)}
          className="outline-none"
        >
          <div
            data-selected={isSelected || undefined}
            className={cn(
              "relative flex h-8 cursor-default select-none items-center gap-1.5 rounded-md pr-2 text-sm transition-colors",
              "text-muted-foreground hover:text-foreground",
              "data-selected:text-foreground",
              "[:focus-visible>&]:ring-2 [:focus-visible>&]:ring-ring/60 [:focus-visible>&]:ring-inset",
              node.disabled && "pointer-events-none opacity-50",
            )}
            style={{ paddingLeft: depth * indent + 6 }}
          >
            {isSelected ? (
              <motion.span
                aria-hidden
                layoutId={`${baseId}-tree-pill`}
                transition={reduce ? INSTANT : SPRING_LAYOUT}
                className="absolute inset-0 rounded-md bg-muted"
              />
            ) : null}
            <span className="relative grid size-4 shrink-0 place-items-center">
              {hasChildren ? (
                <motion.span
                  aria-hidden
                  initial={false}
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={reduce ? INSTANT : SPRING_SWAP}
                  className="grid place-items-center"
                >
                  <ChevronRight className="size-3.5" />
                </motion.span>
              ) : null}
            </span>
            {node.icon ? (
              <span
                aria-hidden
                className="relative grid size-4 shrink-0 place-items-center [&>svg]:size-4"
              >
                {isOpen && node.expandedIcon ? node.expandedIcon : node.icon}
              </span>
            ) : null}
            <span className="relative min-w-0 flex-1 truncate">
              {node.label}
            </span>
          </div>

          {hasChildren ? (
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="group"
                  id={groupId}
                  role="group"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: reduce ? FADE_ONLY : GROUP_OPEN,
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: reduce ? FADE_ONLY : GROUP_CLOSE,
                  }}
                  className="relative overflow-hidden"
                >
                  {guides ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-1 w-px bg-border"
                      style={{ left: depth * indent + 6 + 7.5 }}
                    />
                  ) : null}
                  {renderList(node.children ?? [], depth + 1)}
                </motion.div>
              ) : null}
            </AnimatePresence>
          ) : null}
        </div>
      );
    });

  return (
    <LayoutGroup id={baseId}>
      <div
        role="tree"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className={cn("flex w-full flex-col", className)}
      >
        {renderList(nodes, 0)}
      </div>
    </LayoutGroup>
  );
}
