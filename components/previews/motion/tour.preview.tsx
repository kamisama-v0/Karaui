"use client";

import {
  BarChart3,
  Bell,
  Folder,
  Home,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/motion/button";
import { Tour, type TourStep } from "@/components/motion/tour";

const NAV = [
  { icon: Home, label: "Home" },
  { icon: Folder, label: "Projects" },
  { icon: BarChart3, label: "Insights" },
  { icon: Settings, label: "Settings" },
];

export function TourPreview() {
  const navRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLButtonElement>(null);
  const inboxRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [finished, setFinished] = useState(false);

  const steps: TourStep[] = [
    {
      target: navRef,
      title: "Your workspace",
      content: "Jump between home, projects and insights from the sidebar.",
      placement: "right",
    },
    {
      target: searchRef,
      title: "Search anything",
      content: "Find projects, people and docs. Press / from anywhere.",
      placement: "bottom",
    },
    {
      target: createRef,
      title: "Start a project",
      content: "Spin up a new project from a blank page or a template.",
      placement: "bottom",
    },
    {
      target: inboxRef,
      title: "Stay in the loop",
      content: "Mentions, reviews and deploy alerts land in your inbox.",
      placement: "left",
    },
  ];

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <div className="flex h-72 w-full overflow-hidden rounded-2xl border border-border bg-card text-sm">
        <nav
          ref={navRef}
          aria-label="Demo app"
          className="flex w-36 shrink-0 flex-col gap-0.5 border-r border-border p-2 max-sm:w-12"
        >
          <div className="mb-2 flex items-center gap-2 px-2 py-1.5 font-semibold text-foreground">
            <span className="grid size-5 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-3" />
            </span>
            <span className="max-sm:hidden">Acme</span>
          </div>
          {NAV.map(({ icon: Icon, label }, i) => (
            <span
              key={label}
              className={
                i === 1
                  ? "flex items-center gap-2 rounded-lg bg-muted px-2 py-1.5 text-foreground"
                  : "flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground"
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className="max-sm:hidden">{label}</span>
            </span>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-border p-2">
            <div
              ref={searchRef}
              className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-muted-foreground"
            >
              <Search className="size-3.5 shrink-0" />
              <span className="truncate text-xs">Search…</span>
            </div>
            <button
              ref={createRef}
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground"
            >
              <Plus className="size-3.5" />
              New
            </button>
            <button
              ref={inboxRef}
              type="button"
              aria-label="Inbox"
              className="relative grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground"
            >
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[var(--chart-1)]" />
            </button>
          </header>
          <div className="grid flex-1 grid-cols-2 gap-2 p-3">
            {["Website redesign", "Mobile app", "Billing v2", "Docs"].map(
              (name, i) => (
                <div
                  key={name}
                  className="flex flex-col justify-between rounded-xl border border-border bg-background p-3"
                >
                  <span className="truncate text-xs font-medium text-foreground">
                    {name}
                  </span>
                  <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary/70"
                      style={{ width: `${[72, 40, 88, 25][i]}%` }}
                    />
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={() => {
            setFinished(false);
            setOpen(true);
          }}
        >
          Start tour
        </Button>
        {finished ? (
          <span className="text-xs text-muted-foreground">
            Tour complete
          </span>
        ) : null}
      </div>

      <Tour
        steps={steps}
        open={open}
        onOpenChange={setOpen}
        onComplete={() => setFinished(true)}
      />
    </div>
  );
}
