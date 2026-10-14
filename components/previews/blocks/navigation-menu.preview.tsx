"use client";

import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  Code2,
  LifeBuoy,
  Megaphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import {
  NavigationMenu,
  type NavigationMenuItem,
  type NavigationMenuLinkRenderProps,
} from "@/components/motion/navigation-menu";

// Demo links stay on the docs page. In an app pass `render={(p) => <Link {...p} />}`.
function demoLink({ href, className, children, onClick }: NavigationMenuLinkRenderProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  );
}

const ITEMS: NavigationMenuItem[] = [
  {
    id: "product",
    label: "Product",
    sections: [
      {
        title: "Platform",
        links: [
          { label: "Analytics", href: "/analytics", icon: <BarChart3 />, description: "Live dashboards for every metric.", render: demoLink },
          { label: "Automations", href: "/automations", icon: <Workflow />, description: "Trigger flows from any event.", render: demoLink },
          { label: "Security", href: "/security", icon: <ShieldCheck />, description: "SSO, audit logs and roles.", render: demoLink },
        ],
      },
    ],
    featured: (
      <a
        href="/changelog"
        onClick={(e) => e.preventDefault()}
        className="group/feat relative flex w-full flex-col justify-end overflow-hidden rounded-xl border border-border bg-muted p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-80 transition-opacity group-hover/feat:opacity-100"
          style={{
            background:
              "radial-gradient(120% 90% at 100% 0%, color-mix(in oklch, var(--chart-1) 45%, transparent), transparent 60%), radial-gradient(90% 80% at 0% 100%, color-mix(in oklch, var(--chart-3) 35%, transparent), transparent 65%)",
          }}
        />
        <Sparkles aria-hidden className="relative mb-auto size-5 text-foreground" />
        <span className="relative mt-10 text-sm font-semibold text-foreground">What&apos;s new in 4.0</span>
        <span className="relative mt-1 text-xs leading-snug text-muted-foreground">
          Faster queries, shared views and a brand-new editor.
        </span>
      </a>
    ),
  },
  {
    id: "solutions",
    label: "Solutions",
    sections: [
      {
        title: "By team",
        links: [
          { label: "Engineering", href: "/eng", icon: <Code2 />, render: demoLink },
          { label: "Marketing", href: "/marketing", icon: <Megaphone />, render: demoLink },
          { label: "Operations", href: "/ops", icon: <Boxes />, render: demoLink },
        ],
      },
      {
        title: "By size",
        links: [
          { label: "Startups", href: "/startups", icon: <Rocket />, render: demoLink },
          { label: "Enterprise", href: "/enterprise", icon: <Building2 />, render: demoLink },
        ],
      },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    sections: [
      {
        links: [
          { label: "Documentation", href: "/docs", icon: <BookOpen />, description: "Guides and API reference.", render: demoLink },
          { label: "Support", href: "/support", icon: <LifeBuoy />, description: "Talk to a human.", render: demoLink },
        ],
      },
    ],
  },
  { id: "pricing", label: "Pricing", href: "/pricing", render: demoLink },
];

export function NavigationMenuPreview() {
  return (
    <div className="relative flex h-[420px] w-full max-w-[620px] flex-col gap-6 overflow-hidden rounded-3xl border border-border bg-background p-3">
      <NavigationMenu
        items={ITEMS}
        logo={
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <span aria-hidden className="grid size-6 place-items-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
              N
            </span>
            <span className="sr-only">Northwind</span>
          </span>
        }
        actions={
          <button
              type="button"
              className="h-8 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
            Get started
          </button>
        }
      />
      {/* Faux page body so the panels read as overlays. */}
      <div aria-hidden className="flex flex-col gap-3 px-3 pt-4">
        <div className="h-7 w-2/3 rounded-lg bg-muted" />
        <div className="h-3 w-full rounded bg-muted/70" />
        <div className="h-3 w-5/6 rounded bg-muted/70" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="h-24 rounded-xl bg-muted/60" />
          <div className="h-24 rounded-xl bg-muted/60" />
          <div className="h-24 rounded-xl bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
