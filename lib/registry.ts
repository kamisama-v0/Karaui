import { type AgentGuide, agentGuides } from "@/lib/agent-guides";

export type ComponentExample = {
  slug: string;
  name: string;
  description?: string;
  badge?: "new";
  /** ISO date this variant shipped. */
  launchedAt?: string;
  /** Optional install slug for variants that have their own registry command. */
  installSlug?: string;
  /** Source file shown under Source tab. */
  file: string;
  /** Key into the previews registry (e.g. "motion/button-base"). */
  previewKey: string;
  /** Path to the preview file used for the Usage tab. */
  previewFile: string;
  /** Optional composition file shown instead of the live preview source. */
  usageFile?: string;
};

export type ComponentEntry = {
  slug: string;
  name: string;
  description: string;
  file: string;
  /** Optional contributor credit shown on the website only. */
  credit?: {
    name: string;
    url: string;
  };
  badge?: "new";
  /** ISO date the component shipped. Drives newest-first order in the landing
   * "Recently launched" section. Set it when adding a "new" component. */
  launchedAt?: string;
  /** Optional hand-tuned SEO keywords, merged on top of generated ones. */
  keywords?: string[];
  /** Extra source files bundled under this slug (e.g. multi-file components). */
  extraFiles?: string[];
  /** Optional composition file shown instead of the live preview source. */
  usageFile?: string;
  /** Per-variant breakdown rendered as separate Preview / Usage / Source on the page. */
  examples?: ComponentExample[];
  /** Optional behavior guide rendered on the component documentation page. */
  guide?: AgentGuide;
  /**
   * Max width of the block viewer. Most blocks are widget-sized and use the
   * default cap; page-like blocks (app shells, settings, inboxes) set "wide".
   */
  previewWidth?: "default" | "wide";
};

export type CategoryEntry = {
  slug: string;
  name: string;
  description: string;
  components: ComponentEntry[];
};

