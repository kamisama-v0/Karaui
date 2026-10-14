"use client";

import { Check, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import { type ReactNode, useCallback, useId, useMemo, useState } from "react";
import { Button } from "@/components/motion/button";
import { NumberTicker } from "@/components/motion/number-ticker";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type PricingBilling = "monthly" | "yearly";

export interface PricingFeature {
  label: ReactNode;
  /** Default true. False renders a muted X row. */
  included?: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  /** Price per month for each billing period (yearly = monthly equivalent). */
  price: { monthly: number; yearly: number };
  features: PricingFeature[];
  /** Highlights the plan with a ring and a badge. */
  popular?: boolean;
  /** CTA label. Default "Get started". */
  cta?: string;
}

export interface PricingTableProps {
  plans: PricingPlan[];
  /** Controlled billing period. */
  billing?: PricingBilling;
  /** Uncontrolled initial billing period. Default "monthly". */
  defaultBilling?: PricingBilling;
  onBillingChange?: (billing: PricingBilling) => void;
  /** Fires with the plan and current billing period when a CTA is pressed. */
  onSelect?: (plan: PricingPlan, billing: PricingBilling) => void;
  /** ISO 4217 currency code. Default "USD". */
  currency?: string;
  /** Formatting locale. Default "en-US" so server and client agree. */
  locale?: string;
  /** Badge beside the yearly option. Default "Save 20%"; null hides it. */
  yearlyBadge?: ReactNode;
  /** Badge on popular plans. Default "Popular". */
  popularLabel?: ReactNode;
  /** Tighter padding and type, for narrow columns. */
  compact?: boolean;
  className?: string;
}

/**
 * Pricing block: a monthly/yearly toggle whose pill glides between options,
 * prices that roll digit-by-digit to the new period, plan cards with
 * included/excluded feature rows and a highlighted popular plan. Cards sit in
 * a row once the block's own container is wide enough and stack below that.
 */
export function PricingTable({
  plans,
  billing,
  defaultBilling = "monthly",
  onBillingChange,
  onSelect,
  currency = "USD",
  locale = "en-US",
  yearlyBadge = "Save 20%",
  popularLabel = "Popular",
  compact = false,
  className,
}: PricingTableProps) {
  const [internal, setInternal] = useState<PricingBilling>(defaultBilling);
  const period = billing ?? internal;
  const setPeriod = useCallback(
    (next: PricingBilling) => {
      if (billing === undefined) setInternal(next);
      onBillingChange?.(next);
    },
    [billing, onBillingChange],
  );

  // Fractional prices keep two decimals; whole prices show none. The ticker
  // rounds to integers, so it is fed cents and the formatter divides back.
  const fractional = plans.some(
    (p) => !Number.isInteger(p.price.monthly) || !Number.isInteger(p.price.yearly),
  );
  const money = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: fractional ? 2 : 0,
        maximumFractionDigits: fractional ? 2 : 0,
      }),
    [locale, currency, fractional],
  );

  return (
    <div className={cn("@container flex w-full flex-col items-center", compact ? "gap-4" : "gap-6", className)}>
      <BillingToggle value={period} onChange={setPeriod} badge={yearlyBadge} />
      <div className="grid w-full grid-cols-1 gap-3 @xl:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            period={period}
            money={money}
            compact={compact}
            popularLabel={popularLabel}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function BillingToggle({
  value,
  onChange,
  badge,
}: {
  value: PricingBilling;
  onChange: (next: PricingBilling) => void;
  badge: ReactNode;
}) {
  const reduce = useReducedMotion();
  const pillId = useId();
  const options: { value: PricingBilling; label: string }[] = [
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  return (
    // layoutRoot: the pill's shared layout measures in page coordinates; scoping
    // it here keeps scrolled/fixed ancestors from replaying as movement.
    <motion.fieldset
      layoutRoot
      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1"
    >
      <legend className="sr-only">Billing period</legend>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId={pillId}
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                className="absolute inset-0 rounded-full border border-border bg-background shadow-sm"
              />
            ) : null}
            <span className="relative">{option.label}</span>
            {option.value === "yearly" && badge ? (
              <span
                className={cn(
                  "relative rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-foreground",
                )}
              >
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </motion.fieldset>
  );
}

function PlanCard({
  plan,
  period,
  money,
  compact,
  popularLabel,
  onSelect,
}: {
  plan: PricingPlan;
  period: PricingBilling;
  money: Intl.NumberFormat;
  compact: boolean;
  popularLabel: ReactNode;
  onSelect?: (plan: PricingPlan, billing: PricingBilling) => void;
}) {
  const reduce = useReducedMotion();
  const amount = plan.price[period];
  const free = plan.price.monthly === 0 && plan.price.yearly === 0;
  const note = free
    ? "Free forever"
    : period === "yearly"
      ? `Billed ${money.format(amount * 12)} yearly`
      : "Billed monthly";
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card text-card-foreground",
        compact ? "p-4" : "p-6",
        plan.popular
          ? "border-primary shadow-lg ring-1 ring-primary"
          : "border-border",
      )}
    >
      {plan.popular ? (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
          {popularLabel}
        </span>
      ) : null}

      <h3 id={titleId} className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
        {plan.name}
      </h3>
      {plan.description ? (
        <p className={cn("mt-1 text-muted-foreground", compact ? "text-xs" : "text-sm")}>
          {plan.description}
        </p>
      ) : null}

      <div className={cn("flex items-baseline gap-1", compact ? "mt-3" : "mt-5")}>
        <NumberTicker
          value={Math.round(amount * 100)}
          format={(cents) => money.format(cents / 100)}
          duration={0.6}
          stagger={0.03}
          className={cn(
            "font-semibold tracking-tight",
            compact ? "text-3xl" : "text-4xl",
          )}
        />
        {free ? null : (
          <span className="text-sm text-muted-foreground">/mo</span>
        )}
      </div>
      <div className="relative h-4 overflow-hidden text-[11px] text-muted-foreground">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.p
            key={note}
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -6 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="absolute inset-x-0 top-0 truncate"
          >
            {note}
          </motion.p>
        </AnimatePresence>
      </div>

      <Button
        variant={plan.popular ? "primary" : "secondary"}
        size={compact ? "sm" : "md"}
        onClick={() => onSelect?.(plan, period)}
        className={cn("w-full", compact ? "mt-3" : "mt-5")}
      >
        {plan.cta ?? "Get started"}
      </Button>

      <ul className={cn("flex flex-col", compact ? "mt-4 gap-1.5" : "mt-6 gap-2.5")}>
        {plan.features.map((feature, i) => {
          const included = feature.included !== false;
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: feature rows are static, positional content.
              key={i}
              className={cn(
                "flex items-start gap-2",
                compact ? "text-xs" : "text-sm",
                included ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {included ? (
                <Check aria-hidden className="mt-px size-3.5 shrink-0 text-primary" />
              ) : (
                <X aria-hidden className="mt-px size-3.5 shrink-0 opacity-60" />
              )}
              <span className="sr-only">{included ? "Included: " : "Not included: "}</span>
              <span>{feature.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
