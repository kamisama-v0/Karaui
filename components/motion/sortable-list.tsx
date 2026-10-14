"use client";

import {
  motion,
  Reorder,
  useDragControls,
  useReducedMotion,
} from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { SPRING_LAYOUT } from "@/lib/ease";
import { TOUCH_GESTURE_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

export type SortableItem = { id: string | number };

export type SortableItemState = {
  /** Zero-based position in the list as currently shown. */
  index: number;
  /** Total number of items. */
  count: number;
  /** True while the item is lifted by pointer or keyboard. */
  isDragging: boolean;
};

export interface SortableListProps<T extends SortableItem> {
  /** Controlled order. */
  items?: T[];
  /** Initial order when uncontrolled. */
  defaultItems?: T[];
  /** Fires once per completed move (pointer release or keyboard drop). */
  onChange?: (items: T[]) => void;
  renderItem: (item: T, state: SortableItemState) => ReactNode;
  /** Human-readable name used for the handle label and announcements. */
  getLabel?: (item: T) => string;
  className?: string;
  itemClassName?: string;
}

/** Keyboard pick-up session: what to restore if the move is cancelled. */
type Grab<T extends SortableItem> = { id: T["id"]; original: T[] };

const INSTANT = { duration: 0 } as const;

function positionOf<T extends SortableItem>(list: T[], id: T["id"]) {
  return list.findIndex((entry) => entry.id === id) + 1;
}

function moveItem<T>(list: T[], from: number, to: number) {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function GripIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="currentColor"
    >
      <circle cx="5.5" cy="3.5" r="1.25" />
      <circle cx="10.5" cy="3.5" r="1.25" />
      <circle cx="5.5" cy="8" r="1.25" />
      <circle cx="10.5" cy="8" r="1.25" />
      <circle cx="5.5" cy="12.5" r="1.25" />
      <circle cx="10.5" cy="12.5" r="1.25" />
    </svg>
  );
}

function SortableRow<T extends SortableItem>({
  item,
  index,
  count,
  label,
  lifted,
  grabbed,
  describedBy,
  reduce,
  className,
  registerHandle,
  onPointerLift,
  onPointerDrop,
  onHandleKeyDown,
  onHandleBlur,
  children,
}: {
  item: T;
  index: number;
  count: number;
  label: string;
  lifted: boolean;
  grabbed: boolean;
  describedBy: string;
  reduce: boolean;
  className?: string;
  registerHandle: (id: T["id"], el: HTMLButtonElement | null) => void;
  onPointerLift: (item: T) => void;
  onPointerDrop: (item: T) => void;
  onHandleKeyDown: (event: KeyboardEvent<HTMLButtonElement>, item: T) => void;
  onHandleBlur: (relatedTarget: EventTarget | null) => void;
  children: ReactNode;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="li"
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => onPointerLift(item)}
      onDragEnd={() => onPointerDrop(item)}
      transition={reduce ? INSTANT : SPRING_LAYOUT}
      animate={{ scale: lifted && !reduce ? 1.02 : 1 }}
      className={cn(
        "relative flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5",
        lifted ? "z-10" : "z-0",
        className,
      )}
    >
      {/* The lift shadow is a separate layer so only its opacity animates. */}
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ opacity: lifted ? 1 : 0 }}
        transition={reduce ? INSTANT : { duration: 0.15 }}
        className="pointer-events-none absolute inset-0 -z-10 rounded-2xl shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)]"
      />
      <button
        type="button"
        ref={(el) => registerHandle(item.id, el)}
        aria-label={`Reorder ${label}, position ${index + 1} of ${count}`}
        aria-describedby={describedBy}
        aria-pressed={grabbed}
        onPointerDown={(event) => {
          event.preventDefault();
          controls.start(event);
        }}
        onKeyDown={(event) => onHandleKeyDown(event, item)}
        onBlur={(event) => onHandleBlur(event.relatedTarget)}
        className={cn(
          "grid h-8 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted-foreground outline-none transition-colors",
          "hover:bg-muted hover:text-foreground active:cursor-grabbing",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          grabbed && "bg-muted text-foreground",
          TOUCH_GESTURE_CLASS,
        )}
      >
        <GripIcon />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </Reorder.Item>
  );
}

