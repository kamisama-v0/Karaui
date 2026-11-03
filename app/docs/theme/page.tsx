import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CodeBlock } from "@/components/app/docs/code-block";
import { StyleGallery } from "@/components/app/docs/style-gallery";
import { THEME_CSS } from "@/lib/theme-css";

export const metadata: Metadata = {
  title: "Theme and design styles",
  description:
    "Give karaUI components their colors: run shadcn init or paste theme.css, then pick one of 10 design styles (neobrutalism, swiss, retro…) in light and dark.",
  alternates: { canonical: "/docs/theme" },
  openGraph: {
    title: "Theme and design styles · karaUI",
    description:
      "Wire up the color tokens karaUI reads, then switch between 10 design styles that change palette, radii, shadows and fonts.",
    url: "/docs/theme",
    type: "article",
    siteName: "karaUI",
    images: ["/api/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Theme and design styles · karaUI",
    images: ["/api/og"],
  },
};

const SHADCN_INIT = `npx shadcn@latest init`;

export default function ThemePage() {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Setup
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Theme setup
      </h1>
      <p className="mt-3 text-muted-foreground">
        Nothing in karaUI hard-codes a color. Every component reads the same
        semantic variables shadcn/ui uses
        (<code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">bg-primary</code>,
        {" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">text-muted-foreground</code>,
        {" "}border, ring), so once your app defines them, any component you add
        picks them up. Pick whichever route fits your project:
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Route A — let shadcn write the tokens (recommended)
      </h2>
      <p className="mt-2 text-muted-foreground">
        Already on shadcn/ui? Skip this step, the variables are in place. For a
        fresh project, the init command below adds them to your stylesheet.
      </p>
      <div className="mt-4">
        <CodeBlock code={SHADCN_INIT} lang="bash" filename="terminal" />
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-foreground">
        Route B — copy karaUI&apos;s theme.css
      </h2>
      <p className="mt-2 text-muted-foreground">
        Prefer to skip shadcn entirely? Drop the block below into{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">globals.css</code>{" "}
        right after the{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">@import "tailwindcss";</code>.
        line. Besides the color variables it carries the keyframes and surface
        helper classes some components rely on. Tailwind CSS v4 is required.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        The same file is served at{" "}
        <Link
          href="/theme.css"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-foreground underline underline-offset-4"
        >
          /theme.css
          <ArrowUpRight className="h-3 w-3" />
        </Link>
        .
      </p>
      <div className="mt-4">
        <CodeBlock code={THEME_CSS} lang="css" filename="globals.css" />
      </div>

      <h2
        id="design-styles"
        className="mt-14 text-xl font-semibold tracking-tight text-foreground"
      >
        Design styles
      </h2>
      <p className="mt-2 text-muted-foreground">
        karaUI ships 10 design styles, the default included. A style swaps
        the palette, corner radius, shadows and fonts together, and each one
        has its own light and dark set. Every card below is drawn in the style
        it names. Try one on this site with{" "}
        <span className="text-foreground">Use this style</span> (or the
        palette button in the header and dock), or grab its CSS with Copy CSS and
        paste it into your{" "}
        <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">globals.css</code>{" "}
        after the theme variables.
      </p>
      <div className="mt-6">
        <StyleGallery />
      </div>
    </div>
  );
}
