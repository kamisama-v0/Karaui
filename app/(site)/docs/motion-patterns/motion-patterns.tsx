"use client";

import {
  Accessibility,
  Bell,
  CircleGauge,
  MousePointer2,
  PanelTopOpen,
  RefreshCw,
  Rows3,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import {
  EASE_IN_OUT,
  EASE_OUT,
  SPRING_PRESS,
} from "@/lib/ease";
import { cn } from "@/lib/utils";

type RecipeDemo = "press" | "icon" | "reveal" | "layout" | "swap";

const CONTINUITY_SPRING: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 17,
  mass: 0.85,
};

const CONTINUITY_LABEL: Variants = {
  hidden: { opacity: 0, filter: "blur(4px)" },
  visible: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(4px)" },
};

type Recipe = {
  title: string;
  eyebrow: string;
  description: string;
  purpose: string;
  avoid: string;
  icon: LucideIcon;
  demo: RecipeDemo;
  code: string;
};

const decisions = [
  {
    number: "01",
    title: "How often will people see it?",
    body: "Something clicked dozens of times per session has to respond at once. Keep the flourish for screens that come up once in a while, like onboarding or an empty state.",
    note: "A toolbar button gets a quick dip. A first-run welcome can afford a longer entrance.",
  },
  {
    number: "02",
    title: "What job does it do?",
    body: "Good reasons to move: showing where a panel came from, acknowledging a tap, signalling a new state, or easing a jump in content. Looking nice is not on the list.",
    note: "No job, no animation. Delete it and check whether anyone misses it.",
  },
  {
    number: "03",
    title: "Which curve fits the action?",
    body: "Things arriving get ease-out. Things travelling across the screen get ease-in-out. Progress bars run linear. Anything the pointer drags or flicks gets a spring.",
    note: "Pick the curve from what the element is doing; habit is a poor guide.",
  },
  {
    number: "04",
    title: "What happens with reduced motion?",
    body: "When the OS asks for less motion, fades and color changes can stay. Slides, zooms and parallax should go.",
    note: "Plan this variant up front, alongside the full version.",
  },
] as const;

const timings = [
  {
    use: "Press feedback",
    range: "100–160ms",
    feel: "Felt under the finger",
  },
  {
    use: "Tooltip / popover",
    range: "125–200ms",
    feel: "Grows out of its anchor",
  },
  {
    use: "Dropdown / select",
    range: "150–250ms",
    feel: "Open before the eye arrives",
  },
  {
    use: "Modal / drawer",
    range: "200–500ms",
    feel: "Long enough to show where it came from",
  },
  {
    use: "Marketing demo",
    range: "Flexible",
    feel: "Readable first, quick second",
  },
] as const;

