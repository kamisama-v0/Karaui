"use client";

import {
  type ReactNode,
  type RefObject,
  useId,
  useLayoutEffect,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import type { SortState, TableColumn } from "./types";

/*
 * Shared pieces of the stacked ("card list") layout both tables switch to in a
 * narrow container (`mobileLayout="stack"`).
 */

/** Container width (px) below which `mobileLayout="stack"` shows cards. */
export const DEFAULT_STACK_BELOW = 560;

/**
 * True once the element measures narrower than `stackBelow`. Starts false, so
 * the server and the hydrating client both render the table, then switches in
 * a layout effect (before the first paint after hydration) and follows the
 * element's width from there. The element must not size to its content, or the
 * swap could feed back into the measurement — both tables measure their
 * full-width root.
 */
export function useStackedLayout(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  stackBelow: number,
) {
  const [stacked, setStacked] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) {
      setStacked(false);
      return;
    }
    const update = (width: number) => setStacked(width < stackBelow);
    update(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) update(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled, stackBelow]);
  return enabled && stacked;
}

/** Plain-text name of a column, for option labels and announcements. */
export function columnLabel<T>(column: TableColumn<T>) {
  return typeof column.header === "string" ? column.header : column.key;
}

/**
 * Splits visible columns into the card title (`primary` columns, or the first
 * column when none opts in) and the label/value fields under it, leaving out
 * `hideOnMobile` columns. A primary column is always shown.
 */
export function splitStackColumns<C extends TableColumn<never>>(columns: C[]) {
  const flagged = columns.filter((c) => c.primary);
  const primary = flagged.length > 0 ? flagged : columns.slice(0, 1);
  const titleKeys = new Set(primary.map((c) => c.key));
  const fields = columns.filter((c) => !titleKeys.has(c.key) && !c.hideOnMobile);
  return { primary, fields };
}

/** Rough card height before measurement: title row + one line per field. */
export function estimateCardHeight(fieldCount: number) {
  return 56 + fieldCount * 28;
}

export type StackedField = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  /** The value is an input: let it take the full width instead of hugging the right edge. */
  control?: boolean;
};

/**
 * A card's label/value pairs as a description list, so each value is read
 * with its column header.
 */
export function StackedFields({
  fields,
  className,
}: {
  fields: StackedField[];
  className?: string;
}) {
  if (fields.length === 0) return null;
  return (
    <dl className={cn("grid gap-1.5", className)}>
      {fields.map((field) => (
        <div key={field.key} className="flex min-w-0 items-center gap-3">
          <dt className="w-2/5 max-w-40 shrink-0 truncate text-muted-foreground text-xs">
            {field.label}
          </dt>
          <dd
            className={cn(
              "min-w-0 flex-1 text-foreground",
              field.control ? "pl-2" : "truncate text-right",
            )}
          >
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const SORT_NONE = "";

/**
 * Compact sort control shown above the cards, where there are no headers to
 * click: one native select of "column, direction" pairs.
 */
export function StackSortSelect<T>({
  columns,
  value,
  onChange,
  className,
}: {
  columns: TableColumn<T>[];
  value: SortState | null;
  onChange: (next: SortState | null) => void;
  className?: string;
}) {
  const id = useId();
  const sortable = columns.filter((c) => c.sortable);
  if (sortable.length === 0) return null;
  const current =
    value && sortable.some((c) => c.key === value.key)
      ? `${value.direction}:${value.key}`
      : SORT_NONE;
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <label htmlFor={id} className="shrink-0 text-muted-foreground text-xs">
        Sort by
      </label>
      <select
        id={id}
        value={current}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === SORT_NONE) return onChange(null);
          const split = raw.indexOf(":");
          onChange({
            direction: raw.slice(0, split) === "desc" ? "desc" : "asc",
            key: raw.slice(split + 1),
          });
        }}
        className="h-8 min-w-0 max-w-full rounded-lg border border-border bg-background px-2 text-foreground text-sm outline-none transition-colors focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <option value={SORT_NONE}>None</option>
        {sortable.map((column) => {
          const label = columnLabel(column);
          return [
            <option key={`asc:${column.key}`} value={`asc:${column.key}`}>
              {label} (ascending)
            </option>,
            <option key={`desc:${column.key}`} value={`desc:${column.key}`}>
              {label} (descending)
            </option>,
          ];
        })}
      </select>
    </div>
  );
}
