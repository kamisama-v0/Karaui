"use client";

import { MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/motion/button";
import { type FaqItem, FaqSection } from "@/components/motion/faq-section";

const ITEMS: FaqItem[] = [
  {
    id: "install",
    question: "How do I install a component?",
    answer:
      "Run the shadcn CLI with the @karaui namespace, for example npx shadcn add @karaui/marquee. The source lands in your project with its motion tokens and helpers.",
  },
  {
    id: "license",
    question: "Can I use karaUI in commercial projects?",
    answer:
      "Yes. karaUI is MIT licensed, so you can ship it in client work and paid products. Keep the license notice in copied files.",
  },
  {
    id: "registry",
    question: "Does it work with the shadcn registry?",
    answer:
      "Every component is a registry item. Install by slug, and internal imports such as lib/ease.ts are bundled automatically.",
  },
  {
    id: "reduced-motion",
    question: "What happens with reduced motion?",
    answer:
      "Components read the user's reduced motion preference. Movement is dropped while opacity and color changes stay, so state is still clear.",
  },
  {
    id: "theming",
    question: "How do I theme the components?",
    answer:
      "They use your CSS variables: background, card, muted, primary and the chart palette. Change the tokens and both light and dark themes follow.",
  },
];

export function FaqSectionPreview() {
  return (
    <div className="w-full max-w-[40rem] px-1 py-2">
      <FaqSection
        items={ITEMS}
        defaultValue={["install"]}
        searchable
        description="Everything you need to know about installing, licensing and theming karaUI."
        cta={
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageCircle aria-hidden className="size-4" />
              Still have questions?
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Open a discussion and we usually reply within a day.
            </p>
            <ButtonLink href="#" size="sm" className="self-start">
              Ask the community
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
