"use client";

import { Download, Send } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import { Badge } from "@/components/motion/badge";
import { Button, StatefulButton } from "@/components/motion/button";
import { NumberTicker } from "@/components/motion/number-ticker";
import { EASE_OUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type InvoiceStatus = "paid" | "due" | "overdue";

export type InvoiceParty = {
  name: string;
  /** Address lines, one per row. */
  lines?: string[];
  email?: string;
};

export type InvoiceLineItem = {
  id: string;
  description: string;
  detail?: string;
  quantity: number;
  /** Unit price in major units. */
  unitPrice: number;
};

export interface InvoiceProps {
  number: string;
  /** ISO date (YYYY-MM-DD), formatted in UTC so server and client agree. */
  issueDate: string;
  dueDate: string;
  from: InvoiceParty;
  to: InvoiceParty;
  items: InvoiceLineItem[];
  /** 0.1 = 10%. Default 0. */
  taxRate?: number;
  currency?: string;
  locale?: string;
  notes?: ReactNode;
  /** Brand mark shown beside the title. */
  logo?: ReactNode;
  status?: InvoiceStatus;
  defaultStatus?: InvoiceStatus;
  onStatusChange?: (status: InvoiceStatus) => void;
  /** Defaults to `window.print()` — the layout carries `print:` styles. */
  onDownload?: () => void;
  /** Return a promise to drive the Send button's pending/sent/error states. */
  onSend?: () => void | Promise<void>;
  /** Resolve to flip the status to Paid (stamp + amount due rolls to zero). */
  onMarkPaid?: () => void | Promise<void>;
  className?: string;
}

type ButtonState = "idle" | "loading" | "success" | "error";

const STATUS: Record<
  InvoiceStatus,
  { label: string; variant: "success" | "warning" | "destructive"; dot: true | "pulse" }
> = {
  paid: { label: "Paid", variant: "success", dot: true },
  due: { label: "Due", variant: "warning", dot: true },
  overdue: { label: "Overdue", variant: "destructive", dot: "pulse" },
};

const cents = (major: number) => Math.round(major * 100);

function Party({ title, party }: { title: string; party: InvoiceParty }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase print:text-neutral-500">
        {title}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-foreground print:text-black">
        {party.name}
      </p>
      {party.lines?.map((line) => (
        <p key={line} className="truncate text-xs text-muted-foreground print:text-neutral-600">
          {line}
        </p>
      ))}
      {party.email ? (
        <p className="truncate text-xs text-muted-foreground print:text-neutral-600">
          {party.email}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Printable invoice: header with number, dates and an animated status badge
 * (Paid / Due / Overdue), bill-from / bill-to, a line-item table, subtotal /
 * tax / total, and actions — Download (prints by default), Send and Mark as
 * paid, which stamps the sheet and rolls the amount due to zero. `print:`
 * variants drop the actions and card chrome and force ink-friendly colors.
 */
export function Invoice({
  number,
  issueDate,
  dueDate,
  from,
  to,
  items,
  taxRate = 0,
  currency = "USD",
  locale = "en-US",
  notes,
  logo,
  status: statusProp,
  defaultStatus = "due",
  onStatusChange,
  onDownload,
  onSend,
  onMarkPaid,
  className,
}: InvoiceProps) {
  const reduce = useReducedMotion();
  const [internalStatus, setInternalStatus] = useState(defaultStatus);
  const status = statusProp ?? internalStatus;
  const [sendState, setSendState] = useState<ButtonState>("idle");
  const [payState, setPayState] = useState<ButtonState>("idle");

  const money = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency }),
    [locale, currency],
  );
  const format = (c: number) => money.format(c / 100);
  const date = useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    return (iso: string) => {
      const [y, m, d] = iso.split("-").map(Number);
      return f.format(new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)));
    };
  }, [locale]);

  const subtotal = items.reduce((sum, item) => sum + cents(item.unitPrice) * item.quantity, 0);
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;
  const due = status === "paid" ? 0 : total;

  const send = async () => {
    setSendState("loading");
    try {
      await onSend?.();
      setSendState("success");
    } catch {
      setSendState("error");
    }
  };

  const markPaid = async () => {
    setPayState("loading");
    try {
      await onMarkPaid?.();
      setPayState("success");
      if (statusProp === undefined) setInternalStatus("paid");
      onStatusChange?.("paid");
    } catch {
      setPayState("error");
    }
  };

  const meta = STATUS[status];

  return (
    <article
      aria-label={`Invoice ${number}`}
      className={cn(
        "relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card p-5 text-foreground",
        "print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black",
        className,
      )}
    >
      {/* Paid stamp. Rotation is a static CSS transform on the wrapper; the
          motion child only scales and fades, so nothing fights over it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-16 right-8 -rotate-12 print:top-20"
      >
        <AnimatePresence initial={false}>
          {status === "paid" ? (
            <motion.span
              key="stamp"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={reduce ? { duration: 0.2 } : SPRING_SWAP}
              className="block rounded-lg border-2 border-success/70 px-3 py-0.5 text-lg font-black tracking-[0.2em] text-success/80"
            >
              PAID
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {logo ? <span className="shrink-0">{logo}</span> : null}
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Invoice {number}</h2>
            <p className="text-xs text-muted-foreground print:text-neutral-600">
              Issued {date(issueDate)} · Due {date(dueDate)}
            </p>
          </div>
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={status}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.8, transition: { duration: 0.12 } }}
            transition={reduce ? { duration: 0.15 } : SPRING_SWAP}
          >
            <Badge variant={meta.variant} dot={meta.dot}>
              {meta.label}
            </Badge>
          </motion.span>
        </AnimatePresence>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Party title="From" party={from} />
        <Party title="Bill to" party={to} />
      </div>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] tracking-wide text-muted-foreground uppercase print:border-neutral-300 print:text-neutral-500">
            <th scope="col" className="py-2 font-medium">
              Description
            </th>
            <th scope="col" className="w-12 py-2 text-right font-medium">
              Qty
            </th>
            <th scope="col" className="w-24 py-2 text-right font-medium">
              Price
            </th>
            <th scope="col" className="w-24 py-2 text-right font-medium">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <motion.tr
              key={item.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.04 * index, ease: EASE_OUT }}
              className="border-b border-border print:break-inside-avoid print:border-neutral-200"
            >
              <td className="py-2 pr-2">
                <span className="block font-medium">{item.description}</span>
                {item.detail ? (
                  <span className="block text-xs text-muted-foreground print:text-neutral-600">
                    {item.detail}
                  </span>
                ) : null}
              </td>
              <td className="py-2 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums">{format(cents(item.unitPrice))}</td>
              <td className="py-2 text-right font-medium tabular-nums">
                {format(cents(item.unitPrice) * item.quantity)}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-56 text-xs text-muted-foreground print:text-neutral-600">
          {notes}
        </div>
        <dl className="grid w-52 grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted-foreground print:text-neutral-600">Subtotal</dt>
          <dd className="text-right tabular-nums">{format(subtotal)}</dd>
          {taxRate > 0 ? (
            <>
              <dt className="text-muted-foreground print:text-neutral-600">
                Tax ({Math.round(taxRate * 1000) / 10}%)
              </dt>
              <dd className="text-right tabular-nums">{format(tax)}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground print:text-neutral-600">Total</dt>
          <dd className="text-right tabular-nums">{format(total)}</dd>
          <dt className="mt-1 border-t border-border pt-1.5 text-sm font-medium print:border-neutral-300">
            Amount due
          </dt>
          <dd className="mt-1 border-t border-border pt-1.5 text-right text-sm font-semibold print:border-neutral-300">
            <NumberTicker
              value={due}
              format={format}
              startOnView={false}
              duration={0.6}
              stagger={0.02}
            />
          </dd>
        </dl>
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4 print:hidden">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => (onDownload ? onDownload() : window.print())}
        >
          <Download className="size-3.5" aria-hidden />
          Download
        </Button>
        <StatefulButton
          size="sm"
          variant="secondary"
          state={sendState}
          icon={<Send className="size-3.5" aria-hidden />}
          loadingText="Sending"
          successText="Sent"
          errorText="Retry"
          onClick={() => void send()}
        >
          Send
        </StatefulButton>
        <StatefulButton
          size="sm"
          state={status === "paid" && payState === "idle" ? "success" : payState}
          loadingText="Recording"
          successText="Paid"
          errorText="Retry"
          disabled={status === "paid"}
          onClick={() => void markPaid()}
        >
          Mark as paid
        </StatefulButton>
      </footer>
    </article>
  );
}