export const registry: CategoryEntry[] = [
  {
    slug: "motion",
    name: "Components",
    description:
      "The primitives of karaUI: inputs, menus, overlays, date pickers, tables, charts and text effects for React, animated with Motion and installed as source via shadcn.",
    components: [
      {
        slug: "tilt-card",
        name: "Tilt Card",
        description: "Wrap a product shot, pricing tier or profile in TiltCard and it leans toward the cursor in 3D while a soft highlight follows the pointer; tilt angle and glare are props, and it stays flat on touch screens and under reduced motion.",
        file: "components/motion/tilt-card.tsx",
      },
      {
        slug: "button",
        name: "Button",
        description: "Three buttons in one install: a Button that dips when pressed (with an opt-in Material ripple), a StatefulButton that rolls its label through loading, success and error, and a MagneticButton that drifts toward the pointer. Every size gets an invisible 44px hit area on touch screens.",
        file: "components/motion/button/index.tsx",
        extraFiles: [
          "components/motion/button/base.tsx",
          "components/motion/button/stateful.tsx",
          "components/motion/button/magnetic.tsx",
        ],
        examples: [
          {
            slug: "base",
            name: "Button",
            description: "The everyday button: primary, secondary, ghost and outline styles in sm, md, lg and icon sizes, a spring dip on press, a slight grow on hover and an opt-in ripple from the press point. ButtonLink renders the same look as an anchor.",
            installSlug: "button-base",
            file: "components/motion/button/base.tsx",
            previewKey: "motion/button-base",
            previewFile: "components/previews/motion/button-base.preview.tsx",
          },
          {
            slug: "stateful",
            name: "Stateful Button",
            description: "Set state to idle, loading, success or error and the label rolls over letter by letter, the icon slides in or out, and the button width eases to fit the new text. Copy for each state is a prop.",
            installSlug: "button-stateful",
            file: "components/motion/button/stateful.tsx",
            previewKey: "motion/button-stateful",
            previewFile: "components/previews/motion/button-stateful.preview.tsx",
          },
          {
            slug: "magnetic",
            name: "Magnetic Button",
            description: "Button inside a Magnetic container, so it is tugged a little toward the cursor as it passes; strength (0.25 by default) sets the pull and the wrapper takes its own class.",
            installSlug: "button-magnetic",
            file: "components/motion/button/magnetic.tsx",
            previewKey: "motion/button-magnetic",
            previewFile: "components/previews/motion/button-magnetic.preview.tsx",
          },
        ],
      },
      {
        slug: "expanding-arrow-button",
        name: "Animated CTA Buttons",
        description:
          "Three call-to-action buttons for moments that deserve more than a click: an arrow tile that stretches across the button, a press-and-hold button that fills up before it fires, and a swipe-to-confirm track for actions nobody should trigger by accident.",
        file: "components/motion/expanding-arrow-button.tsx",
        extraFiles: [
          "components/motion/hold-action-button.tsx",
          "components/motion/slide-action-button.tsx",
        ],
        badge: "new",
        launchedAt: "2026-07-16",
        examples: [
          {
            slug: "expanding-arrow",
            name: "Expanding Arrow Button",
            description:
              "The accent block on the left widens to cover the button and lays out a dotted arrow trail when you hover or tab to it, while the label fades aside.",
            installSlug: "expanding-arrow-button",
            file: "components/motion/expanding-arrow-button.tsx",
            previewKey: "motion/expanding-arrow-button",
            previewFile:
              "components/previews/motion/expanding-arrow-button.preview.tsx",
          },
          {
            slug: "hold-action",
            name: "Hold Action Button",
            description:
              "Keep pressing with a mouse, finger, Space or Enter and a liquid fill rises or sweeps across; onHoldComplete fires only when it finishes, and letting go or sliding off cancels. Duration and labels are configurable.",
            installSlug: "hold-action-button",
            file: "components/motion/hold-action-button.tsx",
            previewKey: "motion/hold-action-button",
            previewFile:
              "components/previews/motion/hold-action-button.preview.tsx",
          },
          {
            slug: "slide-action",
            name: "Slide Action Button",
            description:
              "A thumb you drag along a track: past the threshold it locks in and calls onComplete, short of it the thumb springs home. Enter or Space completes it from the keyboard, and it resets after resetDelay.",
            installSlug: "slide-action-button",
            file: "components/motion/slide-action-button.tsx",
            previewKey: "motion/slide-action-button",
            previewFile:
              "components/previews/motion/slide-action-button.preview.tsx",
          },
        ],
      },
      {
        slug: "marquee",
        name: "Marquee",
        description: "Loops logos, testimonials or tickers without end in any of four directions on a plain CSS keyframe animation, with adjustable speed and gap, a soft fade mask at both ends and an optional pause while the pointer rests on it.",
        file: "components/motion/marquee.tsx",
      },
      {
        slug: "tabs",
        name: "Tabs",
        description: "Tabs, TabsList, TabsTrigger and TabsContent in pill, segment or underline styles; the active marker slides to the chosen trigger on a slightly weighty spring, hidden panels stay in the HTML for crawlers, and triggers grow to a 44px hit area on touch screens.",
        file: "components/motion/tabs.tsx",
      },
      {
        slug: "switch",
        name: "Switch",
        description: "An on/off control exposed as role=\"switch\": a heavy spring carries the thumb across, it squashes a little while held, it shakes if pressed while disabled, and on coarse pointers the hit area grows to 44px. Label text is optional.",
        file: "components/motion/switch.tsx",
      },
      {
        slug: "input",
        name: "Input",
        description: "A labelled form field with left and right icon slots: setting error shakes it, turns the border red and blurs a message in underneath, while success draws a check mark at the right edge. Works controlled or uncontrolled, with a classNames hook for every part.",
        file: "components/motion/input.tsx",
        keywords: [
          "animated text field react",
          "input error shake animation",
          "input with icon tailwind",
          "form validation input react",
          "success checkmark input",
          "shadcn input alternative",
        ],
      },
      {
        slug: "select",
        name: "Select",
        description: "A dropdown for choosing one value from a short list. The standard Select pops its list out of the trigger with a springy pinch and flips upward near the bottom of the screen; MorphSelect grows the trigger itself into the list. Both close on Escape.",
        file: "components/motion/select.tsx",
        badge: "new",
        launchedAt: "2026-06-28",
        examples: [
          {
            slug: "default",
            name: "Select",
            description: "Compose Select, SelectTrigger, SelectValue, SelectContent and SelectItem. Opening squeezes the list away from the button like a droplet splitting off, options cascade in, and it opens upward when there is no room below.",
            installSlug: "select",
            file: "components/motion/select.tsx",
            previewKey: "motion/select",
            previewFile: "components/previews/motion/select.preview.tsx",
          },
          {
            slug: "morph",
            name: "Morph Select",
            description: "The same composable API with a Morph prefix, except trigger and list share a layoutId: the button stretches into the open list and shrinks back into a button without ever breaking into two pieces.",
            installSlug: "select-morph",
            file: "components/motion/select-morph.tsx",
            previewKey: "motion/select-morph",
            previewFile: "components/previews/motion/select-morph.preview.tsx",
          },
        ],
      },
      {
        slug: "combobox",
        name: "Combobox",
        description:
          "A select you type into: the input is the trigger, items filter by label or extra keywords across groups, arrow keys move a sliding highlight, and the list springs open in a portal that holds its side while closing. Value, open state and query are controllable.",
        file: "components/motion/combobox.tsx",
        badge: "new",
        launchedAt: "2026-08-11",
        guide: agentGuides.combobox,
        keywords: [
          "react combobox autocomplete",
          "searchable dropdown react",
          "typeahead select tailwind",
          "filterable select component",
          "shadcn combobox alternative",
          "keyboard navigable listbox",
        ],
      },
      {
        slug: "checkbox",
        name: "Checkbox",
        description:
          "A role=\"checkbox\" control whose tick is drawn as an SVG stroke, that dips when pressed and shows a dash for the mixed state through indeterminate. Takes an optional label and aria-describedby for error text, and grows to a 44px hit area on touch devices.",
        file: "components/motion/checkbox.tsx",
        badge: "new",
        launchedAt: "2026-06-23",
      },
      {
        slug: "radio",
        name: "Radio Group",
        description:
          "RadioGroup and RadioGroupItem for picking one option: the filled dot travels from the old choice to the new one through a shared layoutId, items dip when pressed, groups run vertically or horizontally, and every item gets a 44px touch target.",
        file: "components/motion/radio.tsx",
        badge: "new",
        launchedAt: "2026-06-23",
      },
      {
        slug: "bottom-sheet",
        name: "Bottom Sheet",
        description: "A mobile-style sheet you drag between snap points (screen fractions or auto height); a fast flick or long pull dismisses it. It portals to the body, pins the page so iOS cannot scroll underneath, and closes on Escape or a scrim tap.",
        file: "components/motion/bottom-sheet.tsx",
      },
      {
        slug: "pull-to-refresh",
        name: "Pull to Refresh",
        description:
          "Wrap a scrollable feed to get the gesture from native apps: dragging down from the top meets growing resistance, the indicator shows pull, release and refreshing states, and onRefresh can return a promise that keeps the spinner up until it resolves. Mouse drags work too.",
        file: "components/motion/pull-to-refresh.tsx",
        badge: "new",
        launchedAt: "2026-07-17",
        keywords: [
          "pull to refresh react",
          "swipe down to refresh web",
          "mobile feed refresh gesture",
          "pwa pull to refresh",
          "react refresh spinner",
          "touch gesture component react",
        ],
      },
      {
        slug: "shared-layout-bg",
        name: "Shared Layout Background",
        description: "Put it around a list of links or menu rows and a soft highlight follows whichever item is under the pointer, sliding from row to row through a shared layout animation and blurring in or out as you enter or leave the list.",
        file: "components/motion/shared-layout-bg.tsx",
      },
      {
        slug: "bounce-sidebar",
        name: "Bounce Sidebar",
        description:
          "Vertical navigation where the active marker swings out on a curve to reach the newly chosen item rather than sliding straight down, bowing wider and landing heavier on longer trips. Items can be links or buttons with icons; selection is controlled or uncontrolled.",
        file: "components/motion/bounce-sidebar.tsx",
        badge: "new",
        launchedAt: "2026-07-22",
        keywords: [
          "bouncing nav indicator",
          "react vertical navigation",
          "animated active link indicator",
          "spring sidebar menu",
          "sidebar selection animation",
          "framer motion navigation",
        ],
      },
      {
        slug: "animated-sidebar",
        name: "Animated Sidebar",
        guide: agentGuides["animated-sidebar"],
        description:
          "An app-shell sidebar in shadcn's shape (provider, header, groups, menus, sub-menus, rail) whose nested menus open with a clip reveal. On desktop it collapses to an icon strip or off-canvas with Ctrl/Cmd+B; under 768px it becomes a sheet that traps and returns focus.",
        file: "components/motion/animated-sidebar.tsx",
        badge: "new",
        launchedAt: "2026-07-29",
        keywords: [
          "react app sidebar",
          "collapsible sidebar shadcn",
          "icon rail sidebar react",
          "mobile sidebar sheet",
          "dashboard navigation sidebar",
          "nested menu sidebar tailwind",
        ],
      },
      {
        slug: "preview-rail",
        name: "Preview Rail",
        description: "A slim navigation rail of short tick marks, modeled on the Codex app: hovering swells the ticks near the pointer into a pyramid and floats a card with the destination's label and details. Runs vertically or horizontally and accepts your own preview renderer.",
        file: "components/motion/preview-rail.tsx",
        badge: "new",
        launchedAt: "2026-07-11",
        keywords: [
          "codex style navigation rail",
          "minimal page navigation react",
          "hover preview navigation",
          "vertical tick navigation",
          "section navigator react",
          "navigation rail component",
        ],
      },
      {
        slug: "dock",
        name: "Dock",
        description: "A floating toolbar after the macOS dock: Dock, DockItem and DockSeparator group icon actions on a frosted surface, and a highlight slides to whichever item is marked active. Items render as buttons or wrap links you supply.",
        file: "components/motion/dock.tsx",
      },
      {
        slug: "tooltip",
        name: "Tooltip",
        description: "Short labels for icon buttons and clipped text: shown after a brief delay on hover or keyboard focus, at once if another tooltip just closed, and on tap for touch users. A fixed portal keeps overflow from cutting it off.",
        file: "components/motion/tooltip.tsx",
      },
      {
        slug: "context-menu",
        name: "Animated Context Menu",
        description:
          "A right-click menu assembled from parts (items, checkbox and radio items, labels, separators, shortcuts) that opens from the exact spot you clicked, or long-pressed on touch, with a highlight that slides between rows, arrow-key movement and type-to-jump search.",
        file: "components/motion/context-menu.tsx",
        badge: "new",
        launchedAt: "2026-07-27",
        keywords: [
          "react right click menu",
          "custom context menu react",
          "long press menu mobile",
          "animated context menu tailwind",
          "shadcn context menu alternative",
          "menu with keyboard shortcuts react",
        ],
      },
      {
        slug: "popover",
        name: "Popover",
        description:
          "Two popovers with different personalities: a gooey one that melts away from its button via an SVG filter, a sticky neck stretching and then snapping, and a morph one that unclips from the trigger's nearest corner as a single surface. Both can be controlled.",
        file: "components/motion/popover.tsx",
        badge: "new",
        launchedAt: "2026-07-07",
        keywords: [
          "react popover component",
          "gooey svg filter effect",
          "liquid popover animation",
          "morphing popover react",
          "animated dropdown panel",
          "metaball ui effect",
        ],
        examples: [
          {
            slug: "gooey",
            name: "Gooey Popover",
            description:
              "Popover, PopoverTrigger and PopoverContent with side, align, gap and corner radius props; trigger and panel melt together through a blur-based goo filter (gooStrength sets how runny), while the real content fades in sharp on top. Opens on click or hover.",
            installSlug: "popover",
            file: "components/motion/popover.tsx",
            previewKey: "motion/popover",
            previewFile: "components/previews/motion/popover.preview.tsx",
          },
          {
            slug: "morph",
            name: "Morph Popover",
            description:
              "MorphPopover, MorphPopoverTrigger and MorphPopoverContent: the panel is rendered full size from the start but cropped down to the corner beside the trigger, then the crop springs open, so text and borders never scale. Escape or an outside click closes it.",
            installSlug: "popover-morph",
            file: "components/motion/popover-morph.tsx",
            previewKey: "motion/popover-morph",
            previewFile: "components/previews/motion/popover-morph.preview.tsx",
          },
        ],
      },
      {
        slug: "morphing-modal",
        name: "Morphing Modal",
        description: "A modal for multi-step flows, inspired by the Family app: change viewId and one panel resizes to fit the next screen while the old content blurs out and the new content blurs in. Anchors to the bottom like a sheet or sits centered.",
        file: "components/motion/morphing-modal.tsx",
      },
      {
        slug: "center-morph-modal",
        name: "Center Morph Modal",
        description:
          "A dialog that opens by growing out of its own middle: the full panel starts clipped to a small rounded point at the center and expands to every edge, then shrinks back on close. Traps Tab, closes on Escape or backdrop, and hands focus back to its trigger.",
        file: "components/motion/center-morph-modal.tsx",
        badge: "new",
        launchedAt: "2026-07-21",
        keywords: [
          "center expanding modal react",
          "clip path modal animation",
          "animated dialog react",
          "modal open from center",
          "framer motion modal",
          "accessible modal component",
        ],
      },
      {
        slug: "text-animation",
        name: "Text Animation",
        description:
          "Five ways to put headlines and labels in motion: a glyph scramble, a Dia-browser-style colored sweep that cycles the last word, a word or letter rise-in, a shimmering gradient for loading copy, and a departure-board letter cascade for text that changes.",
        file: "components/motion/text-reveal.tsx",
        badge: "new",
        launchedAt: "2026-07-25",
        extraFiles: [
          "components/motion/chromatic-text-reveal.tsx",
          "components/motion/text-shimmer.tsx",
          "components/motion/text-cascade.tsx",
          "components/motion/text-scramble.tsx",
        ],
        examples: [
          {
            slug: "text-scramble",
            name: "Text Scramble",
            description:
              "Change the text prop and the characters churn through random glyphs before settling on the new value within a set duration; screen readers only hear the final text, and reduced motion shows it at once.",
            badge: "new",
            launchedAt: "2026-08-14",
            installSlug: "text-scramble",
            file: "components/motion/text-scramble.tsx",
            previewKey: "motion/text-scramble",
            previewFile:
              "components/previews/motion/text-scramble.preview.tsx",
          },
          {
            slug: "chromatic-reveal",
            name: "Dia Text Animation",
            description:
              "Holds the start of a sentence still and swaps the last word in turn, each new word painted in by a band of color that leaves plain text behind. Inspired by the Dia browser, with loop, pause and start-on-view options.",
            badge: "new",
            launchedAt: "2026-07-25",
            installSlug: "chromatic-text-reveal",
            file: "components/motion/chromatic-text-reveal.tsx",
            previewKey: "motion/chromatic-text-reveal",
            previewFile:
              "components/previews/motion/chromatic-text-reveal.preview.tsx",
          },
          {
            slug: "reveal",
            name: "Text Reveal",
            description: "Splits text into words or characters and lifts each piece into place as its blur clears, on mount or when scrolled into view, with stagger, delay and offset props.",
            installSlug: "text-reveal",
            file: "components/motion/text-reveal.tsx",
            previewKey: "motion/text-reveal",
            previewFile: "components/previews/motion/text-reveal.preview.tsx",
          },
          {
            slug: "shimmer",
            name: "Text Shimmer",
            description: "A band of light passes over the text on a loop, handy for 'Thinking…' or 'Loading' labels; choose the element type and the cycle length.",
            installSlug: "text-shimmer",
            file: "components/motion/text-shimmer.tsx",
            previewKey: "motion/text-shimmer",
            previewFile: "components/previews/motion/text-shimmer.preview.tsx",
          },
          {
            slug: "cascade",
            name: "Text Cascade",
            description: "Give it a new string and the letters flip over one at a time from left to right like a departure board, old characters falling out as new ones drop in.",
            installSlug: "text-cascade",
            file: "components/motion/text-cascade.tsx",
            previewKey: "motion/text-cascade",
            previewFile: "components/previews/motion/text-cascade.preview.tsx",
          },
        ],
      },
      {
        slug: "number",
        name: "Number Animation",
        description: "Two ways to animate figures on dashboards and pricing pages: AnimatedNumber eases up to its value, optionally once it scrolls into view, and NumberTicker spins each digit like an odometer with prefix, suffix and en-US grouping.",
        file: "components/motion/animated-number.tsx",
        extraFiles: ["components/motion/number-ticker.tsx"],
        examples: [
          {
            slug: "ticker",
            name: "Number Ticker",
            description: "Every digit spins into place on its own reel, each starting a beat after the last; supports zero padding, prefix, suffix, comma grouping and an optional blur mid-roll. Screen readers get the formatted number as plain text.",
            installSlug: "number-ticker",
            file: "components/motion/number-ticker.tsx",
            previewKey: "motion/number-ticker",
            previewFile: "components/previews/motion/number-ticker.preview.tsx",
          },
          {
            slug: "animated",
            name: "Animated Number",
            description: "Eases from the previous value to the new one through a format function you provide; with startOnView it waits until most of the element is on screen before counting.",
            installSlug: "animated-number",
            file: "components/motion/animated-number.tsx",
            previewKey: "motion/animated-number",
            previewFile: "components/previews/motion/animated-number.preview.tsx",
          },
        ],
      },
      {
        slug: "animated-badge",
        name: "Animated Badge",
        description: "A small status pill for neutral, info, success, warning, danger and loading states. Each state brings its own icon, changing status rolls the icon over, and a soft breathing ring (on by default while loading) draws the eye. Comes in two sizes.",
        file: "components/motion/animated-badge.tsx",
      },
      {
        slug: "action-swap",
        name: "Action Swap",
        description: "Buttons and slots that change their label or icon in place, for copy-to-clipboard, follow/unfollow or play/pause controls. ActionSwapButton steps through items on click; ActionSwapText and ActionSwapIcon swap content you control using blur, roll or per-letter cascade transitions.",
        file: "components/motion/action-swap.tsx",
        examples: [
          {
            slug: "cascade",
            name: "Cascade",
            description: "Each letter of the outgoing label falls away while its replacement lands in the same slot, travelling left to right, so a change like Copy to Copied reads as one motion.",
            installSlug: "action-swap-cascade",
            file: "components/motion/action-swap-cascade.tsx",
            previewKey: "motion/action-swap-cascade",
            previewFile: "components/previews/motion/action-swap-cascade.preview.tsx",
          },
          {
            slug: "blur",
            name: "Blur",
            description: "The old content blurs, fades and shrinks while the new content grows in sharp: the familiar copy-to-check feedback.",
            installSlug: "action-swap-blur",
            file: "components/motion/action-swap-blur.tsx",
            previewKey: "motion/action-swap-blur",
            previewFile: "components/previews/motion/action-swap-blur.preview.tsx",
          },
          {
            slug: "roll",
            name: "Roll",
            description: "The current label or icon slides up and out as its successor comes up from underneath, softened by a light blur.",
            installSlug: "action-swap-roll",
            file: "components/motion/action-swap-roll.tsx",
            previewKey: "motion/action-swap-roll",
            previewFile: "components/previews/motion/action-swap-roll.preview.tsx",
          },
        ],
      },
      {
        slug: "animated-toast-stack",
        name: "Animated Toast Stack",
        description: "Notifications that gather into a compact stack in any of six screen positions: toasts spring in, change status in place (loading to success or error), leave with a sideways swipe or close button, and can carry an action. A useAnimatedToastStack hook handles ids, timers and promises.",
        file: "components/motion/animated-toast-stack.tsx",
        examples: [
          {
            slug: "stack",
            name: "Animated Toast Stack",
            description:
              "The base stack: neutral, info, success, error and loading toasts with icons, action buttons and swipe-away, placed top or bottom at the left, center or right, with a cap on how many stay visible.",
            installSlug: "animated-toast-stack",
            file: "components/motion/animated-toast-stack.tsx",
            previewKey: "motion/animated-toast-stack",
            previewFile: "components/previews/motion/animated-toast-stack.preview.tsx",
          },
          {
            slug: "promise",
            name: "Toast Promise",
            description:
              "Hand a promise to the hook and a single toast shows a spinner, then turns into a success or error message in the same spot once it settles, and only then starts counting down to close.",
            installSlug: "toast-promise",
            file: "components/motion/animated-toast-stack.tsx",
            previewKey: "motion/toast-promise",
            previewFile: "components/previews/motion/toast-promise.preview.tsx",
          },
        ],
      },
      {
        slug: "theme-toggle",
        name: "Theme Toggle",
        description: "A light/dark switch for next-themes that animates the whole page change with the View Transition API: wipe the new theme in as a rectangle from a corner, center or bottom, grow a sharp or blurred circle, or open it like window blinds.",
        file: "components/motion/theme-toggle.tsx",
        badge: "new",
        launchedAt: "2026-08-01",
        keywords: [
          "dark mode toggle react",
          "view transitions api theme",
          "next-themes toggle animation",
          "theme switch circle reveal",
          "light dark mode button",
          "animated theme switcher",
        ],
      },
      {
        slug: "bouncy-accordion",
        name: "Bouncy Accordion",
        description: "An FAQ-style list where one row opens at a time: the open row breaks away from its neighbours with a bouncy gap and rounded corners, its content expands to its measured height, and rows can carry icons. Collapsible, controlled or uncontrolled.",
        file: "components/motion/bouncy-accordion.tsx",
      },
      {
        slug: "drawer",
        name: "Drawer",
        description: "An off-canvas panel for filters, carts or settings that springs in from either side of the screen over a blurred backdrop, stops the page behind it from scrolling, and closes on Escape or a backdrop click unless dismissable is turned off.",
        file: "components/motion/drawer.tsx",
      },
      {
        slug: "scroll-animation",
        name: "Scroll Animation",
        description: "Scroll tools for long pages: SmoothScroll wraps Lenis and shares position, progress and velocity, while ScrollProgress, Parallax, ScrollTo and ScrollReveal add a reading meter, depth, anchor jumps and entrance effects. Each falls back to native behaviour under reduced motion.",
        file: "components/motion/smooth-scroll.tsx",
        extraFiles: [
          "components/motion/scroll-progress.tsx",
          "components/motion/parallax.tsx",
          "components/motion/scroll-to.tsx",
          "components/motion/scroll-reveal.tsx",
        ],
        keywords: [
          "lenis smooth scroll react",
          "scroll progress bar react",
          "parallax scroll effect react",
          "reveal on scroll animation",
          "smooth scroll to anchor",
          "scroll animations nextjs",
        ],
        examples: [
          {
            slug: "smooth-scroll",
            name: "Smooth Scroll",
            description: "Wraps the page or a contained scroller in Lenis and hands out scrollY, progress and velocity motion values plus a scrollTo helper through useSmoothScroll; with reduced motion it keeps native scrolling.",
            installSlug: "smooth-scroll",
            file: "components/motion/smooth-scroll.tsx",
            previewKey: "motion/smooth-scroll",
            previewFile: "components/previews/motion/smooth-scroll.preview.tsx",
          },
          {
            slug: "scroll-progress",
            name: "Scroll Progress",
            description: "Shows how far through a page the reader is, as a thin bar pinned to the top or bottom or as a circular ring, optionally spring-smoothed and fed by any progress value you pass in.",
            installSlug: "scroll-progress",
            file: "components/motion/scroll-progress.tsx",
            previewKey: "motion/scroll-progress",
            previewFile: "components/previews/motion/scroll-progress.preview.tsx",
          },
          {
            slug: "parallax",
            name: "Parallax",
            description: "Moves its content faster or slower than the page as it passes through view, along x or y; a negative speed pushes it the other way, and it can track a custom scroll container.",
            installSlug: "parallax",
            file: "components/motion/parallax.tsx",
            previewKey: "motion/parallax",
            previewFile: "components/previews/motion/parallax.preview.tsx",
          },
          {
            slug: "scroll-to",
            name: "Scroll To",
            description: "A button that glides the page to a pixel position, CSS selector or element, with an offset for sticky headers; it uses the SmoothScroll provider when present and native scrolling otherwise.",
            installSlug: "scroll-to",
            file: "components/motion/scroll-to.tsx",
            previewKey: "motion/scroll-to",
            previewFile: "components/previews/motion/scroll-to.preview.tsx",
          },
          {
            slug: "scroll-reveal",
            name: "Scroll Reveal",
            description: "Fades content up into place through a short blur as it enters the viewport or a custom scroll root, once by default or every time, with distance, duration and visibility threshold props.",
            installSlug: "scroll-reveal",
            file: "components/motion/scroll-reveal.tsx",
            previewKey: "motion/scroll-reveal",
            previewFile: "components/previews/motion/scroll-reveal.preview.tsx",
          },
        ],
      },
      {
        slug: "range-slider",
        name: "Range Slider",
        description: "Five slider designs on one shared engine: stepped dots, a thumbless liquid fill, equalizer bars, a speed-reactive value bubble and a scrolling ruler. All handle dragging, arrow, Page and Home/End keys and controlled values, with 44px touch targets on coarse pointers.",
        file: "components/motion/range-slider.tsx",
        badge: "new",
        launchedAt: "2026-07-31",
        keywords: [
          "react range slider",
          "custom slider component",
          "animated slider tailwind",
          "volume slider react",
          "ruler scale picker",
          "stepped slider with ticks",
        ],
        examples: [
          {
            slug: "stepped",
            name: "Range Slider",
            description:
              "The base RangeSlider: a dot marks every step and the bar-shaped thumb gives a small hop each time it snaps to a new one; the dots can be turned off.",
            installSlug: "range-slider",
            file: "components/motion/range-slider.tsx",
            previewKey: "motion/range-slider",
            previewFile: "components/previews/motion/range-slider.preview.tsx",
          },
          {
            slug: "fluid",
            name: "Fluid Slider",
            description:
              "The whole pill is the control. A fill with a rounded cap flows to the value and the label text inverts where the fill sits under it; format controls the readout.",
            installSlug: "range-slider-fluid",
            badge: "new",
            launchedAt: "2026-07-31",
            file: "components/motion/range-slider-fluid.tsx",
            previewKey: "motion/range-slider-fluid",
            previewFile: "components/previews/motion/range-slider-fluid.preview.tsx",
          },
          {
            slug: "wave",
            name: "Wave Slider",
            description:
              "A row of bars swells into a crest centred on the value and sinks back as it moves on; bars before the value are filled, so the level reads at a glance.",
            installSlug: "range-slider-wave",
            badge: "new",
            launchedAt: "2026-07-31",
            file: "components/motion/range-slider-wave.tsx",
            previewKey: "motion/range-slider-wave",
            previewFile: "components/previews/motion/range-slider-wave.preview.tsx",
          },
          {
            slug: "bubble",
            name: "Bubble Slider",
            description:
              "Pressing the thumb pops up a bubble with the current value that leans toward the direction of travel and flattens the faster you drag, straightening once you let go.",
            installSlug: "range-slider-bubble",
            badge: "new",
            launchedAt: "2026-07-31",
            file: "components/motion/range-slider-bubble.tsx",
            previewKey: "motion/range-slider-bubble",
            previewFile: "components/previews/motion/range-slider-bubble.preview.tsx",
          },
          {
            slug: "ruler",
            name: "Ruler Slider",
            description:
              "A fixed needle over a moving scale instead of a thumb: flick it and it coasts before resting on a tick. Major ticks carry labels, a unit can follow the number, and decimal steps keep their precision.",
            installSlug: "range-slider-ruler",
            badge: "new",
            launchedAt: "2026-07-31",
            file: "components/motion/range-slider-ruler.tsx",
            previewKey: "motion/range-slider-ruler",
            previewFile: "components/previews/motion/range-slider-ruler.preview.tsx",
          },
        ],
      },
      {
        slug: "wheel-picker",
        name: "Wheel Picker",
        description: "An iOS-style scroll wheel: options sit on a 3D drum with its own momentum physics, so a flick coasts and snaps to a row with a soft bounce. Drag, mouse wheel or arrow keys pick; line several up for dates or times. Optional tick sound.",
        file: "components/motion/wheel-picker.tsx",
        badge: "new",
        launchedAt: "2026-07-09",
        keywords: [
          "ios wheel picker react",
          "scroll wheel date picker",
          "drum picker component",
          "time picker wheel web",
          "react picker wheel",
          "mobile picker ui",
        ],
      },
      {
        slug: "chart",
        name: "Chart",
        description:
          "Animated SVG charts in the shadcn style with zero chart-library dependencies: area and line charts with monotone, linear or stepped curves that reveal left to right (and again when the range changes), grouped, stacked or horizontal bars that grow from the baseline, donut and pie slices that sweep in clockwise, and radial progress rings. Every chart shares one tooltip with dot, line or dashed indicators, arrow-key reading, a legend and a screen-reader table. Colors come from the theme's --chart-1…5 tokens, validated for color-blind separation; reduced-motion safe.",
        file: "components/motion/chart/area-chart.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react chart",
          "animated chart",
          "area chart react",
          "bar chart react",
          "line chart react",
          "donut chart",
          "radial chart",
          "sparkline",
          "shadcn chart",
          "dashboard chart",
        ],
        examples: [
          {
            slug: "area",
            name: "Area Chart",
            description:
              "Stacked gradient areas with a time-range switch; the reveal replays whenever the range changes.",
            installSlug: "chart-area",
            file: "components/motion/chart/area-chart.tsx",
            previewKey: "motion/chart-area",
            previewFile: "components/previews/motion/chart-area.preview.tsx",
          },
          {
            slug: "bar",
            name: "Bar Chart",
            description:
              "Grouped columns that grow from the baseline; hovering a category dims the rest and reads every series.",
            installSlug: "chart-bar",
            file: "components/motion/chart/bar-chart.tsx",
            previewKey: "motion/chart-bar",
            previewFile: "components/previews/motion/chart-bar.preview.tsx",
          },
          {
            slug: "bar-horizontal",
            name: "Horizontal Bars",
            description:
              "The same BarChart with layout=\"horizontal\" and printed values: ranked categories read left to right.",
            file: "components/motion/chart/bar-chart.tsx",
            previewKey: "motion/chart-bar-horizontal",
            previewFile: "components/previews/motion/chart-bar-horizontal.preview.tsx",
          },
          {
            slug: "line",
            name: "Line Chart",
            description:
              "Smooth monotone lines with dots, a snapping cursor and one tooltip for every series.",
            installSlug: "chart-line",
            file: "components/motion/chart/line-chart.tsx",
            previewKey: "motion/chart-line",
            previewFile: "components/previews/motion/chart-line.preview.tsx",
          },
          {
            slug: "donut",
            name: "Donut Chart",
            description:
              "Slices sweep in clockwise; the hovered slice lifts and the center swaps from the total to its value and share. variant=\"pie\" for a solid pie.",
            installSlug: "chart-donut",
            file: "components/motion/chart/donut-chart.tsx",
            previewKey: "motion/chart-donut",
            previewFile: "components/previews/motion/chart-donut.preview.tsx",
          },
          {
            slug: "radial",
            name: "Radial Chart",
            description:
              "Concentric progress rings with rounded caps that fill clockwise toward a target.",
            installSlug: "chart-radial",
            file: "components/motion/chart/radial-chart.tsx",
            previewKey: "motion/chart-radial",
            previewFile: "components/previews/motion/chart-radial.preview.tsx",
          },
          {
            slug: "sparkline",
            name: "Sparkline",
            description:
              "Word-sized trend line for stat tiles that ends on the latest value, with a spoken summary.",
            installSlug: "sparkline",
            file: "components/motion/chart/sparkline.tsx",
            previewKey: "motion/sparkline",
            previewFile: "components/previews/motion/sparkline.preview.tsx",
          },
          {
            slug: "heatmap",
            name: "Heatmap Chart",
            description:
              "GitHub-style contribution calendar; cells fade in week by week and arrow keys read each day.",
            installSlug: "chart-heatmap",
            file: "components/motion/chart/heatmap-chart.tsx",
            previewKey: "motion/chart-heatmap",
            previewFile: "components/previews/motion/chart-heatmap.preview.tsx",
          },
          {
            slug: "gauge",
            name: "Gauge Chart",
            description:
              "Arc meter with threshold bands; the fill and a springy needle swing to the value together.",
            installSlug: "chart-gauge",
            file: "components/motion/chart/gauge-chart.tsx",
            previewKey: "motion/chart-gauge",
            previewFile: "components/previews/motion/chart-gauge.preview.tsx",
          },
          {
            slug: "funnel",
            name: "Funnel Chart",
            description:
              "Horizontal conversion funnel whose stages grow in one by one; hovering a stage reads its step conversion.",
            installSlug: "chart-funnel",
            file: "components/motion/chart/funnel-chart.tsx",
            previewKey: "motion/chart-funnel",
            previewFile: "components/previews/motion/chart-funnel.preview.tsx",
          },
        ],
      },
      {
        slug: "sortable-list",
        name: "Sortable List",
        description:
          "Drag-to-reorder list where only the grip handle lifts a row, the lifted row rises with a soft shadow and slight scale while its siblings spring out of the way, and a full keyboard path (Space to pick up, arrows to move, Space to drop, Escape to restore) announces every move to screen readers. Generic over any item with an id, controlled/uncontrolled, reduced-motion safe.",
        file: "components/motion/sortable-list.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react sortable list",
          "drag and drop reorder",
          "reorderable list",
          "accessible drag and drop",
          "framer motion reorder",
          "shadcn sortable",
        ],
      },
      {
        slug: "tree-view",
        name: "Tree View",
        description:
          "Keyboard-first WAI-ARIA tree with spring-rotating chevrons, height-morphing nested groups, indent guide lines, a selection pill that glides between rows via shared layout, typeahead, and controlled or uncontrolled selection and expansion.",
        file: "components/motion/tree-view.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react tree view",
          "file tree component",
          "animated tree view",
          "accessible treeview",
          "file explorer react",
          "nested navigation",
        ],
      },
      {
        slug: "resizable-panels",
        name: "Resizable Panels",
        description:
          "Horizontal or vertical split panes with pointer-captured drag handles, per-panel min/max sizes, collapsible panels that spring shut below a threshold, double-click reset, nestable layouts, and keyboard-resizable separators.",
        file: "components/motion/resizable-panels.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react resizable panels",
          "split pane",
          "resizable layout",
          "collapsible sidebar",
          "drag to resize",
          "panel group",
        ],
      },
      {
        slug: "image-compare",
        name: "Image Compare",
        description:
          "Before/after comparison whose top layer is clipped by a spring-smoothed clip-path divider, with a draggable knob, optional hover-follow mode, edge-fading labels, keyboard slider control, and images or any React node on either side.",
        file: "components/motion/image-compare.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "image comparison slider",
          "before after slider",
          "react image compare",
          "comparison divider",
          "image diff",
          "photo compare",
        ],
      },
      {
        slug: "timeline",
        name: "Timeline",
        description:
          "Vertical changelog timeline whose connector line draws with scroll progress, with dots that pop in, content that slides into view, done/current/upcoming states, a pulsing ring on the current step, and a static line under reduced motion.",
        file: "components/motion/timeline.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react timeline",
          "animated timeline",
          "changelog component",
          "scroll animation timeline",
          "roadmap timeline",
          "vertical timeline",
        ],
      },
      {
        slug: "tag-input",
        name: "Tag Input",
        description:
          "Chip field where Enter, comma or Tab adds a tag that springs in while the rest glide aside via shared layout, with Backspace-twice removal, arrow-key chip navigation, a filtered keyboard-navigable suggestion combobox, max tags, duplicate prevention and a shake on validation rejection; controlled/uncontrolled, reduced-motion safe.",
        file: "components/motion/tag-input.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "tag input",
          "chips input",
          "multi value input",
          "react tags",
          "token input",
          "autocomplete tags",
        ],
      },
      {
        slug: "color-picker",
        name: "Color Picker",
        description:
          "HSV color picker with a 2D saturation/brightness area, hue and optional alpha sliders whose thumbs spring to a clicked point and follow drags 1:1, a validated hex field, preset swatches with a gliding selection ring and a ColorPickerPopover trigger mode; keyboard accessible, dependency-free color math.",
        file: "components/motion/color-picker.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "color picker",
          "react color picker",
          "hex color input",
          "hue slider",
          "alpha slider",
          "color swatches",
        ],
      },
      {
        slug: "rating",
        name: "Rating",
        description:
          "Star rating radiogroup with hover preview fill, a staggered spring bounce on pick, optional half-star precision from the pointer position, click-to-clear, arrow/Home/End keyboard control, custom icons and a read-only display mode; controlled/uncontrolled, reduced-motion safe.",
        file: "components/motion/rating.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "star rating",
          "rating input",
          "react rating",
          "half star rating",
          "review stars",
          "feedback rating",
        ],
      },
      {
        slug: "number-stepper",
        name: "Number Stepper",
        description:
          "Spinbutton with −/+ controls whose digits roll in the direction of change, press-and-hold repeat that accelerates, direct typing, arrow/Page/Home/End keys, min/max/step with a shake when pushed past a bound, and Intl.NumberFormat formatting; controlled/uncontrolled.",
        file: "components/motion/number-stepper.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "number stepper",
          "quantity input",
          "number input",
          "spinbutton",
          "counter input",
          "increment decrement",
        ],
      },
      {
        slug: "pagination",
        name: "Pagination",
        description:
          "Page navigation with sibling and boundary ellipsis logic, a spring-gliding active pill, numbers that roll as the window shifts, arrow-nudge prev/next controls, and a compact dots variant.",
        file: "components/motion/pagination.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react animated pagination",
          "pagination ellipsis component",
          "shadcn pagination motion",
          "pagination dots indicator",
          "table pagination react",
          "page navigation animation",
        ],
      },
      {
        slug: "copy-button",
        name: "Copy Button",
        description:
          "Copy-to-clipboard button with a blur-and-scale copy-to-check icon morph, optional rolling Copy/Copied label, execCommand fallback, error state, and screen reader announcements.",
        file: "components/motion/copy-button.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react copy to clipboard button",
          "animated copy button",
          "copy icon check animation",
          "clipboard button shadcn",
          "copy code button react",
          "copy api key button",
        ],
      },
      {
        slug: "carousel",
        name: "Carousel",
        description:
          "Swipeable slide carousel driven by one motion value: momentum drag that snaps to slides with rubber-band edges, seamless loop, responsive slidesPerView, dot or thumbnail indicators with a gliding active pill, and autoplay with a progress bar that pauses on hover, focus or hidden tabs.",
        file: "components/motion/carousel.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react carousel",
          "swipe carousel react",
          "image slider react",
          "autoplay carousel",
          "infinite loop carousel",
          "accessible carousel",
        ],
      },
      {
        slug: "markdown-editor",
        name: "Markdown Editor",
        description:
          "Textarea Markdown editor with an undo-safe formatting toolbar and shortcuts, list continuation and Tab indenting, a floating selection toolbar, Write/Preview/Split tabs with a gliding indicator, and a built-in safe renderer that outputs React elements, never raw HTML.",
        file: "components/motion/markdown-editor.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react markdown editor",
          "markdown toolbar",
          "markdown preview split view",
          "textarea formatting shortcuts",
          "safe markdown renderer",
          "floating selection toolbar",
        ],
      },
      {
        slug: "tour",
        name: "Tour",
        description:
          "Onboarding tour that dims the page and cuts a rounded spotlight around each target, gliding and resizing it from step to step, with a card that flips and shifts to stay in the viewport, a gliding progress dot, Back/Next/Skip/Done, targets scrolled into view, Escape to close, trapped focus that returns to the trigger, controlled/uncontrolled open and step, and reduced-motion safe.",
        file: "components/motion/tour.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react product tour",
          "onboarding tour component",
          "spotlight walkthrough",
          "feature tour react",
          "guided tour overlay",
          "shadcn tour",
        ],
      },
      {
        slug: "avatar-group",
        name: "Avatar Group",
        description:
          "Overlapping avatar stack that springs apart on hover or keyboard focus, with name tooltips, online/away/busy presence dots, an optional is-typing pulse ring and a +N chip that opens the full list in a popover, plus LiveCursors: collaboration cursors with colored arrows and name labels that spring toward container-relative positions.",
        file: "components/motion/avatar-group.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react avatar group",
          "avatar stack component",
          "presence indicator",
          "live cursors react",
          "multiplayer collaboration ui",
          "shadcn avatar group",
        ],
      },
      {
        slug: "dropdown-menu",
        name: "Dropdown Menu",
        description:
          "Composable WAI-ARIA dropdown menu that springs open with a scale and fade from the trigger side, with a gliding active-row highlight, checkbox and radio items, icons and shortcuts, a destructive variant, hover-intent submenus, typeahead, full arrow/Home/End/Escape keyboard support and viewport-aware flipping.",
        file: "components/motion/dropdown-menu.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react dropdown menu",
          "animated dropdown menu",
          "menu button aria",
          "dropdown submenu react",
          "checkbox radio menu items",
          "keyboard accessible menu",
        ],
      },
      {
        slug: "hover-card",
        name: "Hover Card",
        description:
          "Hover card that springs out of its trigger after an open delay and stays open while the pointer travels into it; also opens on keyboard focus, closes on Escape or blur, and flips and aligns on any side to stay in the viewport, while touch taps simply follow the link.",
        file: "components/motion/hover-card.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react hover card",
          "animated hover card",
          "link preview card",
          "profile hover card",
          "hover popover react",
          "user preview popup",
        ],
      },
      {
        slug: "kbd",
        name: "Kbd",
        description:
          "Keyboard key chips and key combos that render ⌘ or Ctrl for the visitor's platform without hydration mismatch, in two sizes, with a spring dip when pressed and an optional listen mode that animates each key as the real one is held.",
        file: "components/motion/kbd.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react kbd component",
          "keyboard shortcut chip",
          "key combo display",
          "platform aware cmd ctrl",
          "animated keyboard key",
          "hotkey hint react",
        ],
      },
      {
        slug: "dialog",
        name: "Dialog",
        description:
          "Composable modal Dialog and AlertDialog that portal to the body over a blurred backdrop, scale the panel up and exit faster, trap focus, close on Escape, lock page scroll without layout shift and hand focus back to the trigger, with controlled/uncontrolled open, a bottom-sheet layout below sm, an alertdialog that ignores outside clicks and focuses Cancel first, and an optional type-to-confirm field that shakes when Delete is pressed too early.",
        file: "components/motion/dialog.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react dialog component",
          "alert dialog react",
          "modal focus trap",
          "type to confirm delete",
          "accessible modal tailwind",
          "shadcn dialog",
        ],
      },
      {
        slug: "alert",
        name: "Alert",
        description:
          "Inline alert banner in info, success, warning and destructive tones that keep contrast in light and dark, with icons, a title, description and optional actions, polite status or assertive alert roles by severity, and a dismiss that fades the banner and collapses its height so the content below slides up, plus an AlertStack whose gaps collapse with it.",
        file: "components/motion/alert.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react alert component",
          "alert banner tailwind",
          "dismissible alert",
          "callout component react",
          "warning banner ui",
          "shadcn alert",
        ],
      },
      {
        slug: "progress",
        name: "Progress",
        description:
          "Progress indicators in three forms: a linear Progress bar whose fill springs smoothly with an optional label and rolling percentage, a ProgressCircle ring drawn around a centered value, and ProgressSteps segments that fill in sequence; indeterminate modes slide or spin, every variant exposes role=\"progressbar\" with value text, and reduced motion swaps movement for an opacity pulse.",
        file: "components/motion/progress.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "progress bar react",
          "circular progress",
          "indeterminate progress",
          "segmented progress",
          "upload progress",
          "animated progress bar",
        ],
      },
      {
        slug: "skeleton",
        name: "Skeleton",
        description:
          "Loading placeholders: Skeleton blocks in rect, circle or text shapes with a gradient shimmer, SkeletonText paragraphs with a natural short last line, and SkeletonSwap, which cross-fades from skeleton to real content in one grid cell and holds the last measured height on reload so nothing jumps; reduced motion swaps the shimmer for an opacity pulse.",
        file: "components/motion/skeleton.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "skeleton loader react",
          "shimmer skeleton",
          "loading placeholder",
          "content placeholder",
          "skeleton text",
          "no layout shift loading",
        ],
      },
      {
        slug: "empty-state",
        name: "Empty State",
        description:
          "Empty-state block with an icon or illustration slot, title, description, primary and secondary actions, three sizes and an optional dashed border; the default SVG art (a floating document stack or a search lens) draws in and drifts gently, and the whole block staggers in when scrolled into view.",
        file: "components/motion/empty-state.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "empty state react",
          "no results state",
          "empty state illustration",
          "zero state ui",
          "placeholder screen",
          "animated empty state",
        ],
      },
      {
        slug: "breadcrumb",
        name: "Breadcrumb",
        description:
          "Composable breadcrumb trail with a hover underline that slides in from the left, links that render through your router via a render prop, and a data-driven items mode whose maxItems collapse folds middle crumbs into an ellipsis that either expands them inline with a spring layout reflow or opens a small keyboard-navigable menu.",
        file: "components/motion/breadcrumb.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react breadcrumb component",
          "animated breadcrumbs",
          "breadcrumb ellipsis collapse",
          "shadcn breadcrumb motion",
          "nextjs breadcrumb link",
          "breadcrumb navigation tailwind",
        ],
      },
      {
        slug: "segmented-control",
        name: "Segmented Control",
        description:
          "Form-ready SegmentedControl with radiogroup semantics, a raised thumb that glides between options on a shared-layout spring, icon and/or label options, sizes, full-width layout, disabled options, arrow-key roving where selection follows focus and an optional hidden input for forms, plus a ToggleGroup of spring-pressed buttons in single or multiple mode.",
        file: "components/motion/segmented-control.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react segmented control",
          "ios segmented picker",
          "toggle group component",
          "radio group buttons react",
          "shadcn toggle group motion",
          "view switcher tailwind",
        ],
      },
      {
        slug: "multi-select",
        name: "Multi Select",
        description:
          "Searchable multi-value select whose field is the combobox input: picked options ride as chips that spring in, glide aside and collapse into a \"+N\" overflow chip, over a grouped listbox with draw-in check marks, a gliding active row, Select all / Clear actions, a max limit that shakes on refusal, optional creatable options, full keyboard control and controlled/uncontrolled string[] value.",
        file: "components/motion/multi-select.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "multi select",
          "multiselect react",
          "combobox chips",
          "tag select",
          "searchable select",
          "multiple choice dropdown",
        ],
      },
      {
        slug: "phone-input",
        name: "Phone Input",
        description:
          "International phone field with a searchable country picker (emoji flags, dial codes, ~45 built-in countries or your own list), per-country grouping applied as you type without losing the caret, E.164 output with { country, national, valid }, paste-a-full-+number country detection, and a blur-time length check that shakes the field with an inline error.",
        file: "components/motion/phone-input.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "phone input",
          "phone number input react",
          "country code picker",
          "e164",
          "international phone field",
          "tel input",
        ],
      },
      {
        slug: "password-input",
        name: "Password Input",
        description:
          "Password field with an eye icon that morphs to eye-off, a caps-lock warning, a segmented strength meter whose bars spring-fill and recolor with a sliding Weak/Fair/Good/Strong label from a length-weighted NIST-style heuristic, an optional requirement checklist whose items check off with a draw-in tick, and onStrengthChange.",
        file: "components/motion/password-input.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "password input",
          "password strength meter",
          "show hide password",
          "caps lock warning",
          "password requirements",
          "react password field",
        ],
      },
      {
        slug: "textarea",
        name: "Textarea",
        description:
          "Multi-line companion to Input with the same label, error shake and message API plus a description line, auto-growing between minRows and maxRows through a measured height transition before it scrolls behind a thin themed scrollbar, and an optional maxLength counter that shifts to warning then destructive near the limit and shakes when a keystroke or paste is refused.",
        file: "components/motion/textarea.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "textarea",
          "auto grow textarea",
          "autosize textarea",
          "character counter",
          "max length textarea",
          "react textarea component",
        ],
      },
      {
        slug: "inline-edit",
        name: "Inline Edit",
        description:
          "Click-to-edit text that turns into an input or auto-growing textarea in the exact same box (no layout jump) on click, Enter or F2, saves on Enter or blur and cancels on Escape, blocks saves with a validate message and shake, and runs async onSave with a pending spinner, rollback plus error on rejection, and a drawn check-mark flash on success.",
        file: "components/motion/inline-edit.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "inline edit",
          "click to edit",
          "editable text",
          "in place editing",
          "optimistic save rollback",
          "react inline editor",
        ],
      },
      {
        slug: "toggle-group",
        name: "Toggle Group",
        description:
          "Composable toolbar toggles: a standalone aria-pressed Toggle plus a shadcn-shaped ToggleGroup of ToggleGroupItem children in single or multiple mode, with default/outline variants, sm/md/lg sizes, one roving tab stop with arrow/Home/End keys, a pressed surface that glides between items in single mode and pops per item in multiple mode — the composable, icon-first counterpart to SegmentedControl's radiogroup.",
        file: "components/motion/toggle-group.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "toggle",
          "toolbar",
          "aria-pressed",
          "formatting",
          "button group",
          "multiple selection",
        ],
      },
      {
        slug: "card",
        name: "Card",
        description:
          "Plain, shadcn-compatible Card building block (CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter) with default, outline, elevated and interactive variants — the interactive one lifts on hover and dips on press and becomes a whole-card link or button via asChild — plus an optional height-morphing CardExpandTrigger/CardExpandContent disclosure.",
        file: "components/motion/card.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "card",
          "surface",
          "container",
          "panel",
          "clickable card",
          "expandable",
        ],
      },
      {
        slug: "scroll-area",
        name: "Scroll Area",
        description:
          "Native-scrolling container that keeps wheel, touch momentum and keyboard scrolling but hides the browser bar behind an overlay thumb (vertical, horizontal or both) that fades in on hover or scroll and out when idle, drags, pages on track click, and pairs with distance-scaled edge fade masks, all sized by a ResizeObserver.",
        file: "components/motion/scroll-area.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "scroll",
          "scrollbar",
          "overflow",
          "custom scrollbar",
          "fade mask",
          "viewport",
        ],
      },
      {
        slug: "collapsible",
        name: "Collapsible",
        description:
          "Unstyled disclosure primitive (Collapsible, CollapsibleTrigger with asChild, CollapsibleContent) with controlled or uncontrolled open state, an in-flow height morph that fades content in and closes faster than it opens, aria-expanded/aria-controls wiring, an inert closed panel and a reduced-motion snap.",
        file: "components/motion/collapsible.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "collapsible",
          "disclosure",
          "expand",
          "collapse",
          "show more",
          "toggle",
        ],
      },
      {
        slug: "accordion",
        name: "Accordion",
        description:
          "Calm shadcn-compatible accordion built on Collapsible (Accordion, AccordionItem, AccordionTrigger, AccordionContent) with type single or multiple, collapsible, controlled or uncontrolled value, a spring-rotating chevron, height-morphing panels and Arrow/Home/End focus movement between triggers; the quiet counterpart to the springy Bouncy Accordion.",
        file: "components/motion/accordion.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "accordion",
          "faq",
          "disclosure",
          "expand",
          "collapse",
          "shadcn",
        ],
      },
      {
        slug: "menubar",
        name: "Menubar",
        description:
          "Desktop-app menubar (File / Edit / View) on the WAI-ARIA menubar pattern where every menu renders into one shared floating panel, so once a menu is open hovering another title or pressing Left/Right switches instantly while the panel glides and resizes to fit, with Kbd shortcuts, checkbox and radio rows, separators, disabled items, hover-intent submenus, typeahead and a spring-gliding active row.",
        file: "components/motion/menubar.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "menubar",
          "menu bar",
          "file menu",
          "desktop app",
          "keyboard shortcuts",
          "submenu",
        ],
      },
      {
        slug: "badge",
        name: "Badge",
        description:
          "General-purpose badge in default, secondary, outline, destructive, success and warning (soft or solid), three sizes, with an optional pulsing status dot or icon, removable filter chips whose x plays an exit before onRemove while siblings glide into the gap, and a count mode whose digits roll in the direction of change and cap at 99+ (complements AnimatedBadge, which animates status transitions).",
        file: "components/motion/badge.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "badge",
          "chip",
          "tag",
          "pill",
          "notification count",
          "status dot",
        ],
      },
      {
        slug: "stepper",
        name: "Stepper",
        description:
          "Multi-step flow with an active ring that glides between step markers, connectors that fill as steps complete, panels that slide in from the direction of travel while the container morphs to each panel's height, and an async per-step guard that shakes the marker when it refuses. Linear or free navigation, controlled/uncontrolled, reduced-motion safe.",
        file: "components/motion/stepper.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react stepper",
          "multi step form",
          "wizard component",
          "onboarding flow",
          "progress steps",
          "shadcn stepper",
        ],
      },
      {
        slug: "date-picker",
        name: "Date Picker",
        description:
          "Month-grid calendar with a selection pill that glides between days, directional month slides, single, range, week or multiple-day selection across one or several side-by-side months, ISO week numbers, per-day labels, min/max and per-day disabling, full keyboard grid navigation, a date field, a two-month range field with presets, a booking calendar with nightly prices, time and date-time wheels and a month picker. Locale-aware, reduced-motion safe.",
        file: "components/motion/date-picker.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react date picker",
          "calendar component",
          "date range picker",
          "animated calendar",
          "shadcn date picker",
          "booking calendar",
        ],
        examples: [
          {
            slug: "date-picker",
            name: "Date Picker",
            description:
              "Date field whose calendar morphs open from the trigger corner and closes on pick.",
            installSlug: "date-picker",
            file: "components/motion/date-picker.tsx",
            previewKey: "motion/date-picker",
            previewFile: "components/previews/motion/date-picker.preview.tsx",
          },
          {
            slug: "calendar",
            name: "Calendar",
            description:
              "Inline single-date calendar; the selected pill glides between days. Weekends disabled in this demo.",
            installSlug: "calendar",
            file: "components/motion/calendar.tsx",
            previewKey: "motion/calendar",
            previewFile: "components/previews/motion/calendar.preview.tsx",
          },
          {
            slug: "range",
            name: "Range",
            description:
              "Two months side by side; pick a start and end day and the band follows the pointer across both until the range closes.",
            file: "components/motion/calendar.tsx",
            previewKey: "motion/calendar-range",
            previewFile: "components/previews/motion/calendar-range.preview.tsx",
          },
          {
            slug: "date-range-picker",
            name: "Date Range Picker",
            description:
              "Range field whose two-month calendar morphs open beside one-click presets and commits once the end day is picked.",
            installSlug: "date-range-picker",
            file: "components/motion/date-range-picker.tsx",
            previewKey: "motion/date-range-picker",
            previewFile: "components/previews/motion/date-range-picker.preview.tsx",
          },
          {
            slug: "multiple",
            name: "Multiple Dates",
            description:
              "Toggle any number of separate days up to a max; picked neighbours in a week merge into one pill.",
            file: "components/motion/calendar.tsx",
            previewKey: "motion/calendar-multiple",
            previewFile: "components/previews/motion/calendar-multiple.preview.tsx",
          },
          {
            slug: "week",
            name: "Week Picker",
            description:
              "Hovering a day previews its whole week and a click picks it as one pill across the row, with an ISO week-number column; shown as a timesheet week.",
            file: "components/motion/calendar.tsx",
            previewKey: "motion/calendar-week",
            previewFile: "components/previews/motion/calendar-week.preview.tsx",
          },
          {
            slug: "booking",
            name: "Booking Calendar",
            description:
              "Two-month stay picker with nightly prices under each day and the cheapest days tinted, booked nights struck through, a minimum stay, and a footer with dates, nights, total and a Reserve button.",
            installSlug: "booking-calendar",
            file: "components/motion/booking-calendar.tsx",
            previewKey: "motion/booking-calendar",
            previewFile: "components/previews/motion/booking-calendar.preview.tsx",
          },
          {
            slug: "time-picker",
            name: "Time Picker",
            description:
              "iOS-style hour, minute and AM/PM drums composed from WheelPicker, inline or as a time field whose wheels morph open and commit on Done.",
            installSlug: "time-picker",
            file: "components/motion/time-picker.tsx",
            previewKey: "motion/time-picker",
            previewFile: "components/previews/motion/time-picker.preview.tsx",
          },
          {
            slug: "date-time-picker",
            name: "Date & Time Picker",
            description:
              "One field whose panel morphs open with the calendar beside time wheels; edits a draft and commits on Done, labelled like \"Oct 14, 2026, 9:30 AM\".",
            installSlug: "date-time-picker",
            file: "components/motion/date-time-picker.tsx",
            previewKey: "motion/date-time-picker",
            previewFile: "components/previews/motion/date-time-picker.preview.tsx",
          },
          {
            slug: "month-picker",
            name: "Month Picker",
            description:
              "Twelve-month grid with a gliding selection pill, year slides and a zoom-out year grid, single or range mode, min/max and full keyboard navigation, plus a popover month field.",
            installSlug: "month-picker",
            file: "components/motion/month-picker.tsx",
            previewKey: "motion/month-picker",
            previewFile: "components/previews/motion/month-picker.preview.tsx",
          },
        ],
      },
      {
        slug: "table",
        name: "Table",
        description:
          "Two data tables: a virtualized Table that renders only the visible rows of large datasets, with sorting, row selection, resizable and movable columns and editable cells, and a paginated DataTable with filters and expandable rows. Both can turn rows into cards on narrow screens with mobileLayout=\"stack\".",
        file: "components/motion/table/index.tsx",
        badge: "new",
        launchedAt: "2026-07-01",
        keywords: [
          "react virtualized table",
          "react data table sorting filtering",
          "responsive table mobile cards",
          "editable table react",
          "infinite scroll table",
          "shadcn data table alternative",
        ],
        examples: [
          {
            slug: "data",
            name: "Data Table",
            description:
              "Virtualized rows under a sticky header, click-to-sort columns, checkbox selection with select-all, and drag handles to resize or move columns; a fixed row height keeps 10,000 rows scrolling smoothly.",
            installSlug: "table",
            file: "components/motion/table/index.tsx",
            previewKey: "motion/table",
            previewFile: "components/previews/motion/table.preview.tsx",
          },
          {
            slug: "editable",
            name: "Editable Table",
            description:
              "Mark columns editable to type straight into cells, and use the row and column menus to add or remove rows and columns; your data and column definitions stay the single source of truth.",
            installSlug: "table-editable",
            file: "components/motion/table/index.tsx",
            previewKey: "motion/table-editable",
            previewFile: "components/previews/motion/table-editable.preview.tsx",
          },
          {
            slug: "async",
            name: "Async Table",
            description:
              "Fetches more as you near the end: skeleton rows fill in while loading, onEndReached asks for the next page, and the loading flag holds back further requests until it arrives.",
            installSlug: "table-async",
            file: "components/motion/table/index.tsx",
            previewKey: "motion/table-async",
            previewFile: "components/previews/motion/table-async.preview.tsx",
          },
          {
            slug: "advanced",
            name: "Advanced Data Table",
            description:
              "The paginated DataTable: Shift+click to sort by several columns, per-column text or select filters plus a global search, a column visibility picker, column reordering, rows that expand into detail panels and range selection with a bulk-action bar.",
            installSlug: "table-advanced",
            file: "components/motion/table/data-table.tsx",
            previewKey: "motion/table-advanced",
            previewFile: "components/previews/motion/table-advanced.preview.tsx",
          },
        ],
      },
      {
        slug: "shader-background",
        name: "Shader Background",
        description:
          "Twenty-one GPU shader fills from Paper Design behind one typed variant prop, from mesh and grain gradients to warp, water, voronoi, metaballs, god rays, dithering and noise fields. Animated variants hold still when the visitor prefers reduced motion.",
        file: "components/motion/shader-background.tsx",
        badge: "new",
        launchedAt: "2026-07-02",
        keywords: [
          "webgl shader background react",
          "animated gradient background",
          "mesh gradient component",
          "hero section background effect",
          "paper shaders react",
          "noise texture background",
        ],
      },
      {
        slug: "cylinder-carousel",
        name: "Cylinder Carousel",
        description:
          "A horizontal carousel that bends items around a cylinder: concave makes the middle item smallest and enlarges toward the edges, convex does the reverse. Roll it by drag, mouse wheel or arrow keys, snap to items, or let it auto-rotate until someone touches it.",
        file: "components/motion/cylinder-carousel.tsx",
        badge: "new",
        launchedAt: "2026-07-04",
        keywords: [
          "3d cylinder carousel react",
          "curved carousel animation",
          "draggable carousel component",
          "coverflow style slider",
          "auto rotating carousel react",
          "rolling item carousel",
        ],
      },
      {
        slug: "loader",
        name: "Loader",
        description:
          "Seventeen loading animations behind one Loader component: comet, helix, metaballs and Newton's cradle next to classic spinners, bouncing dots and bars, a dot matrix, dithered noise, morphing shapes, a text scramble, a percent counter and five ASCII spinners. One size prop, currentColor, role=\"status\".",
        file: "components/motion/loader.tsx",
        badge: "new",
        launchedAt: "2026-07-04",
        keywords: [
          "react loading spinner",
          "loader component variants",
          "ascii spinner react",
          "dot matrix loading animation",
          "newtons cradle loader css",
          "accessible loading indicator",
        ],
      },
    ],
  },
  {
    slug: "agents",
    name: "AI Agents",
    description:
      "React components for AI chat and agent interfaces: prompt input, streamed answers, tool calls, approvals, model selection, context usage and voice.",
    components: [
      {
        slug: "voice-input",
        name: "Voice Input",
        guide: agentGuides["voice-input"],
        description:
          "A mic button that morphs into a recording pill with a live Web Audio waveform, elapsed timer, cancel and confirm actions, a shimmering transcription state, and graceful permission-denied fallback.",
        file: "components/agents/voice-input.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "AI voice input React",
          "speech to text button",
          "audio waveform recorder",
          "voice prompt component",
          "microphone recording UI",
          "Web Speech API React",
        ],
      },
      {
        slug: "message-bubble",
        name: "Message Bubble",
        guide: agentGuides["message-bubble"],
        description:
          "The visible surface of a single chat message: six tones from solid to danger, start or end alignment inherited from its Message row, tight bubble groups, a line-clamped show-more toggle, and room for links or buttons inside.",
        file: "components/agents/message-bubble.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "chat bubble React component",
          "AI chat message bubble",
          "Tailwind chat bubble",
          "collapsible long chat message",
          "show more text toggle React",
          "grouped chat bubbles shadcn",
        ],
        examples: [
          {
            slug: "surfaces",
            name: "Animated Surfaces",
            description:
              "A live demo conversation: each message you send pops in once from its corner, while the assistant reply streams into a row that holds still.",
            file: "components/agents/message-bubble.tsx",
            previewKey: "agents/message-bubble",
            previewFile:
              "components/previews/agents/message-bubble.preview.tsx",
            usageFile:
              "components/previews/agents/message-bubble.usage.tsx",
          },
          {
            slug: "avatars",
            name: "With Avatars",
            description:
              "Messages land one after another with sender avatars, header details, a delivery status, and follow-ups kept in line by an empty avatar slot.",
            file: "components/agents/message-bubble.tsx",
            previewKey: "agents/message-bubble-avatars",
            previewFile:
              "components/previews/agents/message-bubble-avatars.preview.tsx",
          },
          {
            slug: "show-more",
            name: "Show More",
            description:
              "A long assistant answer clamped to a few lines, with a toggle under the text that opens it downward and folds it back up.",
            file: "components/agents/message-bubble.tsx",
            previewKey: "agents/message-bubble-collapsible",
            previewFile:
              "components/previews/agents/message-bubble-collapsible.preview.tsx",
          },
        ],
      },
      {
        slug: "message",
        name: "Message",
        guide: agentGuides.message,
        description:
          "Building blocks for one chat transcript row: Message, MessageGroup, MessageAvatar, header, content and footer slots, a live marker and a typing indicator. A freshly sent row can pop up once from its trailing corner.",
        file: "components/agents/message.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "React chat message component",
          "AI chat transcript UI",
          "chat row with avatar React",
          "typing indicator React",
          "LLM chat UI components",
          "shadcn AI message",
        ],
        usageFile: "components/previews/agents/message.usage.tsx",
      },
      {
        slug: "message-scroller",
        name: "Message Scroller",
        guide: agentGuides["message-scroller"],
        description:
          "A scroll container for chat transcripts that stays pinned to the newest streamed text only while the reader sits near the bottom, stops following once they scroll up, and can add a rail for jumping between messages.",
        file: "components/agents/message-scroller.tsx",
        usageFile:
          "components/previews/agents/message-scroller.usage.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "chat auto scroll React",
          "stick to bottom chat",
          "AI chat scroll to bottom",
          "streaming transcript scroll",
          "chat message navigation rail",
          "aria-live chat log",
        ],
      },
      {
        slug: "prompt-input",
        name: "Prompt Input",
        guide: agentGuides["prompt-input"],
        description:
          "The text box where people talk to your agent: it grows with the draft up to a row limit, sends on Enter with Shift+Enter for a new line, offers a model picker and a prompt action menu, and swaps send for stop during a reply.",
        file: "components/agents/prompt-input.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI chat input React",
          "ChatGPT style prompt box",
          "auto resize textarea React",
          "chat composer with model selector",
          "send and stop button chat",
          "shadcn prompt input",
        ],
      },
      {
        slug: "todo-list",
        name: "Todo List",
        guide: agentGuides["todo-list"],
        description:
          "Shows the plan an agent is working through: each task carries a pending, in-progress, completed or cancelled mark that morphs between states, optional progress and detail, a done count in the header, and a panel that can fold away when all is finished.",
        file: "components/agents/todo-list.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI agent task list React",
          "agent plan checklist UI",
          "Claude Code todo list UI",
          "task progress component React",
          "collapsible checklist React",
          "LLM agent plan UI",
        ],
      },
      {
        slug: "code-block",
        name: "Code Block",
        guide: agentGuides["code-block"],
        description:
          "Displays code while an agent is still writing it: highlighting for TypeScript, TSX, JSON, bash, diff or plain text, line numbers, emphasis on chosen lines, a height cap that trails new output, optional wrapping and a copy button that confirms.",
        file: "components/agents/code-block.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "streaming code block React",
          "syntax highlighting React component",
          "copy code button React",
          "AI generated code viewer",
          "code block with line numbers",
          "shadcn code block",
        ],
      },
      {
        slug: "approval-card",
        name: "Approval Card",
        guide: agentGuides["approval-card"],
        description:
          "Pauses an agent to get a decision from a person: walk them through single-choice, multi-choice or write-in questions step by step, or ask them to approve, request changes or reject, then shrink to a record of what they chose.",
        file: "components/agents/approval-card/index.tsx",
        extraFiles: ["components/agents/approval-card/types.ts"],
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "human in the loop React component",
          "AI agent approval UI",
          "agent asks user question UI",
          "multi step question form React",
          "approve reject card React",
          "AI clarifying questions component",
        ],
        examples: [
          {
            slug: "questions",
            name: "Questions",
            description:
              "Steps through single-select, multi-select and write-in questions one at a time, then hands the full set of answers back to the agent.",
            file: "components/agents/approval-card/index.tsx",
            previewKey: "agents/approval-card-question",
            previewFile:
              "components/previews/agents/approval-card-question.preview.tsx",
          },
          {
            slug: "review",
            name: "Review and Approve",
            description:
              "Halts a run so a person can approve, ask for changes or reject, then folds down to show the decision that was made.",
            file: "components/agents/approval-card/index.tsx",
            previewKey: "agents/approval-card-review",
            previewFile:
              "components/previews/agents/approval-card-review.preview.tsx",
          },
        ],
      },
      {
        slug: "file-diff",
        name: "File Diff",
        guide: agentGuides["file-diff"],
        description:
          "Shows what an agent changed in a file: added, removed and context lines with old and new numbers and syntax colors, rows that stream in while the edit lands, running plus and minus counts, a copy button and an optional collapse once complete.",
        file: "components/agents/file-diff.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "React diff viewer",
          "code diff component React",
          "AI code edit preview",
          "git diff UI React",
          "unified diff React component",
          "agent file changes UI",
        ],
      },
      {
        slug: "tool-result",
        name: "Tool Result",
        guide: agentGuides["tool-result"],
        description:
          "Shows what a tool call returned: a header with the tool, title and a running, success, error or cancelled status, a capped log that tracks terminal output or a highlighted response body, retry and copy actions, and a short summary once done.",
        file: "components/agents/tool-result.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI tool call result UI",
          "terminal output component React",
          "agent command output React",
          "API response viewer React",
          "collapsible log viewer React",
          "LLM function call result",
        ],
        examples: [
          {
            slug: "terminal-output",
            name: "Terminal Output",
            description:
              "Command output scrolls into a fixed-height log that keeps the newest line visible, then folds into a one-line summary of the finished run.",
            file: "components/agents/tool-result.tsx",
            previewKey: "agents/tool-result-terminal",
            previewFile:
              "components/previews/agents/tool-result-terminal.preview.tsx",
          },
          {
            slug: "request-result",
            name: "Request Result",
            description:
              "An HTTP call in flight that resolves into a syntax-colored response body you can copy, or retry if it fails.",
            file: "components/agents/tool-result.tsx",
            previewKey: "agents/tool-result-request",
            previewFile:
              "components/previews/agents/tool-result-request.preview.tsx",
          },
        ],
      },
      {
        slug: "streaming-response",
        name: "Streaming Response",
        guide: agentGuides["streaming-response"],
        description:
          "Wraps an assistant answer during and after streaming: content renders as it arrives, then copy, retry and thumbs up or down appear, along with a collapsible footer listing the sources behind the answer.",
        file: "components/agents/streaming-response.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI answer component React",
          "chat response with copy and retry",
          "thumbs up down feedback React",
          "AI response with sources",
          "streaming markdown response React",
          "LLM output component",
        ],
      },
      {
        slug: "image-generation",
        name: "Image Generation",
        guide: agentGuides["image-generation"],
        description:
          "A placeholder for AI images that reserves the final aspect ratio up front, moves through queued, generating and refining stages with a dither pattern and a clearing blur, then shows your image, video or canvas, with retry on failure.",
        file: "components/agents/image-generation.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI image generation loading React",
          "image generation placeholder",
          "text to image UI React",
          "progressive image reveal React",
          "AI image skeleton loader",
          "generative media component",
        ],
      },
      {
        slug: "tool-approval",
        name: "Tool Approval",
        guide: agentGuides["tool-approval"],
        description:
          "Asks a person before an agent runs a tool: it lists the call's parameters, can show the code or command to be executed, lets them approve a single run, grant standing access or deny, then follows the call through running, complete or error.",
        file: "components/agents/tool-approval.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI tool permission prompt",
          "agent tool call confirmation UI",
          "allow once always allow deny",
          "MCP tool approval UI",
          "human approval React component",
          "function call approval React",
        ],
      },
      {
        slug: "citations",
        name: "Citations",
        guide: agentGuides.citations,
        description:
          "Numbered markers you drop into an answer's text, linked to a source list that opens and closes, fills in row by row and shows each site's favicon, title and domain, plus a stacked-favicon summary for compact footers.",
        file: "components/agents/citations.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI citations React",
          "inline source citations UI",
          "RAG sources component",
          "Perplexity style citations",
          "footnote references React",
          "source list with favicons",
        ],
      },
      {
        slug: "agent-activity",
        name: "Agent Activity",
        guide: agentGuides["agent-activity"],
        description:
          "One feed for everything an agent does while it works: free text, reasoning steps, web searches with results, read, edit and run tool calls, or compact trace entries, shown alone or interleaved in order, then folded into a one-line summary.",
        file: "components/agents/agent-activity/index.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI agent activity feed React",
          "agent reasoning steps UI",
          "tool call timeline React",
          "AI web search results UI",
          "agent execution log component",
          "chain of thought UI React",
        ],
        examples: [
          {
            slug: "streaming-text",
            name: "Streaming Text",
            description:
              "Free-form thinking pours into a height-capped view; when it ends, the full log stays behind a disclosure labelled with how long it took.",
            file: "components/agents/agent-activity/index.tsx",
            previewKey: "agents/agent-activity-text",
            previewFile:
              "components/previews/agents/agent-activity-text.preview.tsx",
          },
          {
            slug: "reasoning-steps",
            name: "Reasoning Steps",
            description:
              "A checklist of reasoning steps marked done, in progress or waiting, each with optional details on the right.",
            file: "components/agents/agent-activity/index.tsx",
            previewKey: "agents/agent-activity-steps",
            previewFile:
              "components/previews/agents/agent-activity-steps.preview.tsx",
          },
          {
            slug: "web-search",
            name: "Web Search",
            description:
              "Shows the query, result rows that appear one by one, and a count of the results left unlisted.",
            file: "components/agents/agent-activity/index.tsx",
            previewKey: "agents/agent-activity-search",
            previewFile:
              "components/previews/agents/agent-activity-search.preview.tsx",
          },
          {
            slug: "tool-calls",
            name: "Tool Calls",
            description:
              "Lists read, edit and run actions with file or command targets in monospace and optional added and removed line counts.",
            file: "components/agents/agent-activity/index.tsx",
            previewKey: "agents/agent-activity-tools",
            previewFile:
              "components/previews/agents/agent-activity-tools.preview.tsx",
          },
          {
            slug: "mixed-activity",
            name: "Mixed Activity",
            description:
              "Reasoning, searches and tool calls interleave in one ordered feed, and the view glides to keep the latest event in sight.",
            file: "components/agents/agent-activity/index.tsx",
            previewKey: "agents/agent-activity-mixed",
            previewFile:
              "components/previews/agents/agent-activity.preview.tsx",
          },
          {
            slug: "agent-trace",
            name: "Agent Trace",
            description:
              "Messages and actions stream into a tight ledger, and the finished run collapses to a count of its tool calls and messages.",
            file: "components/agents/agent-activity/index.tsx",
            previewKey: "agents/agent-trace",
            previewFile: "components/previews/agents/agent-trace.preview.tsx",
          },
        ],
      },
      {
        slug: "loading-states",
        name: "Agent Loading States",
        guide: agentGuides["loading-states"],
        description:
          "Three ways to say an agent is busy: ThinkingShimmer sweeps light across a status line, AgentProgress pairs an activity glyph and verb with a running timer, and ReasoningText rotates phrases with cascade, swap or scramble transitions.",
        file: "components/agents/loading-states/index.ts",
        extraFiles: [
          "components/agents/loading-states/thinking-shimmer.tsx",
          "components/agents/loading-states/agent-progress.tsx",
          "components/agents/loading-states/reasoning-text.tsx",
        ],
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI thinking indicator React",
          "Claude thinking animation",
          "shimmer text loading React",
          "agent elapsed timer UI",
          "chatbot loading animation",
          "LLM typing indicator",
        ],
        examples: [
          {
            slug: "reasoning-text",
            name: "Reasoning Text",
            description:
              "Cycles through phrases beside an ASCII spinner, switching them with a cascade, a swap or a letter-by-letter scramble while a shimmer passes over.",
            badge: "new",
            launchedAt: "2026-08-03",
            installSlug: "reasoning-text",
            file: "components/agents/loading-states/reasoning-text.tsx",
            previewKey: "agents/reasoning-text",
            previewFile:
              "components/previews/agents/reasoning-text.preview.tsx",
          },
          {
            slug: "thinking-shimmer",
            name: "Thinking Shimmer",
            description:
              "A single status line with light gliding across it, so the words stay legible for as long as the agent works.",
            badge: "new",
            launchedAt: "2026-08-03",
            installSlug: "thinking-shimmer",
            file: "components/agents/loading-states/thinking-shimmer.tsx",
            previewKey: "agents/thinking-shimmer",
            previewFile:
              "components/previews/agents/thinking-shimmer.preview.tsx",
          },
          {
            slug: "agent-progress",
            name: "Agent Progress",
            description:
              "A small animated glyph, an action word and a ticking timer in tabular digits for jobs that take a while.",
            badge: "new",
            launchedAt: "2026-08-03",
            installSlug: "agent-progress",
            file: "components/agents/loading-states/agent-progress.tsx",
            previewKey: "agents/agent-progress",
            previewFile:
              "components/previews/agents/agent-progress.preview.tsx",
          },
        ],
      },
      {
        slug: "model-selector",
        name: "Model Selector",
        description:
          "Searchable AI model picker (`ModelSelector`) that morphs open from its trigger with models grouped by provider, generic geometric provider glyphs, vision/tools/reasoning/fast capability badges, context size, relative cost dots, a New tag and a gliding active row with full keyboard navigation; a richer standalone alternative to PromptInput's compact model select, controlled or uncontrolled.",
        file: "components/agents/model-selector.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "model picker",
          "llm selector",
          "provider",
          "capabilities",
          "combobox",
          "context window",
        ],
      },
      {
        slug: "context-meter",
        name: "Context Meter",
        description:
          "Token usage indicator (`ContextMeter`) whose compact ring and \"42k / 200k\" readout expand on hover or click into a breakdown bar of system, conversation, files and tool segments in chart colors, turning warning then critical near the limit and offering an async \"Compact conversation\" action; drops into PromptInput's `leadingAction` slot.",
        file: "components/agents/context-meter.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "tokens",
          "context window",
          "usage",
          "meter",
          "compact",
          "breakdown",
        ],
      },
      {
        slug: "prompt-suggestions",
        name: "Prompt Suggestions",
        description:
          "Suggested prompt cards or chips (`PromptSuggestions`) that stagger in on first reveal, filter and highlight as the composer text changes via `query`, reflow with spring layout, move with arrow keys and hand the chosen prompt to `onSelect` — built for empty-chat welcome screens above a PromptInput.",
        file: "components/agents/prompt-suggestions.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "suggestions",
          "starter prompts",
          "empty chat",
          "welcome",
          "chips",
          "filter",
        ],
      },
      {
        slug: "message-actions",
        name: "Message Actions",
        description:
          "Assistant message action row (`MessageActions`) with copy that morphs into a drawn check, regenerate that spins (continuously while its promise runs), exclusive thumbs up/down that pop in filled, a thumbs-down reason popover with toggle chips and comment, share and a more menu; reveals on message hover or focus and stays visible on touch or with `visibility=\"always\"` for the last message — a standalone, richer counterpart to StreamingResponse's built-in actions.",
        file: "components/agents/message-actions.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "copy",
          "regenerate",
          "feedback",
          "thumbs up",
          "share",
          "message toolbar",
        ],
      },
      {
        slug: "branch-navigator",
        name: "Branch Navigator",
        description:
          "Version switcher for regenerated or edited messages: `Branches` shares a controlled or uncontrolled index, `BranchContent` cross-fades and slides the active version in from the direction you navigated, and `BranchNavigator` renders a \"‹ 2 / 3 ›\" control with a rolling counter, arrow/Home/End keys and live announcements, usable standalone too.",
        file: "components/agents/branch-navigator.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "branches",
          "versions",
          "regenerate",
          "pagination",
          "message history",
          "switcher",
        ],
      },
      {
        slug: "conversation-history",
        name: "Conversation History",
        description:
          "Chat history sidebar list grouped into Pinned, Today, Yesterday, Previous 7 days and Older from a now read after mount, with search, a spring-gliding active highlight, hover or focus row actions to pin, rename in place through InlineEdit and delete with a slide-out exit while neighbours glide up, and new chats that drop in at the top with a streaming title caret.",
        file: "components/agents/conversation-history.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "chat history",
          "conversation list",
          "chatgpt sidebar",
          "rename pin delete chat",
          "grouped by date",
          "ai chat threads",
        ],
      },
      {
        slug: "artifact-panel",
        name: "Artifact Panel",
        description:
          "Side canvas that slides open beside a chat (its width eases so the conversation reflows smoothly) to show a generated artifact, with a version switcher whose label rolls by direction, Preview/Code tabs rendering code through CodeBlock, copy, download and close actions, a shared-layout expand into a fullscreen overlay, cross-fading content between versions and a skeleton while a new version generates.",
        file: "components/agents/artifact-panel.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "artifact panel",
          "claude artifacts",
          "canvas side panel",
          "code preview tabs",
          "version switcher",
          "ai generated code viewer",
        ],
      },
      {
        slug: "voice-orb",
        name: "Voice Orb",
        description:
          "Audio-reactive orb for voice mode whose blurred --chart and --primary color blobs orbit inside a glossy sphere and swell with a 0..1 level prop, easing between idle breathing, listening ripples, a circling thinking arc and churning speaking motion, with a simulate mode that synthesizes speech-like levels and a gentle opacity pulse under reduced motion; pairs with VoiceInput for capture.",
        file: "components/agents/voice-orb.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "voice orb",
          "voice mode animation",
          "audio reactive",
          "ai assistant orb",
          "speaking listening animation",
          "siri style orb",
        ],
      },
      {
        slug: "ai-sidebar",
        name: "AI Sidebar",
        guide: agentGuides["ai-sidebar"],
        description:
          "A file-tree sidebar for agent workspaces: folders and projects expand, files and bookmarks open, rows move by drag, keyboard or menu with rollback when your save fails, F2 renames in place, and long names truncate cleanly.",
        file: "components/agents/ai-sidebar.tsx",
        usageFile: "components/previews/agents/ai-sidebar.usage.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI workspace sidebar React",
          "drag and drop file tree React",
          "project sidebar component",
          "tree view with rename React",
          "ChatGPT style sidebar",
          "collapsible folder tree",
        ],
      },
      {
        slug: "chat-app",
        previewWidth: "wide",
        name: "Chat App",
        description:
          "A full agent chat to start from: an app shell whose docked sidebar folds off-canvas when its own container gets too narrow, filled with the workspace tree, transcript, streamed answers, plans, approvals, tool output, code, diffs, images, sources and the composer.",
        file: "components/agents/chat-app.tsx",
        usageFile:
          "components/previews/agents/chat-app-usage.tsx",
        extraFiles: [
          "components/agents/agent-activity/index.tsx",
          "components/agents/ai-sidebar.tsx",
          "components/agents/approval-card/index.tsx",
          "components/agents/code-block.tsx",
          "components/agents/file-diff.tsx",
          "components/agents/image-generation.tsx",
          "components/agents/loading-states/thinking-shimmer.tsx",
          "components/agents/message.tsx",
          "components/agents/message-bubble.tsx",
          "components/agents/message-scroller.tsx",
          "components/agents/prompt-input.tsx",
          "components/agents/streaming-response.tsx",
          "components/agents/todo-list.tsx",
          "components/agents/tool-approval.tsx",
          "components/agents/tool-result.tsx",
        ],
        launchedAt: "2026-08-03",
        keywords: [
          "AI chat app template React",
          "ChatGPT clone UI React",
          "agent chat interface example",
          "Next.js AI chat template",
          "chat UI with sidebar React",
          "shadcn AI chat layout",
        ],
      },
    ],
  },
  {
    slug: "blocks",
    name: "Blocks",
    description:
      "Ready-made app screens and landing sections for React (inbox, checkout, settings, dashboard shell, pricing, hero) composed from karaUI primitives.",
    components: [
      {
        slug: "inbox-app",
        previewWidth: "wide",
        name: "Inbox App",
        description:
          "Mail client with a folder rail and unread counts (virtual folders like Starred via `filter`), a searchable message list with unread dots, stars, checkboxes and a gliding selection highlight, a reading pane that cross-fades between messages, and swipe-right-to-archive / swipe-left-to-delete rows that slide out with an Undo bar.",
        file: "components/motion/inbox-app.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "email",
          "inbox",
          "mail client",
          "swipe to archive",
          "undo",
          "reading pane",
        ],
      },
      {
        slug: "music-player",
        name: "Music Player",
        description:
          "Now-playing card with a token-gradient cover that breathes with playback, title and artist that cross-fade in the skip direction, a draggable scrub bar with buffered and played layers, play/pause icon swap, shuffle and repeat-all/one toggles, volume slider with mute, and a queue drawer that slides up over the card; playback is simulated unless a track has a `src`.",
        file: "components/motion/music-player.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "music",
          "audio player",
          "now playing",
          "scrubber",
          "playlist queue",
          "media controls",
        ],
      },
      {
        slug: "file-manager",
        previewWidth: "wide",
        name: "File Manager",
        description:
          "File browser with breadcrumb navigation, folders that slide in from the side you travel, grid/list views, click / Cmd-Ctrl-click / Shift-click range selection with arrow-key movement, kind-tinted file icons, a sort menu, a storage usage meter, and a drop overlay that adds dragged-in files to the open folder.",
        file: "components/motion/file-manager.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "file browser",
          "file explorer",
          "drive",
          "multi-select",
          "drag and drop upload",
          "breadcrumb",
        ],
      },
      {
        slug: "dashboard-shell",
        previewWidth: "wide",
        name: "Dashboard Shell",
        description:
          "Container-sized app shell whose sidebar collapses to icons with tooltips and a gliding active pill, a top bar with a Mod+K search field and avatar menu, and a content slot with breadcrumbs, title and actions that cross-fades per page; below its own `mobileBelow` width (768px default) the sidebar moves into a Drawer — a data-driven complement to the viewport-height AnimatedSidebar primitives.",
        file: "components/motion/dashboard-shell.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "app shell",
          "admin layout",
          "sidebar",
          "dashboard",
          "navigation",
          "top bar",
        ],
      },
      {
        slug: "comparison-table",
        name: "Comparison Table",
        description:
          "Plan comparison grid with a monthly/yearly switch that rolls every price, plan columns in a sticky header over scrolling feature rows, collapsible feature groups, check / dash / partial / text cells, a recommended column tinted top to bottom, and a plan switcher with one cross-fading column in narrow containers — the detailed companion to PricingTable.",
        file: "components/motion/comparison-table.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "pricing comparison",
          "feature matrix",
          "plans",
          "sticky header",
          "billing toggle",
          "compare",
        ],
      },
      {
        slug: "feature-section",
        name: "Feature Section",
        description:
          "Marketing features section with a vertical tab list beside a visual panel that cross-fades and slides in the direction of travel to each feature's visual, autoplay that fills a progress rail on the active row and advances, pausing on hover or focus, with a pause button and keyboard tabs.",
        file: "components/motion/feature-section.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "features",
          "marketing",
          "landing page",
          "autoplay tabs",
          "product tour",
          "showcase",
        ],
      },
      {
        slug: "blog-list",
        name: "Blog List",
        description:
          "Blog index with category chips and a gliding pill, a wide featured post, and cards with gradient or image covers, excerpt, author avatar, read time and an en-US date that lift on hover; filtering reflows the grid with shared layout and Load more appends the next page with a stagger, falling back to `onLoadMore` for server pagination.",
        file: "components/motion/blog-list.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "blog",
          "articles",
          "posts grid",
          "category filter",
          "load more",
          "featured post",
        ],
      },
      {
        slug: "status-page",
        name: "Status Page",
        description:
          "Service status block with an overall banner derived from today's worst status, per-service 90-day uptime bars that grow in on view and reveal a date, status and incident tooltip on hover or arrow-key focus, computed uptime percentages, and an incident timeline whose entries expand into their update history, all formatted in UTC from deterministic data.",
        file: "components/motion/status-page.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "status page",
          "uptime bars",
          "system status",
          "incident timeline",
          "service health",
          "statuspage component",
        ],
      },
      {
        slug: "changelog",
        name: "Changelog",
        description:
          "Release notes list with a version and date rail, New/Improved/Fixed badges, entries that expand to reveal their staggered change lines, a tag filter with counts that reflows the list with layout animation, and an email subscribe field driven by a StatefulButton promise.",
        file: "components/motion/changelog.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "changelog",
          "release notes",
          "whats new",
          "product updates",
          "version history",
          "changelog filter",
        ],
      },
      {
        slug: "roadmap",
        name: "Roadmap",
        description:
          "Public product roadmap with Planned, In progress and Shipped columns or a quarter timeline, where cards fly between the two views through shared layout, re-sort by votes as you upvote with a direction-aware rolling count, carry tag badges, and can be filtered by status.",
        file: "components/motion/roadmap.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "product roadmap",
          "public roadmap",
          "feature voting",
          "upvote board",
          "roadmap timeline",
          "feedback board",
        ],
      },
      {
        slug: "login-form",
        name: "Login Form",
        description:
          "Sign-in card that pairs with Signup Form — email, password and remember-me with generic SSO/passkey buttons — whose \"Forgot password?\" flow morphs inside the same card from requesting a code to a check-your-inbox screen with a resend cooldown, then an OTP plus new-password step and a drawn success check, with every async handler driving pending states and shaking the card on rejection.",
        file: "components/motion/login-form.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "login form",
          "sign in form",
          "forgot password flow",
          "password reset otp",
          "social login buttons",
          "react auth card",
        ],
      },
      {
        slug: "settings-page",
        previewWidth: "wide",
        name: "Settings Page",
        description:
          "Account settings with a side nav whose pill glides between Profile, Notifications, Appearance and Billing, sections built from inline edits, switches, selects, toggle groups and usage bars, a draft that slides up a sticky unsaved-changes bar with Reset and an async Save that shakes on failure, and a danger zone behind a type-to-confirm dialog.",
        file: "components/motion/settings-page.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "settings page",
          "account settings",
          "unsaved changes bar",
          "preferences form",
          "danger zone delete account",
          "react settings layout",
        ],
      },
      {
        slug: "contact-form",
        name: "Contact Form",
        description:
          "Contact section with name, email, a topic select and an auto-growing message textarea with a live character counter, validation that only flags fields after blur, an async submit that shakes on error and morphs the card into a drawn-check thank-you panel, plus a side panel of contact methods.",
        file: "components/motion/contact-form.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "contact form",
          "contact us section",
          "form validation",
          "message character counter",
          "form success state",
          "react contact page",
        ],
      },
      {
        slug: "checkout",
        name: "Checkout",
        description:
          "Checkout flow on Stepper — shipping with a gliding delivery-speed choice, display-only payment fields and an editable review — beside an order summary with compact quantity steppers, a promo code that shakes when invalid and pops a removable badge when valid, and subtotal, discount, tax and total that roll on every change.",
        file: "components/motion/checkout.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "checkout",
          "checkout form",
          "order summary",
          "promo code input",
          "multi step checkout",
          "react ecommerce checkout",
        ],
      },
      {
        slug: "invoice",
        name: "Invoice",
        description:
          "Printable invoice with number and UTC-formatted dates, an animated Paid / Due / Overdue status badge, bill-from and bill-to, a staggered line-item table and subtotal, tax and total, plus Download, Send and Mark-as-paid actions that stamp the sheet and roll the amount due to zero, with print variants that hide the actions and switch to ink-friendly colors.",
        file: "components/motion/invoice.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "invoice",
          "invoice template",
          "printable invoice",
          "billing document",
          "payment status badge",
          "react invoice component",
        ],
      },
      {
        slug: "onboarding-checklist",
        name: "Onboarding Checklist",
        description:
          "Getting-started card with a progress ring and bar and steps that expand to a description and an async CTA; finishing a step pops its check, strikes its title and opens the next unfinished step, and at 100% the list gives way to a confetti celebration, with a dismiss that animates the card away.",
        file: "components/motion/onboarding-checklist.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "onboarding checklist",
          "getting started checklist",
          "setup progress",
          "user onboarding",
          "task completion animation",
          "react checklist card",
        ],
      },
      {
        slug: "cta-section",
        name: "CTA Section",
        description:
          "Closing call-to-action section in a centered layout (large headline, two CTAs and a reassurance checklist inside a card) or a split layout (copy beside a visual or an email capture with a stateful submit), with a word-by-word headline reveal on scroll, a rotating gradient beam on the card border or a soft dotted field, and a layout that adapts to its own container width.",
        file: "components/motion/cta-section.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react cta section",
          "call to action component",
          "landing page cta",
          "newsletter signup block",
          "animated gradient border card",
          "shadcn cta block",
        ],
      },
      {
        slug: "logo-cloud",
        name: "Logo Cloud",
        description:
          "Trusted-by logo strip with an infinite marquee variant behind edge fade masks that pauses on hover or focus, and a grid variant whose logos fade in with a stagger and lift on hover; logos start muted and grayscale and take their own colors on hover, accept any SVG or node, and fall back to a static row under reduced motion.",
        file: "components/motion/logo-cloud.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react logo cloud",
          "logo marquee",
          "trusted by section",
          "customer logos grid",
          "infinite logo scroller",
          "shadcn logo cloud",
        ],
      },
      {
        slug: "how-it-works",
        name: "How It Works",
        description:
          "Numbered steps section whose connector draws from marker to marker as it scrolls into view, lighting each marker as the line arrives; horizontal on wide containers and a vertical timeline on narrow ones, with optional per-step media that cross-fades when a step is hovered, focused or chosen with arrow keys like a tab.",
        file: "components/motion/how-it-works.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react how it works section",
          "steps section component",
          "process timeline",
          "onboarding steps landing page",
          "animated step connector",
          "shadcn steps block",
        ],
      },
      {
        slug: "integrations-section",
        name: "Integrations Section",
        description:
          "Integrations showcase pairing a hub-and-spoke orbit (your logo at the center, integration icons on counter-rotating rings that keep icons upright and pause on hover) with a searchable card grid filtered by category chips behind a gliding pill, where cards enter, leave and reflow with spring layout animation.",
        file: "components/motion/integrations-section.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react integrations section",
          "integration orbit",
          "hub and spoke animation",
          "searchable integrations grid",
          "app marketplace section",
          "shadcn integrations block",
        ],
      },
      {
        slug: "image-gallery",
        name: "Image Gallery",
        description:
          "Photo gallery laid out as a masonry or uniform grid sized by its own container width, with hover zoom and caption reveal, category filters behind a gliding chip with spring layout reflow, and a lightbox that grows out of the clicked tile with prev/next, arrow keys, Escape, swipe, a counter and a focus trap; reduced motion turns every move into a fade.",
        file: "components/motion/image-gallery.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react image gallery",
          "masonry gallery component",
          "lightbox shared layout",
          "photo grid filter",
          "gallery tailwind",
          "shadcn gallery block",
        ],
      },
      {
        slug: "newsletter-section",
        name: "Newsletter Section",
        description:
          "Newsletter signup section with an email field, light validation and a submit button that steps through idle, loading, success and error from your onSubscribe promise, a form that morphs into a confirmation with a draw-in check, a privacy note, optional reader avatars for social proof, and card or inline layouts.",
        file: "components/motion/newsletter-section.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react newsletter section",
          "email signup component",
          "subscribe form tailwind",
          "newsletter cta block",
          "landing page newsletter",
          "shadcn newsletter",
        ],
      },
      {
        slug: "team-section",
        name: "Team Section",
        description:
          "Team page section with member cards that stagger in on view and slide up a bio and links on hover or focus, department filter chips with a gliding pill and spring layout reflow, and a click that opens a focus-managed dialog with the member's full bio, location and links.",
        file: "components/motion/team-section.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react team section",
          "team members grid",
          "about us team component",
          "team cards tailwind",
          "staff directory block",
          "shadcn team section",
        ],
      },
      {
        slug: "content-section",
        name: "Content Section",
        description:
          "Long-form marketing content block in three variants: split copy beside media that stays pinned while paragraphs scroll, a stats layout whose callouts roll their numbers up on view, and a pull quote framed by large typographic quote marks, with paragraphs revealed as they scroll into view.",
        file: "components/motion/content-section.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react content section",
          "marketing content block",
          "sticky media section",
          "stats section animated numbers",
          "pull quote component",
          "shadcn content block",
        ],
      },
      {
        slug: "audit-trail",
        name: "Audit Trail",
        description:
          "Chronological activity log grouped by day with actor avatars, verb-plus-target summaries, relative times, severity and category badges, actor, action-type and search filters, entries that expand into a before/after field diff, new events sliding in at the top, and an export hook that receives the filtered rows.",
        file: "components/motion/audit-trail.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react audit log",
          "activity log component",
          "audit trail tailwind",
          "change history diff",
          "admin activity feed",
          "shadcn audit log",
        ],
      },
      {
        slug: "approval-queue",
        name: "Approval Queue",
        description:
          "Review queue for pending expense, access, deploy and time-off requests with row and bulk selection, approve and reject that swipe rows out optimistically with an undo toast, a dialog that asks for a rejection reason, Pending/Approved/Rejected tabs whose counts roll, and j/k/x/a/r keyboard shortcuts.",
        file: "components/motion/approval-queue.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react approval queue",
          "approve reject list",
          "bulk approval ui",
          "undo toast pattern",
          "keyboard shortcuts list",
          "shadcn approvals",
        ],
      },
      {
        slug: "log-explorer",
        name: "Log Explorer",
        description:
          "Log stream viewer with a volume histogram you click or drag across to narrow the time window, level filters, a text query with highlighted matches, a virtualized monospace table, live tail that follows new lines until you scroll up and then shows a Jump to latest pill, and a side panel with each line's structured fields as JSON.",
        file: "components/motion/log-explorer.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react log viewer",
          "log explorer component",
          "live tail logs",
          "log histogram filter",
          "virtualized log table",
          "shadcn logs",
        ],
      },
      {
        slug: "performance-report",
        name: "Performance Report",
        description:
          "Dashboard report with a date range picker and previous-period compare switch, rolling KPI cards with delta badges, an area trend chart that adds the previous period as a muted series, a breakdown table with inline growing bars, and auto-generated highlights that stagger in, with skeletons holding the layout while a new range loads.",
        file: "components/motion/performance-report.tsx",
        badge: "new",
        launchedAt: "2026-10-15",
        keywords: [
          "react analytics report",
          "dashboard report component",
          "kpi trend breakdown",
          "period comparison chart",
          "auto insights dashboard",
          "shadcn dashboard",
        ],
      },
      {
        slug: "cookie-consent",
        name: "Cookie Consent",
        description:
          "Cookie consent card that springs up after mount with Accept all, Reject non-essential and Customize, where Customize grows the card into Necessary (locked on), Analytics and Marketing switches with Save; the choice is reported through onConsentChange and can persist to localStorage, anchored bottom-left, bottom or bottom-right, fixed to the viewport or contained in a parent.",
        file: "components/motion/cookie-consent.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react cookie consent",
          "cookie banner component",
          "gdpr consent banner",
          "cookie preferences modal",
          "privacy consent tailwind",
          "shadcn cookie banner",
        ],
      },
      {
        slug: "navigation-menu",
        name: "Navigation Menu",
        description:
          "Site navbar with a logo slot, plain links and mega-menu panels: a hover pill glides between items, the dropdown viewport morphs its size to each panel while content slides in the direction you move, panels open on hover intent or click/Enter, close on Escape or outside click, support arrow-key navigation, and collapse below md into a hamburger sheet with accordion sections.",
        file: "components/motion/navigation-menu.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react navigation menu",
          "mega menu component",
          "animated navbar dropdown",
          "shadcn navigation menu motion",
          "responsive navbar hamburger",
          "nextjs header mega menu",
        ],
      },
      {
        slug: "bento-grid",
        name: "Bento Grid",
        description:
          "Bento layout of feature tiles on a container-query grid that collapses to one column in narrow containers, with per-card column and row spans, icon, title, description and a visual slot that lifts and zooms on hover, a radial spotlight that follows the cursor across the border and surface, a CTA whose arrow nudges on hover, and cards that stagger in when scrolled into view.",
        file: "components/motion/bento-grid.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react bento grid",
          "bento box layout",
          "feature grid component",
          "spotlight card hover",
          "tailwind bento grid",
          "shadcn bento grid",
        ],
      },
      {
        slug: "stat-card",
        name: "Stat Card",
        description:
          "KPI tiles whose headline numbers roll digit by digit to each new value, with Intl number, currency, percent and compact formatting, a delta badge with an up or down arrow toned by whether the move is good news, an inline sparkline that redraws when its data changes, a period caption, a skeleton loading state and a container-query StatGrid layout.",
        file: "components/motion/stat-card.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react stat card",
          "kpi card component",
          "dashboard metrics tailwind",
          "animated number stats",
          "sparkline stat tile",
          "shadcn stats",
        ],
      },
      {
        slug: "notification-center",
        name: "Notification Center",
        description:
          "Bell trigger whose unread badge springs when the count rises, opening a panel that grows out of the bell with All/Unread tabs and a gliding indicator, Today/Earlier groups, relative times, unread dots, hover actions to mark read or archive that collapse rows out while the rest glide up, Mark all as read, an empty state, focus management with Escape, and a controlled or uncontrolled notifications list.",
        file: "components/motion/notification-center.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react notification center",
          "notification bell dropdown",
          "notification inbox component",
          "unread badge animation",
          "tailwind notifications panel",
          "shadcn notifications",
        ],
      },
      {
        slug: "faq-section",
        name: "FAQ Section",
        description:
          "FAQ page section with an eyebrow, heading and description column beside an accordion that opens one or many answers with height-morphing panels and a rotating plus, an optional search that narrows questions with spring layout reflow and highlights matches, a Still have questions CTA slot, optional hash deep links, and a layout that splits into two columns based on its own container width.",
        file: "components/motion/faq-section.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react faq section",
          "faq accordion component",
          "searchable faq",
          "frequently asked questions tailwind",
          "landing page faq",
          "shadcn faq block",
        ],
      },
      {
        slug: "testimonial-wall",
        name: "Testimonial Wall",
        description:
          "Testimonial wall of quote cards with names, roles, initials avatars and optional star ratings, laid out in masonry-like columns that scroll vertically in alternating directions behind fade masks, pause on hover or focus, fall back to a static masonry under reduced motion, offer a static grid variant, and pick their column count from the block's own container width.",
        file: "components/motion/testimonial-wall.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react testimonial wall",
          "testimonials marquee",
          "vertical marquee reviews",
          "masonry testimonials",
          "social proof section",
          "shadcn testimonials",
        ],
      },
      {
        slug: "hero-section",
        name: "Hero Section",
        description:
          "Landing hero with a New pill badge, a headline revealed word by word with a spring blur-in, supporting copy that follows, primary and secondary CTAs, an install command chip with an animated copy button, an optional media slot that tilts up into place on view, and a CSS-gradient grid background with sweeping beams, centered or left aligned.",
        file: "components/motion/hero-section.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react hero section",
          "landing page hero",
          "animated headline",
          "saas hero tailwind",
          "hero with install command",
          "shadcn hero block",
        ],
      },
      {
        slug: "footer-section",
        name: "Footer Section",
        description:
          "Site footer with a brand column of logo, tagline and social icons that lift on hover, link columns that collapse into disclosures in narrow containers, a newsletter signup that validates email and runs idle, loading, success and error states from an onSubscribe promise, and a bottom bar with legal links and a theme toggle slot.",
        file: "components/motion/footer-section.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react footer component",
          "website footer tailwind",
          "newsletter signup footer",
          "responsive footer links",
          "landing page footer",
          "shadcn footer block",
        ],
      },
      {
        slug: "event-calendar",
        name: "Event Calendar",
        description:
          "Month and week event calendar: month cells pack events into lanes so multi-day events become bars across the week row and overflowing days open a \"+N more\" list, while week view places timed events on an hour grid, side by side where they overlap, with a live now line and optional 15-minute drag to reschedule. Periods slide in from the direction you travel, the Month/Week switcher pill glides between views, and day cells support arrow-key navigation.",
        file: "components/motion/event-calendar.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react event calendar",
          "calendar scheduler component",
          "week view calendar react",
          "month view calendar",
          "google calendar clone react",
          "shadcn event calendar",
        ],
      },
      {
        slug: "pricing-table",
        name: "Pricing Table",
        description:
          "Pricing block with a monthly/yearly toggle whose pill glides between options beside a Save 20% badge, prices that roll digit by digit to the new period, three plans with a highlighted Popular card, feature lists with check and cross rows, per-plan CTA buttons, Intl currency formatting and cards that stack based on their own container width.",
        file: "components/motion/pricing-table.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react pricing table",
          "pricing page component",
          "monthly yearly toggle",
          "saas pricing cards",
          "pricing plans tailwind",
          "shadcn pricing",
        ],
      },
      {
        slug: "kanban-board",
        previewWidth: "wide",
        name: "Kanban Board",
        description:
          "Task board whose cards drag within and across columns, opening a dashed drop slot where they will land, lighting up the column underneath and flying into place via shared layout. Space, arrows and Escape move cards from the keyboard with live announcements. Columns show count badges, cards carry tags, assignee initials and a priority dot, and on mobile the columns scroll horizontally with snap. Controlled/uncontrolled, reduced-motion safe.",
        file: "components/motion/kanban-board.tsx",
        badge: "new",
        launchedAt: "2026-10-14",
        keywords: [
          "react kanban board",
          "drag and drop kanban",
          "trello clone react",
          "task board component",
          "project management ui",
          "shadcn kanban",
        ],
      },
      {
        slug: "infinite-masonry",
        name: "Infinite Masonry",
        description:
          "A masonry grid for feeds of unknown length: it measures each card's real height, renders only what is near the viewport with TanStack Virtual, picks a column count from the container width and fetches the next page before the reader runs out.",
        file: "components/motion/infinite-masonry.tsx",
        badge: "new",
        launchedAt: "2026-07-15",
        keywords: [
          "React masonry layout",
          "virtualized masonry grid",
          "infinite scroll gallery React",
          "Pinterest style grid React",
          "TanStack Virtual masonry",
          "responsive masonry columns",
        ],
      },
      {
        slug: "notification-stack",
        name: "Notification Stack",
        description:
          "Piles notifications into a compact deck and fans them out into a full list when someone hovers, focuses or taps it, with a count, a view-all action and an empty state.",
        file: "components/motion/notification-stack.tsx",
        badge: "new",
        launchedAt: "2026-07-14",
        keywords: [
          "notification stack React",
          "stacked notification cards",
          "notification center UI",
          "expandable notification list",
          "iOS style notification stack",
          "Tailwind notification cards",
        ],
      },
      {
        slug: "project-folder",
        name: "Project Folder",
        description:
          "A folder card for portfolios and file browsers: hovering or focusing fans out preview cards from inside, clicking grows it into a full overlay with managed focus and Escape to close, and closing plays the same path back into the folder.",
        file: "components/motion/project-folder.tsx",
        badge: "new",
        launchedAt: "2026-08-15",
        keywords: [
          "animated folder React",
          "folder card component",
          "portfolio project card",
          "file preview hover animation",
          "folder open animation",
          "macOS folder UI React",
        ],
      },
      {
        slug: "knockout-bracket",
        name: "Fixtures",
        description: "Tournament draws two ways from one data shape: a bracket that steps through rounds column by column, and a wheel that rings the same matches around the champion. Pass rounds of matches once and render either view.",
        file: "components/motion/knockout-bracket.tsx",
        badge: "new",
        launchedAt: "2026-07-27",
        extraFiles: ["components/motion/knockout-wheel.tsx"],
        examples: [
          {
            slug: "knockout-wheel",
            name: "Knockout Wheel",
            description:
              "A circular take on the draw: the winner sits at the center, each round adds a ring farther out, and the competing teams line the edge. Rings spring in from the middle outward, hovering a team keeps it in focus while every other one dims, and each team shows a flag, logo or initials.",
            badge: "new",
            launchedAt: "2026-07-27",
            installSlug: "knockout-wheel",
            file: "components/motion/knockout-wheel.tsx",
            previewKey: "blocks/knockout-wheel",
            previewFile: "components/previews/blocks/knockout-wheel.preview.tsx",
          },
          {
            slug: "knockout-bracket",
            name: "Knockout Bracket",
            description:
              "Moves through the draw round by round. The first visible round sits on an even grid, later rounds center each match between the two that fed it, and cards, connector lines, headings and height all animate to each new layout. A separate third place match sits under the tree, and every label, date, crest and result chip comes from your data.",
            installSlug: "knockout-bracket",
            file: "components/motion/knockout-bracket.tsx",
            previewKey: "blocks/knockout-bracket",
            previewFile:
              "components/previews/blocks/knockout-bracket.preview.tsx",
          },
        ],
        keywords: [
          "tournament bracket React",
          "single elimination bracket",
          "World Cup knockout bracket",
          "playoff bracket component",
          "radial tournament bracket",
          "bracket UI with scores",
        ],
      },
      {
        slug: "availability-scheduler",
        name: "Availability Scheduler",
        description: "Set weekly working hours: toggle each day on or off, add or remove time ranges that slide and blur in and out, choose times from a scrolling list in steps you set, and copy one day's hours onto other days.",
        file: "components/motion/availability-scheduler/index.tsx",
        badge: "new",
        launchedAt: "2026-07-10",
        keywords: [
          "weekly availability picker React",
          "business hours editor",
          "working hours scheduler UI",
          "Calendly style availability",
          "time range picker React",
          "opening hours component",
        ],
      },
      {
        slug: "swap",
        name: "Multi-chain Swap",
        description: "A crypto swap card for moving tokens between chains: pick source and destination token and network, reverse them with a rotating button, see the converted amount and a quote with rate, fee, slippage and time, and set a destination address.",
        file: "components/motion/swap.tsx",
      },
      {
        slug: "dynamic-island",
        name: "Dynamic Island",
        description: "An iPhone-like pill that expands into whichever live view you make active, springing its outline to fit each one and blurring between their contents; set the view to null and it folds back to the compact pill.",
        file: "components/motion/dynamic-island.tsx",
      },
      {
        slug: "command-palette",
        name: "Command Palette",
        description: "A Cmd or Ctrl+K launcher for your app: fuzzy search across labels and keywords, grouped results with hints and badges, arrow-key navigation with a springy highlight on the current row, and a frosted panel.",
        file: "components/motion/command-palette.tsx",
      },
      {
        slug: "morphing-search",
        name: "Morphing Search",
        description:
          "A search box, or just an icon, that grows into a frosted results panel when clicked or opened with a keyboard shortcut, filtering items by title and keywords with arrow-key selection.",
        file: "components/motion/morphing-search.tsx",
        badge: "new",
        launchedAt: "2026-08-18",
        keywords: [
          "animated search bar React",
          "expanding search input",
          "search icon expand animation",
          "site search modal React",
          "keyboard shortcut search",
          "morphing search component",
        ],
      },
      {
        slug: "expandable-action-bar",
        name: "Expandable Action Bar",
        description: "A toolbar that shows just icons until hovered or focused, then widens into labeled buttons with badges and shortcut hints, while a shared highlight follows the current item.",
        file: "components/motion/expandable-action-bar.tsx",
      },
      {
        slug: "overflow-actions",
        name: "Overflow Actions",
        description: "Keeps the main buttons visible in one joined pill and tucks the rest behind a toggle; pressing it springs the rail wider to show the extra actions, and it can close again after one is used.",
        file: "components/motion/overflow-actions.tsx",
      },
      {
        slug: "expandable-tabs",
        name: "Expandable Tabs",
        description: "A bar of icon tabs where the selected one widens to show its label in a pill while a panel above it resizes to fit, sliding its content left or right by the direction you moved; Escape or an outside click closes it.",
        file: "components/motion/expandable-tabs.tsx",
      },
      {
        slug: "morphing-tabs",
        name: "Morphing Tabs",
        description: "Tabs you can drag or move with the keyboard to reorder, where the selected tab stretches into the content panel itself, the active shape slides as tabs trade places, and an optional close button sits on every tab.",
        file: "components/motion/morphing-tabs.tsx",
        badge: "new",
        launchedAt: "2026-08-06",
        keywords: [
          "draggable tabs React",
          "reorder tabs drag and drop",
          "browser tabs component",
          "closable tabs React",
          "animated tab panel",
          "Chrome style tabs React",
        ],
      },
      {
        slug: "swipeable-list",
        name: "Swipeable List",
        description: "List rows for touch screens that slide sideways to uncover action buttons, with separate actions for each side and neutral, primary, success, warning or danger tones for things like archive or delete.",
        file: "components/motion/swipeable-list.tsx",
      },
      {
        slug: "file-upload",
        name: "File Upload",
        description:
          "Two ways to handle uploads: a queue of files with progress bars, status, retry and remove, and an attachment area that takes files, links, images and audio with previews, size limits and a waveform player.",
        file: "components/motion/file-upload.tsx",
        extraFiles: ["components/motion/attachment-upload.tsx"],
        badge: "new",
        launchedAt: "2026-07-30",
        examples: [
          {
            slug: "attachment-upload",
            name: "Attachment Upload",
            description:
              "A dropzone for mixed attachments: file and image rows that stagger in, upload, done and failed states with retry and remove, image previews that expand smoothly, and audio with a waveform.",
            badge: "new",
            launchedAt: "2026-07-30",
            installSlug: "attachment-upload",
            file: "components/motion/attachment-upload.tsx",
            previewKey: "blocks/attachment-upload",
            previewFile:
              "components/previews/blocks/attachment-upload.preview.tsx",
          },
          {
            slug: "upload-queue",
            name: "Upload Queue",
            description:
              "Drop or browse files into a list where each row shows progress and status, with retry for failures and a button to take it out.",
            installSlug: "file-upload",
            file: "components/motion/file-upload.tsx",
            previewKey: "blocks/file-upload",
            previewFile: "components/previews/blocks/file-upload.preview.tsx",
          },
        ],
        keywords: [
          "React file upload component",
          "drag and drop upload",
          "upload progress bar React",
          "file attachment UI",
          "image upload preview",
          "dropzone React",
        ],
      },
      {
        slug: "prediction-market",
        name: "Prediction Market",
        description: "A trade ticket for prediction markets: switch between buy and sell, choose an outcome by price, type an amount that rolls digit by digit or bump it with quick chips, and see shares and payout before placing the trade.",
        file: "components/motion/prediction-market.tsx",
      },
      {
        slug: "wallet-card",
        name: "Wallet Card",
        description: "A crypto wallet summary: switch accounts or search from panels that open out of their buttons, show a balance whose characters cascade in beside a change badge, hide it behind dots, copy the address, and act with Send, Deposit, Swap and Buy.",
        file: "components/motion/wallet-card/index.tsx",
        badge: "new",
        launchedAt: "2026-07-03",
        keywords: [
          "crypto wallet UI React",
          "wallet balance card",
          "web3 dashboard card",
          "account switcher component",
          "hide balance toggle",
          "MetaMask style wallet UI",
        ],
      },
      {
        slug: "otp-input",
        name: "OTP Input",
        description: "A verification code field with one slot per digit: a focus ring that slides between slots, digits that roll into place, paste and SMS autofill support, a shake on wrong codes and a drawn check on success.",
        file: "components/motion/otp-input.tsx",
      },
      {
        slug: "signup-form",
        name: "Sign Up Form",
        description: "A ready registration form with name, email, password, confirmation and terms: errors appear only after a field loses focus and clear once it is valid, plus a password strength bar, a show-password toggle and a submit button with loading, success and error states.",
        file: "components/motion/signup-form.tsx",
        badge: "new",
        launchedAt: "2026-08-08",
        keywords: [
          "React signup form",
          "registration form component",
          "password strength meter React",
          "form validation on blur",
          "Tailwind sign up page",
          "animated submit button",
        ],
      },
      {
        slug: "bloom-menu",
        name: "Bloom Menu",
        description: "A single button that opens into a grid of options by widening from its center like an iris, with items appearing in rings outward from the middle; it ships with Doc, Board, Table, Folder, Reminder and Link entries.",
        file: "components/motion/bloom-menu.tsx",
        badge: "new",
        launchedAt: "2026-06-26",
      },
      {
        slug: "feedback-widget",
        name: "Feedback Widget",
        description: "A small corner button that grows into a feedback box with sending, sent and retry states and an async submit handler; it can sit bottom right or bottom left and closes with Escape.",
        file: "components/motion/feedback-widget.tsx",
        badge: "new",
        launchedAt: "2026-06-29",
        keywords: [
          "feedback widget React",
          "in-app feedback form",
          "feedback button corner",
          "user feedback popup",
          "website feedback tool",
          "send feedback component",
        ],
      },
      {
        slug: "not-found",
        name: "404 / Not Found",
        description: "Five ready 404 pages for Next.js or any React app: glitching digits, digits that lean toward the cursor, a spotlight reveal, a card stack that fans out and a terminal that types the error, each with home and browse links.",
        file: "components/motion/not-found/index.tsx",
        extraFiles: [
          "components/motion/not-found/shared.tsx",
          "components/motion/not-found/glitch.tsx",
          "components/motion/not-found/magnetic.tsx",
          "components/motion/not-found/spotlight.tsx",
          "components/motion/not-found/stacked.tsx",
          "components/motion/not-found/terminal.tsx",
        ],
        examples: [
          {
            slug: "glitch",
            name: "Glitch",
            description:
              "The 404 cycles through random characters before settling, and hovering splits it into offset color channels.",
            installSlug: "not-found-glitch",
            file: "components/motion/not-found/glitch.tsx",
            previewKey: "blocks/not-found-glitch",
            previewFile: "components/previews/blocks/not-found-glitch.preview.tsx",
          },
          {
            slug: "magnetic",
            name: "Magnetic",
            description:
              "Every digit is pulled toward the pointer by the Magnetic wrapper, then settles back when it leaves.",
            installSlug: "not-found-magnetic",
            file: "components/motion/not-found/magnetic.tsx",
            previewKey: "blocks/not-found-magnetic",
            previewFile: "components/previews/blocks/not-found-magnetic.preview.tsx",
          },
          {
            slug: "spotlight",
            name: "Spotlight",
            description:
              "A dim panel where a light that follows your cursor brings the error code up to full brightness.",
            installSlug: "not-found-spotlight",
            file: "components/motion/not-found/spotlight.tsx",
            previewKey: "blocks/not-found-spotlight",
            previewFile: "components/previews/blocks/not-found-spotlight.preview.tsx",
          },
          {
            slug: "stacked",
            name: "Stacked",
            description:
              "An error card resting on a hidden pile that springs open into a fan when hovered.",
            installSlug: "not-found-stacked",
            file: "components/motion/not-found/stacked.tsx",
            previewKey: "blocks/not-found-stacked",
            previewFile: "components/previews/blocks/not-found-stacked.preview.tsx",
          },
          {
            slug: "terminal",
            name: "Terminal",
            description:
              "A terminal window types out a cd into a missing path, prints a 404 and leaves a blinking cursor.",
            installSlug: "not-found-terminal",
            file: "components/motion/not-found/terminal.tsx",
            previewKey: "blocks/not-found-terminal",
            previewFile: "components/previews/blocks/not-found-terminal.preview.tsx",
          },
        ],
      },
    ],
  },
];

