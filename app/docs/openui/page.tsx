import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/app/analytics/json-ld";
import { CodeBlock } from "@/components/app/docs/code-block";
import { breadcrumbJsonLd, docsArticleJsonLd } from "@/lib/seo";

const PAGE_TITLE = "Generative UI with OpenUI and karaUI";
const PAGE_DESCRIPTION =
  "Let a model answer with real karaUI components: define them for OpenUI, build the prompt spec, stream OpenUI Lang from your API and render it in React.";
const PAGE_PATH = "/docs/openui";
const PAGE_IMAGE = "/api/og?page=openui&v=2";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: `${PAGE_TITLE} · karaUI`,
    description: PAGE_DESCRIPTION,
    url: PAGE_PATH,
    type: "article",
    siteName: "karaUI",
    images: [
      {
        url: PAGE_IMAGE,
        width: 1200,
        height: 630,
        alt: "Generative UI with OpenUI and karaUI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} · karaUI`,
    description: PAGE_DESCRIPTION,
    images: [{ url: PAGE_IMAGE, alt: "Generative UI with OpenUI and karaUI" }],
  },
};

const INSTALL_SNIPPET = `# Renderer, prompt builder and the Zod schemas
npm install @openuidev/react-lang @openuidev/lang-core zod

# A model client; OpenAI is only the example here
npm install openai

# The karaUI pieces the model may use (the CLI resolves @karaui
# through shadcn's registry directory, no config file edits)
npx shadcn@latest add @karaui/button @karaui/animated-badge @karaui/animated-number`;

const DEFINE_SNIPPET = `import { defineComponent, useTriggerAction } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { Button } from "@/components/motion/button";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { AnimatedNumber } from "@/components/motion/animated-number";

// The model chooses the label, a variant and whether to ripple on press.
// Clicking calls \`useTriggerAction\` with \`action\`, which goes back to the
// model as the next user turn, so the button actually does something.
const KaraButton = defineComponent({
  name: "Button",
  description:
    "Primary action. When clicked, \`action\` is sent to the model as a new message.",
  props: z.object({
    label: z.string(),
    action: z.string(),
    variant: z.enum(["primary", "secondary", "ghost", "outline"]).default("primary"),
    ripple: z.boolean().default(false),
  }),
  component: ({ props }) => {
    const triggerAction = useTriggerAction();
    return (
      <Button
        variant={props.variant}
        ripple={props.ripple}
        onClick={() => triggerAction(props.action)}
      >
        {props.label}
      </Button>
    );
  },
});

// AnimatedBadge: a colored status chip; pulse marks something still running.
const KaraBadge = defineComponent({
  name: "Badge",
  description:
    "Short status label. Choose a status; turn on pulse while work is ongoing.",
  props: z.object({
    label: z.string(),
    status: z
      .enum(["neutral", "info", "success", "warning", "danger", "loading"])
      .default("neutral"),
    pulse: z.boolean().default(false),
  }),
  component: ({ props }) => (
    <AnimatedBadge status={props.status} pulse={props.pulse}>
      {props.label}
    </AnimatedBadge>
  ),
});

// AnimatedNumber inside a small card, for one headline figure.
const KaraStat = defineComponent({
  name: "Stat",
  description: "One labelled number that counts up when it appears.",
  props: z.object({ label: z.string(), value: z.number() }),
  component: ({ props }) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{props.label}</p>
      <AnimatedNumber value={props.value} className="text-2xl font-semibold" />
    </div>
  ),
});

// Root container. Its children are typed as a union of the \`.ref\` of each
// component above (so it has to come after them). That lets the runtime reject
// anything else and tells the model what it may put inside; \`z.any()\` would
// give up both.
const StackChild = z.union([KaraButton.ref, KaraBadge.ref, KaraStat.ref]);

const Stack = defineComponent({
  name: "Stack",
  description: "Column layout; children render in order with a gap.",
  props: z.object({ children: z.array(StackChild) }),
  component: ({ props, renderNode }) => (
    <div className="flex flex-col gap-3">{renderNode(props.children)}</div>
  ),
});`;

