"use client";

import {
  type DragControls,
  LayoutGroup,
  motion,
  type PanInfo,
  useDragControls,
  useReducedMotion,
} from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { SPRING_LAYOUT } from "@/lib/ease";
import { TOUCH_GESTURE_CONTENT_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

export type KanbanPriority = "low" | "medium" | "high" | "urgent";

export type KanbanCard = {
  id: string;
  title: string;
  tags?: string[];
  /** Assignee name; initials are derived unless `initials` is given. */
  assignee?: { name: string; initials?: string };
  priority?: KanbanPriority;
};

export type KanbanColumn = {
  id: string;
  title: string;
  cards: KanbanCard[];
};

export type KanbanMove = {
  cardId: string;
  from: { columnId: string; index: number };
  to: { columnId: string; index: number };
};

export interface KanbanBoardProps {
  /** Controlled columns. */
  columns?: KanbanColumn[];
  /** Initial columns when uncontrolled. */
  defaultColumns?: KanbanColumn[];
  /** Fires once per completed move with the next columns and what moved. */
  onChange?: (columns: KanbanColumn[], move: KanbanMove) => void;
  className?: string;
  columnClassName?: string;
  cardClassName?: string;
}

type Location = { columnId: string; index: number };

type PointerDrag = {
  cardId: string;
  from: Location;
  height: number;
};

type KeyboardGrab = {
  cardId: string;
  original: KanbanColumn[];
};

const INSTANT = { duration: 0 } as const;
const FADE = { duration: 0.15 } as const;
// Touch needs a short press before a card lifts, so a swipe across the board
// still scrolls the columns instead of grabbing whatever card is underneath.
const TOUCH_LIFT_DELAY = 220;
const TOUCH_SLOP = 8;

const PRIORITY: Record<KanbanPriority, { label: string; dot: string }> = {
  low: { label: "Low priority", dot: "bg-sky-500" },
  medium: { label: "Medium priority", dot: "bg-amber-500" },
  high: { label: "High priority", dot: "bg-orange-500" },
  urgent: { label: "Urgent", dot: "bg-red-500" },
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function locate(columns: KanbanColumn[], cardId: string): Location | null {
  for (const column of columns) {
    const index = column.cards.findIndex((card) => card.id === cardId);
    if (index !== -1) return { columnId: column.id, index };
  }
  return null;
}

/** Move a card to `to`, where `to.index` counts the target's other cards. */
function moveCard(
  columns: KanbanColumn[],
  cardId: string,
  to: Location,
): KanbanColumn[] {
  let moving: KanbanCard | undefined;
  const without = columns.map((column) => {
    const card = column.cards.find((entry) => entry.id === cardId);
    if (!card) return column;
    moving = card;
    return {
      ...column,
      cards: column.cards.filter((entry) => entry.id !== cardId),
    };
  });
  if (!moving) return columns;
  const card = moving;
  return without.map((column) => {
    if (column.id !== to.columnId) return column;
    const cards = column.cards.slice();
    cards.splice(Math.max(0, Math.min(cards.length, to.index)), 0, card);
    return { ...column, cards };
  });
}

function KanbanCardView({
  card,
  layoutId,
  reduce,
  dragging,
  grabbed,
  describedBy,
  className,
  registerCard,
  onLift,
  onDragMove,
  onDrop,
  onKeyDown,
  onBlur,
}: {
  card: KanbanCard;
  layoutId: string;
  reduce: boolean;
  dragging: boolean;
  grabbed: boolean;
  describedBy: string;
  className?: string;
  registerCard: (id: string, el: HTMLElement | null) => void;
  onLift: (card: KanbanCard, el: HTMLElement | null) => void;
  onDragMove: (point: { x: number; y: number }) => void;
  onDrop: (card: KanbanCard) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, card: KanbanCard) => void;
  onBlur: (relatedTarget: EventTarget | null) => void;
}) {
  const controls = useDragControls();
  const itemRef = useRef<HTMLLIElement>(null);
  const lifted = dragging || grabbed;
  const startTouchLift = useTouchLift(controls);
  const priority = card.priority ? PRIORITY[card.priority] : null;

  return (
    <motion.li
      ref={(el) => {
        itemRef.current = el;
        registerCard(card.id, el);
      }}
      layout
      layoutId={layoutId}
      drag
      dragControls={controls}
      dragListener={false}
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={() => onLift(card, itemRef.current)}
      onDrag={(_event, info: PanInfo) =>
        // `info.point` is page space; hit-testing reads viewport rects.
        onDragMove({
          x: info.point.x - window.scrollX,
          y: info.point.y - window.scrollY,
        })
      }
      onDragEnd={() => onDrop(card)}
      animate={{ scale: lifted && !reduce ? 1.03 : 1 }}
      transition={reduce ? INSTANT : SPRING_LAYOUT}
      className={cn("relative list-none", lifted ? "z-30" : "z-0")}
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ opacity: lifted ? 1 : 0 }}
        transition={reduce ? INSTANT : FADE}
        className="pointer-events-none absolute inset-0 rounded-xl shadow-[0_16px_36px_-14px_rgb(0_0_0/0.4)]"
      />
      <button
        type="button"
        aria-roledescription="draggable card"
        aria-describedby={describedBy}
        aria-pressed={grabbed}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          startTouchLift(event);
        }}
        onKeyDown={(event) => onKeyDown(event, card)}
        onBlur={(event) => onBlur(event.relatedTarget)}
        className={cn(
          "relative flex w-full cursor-grab flex-col gap-2.5 rounded-xl border border-border bg-card p-3 text-left outline-none transition-colors active:cursor-grabbing",
          "hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          grabbed && "border-foreground/30",
          TOUCH_GESTURE_CONTENT_CLASS,
          dragging && "select-none",
          className,
        )}
      >
        <span className="flex items-start gap-2">
          {priority ? (
            <span
              className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", priority.dot)}
            >
              <span className="sr-only">{priority.label}</span>
            </span>
          ) : null}
          <span className="text-sm font-medium leading-snug text-foreground">
            {card.title}
          </span>
        </span>
        {card.tags?.length || card.assignee ? (
          <span className="flex items-end justify-between gap-2">
            <span className="flex flex-wrap gap-1">
              {card.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </span>
            {card.assignee ? (
              <span
                title={card.assignee.name}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-foreground text-[10px] font-semibold text-background"
              >
                <span aria-hidden="true">
                  {card.assignee.initials ?? initialsOf(card.assignee.name)}
                </span>
                <span className="sr-only">Assigned to {card.assignee.name}</span>
              </span>
            ) : null}
          </span>
        ) : null}
      </button>
    </motion.li>
  );
}

