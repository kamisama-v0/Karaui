"use client";

import { Bell, CircleCheck, Minus, Plus, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/motion/badge";
import { Button } from "@/components/motion/button";

const FILTERS = ["Design", "Engineering", "Remote", "Full-time", "Senior"];

export function BadgePreview() {
  const [filters, setFilters] = useState(FILTERS);
  const [count, setCount] = useState(3);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <Section title="Variants">
        <Row label="Base">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
        </Row>
        <Row label="Solid">
          <Badge variant="success" tone="solid" icon={<CircleCheck />}>
            Passed
          </Badge>
          <Badge variant="warning" tone="solid" icon={<TriangleAlert />}>
            Degraded
          </Badge>
          <Badge variant="destructive" tone="solid">
            Failed
          </Badge>
          <Badge variant="success" dot="pulse">
            Live
          </Badge>
          <Badge variant="outline" dot>
            Draft
          </Badge>
        </Row>
        <Row label="Sizes">
          <Badge variant="secondary" size="sm" icon={<Sparkles />}>
            Small
          </Badge>
          <Badge variant="secondary" icon={<Sparkles />}>
            Medium
          </Badge>
          <Badge variant="secondary" size="lg" icon={<Sparkles />}>
            Large
          </Badge>
        </Row>
      </Section>

      <Section
        title="Filters"
        action={
          filters.length < FILTERS.length ? (
            <button
              type="button"
              onClick={() => setFilters(FILTERS)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCcw aria-hidden="true" className="size-3" />
              Reset
            </button>
          ) : null
        }
      >
        <div className="flex min-h-7 flex-wrap items-center gap-1.5">
          <AnimatePresence initial={false}>
            {filters.map((filter) => (
              <Badge
                key={filter}
                variant="secondary"
                onRemove={() => setFilters((list) => list.filter((f) => f !== filter))}
              >
                {filter}
              </Badge>
            ))}
          </AnimatePresence>
          {filters.length === 0 ? (
            <span className="text-xs text-muted-foreground">No filters applied</span>
          ) : null}
        </div>
      </Section>

      <Section title="Count">
        <div className="flex items-center gap-4">
          <span className="relative inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground">
            <Bell aria-hidden="true" className="size-[18px]" />
            <span className="sr-only">Notifications</span>
            <span className="absolute -right-1.5 -top-1.5">
              <Badge count={count} countLabel={(n) => `${n} unread`} />
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="outline"
              aria-label="Decrease"
              onClick={() => setCount((n) => Math.max(0, n - 1))}
            >
              <Minus className="size-4" />
            </Button>
            <Button size="icon" variant="outline" aria-label="Increase" onClick={() => setCount((n) => n + 1)}>
              <Plus className="size-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCount((n) => n + 48)}>
              +48
            </Button>
          </div>
          <span className="ml-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
            Unread (max 999)
            <Badge variant="secondary" count={count} max={999} showZero size="lg" />
          </span>
        </div>
      </Section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-10 shrink-0 pt-1 text-[11px] text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex h-5 items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
