"use client";

import { ChevronsUpDown, GitFork, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/motion/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/motion/collapsible";
import { SPRING_SWAP } from "@/lib/ease";

const repos = [
  { name: "karaui/motion-primitives", stars: "2.4k", lang: "TypeScript", color: "var(--chart-1)" },
  { name: "karaui/registry-cli", stars: "812", lang: "Rust", color: "var(--chart-2)" },
  { name: "karaui/design-tokens", stars: "391", lang: "CSS", color: "var(--chart-3)" },
];

function RepoRow({ repo }: { repo: (typeof repos)[number] }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <GitFork className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate font-mono text-[13px] text-foreground">{repo.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="size-2 rounded-full" style={{ background: repo.color }} />
          {repo.lang}
        </span>
        <span className="flex items-center gap-1">
          <Star className="size-3" aria-hidden />
          {repo.stars}
        </span>
      </div>
    </div>
  );
}

export function CollapsiblePreview() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="flex w-full max-w-sm flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-4 px-1">
        <p className="text-sm text-foreground">
          <span className="font-semibold">@kara</span>{" "}
          <span className="text-muted-foreground">starred 3 repositories</span>
        </p>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? "Hide repositories" : "Show all repositories"}
          >
            <motion.span
              className="grid place-items-center"
              initial={false}
              animate={{ rotate: open ? 180 : 0 }}
              transition={reduce ? { duration: 0 } : SPRING_SWAP}
            >
              <ChevronsUpDown className="size-4" />
            </motion.span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <RepoRow repo={repos[0]} />
      <CollapsibleContent innerClassName="flex flex-col gap-2">
        {repos.slice(1).map((repo) => (
          <RepoRow key={repo.name} repo={repo} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
