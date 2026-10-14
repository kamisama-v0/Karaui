"use client";

import { useState } from "react";
import { TagInput } from "@/components/motion/tag-input";

const TOPICS = [
  "React",
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "Motion",
  "Accessibility",
  "Design systems",
  "Animation",
  "Server components",
  "Testing",
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TagInputPreview() {
  const [topics, setTopics] = useState(["React", "Motion"]);

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <TagInput
        label="Topics"
        value={topics}
        onChange={setTopics}
        suggestions={TOPICS}
        maxTags={5}
        placeholder="Add a topic…"
        hint="Enter, comma or Tab to add · Backspace twice to remove"
      />
      <TagInput
        label="Invite by email"
        defaultValue={["ada@example.com"]}
        placeholder="name@company.com"
        validate={(tag) => EMAIL.test(tag) || "That doesn't look like an email"}
        hint="Paste a comma-separated list to add several"
      />
    </div>
  );
}
