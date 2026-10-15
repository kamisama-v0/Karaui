"use client";

import { BarChart3, Lock, Users, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { FeatureSection, type FeatureSectionItem } from "@/components/motion/feature-section";

function Frame({ children }: { children: ReactNode }) {
  return <div className="flex size-full items-center justify-center p-6">{children}</div>;
}

const BARS = [36, 52, 44, 68, 60, 80, 74, 92];

const FEATURES: FeatureSectionItem[] = [
  {
    id: "sync",
    title: "Realtime collaboration",
    description: "Everyone edits the same doc at once — cursors, comments and changes land instantly.",
    icon: <Users aria-hidden />,
    visual: (
      <Frame>
        <div className="w-full max-w-xs rounded-xl border border-border bg-card p-4 shadow-md">
          <div className="h-2 w-2/3 rounded-full bg-foreground/15" />
          <div className="mt-2 h-2 w-full rounded-full bg-foreground/10" />
          <div className="mt-2 h-2 w-5/6 rounded-full bg-foreground/10" />
          <div className="mt-4 flex -space-x-2">
            {[1, 2, 3, 5].map((n) => (
              <span
                key={n}
                style={{ backgroundColor: `var(--chart-${n})` }}
                className="size-7 rounded-full border-2 border-card"
              />
            ))}
          </div>
        </div>
      </Frame>
    ),
  },
  {
    id: "analytics",
    title: "Built-in analytics",
    description: "Track usage per page and per teammate without wiring up another tool.",
    icon: <BarChart3 aria-hidden />,
    visual: (
      <Frame>
        <div className="w-full max-w-xs rounded-xl border border-border bg-card p-4 shadow-md">
          <p className="text-[11px] text-muted-foreground">Weekly views</p>
          <p className="text-lg font-semibold">12,480</p>
          <div className="mt-3 flex h-24 items-end gap-1.5">
            {BARS.map((h) => (
              <span key={h} style={{ height: `${h}%` }} className="flex-1 rounded-sm bg-chart-1/80" />
            ))}
          </div>
        </div>
      </Frame>
    ),
  },
  {
    id: "automations",
    title: "Automations",
    description: "Trigger follow-ups, assign owners and post updates when work changes state.",
    icon: <Workflow aria-hidden />,
    visual: (
      <Frame>
        <div className="flex w-full max-w-xs flex-col items-center gap-2">
          {["When status → Done", "Notify #launch", "Assign QA review"].map((label, i) => (
            <div key={label} className="flex w-full flex-col items-center gap-2">
              {i > 0 ? <span className="h-3 w-px bg-border-strong" /> : null}
              <div className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                <span
                  style={{ backgroundColor: `var(--chart-${i + 2})` }}
                  className="mr-2 inline-block size-2 rounded-full"
                />
                {label}
              </div>
            </div>
          ))}
        </div>
      </Frame>
    ),
  },
  {
    id: "security",
    title: "Enterprise security",
    description: "SSO, audit logs and per-workspace permissions come standard on every plan.",
    icon: <Lock aria-hidden />,
    visual: (
      <Frame>
        <div className="w-full max-w-xs rounded-xl border border-border bg-card p-4 shadow-md">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Lock aria-hidden className="size-4" />
            </span>
            <span className="text-sm font-medium">SAML SSO enforced</span>
          </div>
          {["Audit log streaming", "2FA required", "IP allowlist"].map((row) => (
            <div key={row} className="mt-2 flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5 text-xs">
              {row}
              <span className="h-3.5 w-6 rounded-full bg-primary" />
            </div>
          ))}
        </div>
      </Frame>
    ),
  },
];

export function FeatureSectionPreview() {
  return (
    <div className="w-full max-w-[40rem] px-2">
      <FeatureSection
        eyebrow="Features"
        heading="Everything your team needs"
        features={FEATURES}
        visualClassName="h-64"
      />
    </div>
  );
}
