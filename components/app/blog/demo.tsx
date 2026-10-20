"use client";

import { type ReactNode, useState } from "react";
import { Switch } from "@/components/motion/switch";
import { cn } from "@/lib/utils";

/*
 * Draws the hit areas that `TOUCH_TARGET_CLASS` / `TOUCH_TARGET_Y_CLASS`
 * (lib/touch.ts) create, on any pointer. Their `::after` box only exists under
 * `pointer: coarse`, so this re-creates the same geometry unconditionally,
 * keyed off the classes themselves, and tints it. The boxes stay hit-testable,
 * so with the overlay on, a mouse gets exactly the touch hit areas.
 * `translate` (not `transform`) matches what Tailwind's translate utilities
 * set, so on a touch screen the two rules agree instead of adding up.
 */
const HIT_AREA_CSS = `
[data-show-hit-areas] [class*="pointer-coarse:after:content-"]::after {
  content: "";
  position: absolute;
  top: 50%;
  border: 1px dashed color-mix(in oklab, var(--foreground) 55%, transparent);
  border-radius: 6px;
  background: color-mix(in oklab, var(--foreground) 7%, transparent);
}
[data-show-hit-areas] [class*="pointer-coarse:after:size-"]::after {
  left: 50%;
  width: max(100%, 2.75rem);
  height: max(100%, 2.75rem);
  translate: -50% -50%;
}
[data-show-hit-areas] [class*="pointer-coarse:after:inset-x-0"]::after {
  left: 0;
  right: 0;
  height: max(100%, 2.75rem);
  translate: 0 -50%;
}
`;

/**
 * Live demo frame for posts, styled like the docs preview frame. Children are
 * real karaUI components (client components are fine). `hitAreas` adds a
 * "Show touch hit areas" switch that outlines every touch-target box inside.
 */
export function Demo({
  children,
  caption,
  hitAreas = false,
  className,
}: {
  children: ReactNode;
  caption?: ReactNode;
  /** Adds a switch that visualises `TOUCH_TARGET_CLASS` hit areas. */
  hitAreas?: boolean;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <figure className="min-w-0">
      {hitAreas ? (
        <style
          // Static string, no user input.
          dangerouslySetInnerHTML={{ __html: HIT_AREA_CSS }}
        />
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div
          data-show-hit-areas={show ? "" : undefined}
          className={cn(
            "flex min-h-[220px] flex-col items-center justify-center gap-6 px-4 py-10",
            className,
          )}
        >
          {children}
        </div>
        {hitAreas ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
            <span className="text-xs text-muted-foreground">
              {show
                ? "Dashed boxes: the hit area each control gets on a touch screen."
                : "Hit areas are invisible and only exist on coarse pointers."}
            </span>
            <Switch
              checked={show}
              onCheckedChange={setShow}
              label="Show hit areas"
            />
          </div>
        ) : null}
      </div>
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
