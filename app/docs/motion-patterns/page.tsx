import type { Metadata } from "next";
import { MotionPatterns } from "./motion-patterns";

export const metadata: Metadata = {
  title: "Motion Guides",
  description:
    "How karaUI decides what moves: four questions to ask first, the easing and spring tokens in lib/ease.ts, duration ranges, five React recipes and the reduced-motion variant.",
  alternates: {
    canonical: "/docs/motion-patterns",
  },
  openGraph: {
    title: "Motion Guides · karaUI",
    description:
      "The rules behind karaUI's animation: when to move, which token to reach for, how long it should take, and what reduced motion keeps.",
    url: "/docs/motion-patterns",
    type: "article",
    siteName: "karaUI",
    images: ["/api/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Motion Guides · karaUI",
    images: ["/api/og"],
  },
};

export default function MotionPatternsPage() {
  return (
    <div className="w-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        How karaUI moves
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        Animate with a reason.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        The checklist we use inside karaUI: ask whether an element should move
        at all, pick its curve from the shared tokens, keep it short, and write
        the reduced-motion version at the same time.
      </p>

      <MotionPatterns />
    </div>
  );
}