/**
 * Mouse and pen lift immediately (motion still waits for a few pixels of
 * travel before it calls it a drag). Touch lifts after a short still press;
 * moving first hands the gesture back to the scroller.
 */
function useTouchLift(controls: DragControls) {
  const timer = useRef<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  return useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType !== "touch") {
        controls.start(event);
        return;
      }
      cleanup.current?.();
      const native = event.nativeEvent;
      const startX = native.clientX;
      const startY = native.clientY;
      let lifted = false;

      // Once lifted, the page must not scroll under the finger.
      const blockScroll = (touch: TouchEvent) => {
        if (lifted) touch.preventDefault();
      };
      const onMove = (move: PointerEvent) => {
        if (lifted) return;
        if (
          Math.abs(move.clientX - startX) > TOUCH_SLOP ||
          Math.abs(move.clientY - startY) > TOUCH_SLOP
        ) {
          cleanup.current?.();
        }
      };
      const stop = () => {
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
        window.removeEventListener("touchmove", blockScroll);
        cleanup.current = null;
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
      window.addEventListener("touchmove", blockScroll, { passive: false });
      cleanup.current = stop;
      timer.current = window.setTimeout(() => {
        timer.current = null;
        lifted = true;
        controls.start(native);
      }, TOUCH_LIFT_DELAY);
    },
    [controls],
  );
}

