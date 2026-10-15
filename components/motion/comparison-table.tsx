"use client";

import { Check, ChevronDown, Minus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, type ReactNode, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/motion/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  useCollapsible,
} from "@/components/motion/collapsible";
import { NumberTicker } from "@/components/motion/number-ticker";
import { SegmentedControl } from "@/components/motion/segmented-control";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type ComparisonBilling = "monthly" | "yearly";

/** true = included, false = not included, "partial" = limited, anything else renders as text. */
export type ComparisonValue = boolean | "partial" | ReactNode;

export interface ComparisonPlan {
  id: string;
  name: string;
  description?: string;
  /** Price per month for each billing period (yearly = monthly equivalent). */
  price: { monthly: number; yearly: number };
  cta?: string;
  /** Highlights the whole column. */
  recommended?: boolean;
}

export interface ComparisonFeature {
  id: string;
  label: ReactNode;
  /** Secondary line under the label. */
  hint?: ReactNode;
  /** Value per plan id. Missing ids read as not included. */
  values: Record<string, ComparisonValue>;
}

export interface ComparisonGroup {
  id: string;
  label: string;
  features: ComparisonFeature[];
}

export interface ComparisonTableProps {
  plans: ComparisonPlan[];
  groups: ComparisonGroup[];
  billing?: ComparisonBilling;
  defaultBilling?: ComparisonBilling;
  onBillingChange?: (billing: ComparisonBilling) => void;
  /** Groups open initially. Default: all. */
  defaultOpenGroups?: string[];
  /** Plan shown in the narrow (single-column) layout. */
  mobilePlan?: string;
  defaultMobilePlan?: string;
  onMobilePlanChange?: (planId: string) => void;
  onSelect?: (plan: ComparisonPlan, billing: ComparisonBilling) => void;
  /** ISO 4217 code. Default "USD". */
  currency?: string;
  /** Default "en-US" so server and client agree. */
  locale?: string;
  /** Badge beside "Yearly". Default "−20%"; null hides it. */
  yearlyBadge?: ReactNode;
  /** Label on the recommended column. Default "Recommended". */
  recommendedLabel?: ReactNode;
  /** Classes for the scrolling body (set a max height here). Default `max-h-[22rem]`. */
  bodyClassName?: string;
  className?: string;
}

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

/**
 * Plan comparison grid: a monthly/yearly switch rolls every price, plan
 * columns sit in a sticky header while feature rows scroll beneath, feature
 * groups collapse with a height morph, cells read check / dash / partial or
 * text, and the recommended plan's column is tinted top to bottom. In a
 * narrow container the columns give way to a plan switcher with one value
 * column that cross-fades between plans. Complements `PricingTable` (cards)
 * as the detailed "compare all features" section.
 */
