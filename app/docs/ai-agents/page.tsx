import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CodeBlock } from "@/components/app/docs/code-block";

export const metadata: Metadata = {
  title: "Using karaUI from coding agents",
  description:
    "Point Claude Code, Codex, Cursor or Amp at karaUI: add the karaui skill, connect the hosted MCP server, or read llms.txt and the JSON registry yourself.",
  alternates: { canonical: "/docs/ai-agents" },
  openGraph: {
    title: "Using karaUI from coding agents · karaUI",
    description:
      "Point Claude Code, Codex, Cursor or Amp at karaUI: add the karaui skill, connect the hosted MCP server, or read llms.txt and the JSON registry yourself.",
    url: "/docs/ai-agents",
    type: "article",
    siteName: "karaUI",
    images: ["/api/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Using karaUI from coding agents · karaUI",
    images: ["/api/og"],
  },
};

const ENDPOINTS: { label: string; url: string; desc: string }[] = [
  {
    label: "llms.txt",
    url: "/llms.txt",
    desc: "Plain-text site map for models, following the llmstxt.org layout.",
  },
  {
    label: "Registry index",
    url: "/r",
    desc: "Every component and variant as one JSON list.",
  },
  {
    label: "Component detail",
    url: "/r/{slug}",
    desc: "One component as JSON: its files, their source and the npm packages it needs.",
  },
  {
    label: "shadcn catalog",
    url: "/registry.json",
    desc: "The catalog shadcn's registry directory reads.",
  },
  {
    label: "shadcn item",
    url: "/r/{slug}.json",
    desc: "What `shadcn add` downloads: file contents inline, styled with shadcn color classes.",
  },
  {
    label: "Raw source",
    url: "/r/{slug}/raw",
    desc: "The component's .tsx as plain text, nothing wrapped around it.",
  },
];

const MCP_URL = "https://mcp-karaui.kamisama-v0.my.id/mcp";

const SKILL_SNIPPET = `npx skills add kamisama-v0/Karaui --skill karaui`;

const MCP_CLI_SNIPPET = `# Claude Code
claude mcp add --transport http karaui https://mcp-karaui.kamisama-v0.my.id/mcp

# Codex
codex mcp add karaui --url https://mcp-karaui.kamisama-v0.my.id/mcp

# Amp
amp mcp add karaui https://mcp-karaui.kamisama-v0.my.id/mcp`;

const MCP_MANUAL_SNIPPET = `{
  "mcpServers": {
    "karaui": {
      "type": "http",
      "url": "https://mcp-karaui.kamisama-v0.my.id/mcp"
    }
  }
}`;

const FETCH_SNIPPET = `// 1. Read the catalog
const idx = await fetch('https://karaui.kamisama-v0.my.id/r').then((r) => r.json());

// 2. Load one entry by slug
const entry = await fetch(\`https://karaui.kamisama-v0.my.id/r/\${slug}\`).then((r) => r.json());

// 3. Save every bundled file at its path
for (const file of entry.files) {
  await writeFile(file.path, file.content);
}

// 4. Add the npm packages it lists
await runShell(['bun', 'add', ...entry.dependencies]);`;

const SHADCN_SNIPPET = `# Namespace (listed in shadcn's registry directory, no setup)
npx shadcn@latest add @karaui/animated-toast-stack

# Or pass the item's full URL
npx shadcn@latest add https://karaui.kamisama-v0.my.id/r/animated-toast-stack.json`;

const ENTRY_SHAPE = `{
  "slug": "swap",
  "name": "Multi-chain Swap",
  "description": "...",
  "category": "blocks",
  "page_url": "https://karaui.kamisama-v0.my.id/components/blocks/swap",
  "detail_url": "https://karaui.kamisama-v0.my.id/r/swap",
  "raw_url": "https://karaui.kamisama-v0.my.id/r/swap/raw",
  "dependencies": ["motion", "lucide-react", "react"],
  "internal": ["@/lib/utils"],
  "files": [
    { "path": "components/motion/swap.tsx", "type": "component", "content": "..." },
    { "path": "components/previews/blocks/swap.preview.tsx", "type": "preview", "content": "..." },
    { "path": "lib/utils.ts", "type": "util", "content": "..." }
  ]
}`;

export default function AIAgentsPage() {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Intro
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Using karaUI from coding agents
      </h1>
      <p className="mt-3 text-muted-foreground">
        You can ask an assistant like Claude Code, Codex, Cursor or Amp to add a
        karaUI component for you. There are three ways to wire that up, from
        least to most hands-on: a skill that tells the agent how to pick and
        install components, an MCP server it can query, and plain HTTP endpoints
        that return the catalog and the source.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Agent skill
      </h2>
      <p className="mt-2 text-muted-foreground">
        With the skill installed, the agent starts by reading the current
        registry, matches your request to an{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          items[].name
        </code>{" "}
        install slug, checks that item through shadcn, and only then installs
        it and builds on the source it wrote. The point is to stop the agent
        from hand-rolling an animation that karaUI already has.
      </p>
      <div className="mt-4">
        <CodeBlock code={SKILL_SNIPPET} lang="bash" filename="terminal" />
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        MCP server
      </h2>
      <p className="mt-2 text-muted-foreground">
        If your client speaks MCP, this is the shortest setup. Once connected,
        the agent can browse the catalog, search it and get install commands
        without leaving the chat. The server lives at{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          {MCP_URL}
        </code>
        .
      </p>
      <div className="mt-4">
        <CodeBlock code={MCP_CLI_SNIPPET} lang="bash" filename="terminal" />
      </div>
      <p className="mt-4 text-muted-foreground">
        For a client not listed above, put this entry in its MCP config file.
      </p>
      <div className="mt-4">
        <CodeBlock code={MCP_MANUAL_SNIPPET} lang="json" filename="mcp.json" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        It exposes four tools:{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          list_components
        </code>
        ,{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          search_components
        </code>
        ,{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          get_component
        </code>
        ,{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          get_install_command
        </code>
        .
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Endpoints
      </h2>
      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        {ENDPOINTS.map((e) => (
          <li
            key={e.url}
            className="flex items-start justify-between gap-4 p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <code className="rounded-md bg-foreground/5 px-2 py-0.5 font-mono text-xs text-foreground">
                  {e.url}
                </code>
                <span className="text-sm font-medium text-foreground">
                  {e.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{e.desc}</p>
            </div>
            {!e.url.includes("{") ? (
              <Link
                href={e.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Open
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            ) : null}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Agent flow
      </h2>
      <p className="mt-2 text-muted-foreground">
        Writing your own integration? The whole loop is a handful of fetches.
        Each entry already includes every file it imports, so nothing else has
        to be resolved.
      </p>
      <div className="mt-4">
        <CodeBlock code={FETCH_SNIPPET} lang="ts" filename="agent.ts" />
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        shadcn flow
      </h2>
      <p className="mt-2 text-muted-foreground">
        Agents that already use the shadcn CLI can install by name. The CLI
        writes the files and adds the npm packages; since the markup only uses
        shadcn&apos;s color classes, the result follows the host app&apos;s
        theme with no extra karaUI variables.
      </p>
      <div className="mt-4">
        <CodeBlock code={SHADCN_SNIPPET} lang="bash" filename="terminal" />
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Entry shape
      </h2>
      <p className="mt-2 text-muted-foreground">
        Shared helpers such as{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          @/lib/utils
        </code>
        are bundled into the response as{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
          type: util
        </code>{" "}
        entries, which saves the agent a round of import hunting.
      </p>
      <div className="mt-4">
        <CodeBlock code={ENTRY_SHAPE} lang="json" filename="r/swap.json" />
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Generative UI
      </h2>
      <p className="mt-2 text-muted-foreground">
        To let a model build screens out of karaUI components at runtime, see
        the{" "}
        <Link
          href="/docs/openui"
          className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          OpenUI integration guide
        </Link>{" "}
        It covers registering the components, producing the system prompt and
        rendering OpenUI Lang while it streams in.
      </p>
    </>
  );
}
