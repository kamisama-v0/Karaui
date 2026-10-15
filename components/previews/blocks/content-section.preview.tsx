"use client";

import { useState } from "react";
import { ContentSection } from "@/components/motion/content-section";
import { SegmentedControl } from "@/components/motion/segmented-control";

type Variant = "split" | "stats" | "quote";

const VARIANTS = [
  { value: "split", label: "Split" },
  { value: "stats", label: "Stats" },
  { value: "quote", label: "Quote" },
];

/** Fake product shot: a gradient "photo" with a floating card, no network image. */
function Media() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-[linear-gradient(160deg,#ffd7b5,#f4a6b8_45%,#8f8fe8)]">
      <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/30 blur-2xl" />
      <div className="absolute inset-x-5 bottom-5 flex flex-col gap-2 rounded-xl border border-border bg-card/90 p-3 shadow-lg backdrop-blur">
        <div className="h-2 w-1/2 rounded-full bg-foreground/20" />
        <div className="h-2 w-4/5 rounded-full bg-foreground/10" />
        <div className="h-2 w-2/3 rounded-full bg-foreground/10" />
      </div>
    </div>
  );
}

export function ContentSectionPreview() {
  const [variant, setVariant] = useState<Variant>("split");
  return (
    <div className="flex w-full max-w-[40rem] flex-col gap-3 px-1 py-2">
      <SegmentedControl
        aria-label="Content variant"
        size="sm"
        options={VARIANTS}
        value={variant}
        onValueChange={(next) => setVariant(next as Variant)}
        className="self-center"
      />
      <div
        key={variant}
        className="h-[380px] overflow-y-auto rounded-2xl border border-border bg-background p-5 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
      >
        {variant === "split" ? (
          <ContentSection
            variant="split"
            eyebrow="How it works"
            heading="Motion that explains, not decorates"
            media={<Media />}
            paragraphs={[
              "Every transition in Northwind answers a question: where did this come from, and where did it go? Panels grow out of the control that opened them and fold back the same way.",
              "Springs carry the weight of a gesture, so a quick flick settles fast and a slow drag eases in. Nothing animates layout unless layout is the point.",
              "Reduced motion is a first-class mode. Movement becomes a fade, and every state change still reads at a glance.",
              "The result is an interface that feels quick on the first visit and calm on the hundredth.",
            ]}
          />
        ) : variant === "stats" ? (
          <ContentSection
            variant="stats"
            eyebrow="By the numbers"
            heading="Built for teams that ship weekly"
            paragraphs={[
              "Northwind started as an internal kit for one product team. Two years later it powers dashboards, storefronts and docs sites across the company.",
            ]}
            stats={[
              { value: 12480, label: "Weekly installs", description: "Across 40+ products" },
              { value: 99.98, decimals: 2, suffix: "%", label: "Uptime", description: "Registry, last 12 months" },
              { value: 1.4, decimals: 1, prefix: "$", suffix: "M", label: "Design hours saved" },
            ]}
          />
        ) : (
          <div className="grid min-h-full place-items-center">
            <ContentSection
              variant="quote"
              eyebrow="From the field"
              quote="We deleted three in-house animation helpers the week we switched. The components just feel right out of the box."
              author={{ name: "Lena Marsh", role: "Design Lead, Fieldnote" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
