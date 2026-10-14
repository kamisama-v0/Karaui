"use client";

import {
  type Testimonial,
  TestimonialWall,
} from "@/components/motion/testimonial-wall";

// Fictional people and companies.
const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Mara Lindqvist",
    role: "Design engineer, Northwind",
    rating: 5,
    quote:
      "We swapped our hand-rolled accordion for this in an afternoon. The springs feel considered, not bouncy for the sake of it.",
  },
  {
    id: "2",
    name: "Tomasz Okafor",
    role: "Founder, Quillstack",
    rating: 5,
    quote: "Copy, paste, ship. The reduced motion handling alone saved us a sprint.",
  },
  {
    id: "3",
    name: "Priya Raman",
    role: "Frontend lead, Fernhill",
    quote:
      "Our marketing site finally feels as polished as the product. Light and dark both look right without touching a single token.",
  },
  {
    id: "4",
    name: "Jonah Weller",
    role: "Indie developer",
    rating: 4,
    quote: "Readable source, no magic. I learned more about motion from the code than from most tutorials.",
  },
  {
    id: "5",
    name: "Aiko Brandt",
    role: "Product designer, Lumen Labs",
    rating: 5,
    quote:
      "The details are what sold me: exits faster than entrances, focus rings that respect the shape, nothing janky on touch.",
  },
  {
    id: "6",
    name: "Diego Santamaria",
    role: "CTO, Parcelpoint",
    quote: "Installed through the shadcn CLI and it just slotted into our design system.",
  },
  {
    id: "7",
    name: "Hannah Osei",
    role: "Staff engineer, Brightline",
    rating: 5,
    quote:
      "Accessible by default is rare for animation libraries. This one treats keyboard users like first-class citizens.",
  },
  {
    id: "8",
    name: "Felix Navarro",
    role: "Freelance designer",
    rating: 5,
    quote: "Clients keep asking how the hero animates. I just smile.",
  },
  {
    id: "9",
    name: "Sofia Kowalski",
    role: "Engineering manager, Tidewater",
    quote:
      "We onboarded two new hires on it in a day. The conventions are consistent from one component to the next.",
  },
];

export function TestimonialWallPreview() {
  return (
    <div className="w-full max-w-[40rem] px-1">
      <TestimonialWall testimonials={TESTIMONIALS} height="27rem" speed={36} />
    </div>
  );
}
