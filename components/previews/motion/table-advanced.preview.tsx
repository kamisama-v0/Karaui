"use client";

import { Download } from "lucide-react";
import { useMemo } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/motion/table/data-table";
import { cn } from "@/lib/utils";

type Status = "paid" | "pending" | "refunded" | "failed";

type Order = {
  id: string;
  customer: string;
  email: string;
  status: Status;
  channel: "Web" | "iOS" | "Android" | "POS";
  items: number;
  total: number;
  /** Day of October, kept numeric so the demo has no Date in render. */
  day: number;
};

const FIRST = ["Ava", "Leo", "Mia", "Kai", "Zoe", "Eli", "Noa", "Ren", "Ivy", "Jude"];
const LAST = ["Cole", "Frost", "Vale", "Reyes", "Okafor", "Sato", "Lund", "Marsh", "Bose", "Quinn"];
const STATUSES: Status[] = ["paid", "paid", "pending", "paid", "refunded", "failed"];
const CHANNELS: Order["channel"][] = ["Web", "iOS", "Android", "POS"];
const PRODUCTS = ["Linen shirt", "Canvas tote", "Wool beanie", "Trail socks", "Desk lamp", "Ceramic mug"];

// Deterministic so SSR and client render identical rows.
const ORDERS: Order[] = Array.from({ length: 40 }, (_, i) => {
  const first = FIRST[(i * 3) % FIRST.length];
  const last = LAST[(i * 7 + 2) % LAST.length];
  return {
    id: `#${String(1040 + i)}`,
    customer: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    status: STATUSES[(i * 5) % STATUSES.length],
    channel: CHANNELS[(i * 7) % CHANNELS.length],
    items: 1 + ((i * 11) % 4),
    total: 18 + ((i * 7919) % 46_000) / 100,
    day: 1 + ((i * 13) % 28),
  };
});

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const STATUS_STYLES: Record<Status, string> = {
  paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  refunded: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  failed: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

function OrderDetail({ order }: { order: Order }) {
  const index = Number(order.id.slice(1));
  const lines = Array.from({ length: order.items }, (_, k) => ({
    name: PRODUCTS[(index + k * 5) % PRODUCTS.length],
    qty: 1 + ((index + k) % 2),
  }));
  return (
    <div className="grid gap-3 text-xs sm:grid-cols-[1fr_auto]">
      <ul className="flex flex-col gap-1">
        {lines.map((line) => (
          <li key={line.name} className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[var(--chart-1)]" />
            <span className="text-foreground">{line.name}</span>
            <span className="text-muted-foreground">× {line.qty}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-0.5 text-muted-foreground sm:text-right">
        <span>{order.email}</span>
        <span>
          Placed Oct {order.day} via {order.channel}
        </span>
      </div>
    </div>
  );
}

export function TableAdvancedPreview() {
  const columns = useMemo<DataTableColumn<Order>[]>(
    () => [
      {
        key: "id",
        header: "Order",
        width: "88px",
        sortable: true,
        hideable: false,
        sortValue: (row) => Number(row.id.slice(1)),
        cell: (row) => (
          <span className="font-medium tabular-nums">{row.id}</span>
        ),
      },
      {
        key: "customer",
        header: "Customer",
        sortable: true,
        filter: "text",
      },
      {
        key: "status",
        header: "Status",
        width: "112px",
        sortable: true,
        filter: "select",
        filterOptions: ["paid", "pending", "refunded", "failed"],
        cell: (row) => (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-medium text-xs capitalize",
              STATUS_STYLES[row.status],
            )}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: "channel",
        header: "Channel",
        width: "104px",
        sortable: true,
        filter: "select",
      },
      {
        key: "day",
        header: "Date",
        width: "88px",
        sortable: true,
        filterValue: (row) => `Oct ${row.day}`,
        cell: (row) => (
          <span className="text-muted-foreground tabular-nums">
            Oct {row.day}
          </span>
        ),
      },
      {
        key: "total",
        header: "Total",
        width: "100px",
        align: "right",
        sortable: true,
        cell: (row) => (
          <span className="tabular-nums">{money.format(row.total)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex w-full justify-center p-4">
      <DataTable
        data={ORDERS}
        columns={columns}
        getRowId={(row) => row.id}
        getRowLabel={(row) => `order ${row.id}`}
        selectable
        defaultSort={[{ key: "total", direction: "desc" }]}
        defaultHiddenColumns={["day"]}
        renderExpanded={(row) => <OrderDetail order={row} />}
        selectionActions={() => (
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 font-medium text-xs transition-colors hover:bg-primary-foreground/15"
          >
            <Download className="size-3.5" />
            Export
          </button>
        )}
        pageSize={5}
        searchPlaceholder="Search orders…"
        className="max-w-[620px]"
      />
    </div>
  );
}
