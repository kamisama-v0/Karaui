import { cn } from "@/lib/utils";

/**
 * Classes for the element that receives Shiki HTML from `highlightCode`.
 * Kept apart from code-block.tsx so client components can use it without
 * pulling Shiki into the browser bundle.
 */
export const CODE_HTML_CLASS = cn(
  "relative",
  "px-0 py-4 text-[13px] leading-relaxed",
  "[&_pre]:!bg-transparent [&_pre]:!p-0",
  "[&_code]:font-mono [&_code]:text-[13px]",
  "[&_.shiki]:bg-transparent",
  "[&_.line]:px-5",
  "[&_.highlighted]:bg-foreground/[0.07] [&_.highlighted]:border-l-2 [&_.highlighted]:border-blue-500 [&_.highlighted]:!pl-[18px]",
  "[&_.diff.add]:bg-green-500/10 [&_.diff.add]:border-l-2 [&_.diff.add]:border-green-500 [&_.diff.add]:!pl-[18px]",
  "[&_.diff.remove]:bg-red-500/10 [&_.diff.remove]:border-l-2 [&_.diff.remove]:border-red-500 [&_.diff.remove]:!pl-[18px]",
  "[&_.focused]:opacity-100 [&_pre:has(.focused)_.line:not(.focused)]:opacity-30",
  "[&_pre:has(.focused)_.line:not(.focused)]:transition-opacity",
);
