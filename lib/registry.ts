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
      "Free, open-source animated React components built with Motion and Tailwind CSS, available as copy-paste source through the shadcn registry.",
    components: [
      {
        slug: "tilt-card",
        name: "Tilt Card",
        description: "3D perspective tilt on hover with cursor-tracked glare.",
        file: "components/motion/tilt-card.tsx",
      },
      {
        slug: "button",
        name: "Button",
        description: "Spring-pressed Button plus StatefulButton (idle → loading → success / error) and MagneticButton.",
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
            description: "Press scale, hover lift, variants and sizes.",
            installSlug: "button-base",
            file: "components/motion/button/base.tsx",
            previewKey: "motion/button-base",
            previewFile: "components/previews/motion/button-base.preview.tsx",
          },
          {
            slug: "stateful",
            name: "Stateful Button",
            description: "Idle → loading → success / error with blur-swap slots and morphing width.",
            installSlug: "button-stateful",
            file: "components/motion/button/stateful.tsx",
            previewKey: "motion/button-stateful",
            previewFile: "components/previews/motion/button-stateful.preview.tsx",
          },
          {
            slug: "magnetic",
            name: "Magnetic Button",
            description: "Button composed with the Magnetic wrapper for cursor-attracted pull.",
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
          "Expressive call-to-action buttons with expanding, hold, and slide interactions.",
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
              "An accent tile that expands into a dotted-arrow trail on hover or focus.",
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
              "Hold to complete with a vertical or horizontal liquid fill; release early to cancel.",
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
              "Drag the thumb to the end to confirm an action; release early to spring back.",
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
        description: "Infinite horizontal or vertical scroll with pause-on-hover.",
        file: "components/motion/marquee.tsx",
      },
      {
        slug: "tabs",
        name: "Tabs",
        description: "Pill, segment or underline tabs with a spring layoutId indicator.",
        file: "components/motion/tabs.tsx",
      },
      {
        slug: "switch",
        name: "Switch",
        description: "Toggle with a spring-driven thumb and press feedback.",
        file: "components/motion/switch.tsx",
      },
      {
        slug: "input",
        name: "Input",
        description: "Text input with label, left/right icons, error shake and success check draw.",
        file: "components/motion/input.tsx",
        keywords: [
          "react animated input",
          "input error shake",
          "floating label input",
          "react form input animation",
          "animated text field",
        ],
      },
      {
        slug: "select",
        name: "Select",
        description: "Composable select primitives whose panel bouncily unfolds out of the trigger and separates, plus a Morph variant where the trigger grows into the panel via shared layout.",
        file: "components/motion/select.tsx",
        badge: "new",
        launchedAt: "2026-06-28",
        examples: [
          {
            slug: "default",
            name: "Select",
            description: "Composable primitives (Select, SelectTrigger, SelectValue, SelectContent, SelectItem); the panel pinches off the trigger and separates, with staggered items. Position-aware (opens upward when needed).",
            installSlug: "select",
            file: "components/motion/select.tsx",
            previewKey: "motion/select",
            previewFile: "components/previews/motion/select.preview.tsx",
          },
          {
            slug: "morph",
            name: "Morph Select",
            description: "Composable primitives (MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem) where the trigger morphs into the panel via a shared layoutId — one continuous surface that grows open and shrinks back, never detaching.",
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
          "Searchable combobox with a morphing portal, grouped filtering, keyboard navigation, and controlled or uncontrolled state.",
        file: "components/motion/combobox.tsx",
        badge: "new",
        launchedAt: "2026-08-11",
        guide: agentGuides.combobox,
        keywords: [
          "react combobox",
          "animated combobox",
          "searchable select react",
          "autocomplete component",
          "command menu select",
          "accessible listbox",
        ],
      },
      {
        slug: "checkbox",
        name: "Checkbox",
        description:
          "Form choice control with a draw-on checkmark, spring press feedback and indeterminate state support.",
        file: "components/motion/checkbox.tsx",
        badge: "new",
        launchedAt: "2026-06-23",
      },
      {
        slug: "radio",
        name: "Radio Group",
        description:
          "Single-select choice control with a gliding layoutId indicator dot and spring press feedback.",
        file: "components/motion/radio.tsx",
        badge: "new",
        launchedAt: "2026-06-23",
      },
      {
        slug: "bottom-sheet",
        name: "Bottom Sheet",
        description: "Vaul-inspired draggable bottom sheet with snap points, inertia and glass surface.",
        file: "components/motion/bottom-sheet.tsx",
      },
      {
        slug: "pull-to-refresh",
        name: "Pull to Refresh",
        description:
          "Native-feeling pull-to-refresh container with drag resistance, threshold feedback and async refresh handling.",
        file: "components/motion/pull-to-refresh.tsx",
        badge: "new",
        launchedAt: "2026-07-17",
        keywords: [
          "pull to refresh react",
          "swipe to refresh",
          "mobile refresh gesture",
          "touch refresh component",
          "overscroll refresh",
        ],
      },
      {
        slug: "shared-layout-bg",
        name: "Shared Layout Background",
        description: "A pill that glides between hovered items via motion's shared layout, with blur enter/exit.",
        file: "components/motion/shared-layout-bg.tsx",
      },
      {
        slug: "bounce-sidebar",
        name: "Bounce Sidebar",
        description:
          "A vertical sidebar whose active dot jumps between destinations on a curved, spring-loaded path.",
        file: "components/motion/bounce-sidebar.tsx",
        badge: "new",
        launchedAt: "2026-07-22",
        keywords: [
          "animated sidebar react",
          "bounce sidebar",
          "sidebar navigation",
          "spring navigation indicator",
          "curved motion path",
          "active navigation dot",
        ],
      },
      {
        slug: "animated-sidebar",
        name: "Animated Sidebar",
        guide: agentGuides["animated-sidebar"],
        description:
          "A composable application sidebar with morphing nested navigation that folds into an animated icon rail on desktop and becomes a focus-managed sheet on mobile.",
        file: "components/motion/animated-sidebar.tsx",
        badge: "new",
        launchedAt: "2026-07-29",
        keywords: [
          "animated sidebar react",
          "mobile sidebar",
          "responsive sidebar",
          "collapsible sidebar",
          "icon sidebar",
          "sidebar drawer",
          "composable sidebar",
          "nested sidebar navigation",
          "accessible navigation menu",
        ],
      },
      {
        slug: "preview-rail",
        name: "Preview Rail",
        description: "Codex app-inspired navigation rail with compact ticks that form a hover pyramid and reveal a floating destination preview.",
        file: "components/motion/preview-rail.tsx",
        badge: "new",
        launchedAt: "2026-07-11",
        keywords: [
          "codex app navigation",
          "codex style navigation",
          "openai codex navigation",
          "codex navigation react",
          "preview rail",
          "navigation rail",
          "hover navigation",
          "navigation preview",
          "vertical navigation react",
          "horizontal navigation react",
        ],
      },
      {
        slug: "dock",
        name: "Dock",
        description: "macOS-style dock with grouped actions and a gliding active pill.",
        file: "components/motion/dock.tsx",
      },
      {
        slug: "tooltip",
        name: "Tooltip",
        description: "Hover or focus tooltip with blur enter/exit and spring spawn.",
        file: "components/motion/tooltip.tsx",
      },
      {
        slug: "context-menu",
        name: "Animated Context Menu",
        description:
          "Composable context-menu primitives with a pointer-origin clip morph, a gliding active row, checkbox and radio choices, keyboard navigation, typeahead, and long-press support.",
        file: "components/motion/context-menu.tsx",
        badge: "new",
        launchedAt: "2026-07-27",
        keywords: [
          "react context menu",
          "animated context menu",
          "right click menu",
          "context menu keyboard navigation",
          "long press menu react",
          "composable menu primitives",
        ],
      },
      {
        slug: "popover",
        name: "Popover",
        description:
          "Gooey popover whose panel oozes out of the trigger through an SVG goo filter — a liquid neck that stretches and pinches — with crisp content fading in on top, plus a Morph variant that clip-morphs open from the trigger corner. Click or hover trigger, controlled or uncontrolled.",
        file: "components/motion/popover.tsx",
        badge: "new",
        launchedAt: "2026-07-07",
        keywords: [
          "react popover",
          "gooey popover",
          "animated popover",
          "svg goo filter",
          "metaball popover",
          "hover popover react",
          "morph popover react",
          "dropdown menu react",
        ],
        examples: [
          {
            slug: "gooey",
            name: "Gooey Popover",
            description:
              "Composable Popover, PopoverTrigger, PopoverContent; the panel oozes out of the trigger through an SVG goo filter with a liquid neck, crisp content fading in on top. Click or hover, controlled or uncontrolled.",
            installSlug: "popover",
            file: "components/motion/popover.tsx",
            previewKey: "motion/popover",
            previewFile: "components/previews/motion/popover.preview.tsx",
          },
          {
            slug: "morph",
            name: "Morph Popover",
            description:
              "Composable MorphPopover, MorphPopoverTrigger, MorphPopoverContent; the panel is laid out full size but clipped to the corner nearest the trigger, then unclips as one piece — a single-surface morph with a drop-shadow that hugs the shape. Side/align aware, controlled or uncontrolled.",
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
        description: "Family-app-style modal. A single panel that morphs its height as you navigate between inner views, with blur cross-fade on content.",
        file: "components/motion/morphing-modal.tsx",
      },
      {
        slug: "center-morph-modal",
        name: "Center Morph Modal",
        description:
          "A composable modal whose full-size surface unfolds from its exact center toward every edge, then folds back the same way with an inset close control.",
        file: "components/motion/center-morph-modal.tsx",
        badge: "new",
        launchedAt: "2026-07-21",
        keywords: [
          "react morph modal",
          "center expanding modal",
          "animated modal react",
          "framer motion modal",
          "radial modal animation",
        ],
      },
      {
        slug: "text-animation",
        name: "Text Animation",
        description:
          "Animated text primitives for spring reveals, chromatic sweeps, shimmer loading states, letter-cascade swaps and character scrambles.",
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
              "A controlled character scramble that resolves changed text while keeping its final value accessible.",
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
              "A Dia-inspired text effect with a fixed sentence prefix and a cycling final word revealed by a colorful sweep.",
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
            description: "Word or character reveal with spring slide-up and blur.",
            installSlug: "text-reveal",
            file: "components/motion/text-reveal.tsx",
            previewKey: "motion/text-reveal",
            previewFile: "components/previews/motion/text-reveal.preview.tsx",
          },
          {
            slug: "shimmer",
            name: "Text Shimmer",
            description: "Gradient sweep across text for loading or emphasis.",
            installSlug: "text-shimmer",
            file: "components/motion/text-shimmer.tsx",
            previewKey: "motion/text-shimmer",
            previewFile: "components/previews/motion/text-shimmer.preview.tsx",
          },
          {
            slug: "cascade",
            name: "Text Cascade",
            description: "Letter-by-letter slot roll for standalone text — old letters drop away as new ones land, left to right.",
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
        description: "Animated number primitives for count-up values and rolling digit tickers.",
        file: "components/motion/animated-number.tsx",
        extraFiles: ["components/motion/number-ticker.tsx"],
        examples: [
          {
            slug: "ticker",
            name: "Number Ticker",
            description: "Slot-machine rolling digits with staggered entry.",
            installSlug: "number-ticker",
            file: "components/motion/number-ticker.tsx",
            previewKey: "motion/number-ticker",
            previewFile: "components/previews/motion/number-ticker.preview.tsx",
          },
          {
            slug: "animated",
            name: "Animated Number",
            description: "Spring-driven count-up triggered when in view.",
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
        description: "Status badge with animated state icons, pulse feedback and compact size variants.",
        file: "components/motion/animated-badge.tsx",
      },
      {
        slug: "action-swap",
        name: "Action Swap",
        description: "CTA button and slot primitives for swapping text and icons with blur motion.",
        file: "components/motion/action-swap.tsx",
        examples: [
          {
            slug: "cascade",
            name: "Cascade",
            description: "Letter-by-letter slot roll — the old label's letters drop away as the new ones land, left to right.",
            installSlug: "action-swap-cascade",
            file: "components/motion/action-swap-cascade.tsx",
            previewKey: "motion/action-swap-cascade",
            previewFile: "components/previews/motion/action-swap-cascade.preview.tsx",
          },
          {
            slug: "blur",
            name: "Blur",
            description: "Copy-button style swap with blur, opacity and scale.",
            installSlug: "action-swap-blur",
            file: "components/motion/action-swap-blur.tsx",
            previewKey: "motion/action-swap-blur",
            previewFile: "components/previews/motion/action-swap-blur.preview.tsx",
          },
          {
            slug: "roll",
            name: "Roll",
            description: "The next text or icon rolls in from below with blur.",
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
        description: "Stacked toasts with status morphs, swipe dismissal, actions, promise tracking and layout-aware motion.",
        file: "components/motion/animated-toast-stack.tsx",
        examples: [
          {
            slug: "stack",
            name: "Animated Toast Stack",
            description:
              "Stacked toasts with status morphs, swipe dismissal, actions and six screen positions.",
            installSlug: "animated-toast-stack",
            file: "components/motion/animated-toast-stack.tsx",
            previewKey: "motion/animated-toast-stack",
            previewFile: "components/previews/motion/animated-toast-stack.preview.tsx",
          },
          {
            slug: "promise",
            name: "Toast Promise",
            description:
              "One toast tracks a promise: a spinner while pending, then it morphs in place into success or error and starts its dismiss timer.",
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
        description: "Theme toggle button that repaints the whole page through the View Transition API — a rectangle or circle clip-path reveal, or slats that open across the screen like a shutter.",
        file: "components/motion/theme-toggle.tsx",
        badge: "new",
        launchedAt: "2026-08-01",
        keywords: [
          "theme toggle",
          "dark mode toggle",
          "view transition theme",
          "clip path theme reveal",
          "blinds transition",
        ],
      },
      {
        slug: "bouncy-accordion",
        name: "Bouncy Accordion",
        description: "Single-open accordion with weighted spring layout, icon rows and reduced-motion-safe content reveals.",
        file: "components/motion/bouncy-accordion.tsx",
      },
      {
        slug: "drawer",
        name: "Drawer",
        description: "Side panel that slides in from the left or right with a spring, backdrop blur, body scroll lock and esc-to-close.",
        file: "components/motion/drawer.tsx",
      },
      {
        slug: "scroll-animation",
        name: "Scroll Animation",
        description: "Scroll-driven motion: a Lenis smooth-scroll provider and a reading-progress indicator that reads from it.",
        file: "components/motion/smooth-scroll.tsx",
        extraFiles: [
          "components/motion/scroll-progress.tsx",
          "components/motion/parallax.tsx",
          "components/motion/scroll-to.tsx",
          "components/motion/scroll-reveal.tsx",
        ],
        keywords: [
          "smooth scroll",
          "lenis",
          "scroll progress",
          "reading progress",
          "momentum scroll",
          "scroll velocity",
        ],
        examples: [
          {
            slug: "smooth-scroll",
            name: "Smooth Scroll",
            description: "Smooth-scroll provider over Lenis with a useSmoothScroll hook exposing scroll offset, progress and velocity. Reduced-motion safe.",
            installSlug: "smooth-scroll",
            file: "components/motion/smooth-scroll.tsx",
            previewKey: "motion/smooth-scroll",
            previewFile: "components/previews/motion/smooth-scroll.preview.tsx",
          },
          {
            slug: "scroll-progress",
            name: "Scroll Progress",
            description: "Reading-progress indicator — fixed bar or circular ring — driven by scroll position via useSmoothScroll, with spring smoothing.",
            installSlug: "scroll-progress",
            file: "components/motion/scroll-progress.tsx",
            previewKey: "motion/scroll-progress",
            previewFile: "components/previews/motion/scroll-progress.preview.tsx",
          },
          {
            slug: "parallax",
            name: "Parallax",
            description: "Wrapper that drifts its children at a speed factor as they cross the viewport, on either axis. Reduced-motion safe.",
            installSlug: "parallax",
            file: "components/motion/parallax.tsx",
            previewKey: "motion/parallax",
            previewFile: "components/previews/motion/parallax.preview.tsx",
          },
          {
            slug: "scroll-to",
            name: "Scroll To",
            description: "Button that smooth-scrolls to a target (offset, selector or element) via the active SmoothScroll provider; reduced-motion jumps instantly.",
            installSlug: "scroll-to",
            file: "components/motion/scroll-to.tsx",
            previewKey: "motion/scroll-to",
            previewFile: "components/previews/motion/scroll-to.preview.tsx",
          },
          {
            slug: "scroll-reveal",
            name: "Scroll Reveal",
            description: "Reveals its children with a spring slide and blur as they enter the viewport, once or every time. Reduced-motion keeps a fade.",
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
        description: "Slider with tick dots and a vertical-bar thumb that bounces as it lands on each step. Drag or keyboard, reduced-motion safe.",
        file: "components/motion/range-slider.tsx",
        badge: "new",
        launchedAt: "2026-07-31",
        keywords: [
          "slider",
          "range slider",
          "range input",
          "stepped slider",
          "ticks",
          "volume slider",
          "ruler picker",
        ],
        examples: [
          {
            slug: "stepped",
            name: "Range Slider",
            description:
              "Tick dots, and a vertical-bar thumb that bounces as it lands on each step.",
            installSlug: "range-slider",
            file: "components/motion/range-slider.tsx",
            previewKey: "motion/range-slider",
            previewFile: "components/previews/motion/range-slider.preview.tsx",
          },
          {
            slug: "fluid",
            name: "Fluid Slider",
            description:
              "No thumb. The fill slides behind a rounded liquid cap, and the label flips color wherever the fill covers it.",
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
              "Equalizer bars peak around the handle and drop back once it passes, so the value moves down the track as a wave.",
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
              "Grab the thumb and a value bubble pops out of it. The bubble tilts and squashes with how fast you drag, then settles upright.",
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
              "The needle stays put and the scale scrolls under it. A flick keeps going and settles on the nearest tick. Fractional steps read at the step's own precision.",
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
        description: "iOS-style picker wheel: a 3D drum on native momentum scroll that snaps to the nearest notch, with wheel, drag and keyboard control. Composes side by side for date and time pickers, reduced-motion safe.",
        file: "components/motion/wheel-picker.tsx",
        badge: "new",
        launchedAt: "2026-07-09",
        keywords: ["picker", "wheel picker", "ios picker", "drum picker", "spinner", "time picker", "date picker", "scroll picker"],
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
          "Virtualized data table that stays smooth at 10k+ rows, with sortable headers, row selection, column resize and reorder, and a sticky header. Minimal, reduced-motion-safe motion.",
        file: "components/motion/table/index.tsx",
        badge: "new",
        launchedAt: "2026-07-01",
        keywords: [
          "react data table",
          "virtualized table",
          "sortable table",
          "table row selection",
          "react table 10k rows",
          "editable table react",
        ],
        examples: [
          {
            slug: "data",
            name: "Data Table",
            description:
              "10k virtualized rows with sortable headers, row selection, column resize and reorder.",
            installSlug: "table",
            file: "components/motion/table/index.tsx",
            previewKey: "motion/table",
            previewFile: "components/previews/motion/table.preview.tsx",
          },
          {
            slug: "editable",
            name: "Editable Table",
            description:
              "Edit cells inline and insert or delete rows and columns via border handles; the table re-renders from the updated data and column defs.",
            installSlug: "table-editable",
            file: "components/motion/table/index.tsx",
            previewKey: "motion/table-editable",
            previewFile: "components/previews/motion/table-editable.preview.tsx",
          },
          {
            slug: "async",
            name: "Async Table",
            description:
              "Loads pages on demand — skeleton rows on first load, then infinite scroll via onEndReached as the virtualized list nears the bottom.",
            installSlug: "table-async",
            file: "components/motion/table/index.tsx",
            previewKey: "motion/table-async",
            previewFile: "components/previews/motion/table-async.preview.tsx",
          },
          {
            slug: "advanced",
            name: "Advanced Data Table",
            description:
              "Paginated DataTable with multi-column sort (Shift+click adds keys, rows glide into place), per-column text/select filters and global search, column hide and drag or keyboard reorder, expandable detail rows and Shift-range selection with a selected-count bar.",
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
          "Canvas shader backgrounds (mesh gradient, grain, warp, waves, voronoi, dot orbit and more) with a single typed variant prop. Reduced-motion freezes animated variants.",
        file: "components/motion/shader-background.tsx",
        badge: "new",
        launchedAt: "2026-07-02",
        keywords: [
          "shader background react",
          "webgl background",
          "mesh gradient react",
          "animated background react",
          "canvas shader",
          "gradient background component",
        ],
      },
      {
        slug: "cylinder-carousel",
        name: "Cylinder Carousel",
        description:
          "A carousel whose items line the inside of a cylinder, receding into the center and growing toward the edges. Drag, scroll or arrow-key to roll it, with a springy glide and snap. Reduced-motion drops the glide.",
        file: "components/motion/cylinder-carousel.tsx",
        badge: "new",
        launchedAt: "2026-07-04",
        keywords: [
          "3d carousel react",
          "cylinder carousel",
          "coverflow react",
          "rolling carousel",
          "draggable carousel react",
        ],
      },
      {
        slug: "loader",
        name: "Loader",
        description:
          "Loading indicator with seventeen variants: spinner, dots, bars, dot-matrix, dither, morph, comet, scramble, metaballs, newton, helix, percent, and five terminal-style ascii spinners. Scales from one size prop, uses currentColor, and reduced-motion swaps every transform for a calm opacity pulse.",
        file: "components/motion/loader.tsx",
        badge: "new",
        launchedAt: "2026-07-04",
        keywords: [
          "loader react",
          "loading spinner",
          "dot matrix loader",
          "dithering loader",
          "loading indicator",
        ],
      },
    ],
  },
  {
    slug: "agents",
    name: "AI Agents",
    description:
      "Animated React components for agent reasoning, progress, tool activity, and conversational AI interfaces.",
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
          "A focused conversational surface with visual tones, independent alignment, grouped messages, expandable content, and interactive link or button support.",
        file: "components/agents/message-bubble.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "message bubble React",
          "chat bubble component",
          "AI conversation bubble",
          "expandable chat message",
          "interactive chat suggestion",
          "grouped message bubbles",
        ],
        examples: [
          {
            slug: "surfaces",
            name: "Animated Surfaces",
            description:
              "An interactive conversation where each newly sent user row pops up once while the assistant streams into a stable row.",
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
              "Progressively arriving messages with sender avatars, metadata, delivery state, and grouped follow-up alignment.",
            file: "components/agents/message-bubble.tsx",
            previewKey: "agents/message-bubble-avatars",
            previewFile:
              "components/previews/agents/message-bubble-avatars.preview.tsx",
          },
          {
            slug: "show-more",
            name: "Show More",
            description:
              "A long assistant message with a compact line-clamped preview and animated disclosure control.",
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
          "Composable conversation primitives for message rows, grouped bubbles, avatars, metadata, live markers, and a mount-only trailing-edge pop-up for newly sent rows.",
        file: "components/agents/message.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI message React",
          "chat message component",
          "streaming assistant message",
          "LLM conversation UI",
          "agent chat bubbles",
          "AI chat interface React",
        ],
        usageFile: "components/previews/agents/message.usage.tsx",
      },
      {
        slug: "message-scroller",
        name: "Message Scroller",
        guide: agentGuides["message-scroller"],
        description:
          "A reader-aware conversation viewport that follows streamed output at the live edge and releases control when the reader moves away.",
        file: "components/agents/message-scroller.tsx",
        usageFile:
          "components/previews/agents/message-scroller.usage.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "message scroller React",
          "AI chat autoscroll",
          "streaming conversation viewport",
          "follow output chat UI",
          "LLM message scroll",
          "accessible chat transcript",
        ],
      },
      {
        slug: "prompt-input",
        name: "Prompt Input",
        guide: agentGuides["prompt-input"],
        description:
          "An auto-growing agent composer with prompt actions, model selection, keyboard submission, and animated send and stop states.",
        file: "components/agents/prompt-input.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI prompt input React",
          "model selector dropdown",
          "chat composer component",
          "agent input UI",
          "AI textarea React",
          "LLM model picker",
        ],
      },
      {
        slug: "todo-list",
        name: "Todo List",
        guide: agentGuides["todo-list"],
        description:
          "A collapsible agent task plan with morphing status marks, a completion count, compact metadata, and smooth list updates.",
        file: "components/agents/todo-list.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI agent todo list React",
          "agent task progress UI",
          "LLM task plan component",
          "AI checklist React",
          "streaming todo list",
          "agent workflow status",
        ],
      },
      {
        slug: "code-block",
        name: "Code Block",
        guide: agentGuides["code-block"],
        description:
          "A syntax-highlighted code surface with stable streaming updates, line numbers, focused lines, smooth following, and copy feedback.",
        file: "components/agents/code-block.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI code block React",
          "streaming code component",
          "syntax highlighted code block",
          "LLM code response UI",
          "agent generated code",
          "Shiki React code block",
        ],
      },
      {
        slug: "approval-card",
        name: "Approval Card",
        guide: agentGuides["approval-card"],
        description:
          "A human-in-the-loop decision surface for approvals, single or multiple-choice questions, custom responses, and multi-step review flows.",
        file: "components/agents/approval-card/index.tsx",
        extraFiles: ["components/agents/approval-card/types.ts"],
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI approval card React",
          "human in the loop UI",
          "agent clarification question",
          "AI multiple choice prompt",
          "approve agent decision",
          "agent review workflow",
        ],
        examples: [
          {
            slug: "questions",
            name: "Questions",
            description:
              "Guides the user through single-choice, multiple-choice, and freeform questions before returning the completed response to the agent.",
            file: "components/agents/approval-card/index.tsx",
            previewKey: "agents/approval-card-question",
            previewFile:
              "components/previews/agents/approval-card-question.preview.tsx",
          },
          {
            slug: "review",
            name: "Review and Approve",
            description:
              "Pauses an agent workflow for approval, revision, or rejection and collapses into the recorded decision.",
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
          "A syntax-highlighted file change disclosure with progressive rows, line numbers, live change counts, smooth following, and completion collapse.",
        file: "components/agents/file-diff.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI file diff React",
          "agent code changes UI",
          "streaming diff component",
          "file edit result",
          "code additions deletions",
        ],
      },
      {
        slug: "tool-result",
        name: "Tool Result",
        guide: agentGuides["tool-result"],
        description:
          "A lightweight execution disclosure for syntax-highlighted terminal output and request responses that collapses into a compact completed state.",
        file: "components/agents/tool-result.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI tool result React",
          "agent terminal output UI",
          "streaming command result",
          "agent API response",
          "tool execution status",
        ],
        examples: [
          {
            slug: "terminal-output",
            name: "Terminal Output",
            description:
              "Streams command output into a bounded viewport, follows new lines, then collapses into the completed run summary.",
            file: "components/agents/tool-result.tsx",
            previewKey: "agents/tool-result-terminal",
            previewFile:
              "components/previews/agents/tool-result-terminal.preview.tsx",
          },
          {
            slug: "request-result",
            name: "Request Result",
            description:
              "Presents an in-flight request and its highlighted response payload with retry and copy actions.",
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
          "A stable response surface with completion actions, rendered content, and an expandable source summary.",
        file: "components/agents/streaming-response.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI streaming response React",
          "LLM token stream UI",
          "chat response actions",
          "AI response sources",
          "AI answer component",
          "streaming text React",
        ],
      },
      {
        slug: "image-generation",
        name: "Image Generation",
        guide: agentGuides["image-generation"],
        description:
          "A stable generated-image surface that moves from queued work through progressive refinement to a completed result without layout shift.",
        file: "components/agents/image-generation.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI image generation React",
          "generated image loading UI",
          "AI image progress component",
          "image generation animation",
          "text to image interface",
          "AI media result",
        ],
      },
      {
        slug: "tool-approval",
        name: "Tool Approval",
        guide: agentGuides["tool-approval"],
        description:
          "A human-in-the-loop permission card for reviewing tool details, allowing once, remembering access, or denying execution.",
        file: "components/agents/tool-approval.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI tool approval UI",
          "agent permission component",
          "human in the loop React",
          "approve agent action",
          "AI tool confirmation",
        ],
      },
      {
        slug: "citations",
        name: "Citations",
        guide: agentGuides.citations,
        description:
          "Inline citation markers paired with a collapsible, progressively rendered reference collection for grounded agent responses.",
        file: "components/agents/citations.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI citations React",
          "LLM citations component",
          "chat citation list",
          "RAG citation UI",
          "AI grounded response",
        ],
      },
      {
        slug: "agent-activity",
        name: "Agent Activity",
        guide: agentGuides["agent-activity"],
        description:
          "One adaptive activity stream for reasoning, searches, tool calls, structured execution traces, or a chronological mix.",
        file: "components/agents/agent-activity/index.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI agent activity component",
          "agent tool calls UI",
          "AI search results React",
          "agent reasoning timeline",
          "mixed agent activity stream",
          "agent execution trace UI",
          "collapsible AI activity",
        ],
        examples: [
          {
            slug: "streaming-text",
            name: "Streaming Text",
            description:
              "Streams freeform reasoning text into the capped viewport and keeps the completed log available behind a timed disclosure.",
            file: "components/agents/agent-activity/index.tsx",
            previewKey: "agents/agent-activity-text",
            previewFile:
              "components/previews/agents/agent-activity-text.preview.tsx",
          },
          {
            slug: "reasoning-steps",
            name: "Reasoning Steps",
            description:
              "Shows completed, active, and pending reasoning steps with optional trailing metadata.",
            file: "components/agents/agent-activity/index.tsx",
            previewKey: "agents/agent-activity-steps",
            previewFile:
              "components/previews/agents/agent-activity-steps.preview.tsx",
          },
          {
            slug: "web-search",
            name: "Web Search",
            description:
              "Presents a search query, progressively rendered result rows, and an overflow count.",
            file: "components/agents/agent-activity/index.tsx",
            previewKey: "agents/agent-activity-search",
            previewFile:
              "components/previews/agents/agent-activity-search.preview.tsx",
          },
          {
            slug: "tool-calls",
            name: "Tool Calls",
            description:
              "Summarizes read, edit, and run events with monospace targets and optional line-change counts.",
            file: "components/agents/agent-activity/index.tsx",
            previewKey: "agents/agent-activity-tools",
            previewFile:
              "components/previews/agents/agent-activity-tools.preview.tsx",
          },
          {
            slug: "mixed-activity",
            name: "Mixed Activity",
            description:
              "Streams reasoning, search, and tool events in one chronological run while the viewport smoothly follows new work.",
            file: "components/agents/agent-activity/index.tsx",
            previewKey: "agents/agent-activity-mixed",
            previewFile:
              "components/previews/agents/agent-activity.preview.tsx",
          },
          {
            slug: "agent-trace",
            name: "Agent Trace",
            description:
              "Streams messages and structured actions into a compact execution ledger, then summarizes the completed run by tool-call and message counts.",
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
          "Three thoughtful loading states for AI interfaces: shimmering status text, live agent progress, and cycling reasoning phrases.",
        file: "components/agents/loading-states/index.ts",
        extraFiles: [
          "components/agents/loading-states/thinking-shimmer.tsx",
          "components/agents/loading-states/agent-progress.tsx",
          "components/agents/loading-states/reasoning-text.tsx",
        ],
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI agent loading state",
          "agent thinking animation",
          "Claude thinking animation",
          "AI reasoning indicator",
          "LLM loading component",
          "chatbot thinking indicator",
        ],
        examples: [
          {
            slug: "reasoning-text",
            name: "Reasoning Text",
            description:
              "Shimmering reasoning copy with an ASCII loader and cascade, phrase-swap, or per-letter scramble transitions.",
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
              "A quiet shimmer that keeps the agent's current status readable while work continues.",
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
              "A compact activity glyph, action verb, and live tabular timer for longer-running agent work.",
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
        slug: "ai-sidebar",
        name: "AI Sidebar",
        guide: agentGuides["ai-sidebar"],
        description:
          "A collapsible AI workspace sidebar for folders, projects, files, and bookmarks with keyboard navigation, optimistic moves, inline rename, and overflow-aware labels.",
        file: "components/agents/ai-sidebar.tsx",
        usageFile: "components/previews/agents/ai-sidebar.usage.tsx",
        badge: "new",
        launchedAt: "2026-08-03",
        keywords: [
          "AI sidebar React",
          "agent workspace sidebar",
          "draggable resource tree",
          "project file sidebar",
          "collapsible AI navigation",
          "folder tree React",
        ],
      },
      {
        slug: "chat-app",
        name: "Chat App",
        description:
          "A complete agent conversation workspace composing navigation, messages, streaming, planning, approvals, tools, code, diffs, generated media, sources, and prompt input.",
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
          "AI chat app React",
          "agent workspace example",
          "complete AI chat interface",
          "AI SDK compatible chat UI",
          "agent conversation layout",
          "LLM chat app component",
        ],
      },
    ],
  },
  {
    slug: "blocks",
    name: "Blocks",
    description:
      "Product-ready animated React UI blocks built with Motion and Tailwind CSS, available as customizable copy-paste source.",
    components: [
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
          "Responsive virtualized masonry that measures variable-height cards and loads more data as the user nears the end.",
        file: "components/motion/infinite-masonry.tsx",
        badge: "new",
        launchedAt: "2026-07-15",
        keywords: [
          "react masonry",
          "infinite scroll masonry",
          "virtualized masonry",
          "masonry grid react",
          "infinite gallery",
        ],
      },
      {
        slug: "notification-stack",
        name: "Notification Stack",
        description:
          "Compact notification cards that spring from a stacked summary into a readable list on hover, focus or tap.",
        file: "components/motion/notification-stack.tsx",
        badge: "new",
        launchedAt: "2026-07-14",
        keywords: [
          "notification stack react",
          "hover notification cards",
          "animated notification list",
          "stacked cards react",
          "notification center component",
        ],
      },
      {
        slug: "project-folder",
        name: "Project Folder",
        description:
          "An interactive project folder that opens its file fan on hover or focus, expands into a focus-managed overlay, then retraces the complete path when closed.",
        file: "components/motion/project-folder.tsx",
        badge: "new",
        launchedAt: "2026-08-15",
        keywords: [
          "react folder card",
          "animated project folder",
          "file preview component",
          "folder hover animation",
          "project card react",
        ],
      },
      {
        slug: "knockout-bracket",
        name: "Fixtures",
        description: "Animated tournament fixtures in two styles: a knockout bracket that pages through rounds, and a wheel that wraps the same tree around the champion. Both read the same array of rounds, so one dataset draws either.",
        file: "components/motion/knockout-bracket.tsx",
        badge: "new",
        launchedAt: "2026-07-27",
        extraFiles: ["components/motion/knockout-wheel.tsx"],
        examples: [
          {
            slug: "knockout-wheel",
            name: "Knockout Wheel",
            description:
              "The tournament drawn radially. The champion holds the hub, each round is a ring further out, and the teams themselves form the rim. Nodes spring in ring by ring, and hovering one isolates that team while the rest recede. Teams show a flag, a logo or their initials, and a deeper draw grows another ring.",
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
              "Pages one round at a time. The leftmost round stacks at a fixed rhythm, each later round centers between its two feeder matches, and cards, elbow connectors, headers and stage height animate into every new layout. A third place play-off sits below the tree under its own rule. Round names, team artwork, dates and result chips all come from the data you pass.",
            installSlug: "knockout-bracket",
            file: "components/motion/knockout-bracket.tsx",
            previewKey: "blocks/knockout-bracket",
            previewFile:
              "components/previews/blocks/knockout-bracket.preview.tsx",
          },
        ],
        keywords: [
          "tournament bracket react",
          "knockout bracket component",
          "world cup bracket react",
          "single elimination bracket",
          "playoff bracket react",
          "sports bracket animation",
        ],
      },
      {
        slug: "availability-scheduler",
        name: "Availability Scheduler",
        description: "Weekly availability editor where each day springs between available and unavailable, time ranges add and remove with blur-slide motion, times pick from a scrollable dropdown, and a copy menu clones hours to other days.",
        file: "components/motion/availability-scheduler/index.tsx",
        badge: "new",
        launchedAt: "2026-07-10",
        keywords: [
          "availability scheduler react",
          "weekly hours picker react",
          "working hours component",
          "cal.com availability component",
          "time range picker react",
          "business hours editor",
        ],
      },
      {
        slug: "swap",
        name: "Multi-chain Swap",
        description: "Cross-chain swap widget with chain + token selectors, morphing views, animated flip and quote.",
        file: "components/motion/swap.tsx",
      },
      {
        slug: "dynamic-island",
        name: "Dynamic Island",
        description: "iOS-style island pill that morphs between live activity views with bouncy shell resize and blur crossfades.",
        file: "components/motion/dynamic-island.tsx",
      },
      {
        slug: "command-palette",
        name: "Command Palette",
        description: "⌘K palette with fuzzy filter, spring-animated active row and glass surface.",
        file: "components/motion/command-palette.tsx",
      },
      {
        slug: "morphing-search",
        name: "Morphing Search",
        description:
          "Search field or compact icon that morphs into a glass results surface, whether opened by click or keyboard shortcut.",
        file: "components/motion/morphing-search.tsx",
        badge: "new",
        launchedAt: "2026-08-18",
        keywords: [
          "morphing search react",
          "animated search component",
          "search overlay react",
          "keyboard search shortcut",
          "command search ui",
        ],
      },
      {
        slug: "expandable-action-bar",
        name: "Expandable Action Bar",
        description: "Compact icon actions that expand into labeled controls on hover or focus with shared layout motion.",
        file: "components/motion/expandable-action-bar.tsx",
      },
      {
        slug: "overflow-actions",
        name: "Overflow Actions",
        description: "Connected pill rail for primary actions that springs open to reveal extra controls.",
        file: "components/motion/overflow-actions.tsx",
      },
      {
        slug: "expandable-tabs",
        name: "Expandable Tabs",
        description: "Icon tab bar where the active tab expands to a labelled pill, with a panel above that morphs height and slides content direction-aware on switch.",
        file: "components/motion/expandable-tabs.tsx",
      },
      {
        slug: "morphing-tabs",
        name: "Morphing Tabs",
        description: "Reorderable tabs whose selected item grows into a white content surface, with the active shape gliding as tabs move and a shared morph between rooms.",
        file: "components/motion/morphing-tabs.tsx",
        badge: "new",
        launchedAt: "2026-08-06",
        keywords: [
          "reorderable tabs react",
          "drag tabs react",
          "morphing tabs component",
          "animated tab panel",
          "shared layout tabs",
        ],
      },
      {
        slug: "swipeable-list",
        name: "Swipeable List",
        description: "Mobile-style list rows that swipe left or right to reveal contextual action buttons.",
        file: "components/motion/swipeable-list.tsx",
      },
      {
        slug: "file-upload",
        name: "File Upload",
        description:
          "Two file upload patterns: an attachment workspace for mixed files, links, audio and media, plus a progress queue with retry and removal.",
        file: "components/motion/file-upload.tsx",
        extraFiles: ["components/motion/attachment-upload.tsx"],
        badge: "new",
        launchedAt: "2026-07-30",
        examples: [
          {
            slug: "attachment-upload",
            name: "Attachment Upload",
            description:
              "A mixed attachment workspace with a dropzone, staggered file and image rows, animated upload, success, failure, retry and removal feedback, shared-layout image previews, and an audio waveform.",
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
              "A drag-and-drop upload queue with progress rows, upload states, retry, and removal.",
            installSlug: "file-upload",
            file: "components/motion/file-upload.tsx",
            previewKey: "blocks/file-upload",
            previewFile: "components/previews/blocks/file-upload.preview.tsx",
          },
        ],
        keywords: [
          "attachment upload react",
          "file attachment component",
          "mixed media upload",
          "audio attachment waveform",
          "drag and drop attachments",
        ],
      },
      {
        slug: "prediction-market",
        name: "Prediction Market",
        description: "Prediction market trade ticket with buy/sell modes, outcome prices, rolling amount entry, quick add chips and trade states.",
        file: "components/motion/prediction-market.tsx",
      },
      {
        slug: "wallet-card",
        name: "Wallet Card",
        description: "Wallet overview card with an account switcher and search that morph open from their triggers, a cascading balance with a live change pill and privacy toggle, copy-address, and Send / Deposit / Swap / Buy actions.",
        file: "components/motion/wallet-card/index.tsx",
        badge: "new",
        launchedAt: "2026-07-03",
        keywords: [
          "wallet card react",
          "web3 wallet component",
          "crypto balance component",
          "account switcher react",
          "chain switcher react",
        ],
      },
      {
        slug: "otp-input",
        name: "OTP Input",
        description: "One-time-code input with a gliding focus ring, digits that roll in per slot, error shake and a success check draw.",
        file: "components/motion/otp-input.tsx",
      },
      {
        slug: "signup-form",
        name: "Sign Up Form",
        description: "Composed sign-up form that flags a field only once it is left, then clears the moment it is fixed, with a length-weighted strength meter, password reveal and an animated submit lifecycle.",
        file: "components/motion/signup-form.tsx",
        badge: "new",
        launchedAt: "2026-08-08",
        keywords: [
          "react signup form",
          "react registration form component",
          "animated form validation react",
          "password strength meter react",
          "tailwind sign up form",
        ],
      },
      {
        slug: "bloom-menu",
        name: "Bloom Menu",
        description: "A button that morphs open into a menu and blooms iris-out from the center, the grid revealing in every direction with radially staggered items.",
        file: "components/motion/bloom-menu.tsx",
        badge: "new",
        launchedAt: "2026-06-26",
      },
      {
        slug: "feedback-widget",
        name: "Feedback Widget",
        description: "Corner trigger that morphs open into a feedback popup with message entry and animated sending, success and retry states.",
        file: "components/motion/feedback-widget.tsx",
        badge: "new",
        launchedAt: "2026-06-29",
        keywords: [
          "react feedback widget",
          "feedback popover react",
          "in-app feedback component",
          "feedback form animation",
          "react feedback button",
        ],
      },
      {
        slug: "not-found",
        name: "404 / Not Found",
        description: "Animated 404 pages in five styles: glitch scramble, magnetic digits, cursor spotlight, a fanning card stack and a typed terminal.",
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
              "Digits scramble through random glyphs before resolving, with a chromatic split on hover.",
            installSlug: "not-found-glitch",
            file: "components/motion/not-found/glitch.tsx",
            previewKey: "blocks/not-found-glitch",
            previewFile: "components/previews/blocks/not-found-glitch.preview.tsx",
          },
          {
            slug: "magnetic",
            name: "Magnetic",
            description:
              "Each digit is cursor-attracted via the Magnetic wrapper and springs back on leave.",
            installSlug: "not-found-magnetic",
            file: "components/motion/not-found/magnetic.tsx",
            previewKey: "blocks/not-found-magnetic",
            previewFile: "components/previews/blocks/not-found-magnetic.preview.tsx",
          },
          {
            slug: "spotlight",
            name: "Spotlight",
            description:
              "A dark panel where a cursor-tracked spotlight reveals the bright code from a dim base.",
            installSlug: "not-found-spotlight",
            file: "components/motion/not-found/spotlight.tsx",
            previewKey: "blocks/not-found-spotlight",
            previewFile: "components/previews/blocks/not-found-spotlight.preview.tsx",
          },
          {
            slug: "stacked",
            name: "Stacked",
            description:
              "A code card over a hidden stack that fans out with a spring on hover.",
            installSlug: "not-found-stacked",
            file: "components/motion/not-found/stacked.tsx",
            previewKey: "blocks/not-found-stacked",
            previewFile: "components/previews/blocks/not-found-stacked.preview.tsx",
          },
          {
            slug: "terminal",
            name: "Terminal",
            description:
              "A terminal window that types a failed cd command and a 404 status, with a blinking caret.",
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
