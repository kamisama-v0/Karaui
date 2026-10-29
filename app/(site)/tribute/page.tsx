import { ArrowUpRight, Heart } from "lucide-react";
import type { Metadata } from "next";
import { GithubIcon } from "@/components/app/icons";
import { Testimonials } from "@/components/app/landing/testimonials";
import { PressLink } from "@/components/app/press-link";

const DESCRIPTION =
  "karaUI is built on beUI by Saurabh Chauhan. A thank-you to the original project and its author.";

export const metadata: Metadata = {
  title: "Tribute to beUI",
  description: DESCRIPTION,
  alternates: { canonical: "/tribute" },
  openGraph: {
    title: "Tribute to beUI · karaUI",
    description: DESCRIPTION,
    url: "/tribute",
    type: "website",
    siteName: "karaUI",
    images: ["/api/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tribute to beUI · karaUI",
    images: ["/api/og"],
  },
};

const BEUI_REPO = "https://github.com/starc007/beui";
const AUTHOR_GITHUB = "https://github.com/starc007";
const AUTHOR_X = "https://x.com/saurra3h";

const INHERITED = [
  {
    title: "The component catalog",
    body: "The motion primitives, AI agent surfaces and blocks karaUI ships today started life in beUI.",
  },
  {
    title: "Motion language",
    body: "Shared easing curves and springs, reduced-motion gating, and the rule that exits run faster than entrances.",
  },
  {
    title: "Copy-paste distribution",
    body: "The shadcn-compatible registry that bundles each component with the internal files it imports.",
  },
  {
    title: "The docs site",
    body: "Live previews, usage and source tabs, generated API references, llms.txt and agent guides.",
  },
];

const linkButton =
  "group inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-border-strong";

export default function TributePage() {
  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tribute
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
            Built on beUI
          </h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            karaUI exists because{" "}
            <span className="text-foreground">Saurabh Chauhan</span> built beUI
            and released it under the MIT license. Its components, motion
            conventions and registry are the foundation everything here grows
            from. This page is our thank-you.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <PressLink
              href={BEUI_REPO}
              target="_blank"
              rel="noreferrer noopener"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <GithubIcon className="h-4 w-4" />
              Star beUI on GitHub
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </PressLink>
            <PressLink
              href={AUTHOR_X}
              target="_blank"
              rel="noreferrer noopener"
              className={linkButton}
            >
              Follow @saurra3h
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </PressLink>
          </div>
        </div>

        <section className="mt-14 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="flex flex-col rounded-3xl border border-border bg-card p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted font-display text-lg font-semibold text-foreground">
              SC
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
              Saurabh Chauhan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Creator of beUI
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Designed and built beUI, the open-source motion component library
              karaUI is forked from.
            </p>
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-6 text-sm">
              <a
                href={AUTHOR_GITHUB}
                target="_blank"
                rel="noreferrer noopener"
                className="text-foreground underline-offset-4 hover:underline"
              >
                GitHub
              </a>
              <a
                href={AUTHOR_X}
                target="_blank"
                rel="noreferrer noopener"
                className="text-foreground underline-offset-4 hover:underline"
              >
                X / Twitter
              </a>
              <a
                href={BEUI_REPO}
                target="_blank"
                rel="noreferrer noopener"
                className="text-foreground underline-offset-4 hover:underline"
              >
                beUI repository
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What karaUI inherits
            </p>
            <ul className="mt-5 grid gap-5 sm:grid-cols-2">
              {INHERITED.map((item) => (
                <li key={item.title}>
                  <h3 className="text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-4 flex gap-3 rounded-3xl border border-border bg-card p-6">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-6 text-muted-foreground">
            Both projects are MIT licensed. The original copyright notice for
            beUI stays in karaUI&apos;s{" "}
            <a
              href="https://github.com/kamisama-v0/Karaui/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground underline-offset-4 hover:underline"
            >
              LICENSE
            </a>{" "}
            alongside karaUI&apos;s own. If you like what you find here, the
            original deserves your star too.
          </p>
        </section>
      </div>

      <Testimonials
        eyebrow="What builders said about beUI"
        title="Kind words for the original"
      />
    </div>
  );
}
