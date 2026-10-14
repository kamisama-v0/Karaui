"use client";

import { useState } from "react";
import { MultiSelect } from "@/components/motion/multi-select";

const LABELS = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "docs", label: "Documentation", keywords: ["readme"] },
  { value: "design", label: "Design" },
  { value: "perf", label: "Performance", keywords: ["speed"] },
  { value: "a11y", label: "Accessibility", keywords: ["a11y"] },
];

const FRAMEWORKS = [
  {
    label: "Frontend",
    options: [
      { value: "react", label: "React" },
      { value: "vue", label: "Vue" },
      { value: "svelte", label: "Svelte" },
      { value: "solid", label: "Solid" },
      { value: "angular", label: "Angular", disabled: true },
    ],
  },
  {
    label: "Meta-frameworks",
    options: [
      { value: "next", label: "Next.js" },
      { value: "nuxt", label: "Nuxt" },
      { value: "sveltekit", label: "SvelteKit" },
      { value: "remix", label: "Remix" },
      { value: "astro", label: "Astro" },
    ],
  },
];

export function MultiSelectPreview() {
  const [labels, setLabels] = useState(["bug", "design"]);

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <MultiSelect
        label="Labels"
        options={LABELS}
        value={labels}
        onValueChange={setLabels}
        creatable
        placeholder="Assign labels…"
      />
      <MultiSelect
        label="Frameworks"
        options={FRAMEWORKS}
        defaultValue={["react", "next", "svelte", "astro"]}
        max={5}
        maxVisibleChips={2}
        placeholder="Pick up to 5…"
      />
    </div>
  );
}