export function ComparisonTable({
  plans,
  groups,
  billing: billingProp,
  defaultBilling = "monthly",
  onBillingChange,
  defaultOpenGroups,
  mobilePlan: mobilePlanProp,
  defaultMobilePlan,
  onMobilePlanChange,
  onSelect,
  currency = "USD",
  locale = "en-US",
  yearlyBadge = "−20%",
  recommendedLabel = "Recommended",
  bodyClassName,
  className,
}: ComparisonTableProps) {
  const [billing, setBilling] = useControllable(billingProp, defaultBilling, onBillingChange);
  const [mobilePlan, setMobilePlan] = useControllable(
    mobilePlanProp,
    defaultMobilePlan ?? plans.find((p) => p.recommended)?.id ?? plans[0]?.id ?? "",
    onMobilePlanChange,
  );
  const openSet = useMemo(
    () => new Set(defaultOpenGroups ?? groups.map((g) => g.id)),
    [defaultOpenGroups, groups],
  );

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

  const columns: CSSProperties = {
    gridTemplateColumns: `minmax(8.5rem, 1.35fr) repeat(${plans.length}, minmax(0, 1fr))`,
  };
  const current = plans.find((p) => p.id === mobilePlan) ?? plans[0];

  return (
    <div className={cn("@container flex w-full flex-col gap-3", className)}>
      <div className="flex justify-center">
        <SegmentedControl
          aria-label="Billing period"
          size="sm"
          value={billing}
          onValueChange={(v) => setBilling(v as ComparisonBilling)}
          options={[
            { value: "monthly", label: "Monthly" },
            {
              value: "yearly",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  Yearly
                  {yearlyBadge ? (
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                      {yearlyBadge}
                    </span>
                  ) : null}
                </span>
              ),
            },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
        {/* Wide layout: all plan columns */}
        <div
          className={cn(
            "hidden overflow-y-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] @xl:block",
            bodyClassName ?? "max-h-[22rem]",
          )}
        >
          <div className="sticky top-0 z-10 grid border-b border-border bg-card" style={columns}>
            <div className="flex items-end p-3 text-xs text-muted-foreground">Compare plans</div>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col items-start gap-1 p-3",
                  plan.recommended && "bg-primary/5",
                )}
              >
                {plan.recommended ? (
                  <>
                    <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                      {recommendedLabel}
                    </span>
                  </>
                ) : (
                  <span aria-hidden className="h-4" />
                )}
                <span className="text-sm font-semibold">{plan.name}</span>
                <PlanPrice plan={plan} billing={billing} money={money} />
                <Button
                  size="sm"
                  variant={plan.recommended ? "primary" : "secondary"}
                  onClick={() => onSelect?.(plan, billing)}
                  className="mt-1 h-7 w-full px-2"
                >
                  {plan.cta ?? "Choose"}
                </Button>
              </div>
            ))}
          </div>

          {groups.map((group) => (
            <Collapsible key={group.id} defaultOpen={openSet.has(group.id)}>
              <GroupTrigger label={group.label} count={group.features.length} />
              <CollapsibleContent>
                {group.features.map((feature) => (
                  <div
                    key={feature.id}
                    className="grid border-b border-border/60 last:border-b-0"
                    style={columns}
                  >
                    <FeatureLabel feature={feature} />
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={cn(
                          "flex items-center justify-center px-2 py-2.5",
                          plan.recommended && "bg-primary/5",
                        )}
                      >
                        <Cell value={feature.values[plan.id]} planName={plan.name} />
                      </div>
                    ))}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {/* Narrow layout: plan switcher + one value column */}
        <div className="@xl:hidden">
          <div className="border-b border-border p-3">
            <SegmentedControl
              aria-label="Plan"
              size="sm"
              fullWidth
              value={current?.id}
              onValueChange={setMobilePlan}
              options={plans.map((p) => ({ value: p.id, label: p.name }))}
            />
            {current ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {current.name}
                    {current.recommended ? (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                        {recommendedLabel}
                      </span>
                    ) : null}
                  </p>
                  <PlanPrice plan={current} billing={billing} money={money} />
                </div>
                <Button
                  size="sm"
                  variant={current.recommended ? "primary" : "secondary"}
                  onClick={() => onSelect?.(current, billing)}
                >
                  {current.cta ?? "Choose"}
                </Button>
              </div>
            ) : null}
          </div>
          <div
            className={cn(
              "overflow-y-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]",
              bodyClassName ?? "max-h-[22rem]",
            )}
          >
            {groups.map((group) => (
              <Collapsible key={group.id} defaultOpen={openSet.has(group.id)}>
                <GroupTrigger label={group.label} count={group.features.length} />
                <CollapsibleContent>
                  {group.features.map((feature) => (
                    <div
                      key={feature.id}
                      className="grid grid-cols-[1fr_6rem] border-b border-border/60 last:border-b-0"
                    >
                      <FeatureLabel feature={feature} />
                      <div
                        className={cn(
                          "flex items-center justify-center px-2 py-2.5",
                          current?.recommended && "bg-primary/5",
                        )}
                      >
                        <AnimatePresence initial={false} mode="popLayout">
                          <motion.span
                            key={current?.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.18, ease: EASE_OUT }}
                            className="flex"
                          >
                            <Cell
                              value={current ? feature.values[current.id] : undefined}
                              planName={current?.name ?? ""}
                            />
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanPrice({
  plan,
  billing,
  money,
}: {
  plan: ComparisonPlan;
  billing: ComparisonBilling;
  money: Intl.NumberFormat;
}) {
  const amount = plan.price[billing];
  const free = plan.price.monthly === 0 && plan.price.yearly === 0;
  return (
    <span className="flex items-baseline gap-0.5">
      <NumberTicker
        value={Math.round(amount * 100)}
        format={(cents) => money.format(cents / 100)}
        duration={0.6}
        stagger={0.03}
        startOnView={false}
        className="text-lg font-semibold tracking-tight"
      />
      {free ? null : <span className="text-[11px] text-muted-foreground">/mo</span>}
    </span>
  );
}

function GroupTrigger({ label, count }: { label: string; count: number }) {
  const { open } = useCollapsible("GroupTrigger");
  const reduce = useReducedMotion();
  return (
    <CollapsibleTrigger className="flex w-full items-center gap-2 border-b border-border bg-muted/50 px-3 py-2 text-left text-xs font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
      <motion.span
        animate={{ rotate: open ? 0 : -90 }}
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        className="grid place-items-center text-muted-foreground"
      >
        <ChevronDown aria-hidden className="size-3.5" />
      </motion.span>
      <span className="flex-1">{label}</span>
      <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
        {count} {count === 1 ? "feature" : "features"}
      </span>
    </CollapsibleTrigger>
  );
}

function FeatureLabel({ feature }: { feature: ComparisonFeature }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <p className="text-xs font-medium">{feature.label}</p>
      {feature.hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{feature.hint}</p> : null}
    </div>
  );
}

function Cell({ value, planName }: { value: ComparisonValue | undefined; planName: string }) {
  if (value === true) {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-primary">
        <Check aria-hidden className="size-3" strokeWidth={3} />
        <span className="sr-only">{planName}: included</span>
      </span>
    );
  }
  if (value === false || value === undefined || value === null) {
    return (
      <span className="grid size-5 place-items-center text-muted-foreground/60">
        <Minus aria-hidden className="size-3.5" />
        <span className="sr-only">{planName}: not included</span>
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="grid size-5 place-items-center">
        <span
          aria-hidden
          className="size-3 rounded-full border-2 border-primary bg-[linear-gradient(90deg,var(--primary)_50%,transparent_50%)]"
        />
        <span className="sr-only">{planName}: partial</span>
      </span>
    );
  }
  return (
    <span className="text-center text-xs text-foreground">
      <span className="sr-only">{planName}: </span>
      {value}
    </span>
  );
}
