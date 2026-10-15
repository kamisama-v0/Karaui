"use client";

import { useState } from "react";
import {
  formatContextWindow,
  type ModelOption,
  type ModelProvider,
  ModelSelector,
} from "@/components/agents/model-selector";

const PROVIDERS: ModelProvider[] = [
  { id: "northwind", name: "Northwind", shape: "spark" },
  { id: "helix", name: "Helix Labs", shape: "hexagon" },
  { id: "orbit", name: "Orbit", shape: "circle" },
  { id: "local", name: "On-device", shape: "square" },
];

const MODELS: ModelOption[] = [
  {
    value: "nw-apex",
    name: "Apex 3",
    provider: "northwind",
    description: "Deep reasoning for hard, multi-step work",
    capabilities: ["vision", "tools", "reasoning"],
    contextWindow: 200_000,
    cost: 4,
    isNew: true,
  },
  {
    value: "nw-swift",
    name: "Swift 3",
    provider: "northwind",
    description: "Balanced everyday model",
    capabilities: ["vision", "tools", "fast"],
    contextWindow: 200_000,
    cost: 2,
  },
  {
    value: "hx-coder",
    name: "Helix Coder",
    provider: "helix",
    description: "Tuned for code edits and agents",
    capabilities: ["tools", "reasoning"],
    contextWindow: 1_000_000,
    cost: 3,
  },
  {
    value: "hx-mini",
    name: "Helix Mini",
    provider: "helix",
    description: "Low-latency drafts and summaries",
    capabilities: ["fast"],
    contextWindow: 128_000,
    cost: 1,
  },
  {
    value: "orbit-vision",
    name: "Orbit Vision",
    provider: "orbit",
    description: "Screens, charts and documents",
    capabilities: ["vision", "fast"],
    contextWindow: 256_000,
    cost: 2,
    isNew: true,
  },
  {
    value: "local-lite",
    name: "Lite 8B",
    provider: "local",
    description: "Runs offline — download required",
    capabilities: ["fast"],
    contextWindow: 32_000,
    cost: 1,
    disabled: true,
  },
];

export function ModelSelectorPreview() {
  const [model, setModel] = useState("nw-swift");
  const selected = MODELS.find((item) => item.value === model);

  return (
    <div className="flex h-[420px] w-full max-w-md flex-col items-center justify-start pt-12">
      <div className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Model</p>
            <p className="text-xs text-muted-foreground">
              Used for new messages in this chat.
            </p>
          </div>
          <ModelSelector
            models={MODELS}
            providers={PROVIDERS}
            value={model}
            onValueChange={setModel}
            align="end"
          />
        </div>
        {selected ? (
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Context</dt>
              <dd className="mt-0.5 font-mono text-foreground tabular-nums">
                {formatContextWindow(selected.contextWindow ?? 0)} tokens
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cost tier</dt>
              <dd className="mt-0.5 font-mono text-foreground tabular-nums">
                {"$".repeat(selected.cost ?? 1)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="mt-0.5 truncate text-foreground">
                {PROVIDERS.find((p) => p.id === selected.provider)?.name}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}
