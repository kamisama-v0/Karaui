import { Bell, Bookmark, Heart, Share2 } from "lucide-react";
import Link from "next/link";
import { Demo } from "@/components/app/blog/demo";
import { Callout, H2, H3 } from "@/components/app/blog/prose";
import { CodeBlock } from "@/components/app/docs/code-block";
import { Button } from "@/components/motion/button";
import { Pagination } from "@/components/motion/pagination";
import type { BlogPostMeta, BlogTocItem } from "@/lib/blog";
import { TOUCH_TARGET_CLASS } from "@/lib/touch";

export const meta: BlogPostMeta = {
  slug: "touch-targets-without-redesign",
  title: "44px touch targets without redesigning your UI",
  description:
    "How karaUI gives small controls a 44×44px hit area on touch screens with one invisible ::after box, without changing how anything looks or lays out, plus the overlap math, the hybrid-device caveat and iOS's 16px input rule.",
  date: "2026-10-20",
  author: "kara",
  tags: ["Accessibility", "Touch targets", "WCAG", "CSS", "Tailwind CSS", "Mobile"],
  readingMinutes: 7,
  category: "Accessibility",
  related: [
    { category: "motion", slug: "button" },
    { category: "motion", slug: "pagination" },
    { category: "motion", slug: "input" },
    { category: "motion", slug: "switch" },
  ],
};

export const toc: BlogTocItem[] = [
  { id: "why-44px", label: "Why 44px" },
  { id: "why-not-bigger", label: "Why not make buttons bigger?" },
  { id: "one-invisible-box", label: "One invisible box" },
  { id: "four-rules", label: "Four rules for the element" },
  { id: "dense-rows", label: "Dense rows and the overlap math" },
  {
    id: "caveats",
    label: "Caveats",
    children: [
      { id: "hybrid-devices", label: "Hybrid devices" },
      { id: "scroll-containers", label: "Scroll containers" },
    ],
  },
  { id: "ios-input-zoom", label: "The other 16px: input zoom" },
  { id: "checklist", label: "Checklist" },
];

const CLASS_SNIPPET = `// lib/touch.ts
export const TOUCH_TARGET_CLASS =
  "${TOUCH_TARGET_CLASS}";`;

const CSS_SNIPPET = `/* What TOUCH_TARGET_CLASS amounts to, without the Tailwind syntax */
@media (pointer: coarse) {
  .control::after {
    content: "";
    position: absolute; /* against the control, which is relative */
    top: 50%;
    left: 50%;
    width: max(100%, 2.75rem); /* never smaller than the control */
    height: max(100%, 2.75rem); /* 2.75rem = 44px at a 16px root */
    translate: -50% -50%;
  }
}`;

const ICON_BUTTON_SNIPPET = `import type { ComponentProps } from "react";
import { TOUCH_TARGET_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

// Looks like a 32px button everywhere; catches taps like a 44px one on touch.
export function IconButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-grid size-8 place-items-center rounded-md",
        TOUCH_TARGET_CLASS,
        className,
      )}
      {...props}
    />
  );
}`;

const CLIP_SNIPPET = `// Clipping on the button would clip its hit area too.
// Clip an inner layer instead, and let the button overhang on touch.
<button
  className={cn(
    "relative overflow-hidden pointer-coarse:overflow-visible",
    TOUCH_TARGET_CLASS,
  )}
>
  <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
    {/* ripple, rolling digits, anything that must stay inside the shape */}
  </span>
  {children}
</button>`;

const DENSE_SNIPPET = `import { TOUCH_TARGET_Y_CLASS } from "@/lib/touch";

// 20px swatches, 2px apart: a 22px pitch. Growing sideways would hand half of
// each swatch to its neighbour, so grow vertically only.
<div className="flex gap-0.5">
  {colors.map((color) => (
    <button
      key={color.id}
      type="button"
      aria-label={color.name}
      className={cn("relative size-5 rounded-full", TOUCH_TARGET_Y_CLASS)}
      style={{ background: color.value }}
    />
  ))}
</div>`;