const recipes: Recipe[] = [
  {
    title: "Press feedback",
    eyebrow: "Feedback",
    description:
      "Shrink the control slightly the moment it is pressed, so the user knows the tap landed even if the work behind it takes a while.",
    purpose: "Tells the user their tap registered.",
    avoid: "Deep shrinks, sluggish rebounds, and nested children that each bounce on their own.",
    icon: MousePointer2,
    demo: "press",
    code: `import { motion, useReducedMotion } from "motion/react";
import { SPRING_PRESS } from "@/lib/ease";

const reduce = useReducedMotion();

<motion.button
  whileTap={reduce ? undefined : { scale: 0.97 }}
  transition={SPRING_PRESS}
>
  Continue
</motion.button>`,
  },
  {
    title: "Semantic icon motion",
    eyebrow: "Meaning",
    description:
      "Move an icon the way its real-world object would: a bell rocks from the top, a download arrow dips toward the tray below it.",
    purpose: "Hints at the action without needing extra text.",
    avoid: "One stock wiggle reused for every icon, or hover motion firing on touch screens.",
    icon: Bell,
    demo: "icon",
    code: `const reduce = useReducedMotion();
const canHover = useHoverCapable();

<motion.span
  style={{ transformOrigin: "top center" }}
  animate={active && canHover && !reduce
    ? { rotate: [0, 12, -8, 4, 0] }
    : { rotate: 0 }}
  transition={{ duration: 0.28, ease: EASE_OUT }}
>
  <Bell />
</motion.span>`,
  },
  {
    title: "Content reveal",
    eyebrow: "Entrance",
    description:
      "Bring in the one surface that matters with a small upward drift and a light blur, and let it settle before the user starts reading it.",
    purpose: "Stops new content from popping in as a hard cut.",
    avoid: "Entrances that run for half a second, or staggering every tiny child one by one.",
    icon: Sparkles,
    demo: "reveal",
    code: `const reduce = useReducedMotion();

<motion.div
  initial={{
    opacity: 0,
    transform: reduce ? "none" : "translateY(8px)",
    filter: reduce ? "none" : "blur(4px)",
  }}
  animate={{
    opacity: 1,
    transform: "translateY(0px)",
    filter: "blur(0px)",
  }}
  transition={{ duration: 0.22, ease: EASE_OUT }}
/>`,
  },
  {
    title: "Layout continuity",
    eyebrow: "Movement",
    description:
      "When a compact control grows, keep the original shape on screen and resize it; only once there is room should the label fade in.",
    purpose: "The user can see it is still the same button, just bigger.",
    avoid: "Animating width directly, or showing text before the container has grown to fit it.",
    icon: PanelTopOpen,
    demo: "layout",
    code: `<motion.div layout transition={CONTINUITY_SPRING}>
  <motion.button layout transition={CONTINUITY_SPRING}>
    <motion.span layout="position">
      <PanelTopOpen />
    </motion.span>

    <AnimatePresence mode="popLayout" initial={false}>
      {expanded ? (
        <motion.span
          layout
          variants={CONTINUITY_LABEL}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={CONTINUITY_SPRING}
        >
          Open panel
        </motion.span>
      ) : null}
    </AnimatePresence>
  </motion.button>
</motion.div>`,
  },
  {
    title: "Content swap",
    eyebrow: "State change",
    description:
      "Switching tabs or filters? Clear the old view quickly, bring the new one in a touch slower, and move each only a few pixels.",
    purpose: "Makes clear the content changed while the frame around it did not.",
    avoid: "Full page-style transitions on views people flip between all the time.",
    icon: Rows3,
    demo: "swap",
    code: `<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={tab}
    initial={{ opacity: 0, transform: "translateY(4px)" }}
    animate={{ opacity: 1, transform: "translateY(0px)" }}
    exit={{
      opacity: 0,
      transform: "translateY(-4px)",
      transition: { duration: 0.12, ease: EASE_OUT },
    }}
    transition={{ duration: 0.18, ease: EASE_OUT }}
  />
</AnimatePresence>`,
  },
];

