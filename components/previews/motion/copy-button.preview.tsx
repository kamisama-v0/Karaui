"use client";

import { CopyButton } from "@/components/motion/copy-button";

const INSTALL = "npx shadcn@latest add @karaui/copy-button";
// Demo value only — not a real credential.
const DEMO_KEY = "kara_demo_7f3c9e21a84b4d0c9b6e5f12";

function mask(key: string) {
  return `${key.slice(0, 10)}${"•".repeat(12)}${key.slice(-4)}`;
}

export function CopyButtonPreview() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card py-1.5 pr-1.5 pl-4">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
          <span className="text-muted-foreground select-none">$ </span>
          {INSTALL}
        </code>
        <CopyButton value={INSTALL} variant="ghost" labels={{ idle: "Copy install command" }} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">API key</span>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card py-1.5 pr-1.5 pl-3">
          <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
            {mask(DEMO_KEY)}
          </span>
          <CopyButton value={() => DEMO_KEY} showLabel timeout={2000} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <CopyButton value="Hello from karaUI" showLabel variant="primary" />
        <CopyButton value="Hello from karaUI" showLabel variant="outline" size="md" />
      </div>
    </div>
  );
}