export function KanbanBoard({
  columns,
  defaultColumns,
  onChange,
  className,
  columnClassName,
  cardClassName,
}: KanbanBoardProps) {
  const reduce = useReducedMotion() ?? false;
  const boardId = useId();
  const instructionsId = useId();
  const [internal, setInternal] = useState<KanbanColumn[]>(
    defaultColumns ?? [],
  );
  const isControlled = columns !== undefined;
  const committed = isControlled ? columns : internal;

  const [draft, setDraft] = useState<KanbanColumn[] | null>(null);
  const [pointer, setPointer] = useState<PointerDrag | null>(null);
  const [over, setOver] = useState<Location | null>(null);
  const [grab, setGrab] = useState<KeyboardGrab | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const overRef = useRef<Location | null>(null);
  const cardEls = useRef(new Map<string, HTMLElement>());
  const columnEls = useRef(new Map<string, HTMLElement>());
  const view = draft ?? committed;

  const registerCard = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cardEls.current.set(id, el);
    else cardEls.current.delete(id);
  }, []);

  const titleOf = (cardId: string, list = view) => {
    for (const column of list) {
      const card = column.cards.find((entry) => entry.id === cardId);
      if (card) return card.title;
    }
    return "Card";
  };

  const describe = (list: KanbanColumn[], cardId: string) => {
    const at = locate(list, cardId);
    const column = list.find((entry) => entry.id === at?.columnId);
    if (!at || !column) return "";
    return `${column.title}, position ${at.index + 1} of ${column.cards.length}`;
  };

  const commit = (next: KanbanColumn[], move: KanbanMove) => {
    if (
      move.from.columnId === move.to.columnId &&
      move.from.index === move.to.index
    ) {
      return;
    }
    if (!isControlled) setInternal(next);
    onChange?.(next, move);
  };

  // Keep focus on the grabbed card as it changes place; crossing a column
  // remounts it, and the shared layoutId flies it to its new slot.
  const grabbedId = grab?.cardId;
  const grabbedAt = grabbedId ? locate(view, grabbedId) : null;
  const grabbedSlot = grabbedAt ? `${grabbedAt.columnId}:${grabbedAt.index}` : "";
  useEffect(() => {
    if (!grabbedId || !grabbedSlot) return;
    const el = cardEls.current.get(grabbedId)?.querySelector("button");
    if (el && document.activeElement !== el) el.focus();
  }, [grabbedId, grabbedSlot]);

  /* ----------------------------- pointer drag ----------------------------- */

  const onLift = (card: KanbanCard, el: HTMLElement | null) => {
    const from = locate(committed, card.id);
    if (!from) return;
    setPointer({
      cardId: card.id,
      from,
      height: el?.getBoundingClientRect().height ?? 72,
    });
  };

  const onDragMove = (point: { x: number; y: number }) => {
    if (!pointer) return;
    let target: KanbanColumn | undefined;
    let nearest = Number.POSITIVE_INFINITY;
    for (const column of view) {
      const rect = columnEls.current.get(column.id)?.getBoundingClientRect();
      if (!rect) continue;
      const distance =
        point.x < rect.left
          ? rect.left - point.x
          : point.x > rect.right
            ? point.x - rect.right
            : 0;
      if (distance < nearest) {
        nearest = distance;
        target = column;
      }
    }
    // Only a column the pointer is actually over (or right beside) accepts.
    if (!target || nearest > 24) {
      if (overRef.current) {
        overRef.current = null;
        setOver(null);
      }
      return;
    }
    let index = 0;
    for (const card of target.cards) {
      if (card.id === pointer.cardId) continue;
      const rect = cardEls.current.get(card.id)?.getBoundingClientRect();
      if (rect && point.y > rect.top + rect.height / 2) index += 1;
    }
    const prev = overRef.current;
    if (prev?.columnId === target.id && prev.index === index) return;
    const next = { columnId: target.id, index };
    overRef.current = next;
    setOver(next);
  };

  const onPointerDrop = (card: KanbanCard) => {
    const to = overRef.current;
    const from = pointer?.from;
    overRef.current = null;
    setOver(null);
    setPointer(null);
    if (!to || !from) return;
    const next = moveCard(committed, card.id, to);
    commit(next, { cardId: card.id, from, to });
    setAnnouncement(`${card.title} dropped in ${describe(next, card.id)}.`);
  };

  /* ---------------------------- keyboard moves ---------------------------- */

  const drop = (cardId: string) => {
    if (!grab) return;
    const from = locate(grab.original, cardId);
    const to = locate(view, cardId);
    setGrab(null);
    setDraft(null);
    if (!from || !to) return;
    setAnnouncement(`${titleOf(cardId)} dropped in ${describe(view, cardId)}.`);
    commit(view, { cardId, from, to });
  };

  const onCardKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    card: KanbanCard,
  ) => {
    const isToggle = event.key === " " || event.key === "Enter";

    if (!grab) {
      if (!isToggle) return;
      event.preventDefault();
      setGrab({ cardId: card.id, original: committed });
      setDraft(committed);
      setAnnouncement(
        `Picked up ${card.title} in ${describe(committed, card.id)}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
      );
      return;
    }

    if (grab.cardId !== card.id) return;

    if (isToggle) {
      event.preventDefault();
      drop(card.id);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setGrab(null);
      setDraft(null);
      setAnnouncement(
        `Move cancelled. ${card.title} returned to ${describe(grab.original, card.id)}.`,
      );
      return;
    }

    const at = locate(view, card.id);
    if (!at) return;
    const columnIndex = view.findIndex((column) => column.id === at.columnId);
    let to: Location | null = null;

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const length = view[columnIndex].cards.length;
      const index = at.index + (event.key === "ArrowUp" ? -1 : 1);
      if (index >= 0 && index < length) to = { columnId: at.columnId, index };
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const target = view[columnIndex + (event.key === "ArrowLeft" ? -1 : 1)];
      if (target) {
        to = {
          columnId: target.id,
          index: Math.min(at.index, target.cards.length),
        };
      }
    } else {
      return;
    }

    event.preventDefault();
    if (!to) return;
    const next = moveCard(view, card.id, to);
    setDraft(next);
    setAnnouncement(`${card.title} moved to ${describe(next, card.id)}.`);
  };

  const onCardBlur = (relatedTarget: EventTarget | null) => {
    // Tabbing or clicking away drops the card in place. A null target is the
    // card being remounted into another column mid-move.
    if (grab && relatedTarget) drop(grab.cardId);
  };

  return (
    <div className={cn("w-full", className)}>
      <p id={instructionsId} className="sr-only">
        Press Space to pick up a card. Use the left and right arrow keys to
        change column, the up and down arrow keys to change position, Space to
        drop and Escape to cancel.
      </p>
      <LayoutGroup id={boardId}>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] sm:snap-none">
          {view.map((column) => {
            const isOver = pointer !== null && over?.columnId === column.id;
            const sameSlot =
              pointer !== null &&
              over !== null &&
              pointer.from.columnId === over.columnId &&
              pointer.from.index === over.index;
            const showPlaceholder = isOver && !sameSlot;
            let counted = 0;

            const placeholder = (
              <motion.li
                key="kanban-placeholder"
                layout
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reduce ? INSTANT : FADE}
                style={{ height: pointer?.height }}
                className="list-none rounded-xl border-2 border-dashed border-foreground/20 bg-foreground/[0.03]"
              />
            );

            return (
              <section
                key={column.id}
                aria-label={`${column.title}, ${column.cards.length} ${column.cards.length === 1 ? "card" : "cards"}`}
                className={cn(
                  "relative flex w-[78%] max-w-72 shrink-0 snap-start flex-col rounded-2xl bg-muted/60 p-2 sm:w-auto sm:min-w-56 sm:max-w-none sm:flex-1",
                  columnClassName,
                )}
              >
                {/* Highlight is its own layer so only opacity animates. */}
                <motion.span
                  aria-hidden="true"
                  initial={false}
                  animate={{ opacity: isOver ? 1 : 0 }}
                  transition={reduce ? INSTANT : FADE}
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-foreground/[0.04] ring-2 ring-foreground/15 ring-inset"
                />
                <header className="relative flex items-center justify-between px-1.5 pt-1 pb-2.5">
                  <h3 className="text-sm font-semibold text-foreground">
                    {column.title}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="min-w-6 rounded-full bg-background px-2 py-0.5 text-center text-xs font-medium tabular-nums text-muted-foreground"
                  >
                    {column.cards.length}
                  </span>
                </header>
                <ul
                  ref={(el) => {
                    if (el) columnEls.current.set(column.id, el);
                    else columnEls.current.delete(column.id);
                  }}
                  className="relative flex min-h-24 flex-1 flex-col gap-2"
                >
                  {column.cards.flatMap((card) => {
                    const isDragged = pointer?.cardId === card.id;
                    const before =
                      showPlaceholder && !isDragged && counted === over?.index;
                    if (!isDragged) counted += 1;
                    const node = (
                      <KanbanCardView
                        key={card.id}
                        card={card}
                        layoutId={`card-${card.id}`}
                        reduce={reduce}
                        dragging={isDragged}
                        grabbed={grab?.cardId === card.id}
                        describedBy={instructionsId}
                        className={cardClassName}
                        registerCard={registerCard}
                        onLift={onLift}
                        onDragMove={onDragMove}
                        onDrop={onPointerDrop}
                        onKeyDown={onCardKeyDown}
                        onBlur={onCardBlur}
                      />
                    );
                    return before ? [placeholder, node] : [node];
                  })}
                  {showPlaceholder && counted === over?.index
                    ? placeholder
                    : null}
                </ul>
              </section>
            );
          })}
        </div>
      </LayoutGroup>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
