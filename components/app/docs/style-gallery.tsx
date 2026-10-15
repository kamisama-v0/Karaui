"use client";

import { Button } from "@/components/motion/button";
import { CopyButton } from "@/components/motion/copy-button";
import { useDesignStyle } from "@/components/app/chrome/use-design-style";
import { DESIGN_STYLES, type DesignStyle } from "@/lib/styles";
import { styleThemeCss } from "@/lib/theme-css";
import { cn } from "@/lib/utils";

// Fixed demo bar heights (percent) for the chart strip.
const BARS = [72, 46, 88, 58, 34];

function StyleCard({
  style,
  active,
  onUse,
}: {
  style: DesignStyle;
  active: boolean;
  onUse: () => void;
}) {
  return (
    // data-style scopes the style's tokens to this card (and picks the dark
    // variant on a dark page), so it renders in its own skin.
    <article
      data-style={style.id}
      aria-labelledby={`style-${style.id}-title`}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 text-foreground shadow-md"
      style={style.id === "retro" ? { backgroundImage: "var(--gradient-bg)" } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            id={`style-${style.id}-title`}
            className="text-xl font-semibold tracking-tight"
          >
            {style.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {style.description}
          </p>
        </div>
        {active ? (
          <span className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
            Active
          </span>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex h-12 items-end gap-1.5" aria-hidden="true">
          {BARS.map((h, i) => (
            <span
              key={h}
              className="flex-1 rounded-sm"
              style={{ height: `${h}%`, background: `var(--chart-${i + 1})` }}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
          <span className="rounded-md bg-primary px-2 py-1 text-primary-foreground">
            Primary
          </span>
          <span className="rounded-md bg-accent px-2 py-1 text-accent-foreground">
            Accent
          </span>
          <span className="rounded-md border border-border bg-muted px-2 py-1 text-muted-foreground">
            Muted
          </span>
        </div>
      </div>

      <ul className="space-y-1.5 text-sm">
        {style.traits.map((trait) => (
          <li key={trait} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-xs bg-primary"
            />
            {trait}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={onUse}
          disabled={active}
          aria-pressed={active}
          className={cn(active && "opacity-60")}
        >
          {active ? "In use" : "Use this style"}
        </Button>
        <CopyButton
          value={() => styleThemeCss(style.id)}
          showLabel
          variant="outline"
          size="sm"
          labels={{ idle: "Copy CSS", copied: "Copied", error: "Failed" }}
        />
      </div>
    </article>
  );
}

/** /docs/theme gallery: one card per design style, each rendered in that style. */
export function StyleGallery() {
  const { style, setStyle } = useDesignStyle();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {DESIGN_STYLES.map((s) => (
        <StyleCard
          key={s.id}
          style={s}
          active={s.id === style}
          onUse={() => setStyle(s.id)}
        />
      ))}
    </div>
  );
}