export function findCategory(slug: string) {
  return registry.find((c) => c.slug === slug);
}

export function findComponent(categorySlug: string, slug: string) {
  return findCategory(categorySlug)?.components.find((c) => c.slug === slug);
}

export function allComponents() {
  return registry.flatMap((c) =>
    c.components.map((comp) => ({ ...comp, category: c }))
  );
}

/**
 * The `@karaui/<slug>` that installs a component, or one of its variants.
 * A variant without its own install slug borrows a sibling's that ships the
 * same file; null when nothing installs exactly that variant.
 */
export function installSlugFor(comp: ComponentEntry, example?: ComponentExample) {
  const hasVariantInstalls = comp.examples?.some((e) => e.installSlug) ?? false;
  if (!example) return hasVariantInstalls ? null : comp.slug;
  if (example.installSlug) return example.installSlug;
  const sibling = comp.examples?.find((e) => e.installSlug && e.file === example.file);
  if (sibling?.installSlug) return sibling.installSlug;
  return hasVariantInstalls ? null : comp.slug;
}

/** Files an install of this component (or variant) starts from. */
export function entryFilesFor(comp: ComponentEntry, example?: ComponentExample) {
  if (example?.installSlug) return [example.file];
  const slug = installSlugFor(comp, example);
  if (example && slug && slug !== comp.slug) return [example.file];
  const files = slug === comp.slug ? [comp.file, ...(comp.extraFiles ?? [])] : [];
  if (example && !files.includes(example.file)) files.push(example.file);
  return files;
}

/** Top-level components and total installable targets (counting variants). */
export const COMPONENT_COUNT = registry.reduce(
  (n, c) => n + c.components.length,
  0,
);

export const INSTALLABLE_COUNT = registry.reduce(
  (n, c) =>
    n +
    c.components.reduce((m, comp) => {
      const variants = (comp.examples ?? []).filter((e) => e.installSlug).length;
      return m + (variants || 1);
    }, 0),
  0,
);
