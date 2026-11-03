import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { registry } from "@/lib/registry";
import { Hero } from "@/components/app/landing/hero";
import { InstallCommand } from "@/components/app/docs/install-command";
import { LandingComponentCard } from "@/components/app/landing/landing-component-card";
import { SiteFooter } from "@/components/app/chrome/site-footer";
import { WorkCta } from "@/components/app/landing/work-cta";
import { JsonLd } from "@/components/app/analytics/json-ld";
import { isComponentNew } from "@/lib/component-status";

type Featured = { category: string; slug: string };

// Agent components that only karaUI ships; the full set lives on /components/agents.
const AGENT_PICKS: Featured[] = [
  { category: "agents", slug: "model-selector" },
  { category: "agents", slug: "context-meter" },
  { category: "agents", slug: "prompt-suggestions" },
  { category: "agents", slug: "message-actions" },
  { category: "agents", slug: "branch-navigator" },
  { category: "agents", slug: "conversation-history" },
  { category: "agents", slug: "artifact-panel" },
  { category: "agents", slug: "voice-orb" },
];

const BLOCK_PICKS: Featured[] = [
  { category: "blocks", slug: "inbox-app" },
  { category: "blocks", slug: "checkout" },
  { category: "blocks", slug: "settings-page" },
  { category: "blocks", slug: "dashboard-shell" },
  { category: "blocks", slug: "invoice" },
  { category: "blocks", slug: "status-page" },
  { category: "blocks", slug: "roadmap" },
  { category: "blocks", slug: "file-manager" },
];

const PRIMITIVE_PICKS: Featured[] = [
  { category: "motion", slug: "date-picker" },
  { category: "motion", slug: "chart" },
  { category: "motion", slug: "table" },
  { category: "motion", slug: "combobox" },
  { category: "motion", slug: "stepper" },
  { category: "motion", slug: "dialog" },
  { category: "motion", slug: "carousel" },
  { category: "motion", slug: "tabs" },
];

const GRID_CLASS =
  "grid grid-cols-1 gap-4 [grid-auto-rows:19rem] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

const countOf = (slug: string) =>
  registry.find((c) => c.slug === slug)?.components.length ?? 0;