export function SortableList<T extends SortableItem>({
  items,
  defaultItems,
  onChange,
  renderItem,
  getLabel = (item) => String(item.id),
  className,
  itemClassName,
}: SortableListProps<T>) {
  const reduce = useReducedMotion() ?? false;
  const instructionsId = useId();
  const [internal, setInternal] = useState<T[]>(defaultItems ?? []);
  const isControlled = items !== undefined;
  const committed = isControlled ? items : internal;

  // Working order while a move is in progress; committed on drop.
  const [draft, setDraft] = useState<T[] | null>(null);
  const [draggingId, setDraggingId] = useState<T["id"] | null>(null);
  const [grab, setGrab] = useState<Grab<T> | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const handles = useRef(new Map<T["id"], HTMLButtonElement>());
  const view = draft ?? committed;

  const commit = useCallback(
    (next: T[]) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  const registerHandle = useCallback(
    (id: T["id"], el: HTMLButtonElement | null) => {
      if (el) handles.current.set(id, el);
      else handles.current.delete(id);
    },
    [],
  );

  // React moves list nodes when the order changes, which can drop focus from
  // the grabbed handle — put it back after every keyboard move.
  const grabbedId = grab?.id;
  const grabbedIndex =
    grabbedId === undefined
      ? -1
      : view.findIndex((entry) => entry.id === grabbedId);
  useEffect(() => {
    if (grabbedId === undefined || grabbedIndex < 0) return;
    const el = handles.current.get(grabbedId);
    if (el && document.activeElement !== el) el.focus();
  }, [grabbedId, grabbedIndex]);

  const drop = (item: T, list: T[]) => {
    setGrab(null);
    setDraft(null);
    setAnnouncement(
      `${getLabel(item)} dropped at position ${positionOf(list, item.id)} of ${list.length}.`,
    );
    const changed = list.some((entry, i) => entry !== committed[i]);
    if (changed) commit(list);
  };

  const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, item: T) => {
    const label = getLabel(item);
    const isToggle = event.key === " " || event.key === "Enter";

    if (!grab) {
      if (!isToggle) return;
      event.preventDefault();
      setGrab({ id: item.id, original: committed });
      setDraft(committed);
      setAnnouncement(
        `Picked up ${label}, position ${positionOf(committed, item.id)} of ${committed.length}. Use the up and down arrow keys to move, Space to drop, Escape to cancel.`,
      );
      return;
    }

    if (grab.id !== item.id) return;

    if (isToggle) {
      event.preventDefault();
      drop(item, view);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setGrab(null);
      setDraft(null);
      setAnnouncement(
        `Move cancelled. ${label} returned to position ${positionOf(grab.original, item.id)} of ${grab.original.length}.`,
      );
      return;
    }

    const delta =
      event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (!delta) return;
    event.preventDefault();
    const from = view.findIndex((entry) => entry.id === item.id);
    const to = Math.max(0, Math.min(view.length - 1, from + delta));
    if (to === from) return;
    setDraft(moveItem(view, from, to));
    setAnnouncement(`Moved ${label} to position ${to + 1} of ${view.length}.`);
  };

  const onHandleBlur = (relatedTarget: EventTarget | null) => {
    // Focus leaving for another element (Tab, click elsewhere) drops the item
    // where it is. A null target is React re-parenting the node mid-move.
    if (!grab || !relatedTarget) return;
    const item = view.find((entry) => entry.id === grab.id);
    if (item) drop(item, view);
  };

  return (
    <div className={cn("w-full", className)}>
      <p id={instructionsId} className="sr-only">
        Press Space or Enter to pick up an item, the arrow keys to move it,
        Space or Enter to drop it, and Escape to cancel.
      </p>
      <Reorder.Group
        as="ul"
        axis="y"
        values={view}
        onReorder={setDraft}
        className="flex flex-col gap-2"
      >
        {view.map((item, index) => (
          <SortableRow
            key={item.id}
            item={item}
            index={index}
            count={view.length}
            label={getLabel(item)}
            lifted={draggingId === item.id || grab?.id === item.id}
            grabbed={grab?.id === item.id}
            describedBy={instructionsId}
            reduce={reduce}
            className={itemClassName}
            registerHandle={registerHandle}
            onPointerLift={(lifted) => {
              setDraggingId(lifted.id);
              setDraft((current) => current ?? committed);
            }}
            onPointerDrop={(dropped) => {
              setDraggingId(null);
              drop(dropped, draft ?? committed);
            }}
            onHandleKeyDown={onHandleKeyDown}
            onHandleBlur={onHandleBlur}
          >
            {renderItem(item, {
              index,
              count: view.length,
              isDragging: draggingId === item.id || grab?.id === item.id,
            })}
          </SortableRow>
        ))}
      </Reorder.Group>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
