"use client";

import { ArrowUpRight, Check, GitPullRequest, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/motion/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardExpandContent,
  CardExpandTrigger,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/motion/card";

const FEATURES = ["Unlimited projects", "Shared component library", "Priority support"];
const MORE = ["SSO and audit log", "Custom design tokens", "99.9% uptime SLA"];

export function CardPreview() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Team plan</CardTitle>
          <CardDescription>For small teams shipping together.</CardDescription>
          <CardAction>
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
              Popular
            </span>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-2xl font-semibold tracking-tight">
            $24<span className="text-sm font-normal text-muted-foreground"> / seat / mo</span>
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="size-3.5 text-muted-foreground" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardExpandContent>
          <ul className="flex flex-col gap-1.5 text-sm">
            {MORE.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="size-3.5 text-muted-foreground" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </CardExpandContent>
        <CardFooter className="justify-between">
          <CardExpandTrigger>All features</CardExpandTrigger>
          <Button size="sm">Choose plan</Button>
        </CardFooter>
      </Card>

      <div className="flex flex-col gap-4">
        <AnimatePresence initial={false} mode="popLayout">
          {dismissed ? (
            <motion.div
              key="restore"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex"
            >
              <Card variant="outline" className="w-full items-center justify-center border-dashed py-4">
                <Button size="sm" variant="ghost" onClick={() => setDismissed(false)}>
                  Show notification
                </Button>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="note"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex"
            >
              <Card variant="outline" className="w-full gap-3 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <GitPullRequest className="size-4 text-muted-foreground" aria-hidden />
                    Review requested
                  </CardTitle>
                  <CardDescription>Mira asked you to review #482.</CardDescription>
                  <CardAction>
                    <button
                      type="button"
                      aria-label="Dismiss notification"
                      onClick={() => setDismissed(true)}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="size-4" />
                    </button>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                    <div className="h-full w-2/3 rounded-full bg-primary" />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">2 of 3 checks passed</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Card variant="interactive" asChild>
          <a href="/docs/theme">
            <CardHeader>
              <CardTitle>Theme guide</CardTitle>
              <CardDescription>Tokens and design styles every card re-skins through.</CardDescription>
              <CardAction>
                <ArrowUpRight
                  aria-hidden
                  className="size-4 text-muted-foreground transition-transform duration-200 group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5"
                />
              </CardAction>
            </CardHeader>
            <CardFooter>
              <span className="text-xs text-muted-foreground">5 min read</span>
            </CardFooter>
          </a>
        </Card>
      </div>
    </div>
  );
}