const FAQ: { question: string; answer: ReactNode; text: string }[] = [
  {
    question: "How do I add a karaUI component to my project?",
    text: "Run npx shadcn@latest add @karaui/<name>, for example @karaui/model-selector. The @karaui namespace is listed in shadcn's registry directory, so the CLI resolves it without any components.json changes. The files are copied into your repo and are yours to edit.",
    answer: (
      <>
        Run{" "}
        <code className="font-mono text-foreground">
          npx shadcn@latest add @karaui/&lt;name&gt;
        </code>
        , for example <code className="font-mono text-foreground">@karaui/model-selector</code>.
        The @karaui namespace is listed in shadcn&apos;s registry directory, so
        the CLI resolves it without any components.json changes. The files are
        copied into your repo and are yours to edit.
      </>
    ),
  },
  {
    question: "What does my app need?",
    text: "React 19 and Tailwind CSS 4. The CLI installs packages such as motion for you. Colors come from shadcn's CSS variables, or from karaUI's theme.css if you don't use shadcn.",
    answer: (
      <>
        React 19 and Tailwind CSS 4. The CLI installs packages such as{" "}
        <code className="font-mono text-foreground">motion</code> for you.
        Colors come from shadcn&apos;s CSS variables, or from karaUI&apos;s
        theme.css if you don&apos;t use shadcn (see{" "}
        <Link href="/docs/theme" className="text-foreground underline underline-offset-4">
          theme setup
        </Link>
        ).
      </>
    ),
  },
  {
    question: "Can I build an AI chat or coding-agent interface with it?",
    text: "Yes. The AI agents category covers the prompt box, streamed answers, tool output and approvals, plus a model selector, context meter, branch navigator, conversation history, artifact panel and voice input. The Chat App component shows them working together.",
    answer: (
      <>
        Yes. The{" "}
        <Link href="/components/agents" className="text-foreground underline underline-offset-4">
          AI agents
        </Link>{" "}
        category covers the prompt box, streamed answers, tool output and
        approvals, plus a model selector, context meter, branch navigator,
        conversation history, artifact panel and voice input. The Chat App
        component shows them working together.
      </>
    ),
  },
  {
    question: "Does it work on phones?",
    text: "Tables can switch to stacked cards on narrow widths, many blocks size themselves with container queries, and small controls get a 44px hit area on touch screens. The mobile guide covers the details.",
    answer: (
      <>
        Tables can switch to stacked cards on narrow widths, many blocks size
        themselves with container queries, and small controls get a 44px hit
        area on touch screens. The{" "}
        <Link href="/docs/mobile" className="text-foreground underline underline-offset-4">
          mobile guide
        </Link>{" "}
        covers the details.
      </>
    ),
  },
  {
    question: "How is karaUI related to beUI?",
    text: "karaUI began as a fork of beUI by Saurabh Chauhan, which is MIT licensed. Since then it has added app blocks such as the inbox and checkout, new agent components such as the model selector and context meter, 10 design styles and mobile layouts.",
    answer: (
      <>
        karaUI began as a fork of{" "}
        <Link
          href="https://github.com/starc007/beui"
          target="_blank"
          rel="noreferrer noopener"
          className="text-foreground underline underline-offset-4"
        >
          beUI
        </Link>{" "}
        by Saurabh Chauhan, which is MIT licensed. Since then it has added app
        blocks such as the inbox and checkout, new agent components such as the
        model selector and context meter, 10 design styles and mobile layouts.
        The{" "}
        <Link href="/tribute" className="text-foreground underline underline-offset-4">
          tribute page
        </Link>{" "}
        says more.
      </>
    ),
  },
];

function resolvePicks(picks: Featured[], skip: Set<string>) {
  return picks.flatMap(({ category, slug }) => {
    if (skip.has(`${category}/${slug}`)) return [];
    const cat = registry.find((c) => c.slug === category);
    const comp = cat?.components.find((c) => c.slug === slug);
    return comp ? [{ category, component: comp }] : [];
  });
}

function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-pretty text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="group inline-flex min-h-11 shrink-0 items-center self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:self-auto"
        >
          {linkLabel}
          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

