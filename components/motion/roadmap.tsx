"use client";

import { ChevronUp, Columns3, ListTree } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useCallback, useId, useMemo, useState } from "react";
import { Badge, type BadgeVariant } from "@/components/motion/badge";
import { EmptyState } from "@/components/motion/empty-state";
import { SegmentedControl } from "@/components/motion/segmented-control";
import { ToggleGroup, ToggleGroupItem } from "@/components/motion/toggle-group";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type RoadmapStatus = "planned" | "in-progress" | "shipped";
export type RoadmapView = "board" | "timeline";

export interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  status: RoadmapStatus;
  tags?: string[];
  votes: number;
  /** The current viewer has upvoted this item. */
  voted?: boolean;
  /** Timeline bucket, e.g. "Q4 2026". Items without one land in "Later". */
  quarter?: string;
}

export interface RoadmapProps {
  items?: RoadmapItem[];
  defaultItems?: RoadmapItem[];
  onItemsChange?: (items: RoadmapItem[]) => void;
  view?: RoadmapView;
  defaultView?: RoadmapView;
  onViewChange?: (view: RoadmapView) => void;
  /** Visible statuses (the status filter). Default: all three. */
  statuses?: RoadmapStatus[];
  defaultStatuses?: RoadmapStatus[];
  onStatusesChange?: (statuses: RoadmapStatus[]) => void;
  /** Fires after the optimistic vote toggle. */
  onVote?: (id: string, voted: boolean) => void;
  /** Quarter order for the timeline view; defaults to first-seen order. */
  quarters?: string[];
  className?: string;
}

const STATUSES: RoadmapStatus[] = ["planned", "in-progress", "shipped"];

const STATUS_LABEL: Record<RoadmapStatus, string> = {
  planned: "Planned",
  "in-progress": "In progress",
  shipped: "Shipped",
};

const STATUS_DOT: Record<RoadmapStatus, string> = {
  planned: "bg-chart-2",
  "in-progress": "bg-warning",
  shipped: "bg-success",
};

const STATUS_BADGE: Record<RoadmapStatus, BadgeVariant> = {
  planned: "secondary",
  "in-progress": "warning",
  shipped: "success",
};

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

const byVotes = (a: RoadmapItem, b: RoadmapItem) => b.votes - a.votes;

