"use client";

import { Folder, Home, Slash } from "lucide-react";
import { useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  type BreadcrumbLinkRenderProps,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/motion/breadcrumb";

// Demo links keep the docs page in place. In an app pass
// `render={(p) => <Link {...p} />}` to route through next/link instead.
function demoLink({ href, className, children }: BreadcrumbLinkRenderProps) {
  return (
    <a href={href} className={className} onClick={(e) => e.preventDefault()}>
      {children}
    </a>
  );
}

const TRAIL = [
  { label: "Home", href: "/", icon: <Home />, render: demoLink },
  { label: "Workspace", href: "/workspace", render: demoLink },
  { label: "Projects", href: "/workspace/projects", render: demoLink },
  { label: "karaUI", href: "/workspace/projects/karaui", render: demoLink },
  { label: "Components", href: "/workspace/projects/karaui/components", render: demoLink },
  { label: "Breadcrumb" },
];

export function BreadcrumbPreview() {
  const [round, setRound] = useState(0);

  return (
    <div className="flex w-full max-w-lg flex-col gap-7">
      <Section title="Composable">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" render={demoLink}>
                <Home className="size-3.5" aria-hidden />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/docs" render={demoLink}>
                Docs
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash className="-rotate-12" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Installation</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Section>

      <Section
        title="Collapsed · expands inline"
        action={
          <button
            type="button"
            onClick={() => setRound((r) => r + 1)}
            className="rounded-md px-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            Reset
          </button>
        }
      >
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <Breadcrumb key={round} items={TRAIL} maxItems={4} />
        </div>
      </Section>

      <Section title="Collapsed · opens a menu">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <Breadcrumb
            items={TRAIL.map((item, i) =>
              i > 0 && i < TRAIL.length - 1 ? { ...item, icon: <Folder /> } : item,
            )}
            maxItems={3}
            collapse="menu"
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}
