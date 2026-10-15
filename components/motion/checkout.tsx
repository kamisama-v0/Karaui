"use client";

import { Lock, Minus, Plus, Tag, Truck, Zap } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import { type ReactNode, useCallback, useId, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/motion/badge";
import { Button, StatefulButton } from "@/components/motion/button";
import { Input } from "@/components/motion/input";
import { NumberTicker } from "@/components/motion/number-ticker";
import {
  Stepper,
  StepperIndicator,
  StepperNext,
  StepperPanels,
  StepperPrevious,
  type StepperStep,
  useStepper,
} from "@/components/motion/stepper";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type CheckoutItem = {
  id: string;
  name: string;
  /** Secondary line — size, color, plan. */
  variant?: string;
  /** Unit price in major units (12.5 = $12.50). */
  price: number;
  quantity: number;
  /** Thumbnail node; defaults to a tinted swatch. */
  image?: ReactNode;
};

export type CheckoutPromo = {
  code: string;
  label: string;
  /** Percentage off the subtotal (0–100). */
  percentOff?: number;
  /** Fixed amount off, in major units. */
  amountOff?: number;
};

export type CheckoutShipping = {
  name: string;
  address: string;
  city: string;
  zip: string;
};

export type CheckoutDelivery = "standard" | "express";

export type CheckoutTotals = {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
};

export type CheckoutOrder = {
  items: CheckoutItem[];
  shipping: CheckoutShipping;
  delivery: CheckoutDelivery;
  promo: CheckoutPromo | null;
  totals: CheckoutTotals;
};

export interface CheckoutProps {
  items?: CheckoutItem[];
  defaultItems?: CheckoutItem[];
  onItemsChange?: (items: CheckoutItem[]) => void;
  /** Known codes (case-insensitive) when `onApplyPromo` isn't given. */
  promoCodes?: CheckoutPromo[];
  /** Async promo check. Resolve with the promo, reject to mark the code invalid. */
  onApplyPromo?: (code: string) => Promise<CheckoutPromo>;
  /**
   * Places the order. Card fields are UI only and never included — wire a
   * payment provider's hosted fields for real card entry. Resolve with an
   * order reference to show it; reject to show the message on the review step.
   */
  onComplete?: (order: CheckoutOrder) => Promise<string | undefined> | string | undefined;
  /** Sales tax rate (0.08 = 8%). Default 0.08. */
  taxRate?: number;
  /** Express delivery price in major units. Default 15. */
  expressPrice?: number;
  currency?: string;
  locale?: string;
  className?: string;
}

const STEPS: StepperStep[] = [
  { id: "shipping", title: "Shipping" },
  { id: "payment", title: "Payment" },
  { id: "review", title: "Review" },
];

const SWATCHES = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
const SHAKE = { x: [0, -6, 6, -4, 4, -2, 0] };
const EMPTY_SHIPPING: CheckoutShipping = { name: "", address: "", city: "", zip: "" };

const cents = (major: number) => Math.round(major * 100);

function digits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function messageOf(reason: unknown, fallback: string) {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason) return reason;
  return fallback;
}

/** Money that rolls when it changes. Values are cents so decimals survive `NumberTicker`'s rounding. */
function Money({
  value,
  format,
  className,
}: {
  value: number;
  format: (cents: number) => string;
  className?: string;
}) {
  return (
    <NumberTicker
      value={value}
      format={format}
      startOnView={false}
      duration={0.5}
      stagger={0.015}
      className={cn("tabular-nums", className)}
    />
  );
}

/**
 * Compact quantity control. `NumberStepper`'s 48px editable field is too big
 * for a summary line, so this keeps two pressable buttons around a rolling
 * digit and exposes the same spinbutton semantics.
 */
