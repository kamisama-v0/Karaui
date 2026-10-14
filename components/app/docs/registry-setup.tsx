import { CopyButton } from "@/components/app/docs/copy-button";
import { REGISTRY_CONFIG, REGISTRY_NAMESPACE } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Collapsible one-time setup: the `components.json` entry that lets the
 * shadcn CLI resolve `@karaui/…` installs.
 */
export function RegistrySetup({ className }: { className?: string }) {
  return (
    <details
      className={cn(
        "group rounded-xl border border-border bg-card text-sm",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="inline-block transition-transform duration-200 group-open:rotate-90"
        >
          ›
        </span>
        First time? Add{" "}
        <code className="font-mono text-foreground">{REGISTRY_NAMESPACE}</code>{" "}
        to your <code className="font-mono text-foreground">components.json</code>
      </summary>
      <div className="relative border-t border-border">
        <div className="absolute top-2 right-2">
          <CopyButton
            text={REGISTRY_CONFIG}
            eventName="copy_registry_config"
          />
        </div>
        <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] text-foreground [scrollbar-width:thin]">
          {REGISTRY_CONFIG}
        </pre>
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          Merge it into the existing file once; every{" "}
          <code className="font-mono">{REGISTRY_NAMESPACE}/…</code> install
          then resolves.
        </p>
      </div>
    </details>
  );
}
