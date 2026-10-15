"use client";

import { PanelRight, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ArtifactPanel, type ArtifactVersion } from "@/components/agents/artifact-panel";

function PricingCard({ accent, cta }: { accent: boolean; cta: string }) {
  return (
    <div className="w-full max-w-[200px] rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">Pro</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">
        $24<span className="text-xs font-normal text-muted-foreground">/mo</span>
      </p>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        <li>Unlimited projects</li>
        <li>Priority support</li>
      </ul>
      <span
        className={
          accent
            ? "mt-4 flex h-8 items-center justify-center rounded-lg bg-primary text-xs font-medium text-primary-foreground"
            : "mt-4 flex h-8 items-center justify-center rounded-lg border border-border-strong text-xs font-medium text-foreground"
        }
      >
        {cta}
      </span>
    </div>
  );
}

const code = (accent: boolean, cta: string) => `export function PricingCard() {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs">Pro</p>
      <p className="text-2xl font-semibold">$24/mo</p>
      <ul className="mt-3 text-xs">
        <li>Unlimited projects</li>
        <li>Priority support</li>
      </ul>
      <button className="${accent ? "bg-primary" : "border"}">
        ${cta}
      </button>
    </div>
  );
}`;

const VARIANTS = [
  { label: "First draft", accent: false, cta: "Choose plan" },
  { label: "Primary call to action", accent: true, cta: "Start free trial" },
  { label: "Shorter button copy", accent: true, cta: "Upgrade" },
];

const makeVersion = (i: number): ArtifactVersion => {
  const v = VARIANTS[i % VARIANTS.length] ?? VARIANTS[0];
  return {
    id: `v${i + 1}`,
    label: v?.label,
    language: "tsx",
    code: code(v?.accent ?? false, v?.cta ?? ""),
    preview: <PricingCard accent={v?.accent ?? false} cta={v?.cta ?? ""} />,
  };
};

export function ArtifactPanelPreview() {
  const [open, setOpen] = useState(true);
  const [versions, setVersions] = useState(() => [makeVersion(0), makeVersion(1)]);
  const [version, setVersion] = useState("v2");
  const [generating, setGenerating] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const regenerate = () => {
    setOpen(true);
    setGenerating(true);
    timer.current = window.setTimeout(() => {
      const next = makeVersion(versions.length);
      setVersions((list) => [...list, next]);
      setVersion(next.id);
      setGenerating(false);
    }, 1600);
  };

  return (
    <div className="flex h-[420px] w-full max-w-[640px] items-stretch">
      <ArtifactPanel
        title="PricingCard.tsx"
        filename="pricing-card.tsx"
        versions={versions}
        version={version}
        onVersionChange={setVersion}
        open={open}
        onOpenChange={setOpen}
        generating={generating}
        width={360}
      >
        <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-3 text-sm">
          <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground">
            Build a pricing card for the Pro plan.
          </p>
          <p className="max-w-[90%] rounded-2xl rounded-bl-md bg-card px-3 py-2 text-foreground">
            Here it is. I made the call to action stand out — open the artifact to compare versions.
          </p>
          <div className="mt-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={regenerate}
              disabled={generating}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              Regenerate
            </button>
            {!open && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <PanelRight aria-hidden="true" className="size-3.5" />
                Open artifact
              </button>
            )}
          </div>
        </div>
      </ArtifactPanel>
    </div>
  );
}