function Quantity({
  value,
  onChange,
  label,
  min = 1,
  max = 9,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  min?: number;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const button = (dir: -1 | 1) => {
    const Icon = dir < 0 ? Minus : Plus;
    const blocked = dir < 0 ? value <= min : value >= max;
    return (
      <motion.button
        type="button"
        aria-label={`${dir < 0 ? "Decrease" : "Increase"} ${label}`}
        disabled={blocked}
        whileTap={reduce || blocked ? undefined : { scale: 0.85 }}
        transition={SPRING_PRESS}
        onClick={() => onChange(value + dir)}
        className="grid size-6 place-items-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:text-muted-foreground/50 disabled:hover:bg-transparent"
      >
        <Icon className="size-3" aria-hidden />
      </motion.button>
    );
  };
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5">
      {button(-1)}
      <span
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" && value < max) {
            event.preventDefault();
            onChange(value + 1);
          } else if (event.key === "ArrowDown" && value > min) {
            event.preventDefault();
            onChange(value - 1);
          }
        }}
        className="min-w-4 rounded text-center text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <NumberTicker value={value} startOnView={false} duration={0.35} stagger={0} />
      </span>
      {button(1)}
    </div>
  );
}

/** Finish button that shows the total and the stepper's pending state. */
function PlaceOrder({ label }: { label: string }) {
  const { isLast, pending } = useStepper();
  return (
    <StepperNext finishLabel={pending && isLast ? "Placing order…" : label} size="md">
      Continue
    </StepperNext>
  );
}

/**
 * Checkout block: `Stepper`-driven Shipping → Payment → Review with guarded
 * steps that shake when incomplete, an order summary with compact quantity
 * controls, a promo field that shakes on an invalid code and pops a removable
 * `Badge` on a valid one, and totals that roll through `NumberTicker`. Card
 * inputs are display-only placeholders and are never passed to `onComplete`.
 */