const LIBRARY_SNIPPET = `import { createLibrary } from "@openuidev/react-lang";

export const karauiLibrary = createLibrary({
  root: "Stack",
  components: [Stack, KaraButton, KaraBadge, KaraStat],
  componentGroups: [
    {
      name: "Layout",
      components: ["Stack"],
      notes: ["Wrap the whole answer in one Stack."],
    },
    {
      name: "karaUI motion",
      components: ["Button", "Badge", "Stat"],
      notes: [
        "Turn on Badge pulse only for work that is still running.",
        "Offer at most one Button per answer.",
      ],
    },
  ],
});`;

const PROMPT_SNIPPET = `import OpenAI from "openai";
import { generateSystemPrompt } from "@openuidev/lang-core";
import karauiLibrarySpec from "@/lib/generated/karaui-library.spec.json";

const openai = new OpenAI();

// The spec JSON (built by the CLI) lists what the model is allowed to output.
export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = await openai.responses.create({
    model: "gpt-5.6-sol",
    stream: true,
    store: false,
    // OpenUI Lang syntax plus each component's props and description, which
    // keeps the model inside your library.
    instructions: generateSystemPrompt({ library: karauiLibrarySpec }),
    input: messages,
  });

  const response = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(encoder.encode(event.delta));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(response, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}`;

const RENDER_SNIPPET = `"use client";

import { Renderer } from "@openuidev/react-lang";
import { karauiLibrary } from "@/lib/karaui-library";

// \`response\` holds the OpenUI Lang text received so far from your route.
export function GenerativeResponse({
  response,
  isStreaming,
  onSend,
}: {
  response: string | null;
  isStreaming: boolean;
  onSend: (message: string) => void;
}) {
  return (
    <Renderer
      response={response}
      library={karauiLibrary}
      isStreaming={isStreaming}
      // Fired by a generated Button; forward its message as the next turn.
      onAction={(event) => onSend(event.humanFriendlyMessage)}
    />
  );
}`;

const RESOURCES: { label: string; url: string; desc: string }[] = [
  {
    label: "OpenUI",
    url: "https://www.openui.com",
    desc: "Project home, with the OpenUI Lang spec.",
  },
  {
    label: "Defining components",
    url: "https://www.openui.com/docs/openui-lang/defining-components",
    desc: "API docs for defineComponent and createLibrary.",
  },
  {
    label: "shadcn chat example",
    url: "https://www.openui.com/docs/openui-lang/examples/shadcn-chat",
    desc: "OpenUI's own example of wrapping shadcn components; this guide is modelled on it.",
  },
];

