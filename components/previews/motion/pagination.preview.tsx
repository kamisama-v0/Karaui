"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Pagination } from "@/components/motion/pagination";
import { EASE_OUT } from "@/lib/ease";

const PAGE_SIZE = 4;
const STATUSES = ["Paid", "Pending", "Refunded"] as const;
// Deterministic rows so server and client render the same table.
const INVOICES = Array.from({ length: 80 }, (_, i) => ({
  id: `INV-${(1040 + i).toString()}`,
  customer: ["Acme Co.", "Globex", "Initech", "Umbrella", "Hooli", "Stark Ind."][i % 6],
  amount: `$${(((i * 7919) % 900) + 120).toLocaleString("en-US")}.00`,
  status: STATUSES[(i * 5) % 3],
}));
const TOTAL = Math.ceil(INVOICES.length / PAGE_SIZE);

export function PaginationPreview() {
  const reduce = useReducedMotion() ?? false;
  const [page, setPage] = useState(1);
  const rows = INVOICES.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-10">
      <div className="flex w-full flex-col gap-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[1fr_1.2fr_1fr_auto] gap-3 border-b border-border px-4 py-2 text-xs text-muted-foreground">
            <span>Invoice</span>
            <span>Customer</span>
            <span className="text-right">Amount</span>
            <span className="w-16 text-right">Status</span>
          </div>
          <div className="relative h-[164px]">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.ul
                key={page}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="absolute inset-0"
              >
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="grid grid-cols-[1fr_1.2fr_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-2.5 text-sm last:border-b-0"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.id}
                    </span>
                    <span className="truncate text-foreground">{row.customer}</span>
                    <span className="text-right tabular-nums text-foreground">
                      {row.amount}
                    </span>
                    <span className="w-16 text-right text-xs text-muted-foreground">
                      {row.status}
                    </span>
                  </li>
                ))}
              </motion.ul>
            </AnimatePresence>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {TOTAL}
          </span>
          <Pagination
            total={TOTAL}
            page={page}
            onPageChange={setPage}
            aria-label="Invoice pages"
          />
        </div>
      </div>
      <Pagination
        variant="dots"
        total={12}
        defaultPage={3}
        aria-label="Gallery pages"
      />
    </div>
  );
}
