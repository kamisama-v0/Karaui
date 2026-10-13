# karaUI MCP server

Remote [MCP](https://modelcontextprotocol.io) server for the karaUI component registry, running on a Cloudflare Worker. It lets AI agents discover, inspect, and install karaUI components.

It owns no data — it reads the live `karaui.kamisama-v0.my.id/r/*` registry endpoints at runtime (edge-cached), so new components appear without redeploying the worker.

## Connect

Add to your MCP client (Claude Desktop, Cursor, etc.):

```
https://mcp-karaui.kamisama-v0.my.id/mcp
```

Streamable HTTP is recommended. An SSE endpoint (`/sse`) exists for legacy clients.

## Tools

| tool | input | returns |
|---|---|---|
| `list_components` | `category?` | components (slug, name, category, description) |
| `search_components` | `query` | best-matching components |
| `get_component` | `slug` | description, dependencies, all source files, install command |
| `get_install_command` | `slug`, `packageManager?` | shadcn CLI command per package manager |

## Develop

```bash
bun install
bun run dev        # local worker at http://localhost:8787
bun run typecheck
```

## Deploy

```bash
bun run deploy
```

Requires the `kamisama-v0.my.id` zone on Cloudflare. Wrangler provisions the `mcp-karaui.kamisama-v0.my.id` custom domain on first deploy (see `routes` in `wrangler.jsonc`). To point at a different registry, set the `REGISTRY_URL` var.