export function Roadmap({
  items: itemsProp,
  defaultItems = [],
  onItemsChange,
  view: viewProp,
  defaultView = "board",
  onViewChange,
  statuses: statusesProp,
  defaultStatuses = STATUSES,
  onStatusesChange,
  onVote,
  quarters: quartersProp,
  className,
}: RoadmapProps) {
  const uid = useId();
  const reduce = useReducedMotion() ?? false;
  const [items, setItems] = useControllable(itemsProp, defaultItems, onItemsChange);
  const [view, setView] = useControllable(viewProp, defaultView, onViewChange);
  const [statuses, setStatuses] = useControllable(statusesProp, defaultStatuses, onStatusesChange);

  const visible = useMemo(() => items.filter((i) => statuses.includes(i.status)), [items, statuses]);

  const vote = (id: string) => {
    let next = false;
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        next = !item.voted;
        return { ...item, voted: next, votes: item.votes + (next ? 1 : -1) };
      }),
    );
    onVote?.(id, next);
  };

  const quarters = useMemo(() => {
    const seen = quartersProp ? [...quartersProp] : [];
    for (const i of visible) {
      const q = i.quarter ?? "Later";
      if (!seen.includes(q)) seen.push(q);
    }
    return seen.filter((q) => visible.some((i) => (i.quarter ?? "Later") === q));
  }, [visible, quartersProp]);

  const visibleStatuses = STATUSES.filter((s) => statuses.includes(s));

  return (
    <div className={cn("@container flex w-full flex-col gap-4 text-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          aria-label="Filter by status"
          value={statuses}
          onValueChange={(v) => setStatuses(STATUSES.filter((s) => v.includes(s)))}
        >
          {STATUSES.map((s) => (
            <ToggleGroupItem key={s} value={s}>
              <span aria-hidden="true" className={cn("size-2 rounded-full", STATUS_DOT[s])} />
              {STATUS_LABEL[s]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <SegmentedControl
          aria-label="View"
          size="sm"
          value={view}
          onValueChange={(v) => setView(v as RoadmapView)}
          options={[
            { value: "board", label: "Board", icon: <Columns3 aria-hidden="true" /> },
            { value: "timeline", label: "Timeline", icon: <ListTree aria-hidden="true" /> },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState size="sm" bordered title="Nothing to show" description="Turn on a status to see its items." />
      ) : (
        // Cards share a layoutId across views, so switching Board ↔ Timeline
        // flies each card to its new slot instead of re-rendering the list.
        <LayoutGroup id={uid}>
          {view === "board" ? (
            <div
              className={cn(
                "grid gap-3",
                visibleStatuses.length === 3 && "@lg:grid-cols-3",
                visibleStatuses.length === 2 && "@md:grid-cols-2",
              )}
            >
              {visibleStatuses.map((status) => {
                const column = visible.filter((i) => i.status === status).sort(byVotes);
                return (
                  <section
                    key={status}
                    aria-labelledby={`${uid}-${status}`}
                    className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-muted/40 p-2"
                  >
                    <h3
                      id={`${uid}-${status}`}
                      className="flex items-center gap-2 px-1.5 pt-1 text-xs font-medium text-muted-foreground"
                    >
                      <span aria-hidden="true" className={cn("size-2 rounded-full", STATUS_DOT[status])} />
                      {STATUS_LABEL[status]}
                      <span className="ml-auto font-mono tabular-nums">{column.length}</span>
                    </h3>
                    <ul className="flex flex-col gap-2">
                      <AnimatePresence initial={false} mode="popLayout">
                        {column.map((item) => (
                          <RoadmapCard key={item.id} uid={uid} item={item} reduce={reduce} onVote={vote} />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : (
            <ol className="flex flex-col gap-4">
              {quarters.map((quarter, qi) => (
                <li key={quarter} className="relative grid grid-cols-[4.5rem_1fr] gap-3">
                  <div className="relative pt-2 text-right">
                    <span className="font-mono text-xs font-semibold text-foreground">{quarter}</span>
                    {qi < quarters.length - 1 && (
                      <span aria-hidden="true" className="absolute -right-[7px] top-6 -bottom-6 w-px bg-border" />
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute -right-[11px] top-3 size-2 rounded-full bg-foreground/40 ring-4 ring-background"
                    />
                  </div>
                  <ul className="flex flex-col gap-2 pl-2">
                    <AnimatePresence initial={false} mode="popLayout">
                      {visible
                        .filter((i) => (i.quarter ?? "Later") === quarter)
                        .sort(
                          (a, b) => STATUSES.indexOf(b.status) - STATUSES.indexOf(a.status) || byVotes(a, b),
                        )
                        .map((item) => (
                          <RoadmapCard key={item.id} uid={uid} item={item} reduce={reduce} onVote={vote} showStatus />
                        ))}
                    </AnimatePresence>
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </LayoutGroup>
      )}
    </div>
  );
}

function RoadmapCard({
  uid,
  item,
  reduce,
  onVote,
  showStatus,
}: {
  uid: string;
  item: RoadmapItem;
  reduce: boolean;
  onVote: (id: string) => void;
  showStatus?: boolean;
}) {
  return (
    <motion.li
      layoutId={reduce ? undefined : `${uid}-card-${item.id}`}
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={SPRING_LAYOUT}
      className="flex gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
    >
      <div className="min-w-0 flex-1">
        {showStatus && (
          <Badge size="sm" variant={STATUS_BADGE[item.status]} dot className="mb-1.5">
            {STATUS_LABEL[item.status]}
          </Badge>
        )}
        <p className="font-medium leading-snug text-foreground">{item.title}</p>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        )}
        {item.tags?.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <Badge key={tag} size="sm" variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <UpvoteButton count={item.votes} voted={!!item.voted} title={item.title} reduce={reduce} onClick={() => onVote(item.id)} />
    </motion.li>
  );
}

const ROLL: Variants = {
  enter: (d: number) => ({ y: d > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { y: "0%", opacity: 1 },
  exit: (d: number) => ({ y: d > 0 ? "-100%" : "100%", opacity: 0 }),
};
const FADE: Variants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

function UpvoteButton({
  count,
  voted,
  title,
  reduce,
  onClick,
}: {
  count: number;
  voted: boolean;
  title: string;
  reduce: boolean;
  onClick: () => void;
}) {
  // Direction is derived during render from the last seen count (React's
  // "adjust state on prop change" pattern), so rolls go up on +1, down on -1.
  const [last, setLast] = useState(count);
  const [direction, setDirection] = useState(1);
  if (count !== last) {
    setDirection(count > last ? 1 : -1);
    setLast(count);
  }
  const variants = reduce ? FADE : ROLL;

  return (
    <motion.button
      type="button"
      aria-pressed={voted}
      aria-label={`Upvote ${title}, ${count} vote${count === 1 ? "" : "s"}`}
      onClick={onClick}
      whileTap={reduce ? undefined : { scale: 0.9 }}
      transition={SPRING_PRESS}
      className={cn(
        "flex h-12 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-border text-xs font-semibold outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
        voted
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-border-strong hover:bg-muted",
      )}
    >
      <motion.span
        aria-hidden="true"
        animate={voted && !reduce ? { y: [0, -3, 0] } : { y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="flex"
      >
        <ChevronUp className="size-4" />
      </motion.span>
      <span aria-hidden="true" className="relative flex h-4 overflow-hidden font-mono tabular-nums">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.span
            key={count}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={SPRING_SWAP}
          >
            {count}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
