"use client";

import {
  BarChart3,
  CreditCard,
  FolderKanban,
  Home,
  Inbox,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/motion/button";
import { DashboardShell, type DashboardNavGroup } from "@/components/motion/dashboard-shell";
import { SegmentedControl } from "@/components/motion/segmented-control";
import { cn } from "@/lib/utils";

const NAV: DashboardNavGroup[] = [
  {
    id: "main",
    items: [
      { id: "overview", label: "Overview", icon: <Home aria-hidden /> },
      { id: "inbox", label: "Inbox", icon: <Inbox aria-hidden />, badge: 4 },
      { id: "projects", label: "Projects", icon: <FolderKanban aria-hidden /> },
      { id: "analytics", label: "Analytics", icon: <BarChart3 aria-hidden /> },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { id: "team", label: "Team", icon: <Users aria-hidden /> },
      { id: "billing", label: "Billing", icon: <CreditCard aria-hidden /> },
      { id: "settings", label: "Settings", icon: <Settings aria-hidden /> },
    ],
  },
];

const LABELS: Record<string, string> = {
  overview: "Overview",
  inbox: "Inbox",
  projects: "Projects",
  analytics: "Analytics",
  team: "Team",
  billing: "Billing",
  settings: "Settings",
};

const STATS = [
  { label: "Revenue", value: "$48.2k", delta: "+12%" },
  { label: "Active users", value: "2,914", delta: "+4%" },
  { label: "Churn", value: "1.8%", delta: "-0.3%" },
];

// Bar heights (percent) for the placeholder chart.
const BARS = [42, 58, 51, 70, 64, 82, 76, 90, 72, 86, 94, 88];

export function DashboardShellPreview() {
  const [active, setActive] = useState("overview");
  const [frame, setFrame] = useState("wide");
  return (
    <div className="flex w-full max-w-[40rem] flex-col items-center gap-3">
      <SegmentedControl
        aria-label="Frame width"
        size="sm"
        value={frame}
        onValueChange={setFrame}
        options={[
          { value: "wide", label: "Wide" },
          { value: "narrow", label: "Narrow" },
        ]}
      />
      {/* The shell folds on its own width, not the viewport: narrow the frame
          and the sidebar moves into the drawer even on a desktop screen. */}
      <div className={cn("h-[26rem] w-full", frame === "narrow" && "max-w-[22rem]")}>
      <DashboardShell
        nav={NAV}
        mobileBelow={560}
        active={active}
        onActiveChange={setActive}
        brand={{ name: "Northwind" }}
        user={{ name: "Maya Chen", email: "maya@northwind.dev" }}
        breadcrumbs={[{ label: "Northwind", href: "#" }, { label: LABELS[active] }]}
        title={LABELS[active]}
        description="Last 30 days across all workspaces."
        actions={
          <Button size="sm">
            <Plus aria-hidden className="size-3.5" />
            New
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-base font-semibold tabular-nums">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.delta} vs last month</p>
            </div>
          ))}
        </div>
        <div className="mt-2 rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Weekly sessions</p>
          <div aria-hidden className="mt-3 flex h-24 items-end gap-1.5">
            {BARS.map((h, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder bars.
                key={i}
                style={{ height: `${h}%` }}
                className="flex-1 rounded-sm bg-chart-1/80"
              />
            ))}
          </div>
        </div>
      </DashboardShell>
      </div>
    </div>
  );
}