export function Checkout({
  items: itemsProp,
  defaultItems = [],
  onItemsChange,
  promoCodes = [],
  onApplyPromo,
  onComplete,
  taxRate = 0.08,
  expressPrice = 15,
  currency = "USD",
  locale = "en-US",
  className,
}: CheckoutProps) {
  const reduce = useReducedMotion();
  const baseId = useId();

  const [internalItems, setInternalItems] = useState(defaultItems);
  const items = itemsProp ?? internalItems;
  const setQuantity = (id: string, quantity: number) => {
    const next = items.map((item) => (item.id === id ? { ...item, quantity } : item));
    if (itemsProp === undefined) setInternalItems(next);
    onItemsChange?.(next);
  };

  const [shipping, setShipping] = useState<CheckoutShipping>(EMPTY_SHIPPING);
  const [delivery, setDelivery] = useState<CheckoutDelivery>("standard");
  // UI-only card fields: local state, never leaves this component.
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "" });
  const [touched, setTouched] = useState<{ shipping?: boolean; payment?: boolean }>({});

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<CheckoutPromo | null>(null);
  const [promoState, setPromoState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [promoError, setPromoError] = useState<string>();
  const promoRef = useRef<HTMLFormElement>(null);

  const [placed, setPlaced] = useState<{ reference?: string } | null>(null);
  const [orderError, setOrderError] = useState<string>();

  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency }),
    [locale, currency],
  );
  const format = useCallback((c: number) => formatter.format(c / 100), [formatter]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + cents(item.price) * item.quantity, 0);
    const discount = promo
      ? Math.min(
          subtotal,
          promo.percentOff
            ? Math.round((subtotal * promo.percentOff) / 100)
            : cents(promo.amountOff ?? 0),
        )
      : 0;
    const ship = delivery === "express" ? cents(expressPrice) : 0;
    const tax = Math.round((subtotal - discount) * taxRate);
    return { subtotal, discount, shipping: ship, tax, total: subtotal - discount + ship + tax };
  }, [items, promo, delivery, expressPrice, taxRate]);

  const shippingErrors = {
    name: shipping.name.trim() ? undefined : "Required",
    address: shipping.address.trim() ? undefined : "Required",
    city: shipping.city.trim() ? undefined : "Required",
    zip: /^[A-Za-z0-9 -]{3,10}$/.test(shipping.zip.trim()) ? undefined : "Invalid",
  };
  const [mm, yy] = card.expiry.split("/");
  const paymentErrors = {
    number: digits(card.number, 16).length === 16 ? undefined : "Enter 16 digits",
    expiry:
      Number(mm) >= 1 && Number(mm) <= 12 && (yy ?? "").length === 2 ? undefined : "MM/YY",
    cvc: /^\d{3,4}$/.test(card.cvc) ? undefined : "3–4 digits",
  };
  const hasErrors = (errors: Record<string, string | undefined>) =>
    Object.values(errors).some(Boolean);

  const canAdvance = (index: number) => {
    if (index === 0) {
      setTouched((t) => ({ ...t, shipping: true }));
      return !hasErrors(shippingErrors);
    }
    if (index === 1) {
      setTouched((t) => ({ ...t, payment: true }));
      return !hasErrors(paymentErrors);
    }
    return items.length > 0;
  };

  const complete = async () => {
    setOrderError(undefined);
    try {
      const reference = await onComplete?.({
        items,
        shipping,
        delivery,
        promo,
        totals: {
          subtotal: totals.subtotal / 100,
          discount: totals.discount / 100,
          shipping: totals.shipping / 100,
          tax: totals.tax / 100,
          total: totals.total / 100,
        },
      });
      setPlaced({ reference: reference ?? undefined });
    } catch (reason) {
      setOrderError(messageOf(reason, "Payment didn't go through. Try again."));
    }
  };

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoState("loading");
    setPromoError(undefined);
    try {
      let result: CheckoutPromo | undefined;
      if (onApplyPromo) result = await onApplyPromo(code);
      else result = promoCodes.find((p) => p.code.toLowerCase() === code.toLowerCase());
      if (!result) throw new Error("That code isn't valid.");
      setPromo(result);
      setPromoInput("");
      setPromoState("idle");
    } catch (reason) {
      setPromoState("idle");
      setPromoError(messageOf(reason, "That code isn't valid."));
      if (!reduce && promoRef.current) {
        animate(promoRef.current, SHAKE, { duration: 0.42, ease: EASE_OUT });
      }
    }
  };

  const fieldError = (show: boolean | undefined, error: string | undefined) =>
    show ? error : undefined;

  const shippingPanel = (
    <div className="flex flex-col gap-2.5">
      <Input
        aria-label="Full name"
        placeholder="Full name"
        autoComplete="name"
        value={shipping.name}
        onChange={(name) => setShipping((s) => ({ ...s, name }))}
        error={fieldError(touched.shipping, shippingErrors.name) && true}
      />
      <Input
        aria-label="Street address"
        placeholder="Street address"
        autoComplete="street-address"
        value={shipping.address}
        onChange={(address) => setShipping((s) => ({ ...s, address }))}
        error={fieldError(touched.shipping, shippingErrors.address) && true}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2.5">
        <Input
          aria-label="City"
          placeholder="City"
          autoComplete="address-level2"
          value={shipping.city}
          onChange={(city) => setShipping((s) => ({ ...s, city }))}
          error={fieldError(touched.shipping, shippingErrors.city) && true}
        />
        <Input
          aria-label="Postal code"
          placeholder="ZIP"
          autoComplete="postal-code"
          value={shipping.zip}
          onChange={(zip) => setShipping((s) => ({ ...s, zip }))}
          error={fieldError(touched.shipping, shippingErrors.zip) && true}
        />
      </div>
      <fieldset className="m-0 grid grid-cols-2 gap-2.5 border-0 p-0">
        <legend className="sr-only">Delivery speed</legend>
        {(
          [
            { id: "standard", label: "Standard", note: "Free · 5–7 days", icon: Truck },
            {
              id: "express",
              label: "Express",
              note: `${format(cents(expressPrice))} · 1–2 days`,
              icon: Zap,
            },
          ] as const
        ).map((option) => {
          const active = delivery === option.id;
          const Icon = option.icon;
          return (
            <label
              key={option.id}
              className={cn(
                "relative flex cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-2 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                active ? "border-foreground/40" : "border-border hover:border-border-strong",
              )}
            >
              <input
                type="radio"
                name={`${baseId}-delivery`}
                value={option.id}
                checked={active}
                onChange={() => setDelivery(option.id)}
                className="sr-only"
              />
              {active ? (
                <motion.span
                  layoutId={`${baseId}-delivery-pill`}
                  transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                  className="absolute inset-0 rounded-2xl bg-muted"
                  aria-hidden
                />
              ) : null}
              <Icon className="relative size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="relative min-w-0">
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {option.note}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </div>
  );

  const paymentPanel = (
    <div className="flex flex-col gap-2.5">
      {/* Placeholders only: autocomplete is off so no saved card is ever
          offered, and these values never leave the component. */}
      <Input
        aria-label="Card number"
        placeholder="1234 1234 1234 1234"
        inputMode="numeric"
        autoComplete="off"
        leftIcon={<Lock />}
        value={digits(card.number, 16).replace(/(\d{4})(?=\d)/g, "$1 ")}
        onChange={(number) => setCard((c) => ({ ...c, number: digits(number, 16) }))}
        error={fieldError(touched.payment, paymentErrors.number) && true}
      />
      <div className="grid grid-cols-2 gap-2.5">
        <Input
          aria-label="Expiry (MM/YY)"
          placeholder="MM / YY"
          inputMode="numeric"
          autoComplete="off"
          value={card.expiry}
          onChange={(next) => {
            const d = digits(next, 4);
            setCard((c) => ({ ...c, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d }));
          }}
          error={fieldError(touched.payment, paymentErrors.expiry) && true}
        />
        <Input
          aria-label="Security code"
          placeholder="CVC"
          inputMode="numeric"
          autoComplete="off"
          value={card.cvc}
          onChange={(cvc) => setCard((c) => ({ ...c, cvc: digits(cvc, 4) }))}
          error={fieldError(touched.payment, paymentErrors.cvc) && true}
        />
      </div>
      <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <Lock className="size-3" aria-hidden />
        Demo fields — no card data is stored or sent.
      </p>
    </div>
  );

  const reviewRow = (label: string, value: ReactNode, step: number) => (
    <ReviewRow label={label} step={step}>
      {value}
    </ReviewRow>
  );

  const reviewPanel = (
    <div className="flex flex-col gap-2">
      {reviewRow(
        "Ship to",
        <>
          {shipping.name}, {shipping.address}, {shipping.city} {shipping.zip}
        </>,
        0,
      )}
      {reviewRow(
        "Delivery",
        delivery === "express" ? "Express · 1–2 days" : "Standard · 5–7 days",
        0,
      )}
      {reviewRow("Payment", `Card ending ${digits(card.number, 16).slice(-4)}`, 1)}
      <AnimatePresence initial={false}>
        {orderError ? (
          <motion.p
            role="alert"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {orderError}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );

  const summary = (
    <aside
      aria-label="Order summary"
      className="flex flex-col gap-3 rounded-2xl bg-muted/50 p-3.5"
    >
      <p className="text-sm font-semibold text-foreground">Order summary</p>
      <ul className="flex flex-col gap-2.5">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2.5">
            {item.image ?? (
              <span
                aria-hidden
                className={cn(
                  "size-9 shrink-0 rounded-xl opacity-80",
                  SWATCHES[index % SWATCHES.length],
                )}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {item.name}
                {item.variant ? (
                  <span className="font-normal text-muted-foreground"> · {item.variant}</span>
                ) : null}
              </p>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                {placed ? (
                  <span className="text-xs text-muted-foreground">Qty {item.quantity}</span>
                ) : (
                  <Quantity
                    label={`${item.name} quantity`}
                    value={item.quantity}
                    onChange={(q) => setQuantity(item.id, q)}
                  />
                )}
                <Money
                  value={cents(item.price) * item.quantity}
                  format={format}
                  className="text-xs text-foreground"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="h-px bg-border" aria-hidden />

      <AnimatePresence mode="popLayout" initial={false}>
        {promo ? (
          <motion.div
            key="applied"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.9, transition: { duration: 0.12 } }}
            transition={reduce ? { duration: 0.15 } : SPRING_SWAP}
            className="flex items-center justify-between gap-2"
          >
            <Badge
              variant="success"
              icon={<Tag />}
              onRemove={placed ? undefined : () => setPromo(null)}
              removeLabel={`Remove code ${promo.code}`}
            >
              {promo.code.toUpperCase()}
            </Badge>
            <span className="truncate text-xs text-muted-foreground">{promo.label}</span>
          </motion.div>
        ) : placed ? null : (
          <motion.form
            key="field"
            ref={promoRef}
            noValidate
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            onSubmit={(event) => {
              event.preventDefault();
              void applyPromo();
            }}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center gap-2">
              <Input
                aria-label="Promo code"
                placeholder="Promo code"
                autoComplete="off"
                value={promoInput}
                onChange={(next) => {
                  setPromoInput(next);
                  setPromoError(undefined);
                }}
                error={Boolean(promoError)}
                className="min-w-0 flex-1"
                classNames={{ field: "h-9" }}
              />
              <StatefulButton
                type="submit"
                size="sm"
                variant="secondary"
                state={promoState}
                loadingText="…"
                disabled={!promoInput.trim()}
              >
                Apply
              </StatefulButton>
            </div>
            <AnimatePresence initial={false}>
              {promoError ? (
                <motion.p
                  role="alert"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-1 text-xs text-destructive"
                >
                  {promoError}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>

      <dl className="flex flex-col gap-1.5 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <dt>Subtotal</dt>
          <dd>
            <Money value={totals.subtotal} format={format} className="text-foreground" />
          </dd>
        </div>
        <AnimatePresence initial={false}>
          {totals.discount > 0 ? (
            <motion.div
              key="discount"
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="flex justify-between text-muted-foreground"
            >
              <dt>Discount</dt>
              <dd className="text-success">
                −<Money value={totals.discount} format={format} />
              </dd>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="flex justify-between text-muted-foreground">
          <dt>Shipping</dt>
          <dd className="text-foreground">
            {totals.shipping === 0 ? "Free" : <Money value={totals.shipping} format={format} />}
          </dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Tax</dt>
          <dd>
            <Money value={totals.tax} format={format} className="text-foreground" />
          </dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2.5">
          <dt className="text-sm font-medium text-foreground">Total</dt>
          <dd>
            <Money
              value={totals.total}
              format={format}
              className="text-base font-semibold text-foreground"
            />
          </dd>
        </div>
      </dl>
    </aside>
  );

  return (
    <div className={cn("@container w-full", className)}>
      <div className="grid gap-4 rounded-3xl border border-border bg-card p-4 @xl:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            {placed ? (
              <motion.div
                key="placed"
                role="status"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="flex h-full min-h-72 flex-col items-center justify-center gap-3 text-center"
              >
                <motion.span
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={reduce ? { duration: 0.2 } : { ...SPRING_SWAP, delay: 0.08 }}
                  className="grid size-14 place-items-center rounded-full bg-success/15 text-success"
                >
                  <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden="true">
                    <motion.path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="currentColor"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: reduce ? 1 : 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.2, ease: EASE_OUT }}
                    />
                  </svg>
                </motion.span>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Order placed
                </h2>
                <p className="max-w-xs text-sm text-muted-foreground">
                  {placed.reference ? (
                    <>
                      Order <span className="font-medium text-foreground">{placed.reference}</span>{" "}
                      is confirmed.{" "}
                    </>
                  ) : null}
                  A receipt is on its way to you, {shipping.name.split(" ")[0]}.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="steps"
                exit={{ opacity: 0, transition: { duration: 0.14 } }}
              >
                <Stepper steps={STEPS} canAdvance={canAdvance} onComplete={complete} className="gap-4">
                  <StepperIndicator showTitles />
                  <StepperPanels>
                    {shippingPanel}
                    {paymentPanel}
                    {reviewPanel}
                  </StepperPanels>
                  <div className="flex items-center justify-between">
                    <StepperPrevious size="md" />
                    <PlaceOrder label={`Pay ${format(totals.total)}`} />
                  </div>
                </Stepper>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {summary}
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  step,
  children,
}: {
  label: string;
  step: number;
  children: ReactNode;
}) {
  const { goTo } = useStepper();
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{children}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={`Edit ${label.toLowerCase()}`}
        onClick={() => void goTo(step)}
      >
        Edit
      </Button>
    </div>
  );
}
