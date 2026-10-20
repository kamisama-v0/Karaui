"use client";

import { cn } from "@/lib/utils";
import type { TableColumn } from "./types";
import { alignText } from "./utils";

/** Placeholder cards for the stacked layout; hidden from assistive tech. */
export function SkeletonCards({
  count,
  fields,
}: {
  count: number;
  fields: number;
}) {
  return (
    <div aria-hidden>
      {Array.from({ length: count }, (_, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cards
        <div key={r} className="border-border/60 border-b px-3 py-3">
          <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-muted" />
          <div className="mt-3 grid gap-2.5">
            {Array.from({ length: fields }, (_, f) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder lines
                key={f}
                className="flex items-center justify-between gap-3"
              >
                <div className="h-2.5 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows<T>({
  count,
  columns,
  selectable,
  rowHeight,
}: {
  count: number;
  columns: TableColumn<T>[];
  selectable: boolean;
  rowHeight: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
        <tr key={r} style={{ height: rowHeight }} className="border-border/60 border-b">
          {selectable ? <td /> : null}
          {columns.map((column) => (
            <td key={column.key} className={cn("px-4", alignText(column.align))}>
              <div
                className={cn(
                  "h-3 animate-pulse rounded-full bg-muted",
                  column.align === "right" ? "ml-auto w-10" : "w-2/3",
                )}
              />
            </td>
          ))}
          <td aria-hidden />
        </tr>
      ))}
    </>
  );
}
