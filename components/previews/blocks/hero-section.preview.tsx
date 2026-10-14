"use client";

import { ArrowRight } from "lucide-react";
import { HeroSection } from "@/components/motion/hero-section";

// Fictional product.
function DashboardMock() {
  const bars = [38, 62, 48, 80, 56, 92, 70, 84];
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 p-3">
      <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3">
        <div className="h-2 w-12 rounded-full bg-foreground/20" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={
              i === 0
                ? "h-2 w-16 rounded-full bg-primary/70"
                : "h-2 w-14 rounded-full bg-foreground/10"
            }
          />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
          {["--chart-1", "--chart-2", "--chart-3"].map((token) => (
            <div key={token} className="rounded-xl border border-border bg-background p-3">
              <div className="h-1.5 w-10 rounded-full bg-foreground/15" />
              <div
                className="mt-2 h-3 w-14 rounded-full"
                style={{ backgroundColor: `var(${token})` }}
              />
            </div>
          ))}
        </div>
        <div className="flex h-28 items-end gap-2 rounded-xl border border-border bg-background p-3">
          {bars.map((h, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static demo bars.
              key={i}
              className="flex-1 rounded-t-md bg-(--chart-1)"
              style={{ height: `${h}%`, opacity: 0.45 + i * 0.07 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroSectionPreview() {
  return (
    <div className="relative h-[500px] w-full max-w-[40rem] overflow-hidden rounded-2xl [mask-image:linear-gradient(to_bottom,black_82%,transparent)]">
      <HeroSection
        badge={{ label: "Orbit 2.0 is live", href: "#" }}
        headline="Ship analytics your team actually reads"
        description="Orbit turns raw product events into weekly briefs, alerts and dashboards in minutes, without a data team."
        primaryAction={{
          label: "Start free",
          href: "#",
          icon: <ArrowRight aria-hidden className="size-4" />,
        }}
        secondaryAction={{ label: "Book a demo", href: "#" }}
        installCommand="npm i @orbit/sdk"
        media={<DashboardMock />}
      />
    </div>
  );
}