export function MotionPatterns() {
  return (
    <div className="mt-12 space-y-20">
      <GuideSection
        eyebrow="Decision framework"
        title="Answer these before you animate"
        description="Most motion problems are settled by a few questions asked up front, well before anyone tweaks a duration."
      >
        <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2">
          {decisions.map((decision) => (
            <article key={decision.number} className="bg-background p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {decision.number}
                </span>
                <span className="size-1.5 rounded-full bg-foreground/20" />
              </div>
              <h3 className="mt-8 text-base font-semibold text-foreground">
                {decision.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {decision.body}
              </p>
              <p className="mt-4 border-l border-border pl-3 text-xs leading-5 text-muted-foreground">
                {decision.note}
              </p>
            </article>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        eyebrow="Motion tokens"
        title="Shared tokens, not one-off curves"
        description="Every karaUI component pulls its easing and springs from lib/ease.ts. Pick a token by what the element is doing; the library then feels consistent even though each piece moves differently."
      >
        <EasingLab />
      </GuideSection>

      <GuideSection
        eyebrow="Timing"
        title="How long should it take?"
        description="Bigger surfaces and longer distances need more time; frequent actions need less. Treat the ranges below as a first guess and adjust by eye."
      >
        <div className="overflow-hidden rounded-3xl border border-border">
          <div className="hidden grid-cols-[1fr_8rem_1.4fr] gap-4 border-b border-border bg-card px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Interaction</span>
            <span>Range</span>
            <span>Desired feel</span>
          </div>
          {timings.map((timing) => (
            <div
              key={timing.use}
              className="grid gap-1 border-b border-border px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_8rem_1.4fr] sm:items-center sm:gap-4"
            >
              <span className="text-sm font-medium text-foreground">
                {timing.use}
              </span>
              <span className="font-mono text-xs text-foreground">
                {timing.range}
              </span>
              <span className="text-sm text-muted-foreground">
                {timing.feel}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3 rounded-2xl bg-card p-4">
          <Zap className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden="true" />
          <p className="text-sm leading-6 text-muted-foreground">
            Most UI motion in karaUI finishes inside 300ms. Go longer only for a demo
            that teaches something, a gesture the user is driving, or a big change
            in layout.
          </p>
        </div>
      </GuideSection>

      <GuideSection
        eyebrow="Recipes"
        title="Five recipes from the library"
        description="Each card shows a live demo, the reason the motion exists, a common way to get it wrong, and the code with its reduced-motion branch."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.title} recipe={recipe} />
          ))}
        </div>
      </GuideSection>

      <GuideSection
        eyebrow="Accessibility"
        title="Building the reduced-motion version"
        description="Turning everything off is the wrong fix. Keep the cues that help people follow along and drop the movement that can make them feel unwell."
      >
        <div className="grid overflow-hidden rounded-3xl border border-border lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-border bg-card p-6 lg:border-b-0 lg:border-r">
            <Accessibility className="size-5 text-foreground" aria-hidden="true" />
            <h3 className="mt-8 text-lg font-semibold text-foreground">
              Fade and recolor instead of moving.
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Opacity, color and instant state swaps stay. Parallax, big translates,
              repeated scaling and springy overshoot are removed.
            </p>
          </div>
          <CodeRecipe
            alwaysOpen
            code={`const reduce = useReducedMotion();

const hidden = {
  opacity: 0,
  transform: reduce ? "none" : "translateY(8px)",
};

const visible = {
  opacity: 1,
  transform: "translateY(0px)",
};`}
          />
        </div>
      </GuideSection>
    </div>
  );
}

function GuideSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function EasingLab() {
  const [replay, setReplay] = useState(0);
  const reduce = useReducedMotion();

  return (
    <div className="overflow-hidden rounded-3xl border border-border">
      <div className="flex items-start justify-between gap-4 border-b border-border bg-card px-5 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Compare the curves</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Both dots travel the same track in the same time.
          </p>
        </div>
        <ReplayButton
          onClick={() => setReplay((current) => current + 1)}
          reduce={Boolean(reduce)}
        />
      </div>
      <div className="grid gap-px bg-border md:grid-cols-2">
        <EasingTrack
          key={`out-${replay}`}
          label="EASE_OUT"
          value="[0.16, 1, 0.3, 1]"
          description="Starts fast and coasts to a stop, which suits elements arriving or leaving."
          ease={EASE_OUT}
          reduce={Boolean(reduce)}
        />
        <EasingTrack
          key={`in-out-${replay}`}
          label="EASE_IN_OUT"
          value="[0.77, 0, 0.175, 1]"
          description="Speeds up, then slows down, which suits an element moving between two spots."
          ease={EASE_IN_OUT}
          reduce={Boolean(reduce)}
        />
      </div>
      <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
        <TokenNote
          icon={MousePointer2}
          title="SPRING_PRESS"
          body="Short and firm; used on buttons and anything else you press."
        />
        <TokenNote
          icon={CircleGauge}
          title="SPRING_LAYOUT"
          body="For pills, indicators and shared surfaces that glide between positions."
        />
      </div>
    </div>
  );
}

function EasingTrack({
  label,
  value,
  description,
  ease,
  reduce,
}: {
  label: string;
  value: string;
  description: string;
  ease: readonly [number, number, number, number];
  reduce: boolean;
}) {
  return (
    <div className="bg-background p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs font-medium text-foreground">
          {label}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {value}
        </span>
      </div>
      <div className="mt-8 h-2 w-48 max-w-full rounded-full bg-card p-0.5">
        <motion.div
          initial={{ opacity: 0.5, transform: "translateX(0px)" }}
          animate={{
            opacity: 1,
            transform: reduce ? "translateX(0px)" : "translateX(176px)",
          }}
          transition={{ duration: reduce ? 0.18 : 0.9, ease }}
          className="size-1 rounded-full bg-foreground"
        />
      </div>
      <p className="mt-6 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function TokenNote({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 bg-card p-5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
        <Icon className="size-3.5 text-foreground" aria-hidden="true" />
      </span>
      <div>
        <p className="font-mono text-xs text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const Icon = recipe.icon;

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-border bg-background">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="flex size-9 items-center justify-center rounded-full border border-border bg-card">
            <Icon className="size-4 text-foreground" aria-hidden="true" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {recipe.eyebrow}
          </span>
        </div>
        <h3 className="mt-6 text-lg font-semibold text-foreground">
          {recipe.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {recipe.description}
        </p>
      </div>

      <div className="mx-3 rounded-2xl bg-card p-3">
        <div className="flex min-h-36 items-center justify-center rounded-xl bg-background p-4">
          <RecipeDemoView demo={recipe.demo} />
        </div>
      </div>

      <div className="grid gap-3 p-5 text-xs leading-5 sm:p-6">
        <Rule label="Purpose" value={recipe.purpose} />
        <Rule label="Avoid" value={recipe.avoid} />
      </div>

      <CodeRecipe code={recipe.code} />
    </article>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
      <span className="font-mono uppercase text-muted-foreground">{label}</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

function CodeRecipe({
  code,
  alwaysOpen = false,
}: {
  code: string;
  alwaysOpen?: boolean;
}) {
  if (alwaysOpen) {
    return (
      <pre className="overflow-x-auto bg-background p-5 font-mono text-xs leading-6 text-foreground sm:p-6">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <details className="group/code mt-auto border-t border-border">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        View recipe
        <span className="font-mono text-muted-foreground transition-transform group-open/code:rotate-45">
          +
        </span>
      </summary>
      <pre className="overflow-x-auto border-t border-border bg-card p-5 font-mono text-xs leading-6 text-foreground">
        <code>{code}</code>
      </pre>
    </details>
  );
}

function RecipeDemoView({ demo }: { demo: RecipeDemo }) {
  const reduce = useReducedMotion();
  const hoverCapable = useHoverCapable();
  const [replay, setReplay] = useState(0);
  const [iconActive, setIconActive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"Preview" | "Code">("Preview");
  const tabsId = useId();

  if (demo === "press") {
    return (
      <motion.button
        type="button"
        whileTap={reduce ? undefined : { scale: 0.97 }}
        transition={SPRING_PRESS}
        className="h-11 rounded-full bg-foreground px-5 text-sm font-medium text-background"
      >
        Press me
      </motion.button>
    );
  }

  if (demo === "icon") {
    const active = iconActive && hoverCapable && !reduce;

    return (
      <button
        type="button"
        onMouseEnter={() => setIconActive(true)}
        onMouseLeave={() => setIconActive(false)}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground"
      >
        <motion.span
          animate={active ? { rotate: [0, 12, -8, 4, 0] } : { rotate: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          style={{ transformOrigin: "top center" }}
        >
          <Bell className="size-4" aria-hidden="true" />
        </motion.span>
        Hover bell
      </button>
    );
  }

  if (demo === "reveal") {
    return (
      <div className="flex w-full flex-col items-center">
        <ReplayButton
          onClick={() => setReplay((current) => current + 1)}
          reduce={Boolean(reduce)}
        />
        <motion.div
          key={replay}
          initial={{
            opacity: 0,
            transform: reduce ? "none" : "translateY(8px)",
            filter: reduce ? "none" : "blur(4px)",
          }}
          animate={{
            opacity: 1,
            transform: "translateY(0px)",
            filter: "blur(0px)",
          }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="mt-3 w-48 rounded-xl border border-border bg-card p-3"
        >
          <p className="text-sm font-medium text-foreground">New surface</p>
          <p className="mt-1 text-xs text-muted-foreground">Ready before focus.</p>
        </motion.div>
      </div>
    );
  }

  if (demo === "layout") {
    const transition = reduce ? { duration: 0 } : CONTINUITY_SPRING;

    return (
      <motion.div
        layout
        transition={transition}
        className="inline-flex"
      >
        <motion.button
          layout
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse panel" : "Expand panel"}
          onClick={() => setExpanded((current) => !current)}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          transition={transition}
          style={{ borderRadius: 9999 }}
          className="relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-full border border-border bg-card p-1 pr-1 text-sm font-medium text-foreground"
        >
          <motion.span
            layout="position"
            transition={transition}
            className="inline-grid size-9 shrink-0 place-items-center rounded-full bg-background"
          >
            <PanelTopOpen className="size-4" aria-hidden="true" />
          </motion.span>
          <AnimatePresence mode="popLayout" initial={false}>
            {expanded ? (
              <motion.span
                key="continuity-label"
                layout
                variants={CONTINUITY_LABEL}
                initial={reduce ? { opacity: 0 } : "hidden"}
                animate={reduce ? { opacity: 1 } : "visible"}
                exit={reduce ? { opacity: 0 } : "exit"}
                transition={transition}
                className="relative inline-flex w-max items-center whitespace-nowrap pr-3"
              >
                Open panel
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-64 rounded-2xl bg-card p-2">
      <div role="tablist" aria-label="Example views" className="grid grid-cols-2 gap-1">
        {(["Preview", "Code"] as const).map((item) => {
          const selected = tab === item;
          return (
            <button
              key={item}
              id={`${tabsId}-${item}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${tabsId}-panel`}
              onClick={() => setTab(item)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                selected
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          id={`${tabsId}-panel`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-${tab}-tab`}
          initial={{
            opacity: 0,
            transform: reduce ? "none" : "translateY(4px)",
          }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{
            opacity: 0,
            transform: reduce ? "none" : "translateY(-4px)",
            transition: { duration: 0.12, ease: EASE_OUT },
          }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
          className="mt-2 rounded-xl bg-background p-4 text-sm text-foreground"
        >
          {tab === "Preview" ? "Live component view" : "Copy-ready source"}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ReplayButton({
  onClick,
  reduce,
}: {
  onClick: () => void;
  reduce: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={SPRING_PRESS}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground"
    >
      <RefreshCw className="size-3" aria-hidden="true" />
      Replay
    </motion.button>
  );
}
