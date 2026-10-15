"use client";

import { ArrowRight } from "lucide-react";
import { CtaSection } from "@/components/motion/cta-section";

// Fictional product and copy.
export function CtaSectionPreview() {
  return (
    <div className="w-full max-w-[38rem] px-1">
      <CtaSection
        eyebrow="Get started"
        headline="Ship your next launch in a weekend"
        description="Fieldnote gives your team docs, roadmaps and changelogs in one calm workspace. Free for small teams."
        primaryAction={{
          label: "Start for free",
          onClick: () => {},
          icon: <ArrowRight aria-hidden className="size-4" />,
        }}
        secondaryAction={{ label: "Talk to sales", onClick: () => {} }}
        checklist={["No credit card", "14-day Pro trial", "Cancel any time"]}
      />
    </div>
  );
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Split layout with an email capture in the right column. */
export function CtaSectionSplitPreview() {
  return (
    <div className="w-full max-w-[40rem] px-1">
      <CtaSection
        variant="split"
        background="dots"
        eyebrow="Early access"
        headline="Be first in line for Fieldnote 3"
        description="Join the waitlist and we'll send one email when your workspace is ready."
        checklist={["No spam", "One-click unsubscribe"]}
        emailCapture={{
          onSubscribe: () => wait(900),
          buttonLabel: "Join waitlist",
          note: "We'll never share your email.",
        }}
      />
    </div>
  );
}