const SCROLLER_SNIPPET = `// A 32px control overhangs by (44 - 32) / 2 = 6px on each side.
// Pad the scroller by that much so the overhang isn't scrollable overflow.
<div className="flex gap-2 overflow-x-auto px-1.5">
  {chips}
</div>`;

const INPUT_SNIPPET = `// 16px on the field itself. The label and helper text can stay smaller.
<input className="text-base leading-6" />`;

export default function TouchTargetsPost() {
  return (
    <>
      <p>
        Most of karaUI&apos;s controls are drawn smaller than a fingertip. The
        small Button is 32px tall, the icon button is 32×32, a Pagination page
        is a 36px circle and its dots are 20px. On a trackpad that is plenty.
        On a phone it is a miss waiting to happen. The fix I wanted could not
        touch a single visual size, because each of those sizes was chosen for
        density and alignment on desktop. This post covers how the fix works,
        where it breaks, and how to apply it to your own controls.
      </p>

      <H2 id="why-44px">Why 44px</H2>
      <p>
        The same few numbers come up every time.{" "}
        <strong>WCAG 2.5.5 Target Size (Enhanced)</strong>, a Level AAA
        criterion, asks for pointer targets of at least 44 by 44 CSS pixels.
        WCAG 2.2 added <strong>2.5.8 Target Size (Minimum)</strong> at Level
        AA: 24 by 24, or enough spacing that a 24px circle centered on each
        undersized target doesn&apos;t intersect another target or another
        target&apos;s circle. Apple&apos;s Human Interface Guidelines recommend
        a hit target of at least <strong>44×44 points</strong> for anything
        tappable. With the usual <code>width=device-width</code> viewport, a
        CSS pixel on an iPhone is one point, so on iOS the two 44s are the
        same size.
      </p>
      <p>
        The reason is anatomy, not taste. A fingertip&apos;s contact patch is
        far wider than a mouse pointer&apos;s hotspot, and the finger hides the
        thing it is aiming at. karaUI aims for 44 on touch: it is the stricter
        number, and the one iOS users already have in their thumbs.
      </p>

      <H2 id="why-not-bigger">Why not make buttons bigger?</H2>
      <p>The obvious fix is to draw everything at 44px. I didn&apos;t, for three reasons.</p>
      <ul>
        <li>
          <strong>Density on desktop is a feature.</strong> A toolbar of 44px
          icon buttons, a 44px pagination row, 44px tag chips: with a mouse,
          that is space taken from content.
        </li>
        <li>
          <strong>Swapping sizes per device moves layout.</strong> A{" "}
          <code>@media (pointer: coarse)</code> rule that sets{" "}
          <code>height: 44px</code> works, but now a toolbar that fit on one
          line wraps on a tablet and a table row loses its rhythm. Every
          layout has to be checked twice.
        </li>
        <li>
          <strong>Visual size and hit size are different properties.</strong>{" "}
          One is what you see, the other is where a press counts. Tie them
          together and every touch fix becomes a redesign.
        </li>
      </ul>
      <p>
        So the goal was narrower: keep every visual size, leave layout alone,
        grow only the area that catches the press, and only on touch.
      </p>

      <H2 id="one-invisible-box">One invisible box</H2>
      <p>
        This class from <code>lib/touch.ts</code> does all of it:
      </p>
      <CodeBlock code={CLASS_SNIPPET} lang="ts" filename="lib/touch.ts" />
      <p>Written as plain CSS, that is:</p>
      <CodeBlock code={CSS_SNIPPET} lang="css" filename="equivalent.css" />
      <p>
        The <code>::after</code> is positioned against the control, centered,
        and <code>max(100%, 2.75rem)</code> on each axis. Because it is{" "}
        <code>max()</code>, it can only grow:
      </p>
      <ul>
        <li>a 32px icon button gets a 44px box that reaches 6px past each edge;</li>
        <li>
          the 40px-tall default Button is already wider than 44px, so it only
          grows vertically, 2px above and below;
        </li>
        <li>the 48px large Button is left exactly as it is.</li>
      </ul>
      <p>
        Hit-testing a pseudo-element lands on its owner, so the event target
        is the button itself: <code>onClick</code>, focus and{" "}
        <code>:active</code> all behave as if the button were bigger. Nothing
        paints, because the box has no background or border. Nothing moves,
        because an absolutely positioned box takes no space in layout. And
        every utility sits behind <code>pointer-coarse:</code>, Tailwind&apos;s{" "}
        <code>@media (pointer: coarse)</code> variant, so mouse and trackpad
        rendering is untouched.
      </p>
      <Demo
        hitAreas
        caption="Live karaUI Buttons and Pagination. Flip the switch to draw their touch hit areas with any pointer; on a phone they are already there, just invisible."
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Default</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Like">
            <Heart className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Bookmark">
            <Bookmark className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Share">
            <Share2 className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Notifications">
            <Bell className="size-4" />
          </Button>
        </div>
        <Pagination total={10} defaultPage={5} siblings={0} />
        <Pagination total={8} defaultPage={3} variant="dots" />
      </Demo>
      <p>
        Every Button size carries the class, and so do Switch, Checkbox, Radio
        Group, Toggle, the Select trigger, the pill and segment Tabs triggers, Pagination, Number
        Stepper and Copy Button. The full list is on the{" "}
        <Link href="/docs/mobile#touch-targets">Mobile &amp; responsive</Link>{" "}
        page. For your own controls, import the class and add it:
      </p>
      <CodeBlock code={ICON_BUTTON_SNIPPET} lang="tsx" filename="icon-button.tsx" />

      <H2 id="four-rules">Four rules for the element</H2>
      <p>
        The box only works if the element it goes on plays along. These come
        straight from the comment above <code>TOUCH_TARGET_CLASS</code>:
      </p>
      <ol>
        <li>
          <strong>It must be the containing block.</strong> Add{" "}
          <code>relative</code>, and keep it mergeable so a consumer&apos;s{" "}
          <code>absolute</code> still wins through <code>cn()</code>.
        </li>
        <li>
          <strong>It must not clip itself.</strong>{" "}
          <code>overflow-hidden</code> clips the overhang, and the hit area
          with it.
        </li>
        <li>
          <strong>It must render children.</strong> <code>&lt;input&gt;</code>{" "}
          and other void elements have no <code>::after</code>. Put the class
          on the wrapper or the label instead.
        </li>
        <li>
          <strong>
            It must not already use <code>::after</code>
          </strong>{" "}
          for something visible.
        </li>
      </ol>
      <p>
        Rule two is the one that bites, because plenty of controls clip on
        purpose. Button&apos;s ripple is the worked example: with{" "}
        <code>ripple</code> on, the button is{" "}
        <code>overflow-hidden pointer-coarse:overflow-visible</code>, and the
        ripple layer clips itself on an inner span. Pagination goes one step
        further for its rolling page numbers: the button never clips, only a
        span inside it does. The pattern:
      </p>
      <CodeBlock code={CLIP_SNIPPET} lang="tsx" filename="clipped-control.tsx" />

      <H2 id="dense-rows">Dense rows and the overlap math</H2>
      <p>
        Centered boxes overlap when controls sit close together. For two
        controls smaller than 44px along the row, the overlap is simply{" "}
        <strong>44 − pitch</strong>, where pitch is the control&apos;s size
        plus the gap:
      </p>
      <ul>
        <li>two 32px icon buttons 4px apart (36px pitch): 8px of overlap;</li>
        <li>Pagination pages, 36px with a 4px gap (40px pitch): 4px;</li>
        <li>Pagination dots, 20px with a 2px gap (22px pitch): 22px, half the box.</li>
      </ul>
      <p>
        The later element in the DOM wins the overlap: both boxes are
        positioned with no z-index, so the later one paints, and hit-tests, on
        top. That is fine while the strip it takes stays away from the earlier
        control&apos;s center. The later neighbour&apos;s box starts{" "}
        <code>pitch − 22</code>px from that center: 14px at a 36px pitch, 10px
        at 32px, and zero at 22px, where a tap on the dead center of one dot
        would go to the next. karaUI draws the line at about 32px. Below that,
        use <code>TOUCH_TARGET_Y_CLASS</code>, which grows the box vertically
        only. Pagination&apos;s dots use it, so each one stays 20px wide but
        is 44px tall on touch.
      </p>
      <CodeBlock code={DENSE_SNIPPET} lang="tsx" filename="swatches.tsx" />
      <Callout tone="note" title="On a mouse, the drawn size is the target">
        <p>
          Nothing here applies to fine pointers, so the visual sizes have to
          stand on their own against 2.5.8&apos;s 24px. Button&apos;s smallest
          size is 32px. Pagination dots are 20px, below it; the 32px arrows
          beside them move through the same pages.
        </p>
      </Callout>

      <H2 id="caveats">Caveats</H2>
      <H3 id="hybrid-devices">Hybrid devices</H3>
      <p>
        <code>pointer: coarse</code> describes the device&apos;s{" "}
        <em>primary</em> pointer, not the one in the user&apos;s hand. A laptop
        with a touchscreen keeps the trackpad as primary, so a finger on that
        screen gets the drawn size, not 44px. A tablet with a mouse attached
        keeps touch as primary, so the mouse gets the enlarged boxes. They are
        invisible and mostly harmless, except in the overlap strips, where a
        click right at a control&apos;s edge lands on its neighbour.
      </p>
      <p>
        No media query can say which pointer a given press came from; the
        query is about the device, the question is about the gesture.
        Tailwind also ships <code>any-pointer-coarse:</code>, which matches if
        any attached pointer is coarse. That would cover the touchscreen
        laptop, at the price of overlapping boxes under its mouse all the time.
        karaUI stays on the primary pointer, which is right on every machine
        that is one thing or the other.
      </p>
      <H3 id="scroll-containers">Scroll containers</H3>
      <p>
        The overhang is real geometry. Inside a scroll container it counts as
        scrollable overflow, so a control flush against the scroller&apos;s
        edge can add a few pixels of scroll on touch screens. Pad that side by
        the overhang, which is <code>(44 − size) / 2</code>:
      </p>
      <CodeBlock code={SCROLLER_SNIPPET} lang="tsx" filename="chip-row.tsx" />

      <H2 id="ios-input-zoom">The other 16px: input zoom</H2>
      <p>
        Hit areas are half of &ldquo;works on a phone&rdquo;. The other half is
        iOS Safari zooming the page when a text field with a font size below
        16px gets focus, then leaving the page zoomed in after the field is
        done with. karaUI&apos;s{" "}
        <Link href="/components/motion/input">Input</Link> and{" "}
        <Link href="/components/motion/textarea">Textarea</Link> set{" "}
        <code>text-base</code> (16px) on the field itself, so focusing them
        never triggers it.
      </p>
      <CodeBlock code={INPUT_SNIPPET} lang="tsx" filename="field.tsx" />
      <Callout tone="warning" title="Don't fix it with the viewport meta">
        <p>
          <code>maximum-scale=1</code> stops the focus zoom, but in browsers
          that honour it, it also disables pinch-zoom for the people who rely
          on it. Size the text instead.
        </p>
      </Callout>

      <H2 id="checklist">Checklist</H2>
      <ul>
        <li>
          Keep your visual sizes. Add <code>TOUCH_TARGET_CLASS</code> to
          anything tappable that is smaller than 44px on either axis.
        </li>
        <li>
          The element is <code>relative</code>, doesn&apos;t clip itself,
          isn&apos;t a void element, and has a free <code>::after</code>.
        </li>
        <li>
          Pitch under about 32px? Use <code>TOUCH_TARGET_Y_CLASS</code>.
        </li>
        <li>Pad scrollers by the overhang on the side a control touches.</li>
        <li>Give text fields 16px text.</li>
        <li>
          Check it on a real phone, and use the switch in the demo above to see
          where boxes overlap.
        </li>
      </ul>
    </>
  );
}
