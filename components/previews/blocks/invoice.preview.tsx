"use client";

import { Invoice } from "@/components/motion/invoice";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function InvoicePreview() {
  return (
    <div className="flex w-full justify-center">
      <Invoice
        number="INV-0042"
        issueDate="2026-10-01"
        dueDate="2026-10-15"
        defaultStatus="overdue"
        logo={
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-xl bg-foreground text-sm font-bold text-background"
          >
            k
          </span>
        }
        from={{ name: "Kara Studio", lines: ["100 Example St, Springfield"], email: "billing@example.com" }}
        to={{ name: "Northwind Labs", lines: ["42 Sample Ave, Riverton"], email: "ap@example.org" }}
        items={[
          { id: "design", description: "Design system audit", detail: "12 hours", quantity: 12, unitPrice: 95 },
          { id: "proto", description: "Interactive prototype", quantity: 1, unitPrice: 1400 },
          { id: "support", description: "Support retainer", detail: "October", quantity: 1, unitPrice: 300 },
        ]}
        taxRate={0.08}
        notes="Payment due within 14 days. Thank you for your business."
        onSend={() => wait(900)}
        onMarkPaid={() => wait(800)}
      />
    </div>
  );
}
