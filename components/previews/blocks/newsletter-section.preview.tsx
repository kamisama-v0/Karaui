"use client";

import type { AvatarGroupItem } from "@/components/motion/avatar-group";
import { NewsletterSection } from "@/components/motion/newsletter-section";

const READERS: AvatarGroupItem[] = [
  { id: "mo", name: "Mara Okafor" },
  { id: "jl", name: "Jonas Lind" },
  { id: "pv", name: "Priya Varma" },
  { id: "te", name: "Theo Easton" },
  { id: "ak", name: "Aiko Kimura" },
  { id: "rb", name: "Ruth Bellamy" },
];

// Demo: any address containing "fail" rejects, so the error state is reachable.
function subscribe(email: string) {
  return new Promise<void>((resolve, reject) => {
    window.setTimeout(() => {
      if (email.includes("fail")) reject(new Error("Rejected"));
      else resolve();
    }, 1100);
  });
}

export function NewsletterSectionPreview() {
  return (
    <div className="w-full max-w-[40rem] px-1 py-2">
      <NewsletterSection
        eyebrow="Newsletter"
        heading="Motion notes, every Friday"
        description="New components, easing breakdowns and the occasional teardown. Five minutes to read, no fluff."
        onSubscribe={subscribe}
        privacyNote="We never share your email. Unsubscribe with one click."
        socialProof={{ avatars: READERS, label: "Join 4,200 readers" }}
      />
    </div>
  );
}
