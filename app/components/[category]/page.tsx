import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCategory, registry } from "@/lib/registry";
import { ComponentCard } from "@/components/app/docs/component-card";
import { JsonLd } from "@/components/app/analytics/json-ld";
import { isComponentNew } from "@/lib/component-status";
import { breadcrumbJsonLd, categoryJsonLd } from "@/lib/seo";

const categoryContent = {
  motion: {
    title: "React UI Primitives with Motion: Forms, Menus, Charts",
    heading: "Motion primitives for React",
    description:
      "Inputs, menus, date pickers, data tables, SVG charts, dialogs and more: the low-level React pieces of karaUI, animated with Motion and installed as editable source.",
    supportingText:
      "Open any of them to try a live demo, copy the @karaui install command, read the full TypeScript source and check the props. Small controls such as buttons, tabs and switches get a 44px hit area on touch screens, and movement switches off when the OS asks for reduced motion.",
    allLabel: "Every primitive",
  },
  blocks: {
    title: "React App and Landing Blocks: Inbox, Checkout, Dashboard",
    heading: "App screens and landing sections",
    description:
      "Whole screens and page sections assembled from karaUI primitives: an inbox, checkout, settings page, dashboard shell, invoice, status page, pricing table, hero and footer.",
    supportingText:
      "Each block is a working layout you connect to your own data rather than a static mockup. Most of them lay out with container queries, so one block fits a narrow side panel or a full page. Every block page has a live preview and the TypeScript source.",
    allLabel: "Every block",
  },
  agents: {
    title: "AI Chat and Agent UI Components for React",
    heading: "Components for AI chat and agent apps",
    description:
      "Prompt input, streamed answers, tool calls, approvals, a model picker, a context meter, response branches and a voice orb: React parts for chat and coding-agent interfaces.",
    supportingText:
      "They are built for runs that stream, take a while and may be stopped halfway: output grows without throwing the reader around, finished steps fold away, and a person can approve or reject before a tool runs. Each one comes with a live demo, an @karaui install command and its source.",
    allLabel: "Every agent component",
  },
} as const;

const AGENT_CATEGORY_GROUPS = [
  {
    id: "conversation",
    title: "Conversation",
    description:
      "The composer, the messages and the controls under each reply: type a prompt or start from a suggestion, lay out each turn, copy or rate an answer, and step between regenerated versions.",
    slugs: [
      "prompt-input",
      "prompt-suggestions",
      "message",
      "message-bubble",
      "message-actions",
      "branch-navigator",
      "message-scroller",
    ],
  },
  {
    id: "responses",
    title: "Answers and sources",
    description:
      "Show a reply while it is still being written, generate an image in place, and link each claim to the page it came from.",
    slugs: ["streaming-response", "image-generation", "citations"],
  },
  {
    id: "progress",
    title: "Progress and plans",
    description:
      "Let people know the agent is busy, show the task list it is working through, and keep a readable log of what it did, with no made-up percentages.",
    slugs: ["loading-states", "todo-list", "agent-activity"],
  },
  {
    id: "tools",
    title: "Tool output and code",
    description:
      "Display command output, generated code and file diffs as they stream, with copy buttons, and fold output and diffs away once a step finishes.",
    slugs: ["tool-result", "code-block", "file-diff"],
  },
  {
    id: "human-control",
    title: "Approvals",
    description:
      "Stop before a risky tool call or put a question to the user, then keep their answer visible in the run history.",
    slugs: ["tool-approval", "approval-card"],
  },
  {
    id: "models",
    title: "Model and context",
    description:
      "Let users choose which model handles the run and see how much of its context window is already used, with an optional compact action.",
    slugs: ["model-selector", "context-meter"],
  },
  {
    id: "voice",
    title: "Voice",
    description:
      "Record speech and turn it into a prompt, or show an animated orb that reacts to listening, thinking and speaking.",
    slugs: ["voice-input", "voice-orb"],
  },
  {
    id: "workspace",
    title: "Workspace and history",
    description:
      "The frame around a chat: a sidebar for projects and files, a searchable list of past conversations, a side panel for generated artifacts, and a full chat app that puts them together.",
    slugs: ["chat-app", "ai-sidebar", "conversation-history", "artifact-panel"],
  },
] as const;

const AGENT_GROUPED_SLUGS = new Set<string>(
  AGENT_CATEGORY_GROUPS.flatMap((group) => group.slugs),
);

