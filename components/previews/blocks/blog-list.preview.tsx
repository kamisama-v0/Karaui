"use client";

import { BlogList, type BlogPost } from "@/components/motion/blog-list";
import { ScrollArea } from "@/components/motion/scroll-area";

const POSTS: BlogPost[] = [
  {
    id: "p1",
    title: "Designing motion that respects attention",
    excerpt: "Why the best interface animations are short, purposeful and easy to turn off — and how we tune ours.",
    category: "Design",
    author: { name: "Maya Chen" },
    date: "2026-10-12T09:00:00Z",
    readTime: 7,
    featured: true,
  },
  {
    id: "p2",
    title: "Shipping a registry with zero build step",
    excerpt: "Copy-paste components still need versioning. Here is the pipeline behind our install command.",
    category: "Engineering",
    author: { name: "Leo Park" },
    date: "2026-10-09T09:00:00Z",
    readTime: 5,
  },
  {
    id: "p3",
    title: "Tokens over themes",
    excerpt: "One set of CSS variables, ten design styles. What we learned re-skinning every component.",
    category: "Design",
    author: { name: "Ava Rossi" },
    date: "2026-10-05T09:00:00Z",
    readTime: 4,
  },
  {
    id: "p4",
    title: "October release notes",
    excerpt: "Inbox, file manager, music player and four more blocks land in this release.",
    category: "Product",
    author: { name: "Sam Okafor" },
    date: "2026-10-02T09:00:00Z",
    readTime: 3,
  },
  {
    id: "p5",
    title: "Springs you can reason about",
    excerpt: "Stiffness, damping and mass explained with the five springs we actually use.",
    category: "Engineering",
    author: { name: "Leo Park" },
    date: "2026-09-28T09:00:00Z",
    readTime: 6,
  },
  {
    id: "p6",
    title: "Accessible drag and drop",
    excerpt: "Keyboard pick-up, live announcements and touch delays — the parts users never notice.",
    category: "Engineering",
    author: { name: "Maya Chen" },
    date: "2026-09-21T09:00:00Z",
    readTime: 8,
  },
  {
    id: "p7",
    title: "How we pick a default easing",
    excerpt: "A strong ease-out beats the browser default nearly every time. Here is the curve and why.",
    category: "Design",
    author: { name: "Ava Rossi" },
    date: "2026-09-14T09:00:00Z",
    readTime: 4,
  },
  {
    id: "p8",
    title: "Pricing pages that convert",
    excerpt: "Toggle, compare, decide: the three jobs of a pricing section and the blocks for each.",
    category: "Product",
    author: { name: "Sam Okafor" },
    date: "2026-09-07T09:00:00Z",
    readTime: 5,
  },
];

export function BlogListPreview() {
  return (
    <ScrollArea aria-label="Blog posts" className="h-[28rem] w-full max-w-[40rem]" viewportClassName="p-1">
      <BlogList posts={POSTS} pageSize={3} onPostClick={() => {}} />
    </ScrollArea>
  );
}
