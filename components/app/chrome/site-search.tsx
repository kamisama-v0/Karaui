"use client";

import { CircleDashed, FileText, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CommandPalette,
  type CommandItem,
} from "@/components/motion/command-palette";
import { NewBadge } from "@/components/app/docs/new-badge";
import { registry } from "@/lib/registry";

const PAGES = [
  { slug: "ai-agents", name: "AI Agents", href: "/docs/ai-agents" },
  {
    slug: "motion-patterns",
    name: "Motion Guides",
    href: "/docs/motion-patterns",
  },
  { slug: "openui", name: "OpenUI", href: "/docs/openui" },
  { slug: "mobile", name: "Mobile & responsive", href: "/docs/mobile" },
  { slug: "blog", name: "Blog", href: "/blog" },
];

/** Site search trigger backed by the library's own command palette. */
export function SiteSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = useMemo<CommandItem[]>(
    () => [
      ...registry.flatMap((cat) =>
        cat.components.map((comp) => ({
          id: `${cat.slug}-${comp.slug}`,
          label: comp.name,
          group: cat.name,
          // Variant names ("Fluid Slider") and hand-tuned SEO terms make
          // variants findable even though they share one page.
          keywords: [
            comp.slug,
            cat.name,
            ...(comp.examples ?? []).flatMap((ex) => [ex.name, ex.slug]),
            ...(comp.keywords ?? []),
          ],
          icon: CircleDashed,
          badge:
            comp.badge === "new" ? (
              <NewBadge launchedAt={comp.launchedAt} />
            ) : undefined,
          onSelect: () => router.push(`/components/${cat.slug}/${comp.slug}`),
        })),
      ),
      ...PAGES.map((page) => ({
        id: page.slug,
        label: page.name,
        group: "Pages",
        keywords: [page.slug],
        icon: FileText,
        onSelect: () => router.push(page.href),
      })),
    ],
    [router],
  );

  return (
    <>
      <button
        type="button"
        aria-label="Search components"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-(--color-border-strong) hover:text-foreground",
          className,
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden flex-1 text-left sm:block">Search</span>
        <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline-block">
          ⌘K
        </kbd>
      </button>
      <CommandPalette
        items={items}
        open={open}
        onOpenChange={setOpen}
        placeholder="Search components…"
      />
    </>
  );
}
