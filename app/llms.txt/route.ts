import { buildIndex } from "@/lib/registry-server";

export const dynamic = "force-static";

export async function GET() {
  const idx = await buildIndex();
  const lines: string[] = [];
  lines.push(`# ${idx.name}`);
  lines.push("");
  lines.push(`> ${idx.description}`);
  lines.push("");
  lines.push("## Endpoints");
  lines.push("");
  lines.push(`- Registry index (JSON): ${idx.endpoints.index}`);
  lines.push(`- Component detail (JSON): ${idx.endpoints.detail}`);
  lines.push(`- Raw source (text/plain): ${idx.endpoints.raw}`);
  lines.push(`- Component Markdown: ${idx.endpoints.markdown}`);
  lines.push("");
  lines.push("## Components");
  lines.push("");
  for (const c of idx.components) {
    lines.push(`- [${c.name}](${c.markdown_url}): ${c.description}`);
  }
  lines.push("");
  lines.push("## Usage for agents");
  lines.push("");
  lines.push("Shortest route: `npx shadcn@latest add @karaui/<slug>` (the namespace is in shadcn's registry directory).");
  lines.push("Without the CLI:");
  lines.push("");
  lines.push("1. Read the registry index and pick a slug.");
  lines.push("2. Request that slug's detail JSON; it carries every file with its source.");
  lines.push("3. Write each file to its `path` inside the project.");
  lines.push("4. Add the npm packages named in `dependencies`.");
  lines.push("5. Shared helpers such as `@/lib/utils` are already in `files` (`type: util`), so no further lookups are needed.");
  lines.push("");
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
    },
  });
}
