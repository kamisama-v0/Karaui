"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/motion/accordion";

const faqs = [
  {
    id: "install",
    q: "How do I install a component?",
    a: "Add the karaUI registry to components.json once, then run the shadcn CLI with the component's name. The source lands in your project, so you own every line.",
  },
  {
    id: "motion",
    q: "Does it respect reduced motion?",
    a: "Yes. Panels still open and close, but the height snaps instead of animating and only a short opacity fade remains. The chevron stops rotating smoothly too.",
  },
  {
    id: "keyboard",
    q: "Can I use it with the keyboard?",
    a: "Tab reaches each trigger, Enter or Space toggles it, and the arrow keys, Home and End move focus between triggers without leaving the accordion.",
  },
  {
    id: "controlled",
    q: "Can I control which items are open?",
    a: "Pass value and onValueChange to drive it from state, or defaultValue to let it manage itself. type=\"multiple\" keeps several items open at once.",
  },
];

export function AccordionPreview() {
  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card px-5 py-1 shadow-sm">
      <Accordion type="single" collapsible defaultValue="install">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            className={i === faqs.length - 1 ? "border-b-0" : undefined}
          >
            <AccordionTrigger>{faq.q}</AccordionTrigger>
            <AccordionContent>{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