export function generateStaticParams() {
  return registry.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = findCategory(category);
  if (!cat) return {};

  const content =
    categoryContent[cat.slug as keyof typeof categoryContent] ??
    categoryContent.motion;
  const title = content.title;
  const ogTitle = `${title} · karaUI`;
  const pageUrl = `/components/${cat.slug}`;
  const imageUrl = `/api/og?category=${cat.slug}`;
  const componentNames = cat.components.map((comp) => comp.name);

  return {
    title,
    description: content.description,
    keywords: [
      `${cat.name} components`,
      "React motion components",
      "best motion components",
      "free motion components",
      "open source motion components",
      "framer motion components",
      "best framer motion components",
      "framer motion templates",
      "Tailwind CSS components",
      "shadcn-compatible components",
      "shadcn registry",
      "karaUI",
      ...componentNames,
    ],
    openGraph: {
      title: ogTitle,
      description: content.description,
      url: pageUrl,
      type: "website",
      siteName: "karaUI",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${cat.name} components by karaUI`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: content.description,
      images: [imageUrl],
    },
    alternates: {
      canonical: pageUrl,
      types: {
        "application/json": "/registry.json",
      },
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = findCategory(category);
  if (!cat) notFound();
  const content =
    categoryContent[cat.slug as keyof typeof categoryContent] ??
    categoryContent.motion;
  const now = Date.now();
  const newComponents = cat.components.filter((comp) =>
    isComponentNew(comp, now),
  );
  const components = cat.components.filter(
    (comp) => !isComponentNew(comp, now),
  );
  // Every agent component must appear on the page: anything not listed in a
  // group lands in a trailing "More" group instead of silently disappearing.
  const ungroupedAgents = cat.components.filter(
    (comp) => !AGENT_GROUPED_SLUGS.has(comp.slug),
  );
  const agentGroups =
    cat.slug === "agents"
      ? [
          ...AGENT_CATEGORY_GROUPS.map((group) => ({
            id: group.id as string,
            title: group.title as string,
            description: group.description as string,
            components: group.slugs.flatMap((slug) => {
              const component = cat.components.find(
                (item) => item.slug === slug,
              );
              return component ? [component] : [];
            }),
          })),
          ...(ungroupedAgents.length
            ? [
                {
                  id: "more",
                  title: "More",
                  description:
                    "Agent components that don't fit one of the groups above.",
                  components: ungroupedAgents,
                },
              ]
            : []),
        ]
      : [];

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "karaUI", path: "/" },
            { name: cat.name, path: `/components/${cat.slug}` },
          ]),
          categoryJsonLd(cat),
        ]}
      />
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm"
      >
        <span className="font-medium text-foreground">{cat.name}</span>
      </nav>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        {content.heading}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {content.description}
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {content.supportingText}
      </p>

      {agentGroups.length ? (
        <>
          <nav
            aria-label="Agent component groups"
            className="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-y border-border py-4"
          >
            {agentGroups.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {group.title}
              </a>
            ))}
          </nav>

          <div className="mt-12 space-y-14">
            {agentGroups.map((group) => (
              <section key={group.id} id={group.id} className="scroll-mt-24">
                <div className="max-w-2xl">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {group.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {group.description}
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {group.components.map((comp) => (
                    <ComponentCard
                      key={comp.slug}
                      categorySlug={cat.slug}
                      slug={comp.slug}
                      name={comp.name}
                      description={comp.description}
                      badge={comp.badge}
                      launchedAt={comp.launchedAt}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <>
          {newComponents.length ? (
            <section className="mt-10">
              <h2 className="font-display text-xs font-medium uppercase text-muted-foreground">
                New
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {newComponents.map((comp) => (
                  <ComponentCard
                    key={comp.slug}
                    categorySlug={cat.slug}
                    slug={comp.slug}
                    name={comp.name}
                    description={comp.description}
                    badge={comp.badge}
                    launchedAt={comp.launchedAt}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="font-display text-xs font-medium uppercase text-muted-foreground">
              {content.allLabel}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {components.map((comp) => (
                <ComponentCard
                  key={comp.slug}
                  categorySlug={cat.slug}
                  slug={comp.slug}
                  name={comp.name}
                  description={comp.description}
                  badge={comp.badge}
                  launchedAt={comp.launchedAt}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