function PickSection({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  items: ReturnType<typeof resolvePicks>;
}) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-7xl border-t border-border px-4 pb-16 pt-14">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        href={href}
        linkLabel={linkLabel}
      />
      <div className={GRID_CLASS}>
        {items.map(({ category, component }) => (
          <LandingComponentCard
            key={`${category}-${component.slug}`}
            component={component}
            category={category}
          />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const agentCount = countOf("agents");
  const blockCount = countOf("blocks");
  const primitiveCount = countOf("motion");

  const newComponents = registry
    .flatMap((category) =>
      category.components
        .filter((component) => isComponentNew(component))
        .map((component) => {
          const newVariant = component.examples
            ?.filter((example) => isComponentNew(example))
            .sort((a, b) =>
              (b.launchedAt ?? "").localeCompare(a.launchedAt ?? ""),
            )[0];

          return {
            category: category.slug,
            previewKey: newVariant?.previewKey,
            component: newVariant
              ? {
                  ...component,
                  name: newVariant.name,
                  description:
                    newVariant.description ?? component.description,
                  launchedAt: newVariant.launchedAt,
                }
              : component,
          };
        }),
    )
    // Newest first: most recently launched components lead the section.
    .sort((a, b) =>
      (b.component.launchedAt ?? "").localeCompare(a.component.launchedAt ?? ""),
    );
  const newComponentKeys = new Set(
    newComponents.map(
      ({ category, component }) => `${category}/${component.slug}`,
    ),
  );

  const pillars = [
    {
      href: "/components/agents",
      stat: String(agentCount),
      label: "AI agent components",
      body: "Prompt box, streamed replies, tool calls, approvals, model picker, context meter and voice.",
    },
    {
      href: "/components/blocks",
      stat: String(blockCount),
      label: "App and landing blocks",
      body: "Inbox, checkout, settings, dashboard shell, invoice, status page, pricing, hero and footer.",
    },
    {
      href: "/components/motion",
      stat: String(primitiveCount),
      label: "Primitives",
      body: "Inputs, menus, dialogs, date pickers, data tables and SVG charts that the blocks are made of.",
    },
    {
      href: "/docs/theme#design-styles",
      stat: "10",
      label: "Design styles",
      body: "Minimalism, neobrutalism, swiss, retro, bento and more, each with light and dark tokens.",
    },
  ];

  return (
    <div className="relative">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.text },
          })),
        }}
      />
      <section className="relative isolate overflow-hidden px-4 pb-20 pt-20 md:pt-28">
        <Hero />
      </section>

      <section className="mx-auto max-w-2xl px-4 pb-24">
        <p className="mb-5 text-center text-sm text-muted-foreground">
          One command per component. The source lands in your repo, ready to edit.
        </p>
        <InstallCommand />
      </section>

      <section className="mx-auto max-w-7xl border-t border-border px-4 pb-16 pt-14">
        <SectionHeader eyebrow="What's inside" title="Four parts, one theme" />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pillars.map((pillar) => (
            <li key={pillar.href}>
              <Link
                href={pillar.href}
                className="group flex h-full min-h-11 flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"
              >
                <span className="font-display text-4xl font-semibold tracking-tight text-foreground">
                  {pillar.stat}
                </span>
                <span className="mt-2 inline-flex items-center text-sm font-medium text-foreground">
                  {pillar.label}
                  <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-2 text-sm leading-6 text-muted-foreground">
                  {pillar.body}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {newComponents.length ? (
        <section className="mx-auto max-w-7xl border-t border-border px-4 pb-16 pt-14">
          <SectionHeader eyebrow="New" title="Just added" />
          <div className={GRID_CLASS}>
            {newComponents.map(({ category, component, previewKey }) => (
              <LandingComponentCard
                key={`${category}-${component.slug}`}
                component={component}
                category={category}
                previewKey={previewKey}
              />
            ))}
          </div>
        </section>
      ) : null}

      <PickSection
        eyebrow="AI agents"
        title="The controls around a chat"
        description="Choosing a model, watching the context window fill up, rating a reply, flipping between regenerated answers, reopening an old thread: the parts most chat UIs end up building by hand."
        href="/components/agents"
        linkLabel={`All ${agentCount} agent components`}
        items={resolvePicks(AGENT_PICKS, newComponentKeys)}
      />

      <PickSection
        eyebrow="Blocks"
        title="Screens you connect to real data"
        description="Each block is a complete screen or page section with its state already handled. Pass in your data and callbacks instead of starting from an empty layout."
        href="/components/blocks"
        linkLabel={`All ${blockCount} blocks`}
        items={resolvePicks(BLOCK_PICKS, newComponentKeys)}
      />

      <PickSection
        eyebrow="Primitives"
        title="What the blocks are made of"
        description="Form fields, overlays, date and time pickers, tables and charts. Use them on their own, or open a block's source to see how they combine."
        href="/components/motion"
        linkLabel={`All ${primitiveCount} primitives`}
        items={resolvePicks(PRIMITIVE_PICKS, newComponentKeys)}
      />

      <section
        aria-labelledby="faq-heading"
        className="mx-auto max-w-3xl border-t border-border px-4 pb-8 pt-14"
      >
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          FAQ
        </p>
        <h2
          id="faq-heading"
          className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl"
        >
          Questions people ask
        </h2>
        <div className="mt-8 divide-y divide-border border-y border-border">
          {FAQ.map((item) => (
            <details key={item.question} className="group py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
                {item.question}
                <span
                  aria-hidden="true"
                  className="font-mono text-muted-foreground transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-4 text-sm leading-6 text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <WorkCta />

      <SiteFooter />
    </div>
  );
}