export default function OpenUIPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "OpenUI integration", path: PAGE_PATH },
          ]),
          docsArticleJsonLd({
            path: PAGE_PATH,
            headline: PAGE_TITLE,
            description: PAGE_DESCRIPTION,
            image: PAGE_IMAGE,
            datePublished: "2026-07-27",
            dateModified: "2026-08-14",
            about: [
              "OpenUI React integration",
              "Custom OpenUI component library",
              "Generative UI",
              "karaUI",
            ],
          }),
        ]}
      />
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Integration
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Generative UI with OpenUI and karaUI
      </h1>
      <p className="mt-3 text-muted-foreground">
        <Link
          href="https://www.openui.com"
          target="_blank"
          rel="noreferrer noopener"
          className="text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
        >
          OpenUI
        </Link>{" "}
        lets a model reply with interface instead of text. It writes a compact
        markup called OpenUI Lang, and a React renderer swaps each node for a
        component from a list <em>you</em> control. This guide fills that list
        with karaUI pieces, so a chat answer can contain a working button, a
        status badge or a counting metric, and nothing you did not approve.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Install
      </h2>
      <p className="mt-2 text-muted-foreground">
        Add the OpenUI packages, a model client, and whichever karaUI
        components the model should be able to use. The shadcn CLI copies their
        source into your project (the{" "}
        <Link
          href="/docs/ai-agents"
          className="text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
        >
          AI Agents
        </Link>{" "}
        page lists other ways to install).
      </p>
      <div className="mt-4">
        <CodeBlock code={INSTALL_SNIPPET} lang="bash" filename="terminal" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Starting with an empty repo?{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          npx @openuidev/cli@latest create
        </code>{" "}
        gives you a streaming chat app to begin with; replace its built-in
        library with the one built on this page.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Register components
      </h2>
      <p className="mt-2 text-muted-foreground">
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          defineComponent
        </code>{" "}
        ties one OpenUI Lang node name to one React component. Its Zod{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          props
        </code>{" "}
        schema checks each node while it streams in; the{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          description
        </code>{" "}
        text ends up in the system prompt and tells the model when to use the
        component; and{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          useTriggerAction
        </code>{" "}
        is how a rendered control reports a click. For containers, type the
        children as a union of the other components&apos;{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          .ref
        </code>{" "}
        schemas; the renderer then enforces what can go inside, and the
        prompt spells it out for the model.
      </p>
      <div className="mt-4">
        <CodeBlock code={DEFINE_SNIPPET} lang="tsx" filename="lib/karaui-library.tsx" />
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Assemble the library
      </h2>
      <p className="mt-2 text-muted-foreground">
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          createLibrary
        </code>{" "}
        bundles the definitions together, sets which one is the{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          root
        </code>{" "}
        and lets you split the prompt into{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          componentGroups
        </code>{" "}
        with short usage notes the model reads alongside each group.
      </p>
      <div className="mt-4">
        <CodeBlock code={LIBRARY_SNIPPET} lang="tsx" filename="lib/karaui-library.tsx" />
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Generate the prompt
      </h2>
      <p className="mt-2 text-muted-foreground">
        The browser only displays OpenUI Lang; the model still needs to learn
        how to write it. Build a spec file with{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          npx @openuidev/cli@latest generate --spec ./lib/karaui-library.tsx --out ./lib/generated/karaui-library.spec.json
        </code>{" "}
        and pass it to{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          generateSystemPrompt
        </code>{" "}
        in an API route. The route below sends that prompt with the chat
        history and pipes the text deltas straight to the client.
      </p>
      <div className="mt-4">
        <CodeBlock code={PROMPT_SNIPPET} lang="tsx" filename="app/api/generate/route.ts" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Re-run the generate command whenever you edit the library. Because the
        route only imports the JSON file from{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          @/lib/generated
        </code>
        , your client components stay out of the server bundle.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Render the stream
      </h2>
      <p className="mt-2 text-muted-foreground">
        Pass the library to{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          &lt;Renderer&gt;
        </code>{" "}
        in a client component. It reads the partial OpenUI Lang as it arrives
        and mounts the matching karaUI components one by one. Hook up{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          onAction
        </code>{" "}
        so a click on a generated button becomes the next message to the
        model.
      </p>
      <div className="mt-4">
        <CodeBlock code={RENDER_SNIPPET} lang="tsx" filename="generative-response.tsx" />
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Why this works well with karaUI
      </h2>
      <p className="mt-2 text-muted-foreground">
        The components are plain source files in your repo, not a package
        with its own runtime, so the definitions above are all the glue you
        need. Their colors come from shadcn variables, which means whatever the
        model generates already matches your app&apos;s theme and the design
        style you picked.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Resources
      </h2>
      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        {RESOURCES.map((r) => (
          <li key={r.url} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <span className="text-sm font-medium text-foreground">
                {r.label}
              </span>
              <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
            </div>
            <Link
              href={r.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Open
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted-foreground">
        Any generative UI tool that installs from a shadcn registry can use
        karaUI in the same way.
      </p>
    </>
  );
}
