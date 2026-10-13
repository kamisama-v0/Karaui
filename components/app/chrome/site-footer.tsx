import Link from "next/link";
import { GithubIcon } from "@/components/app/icons";
import { registry } from "@/lib/registry";

// The catalog keeps growing — the footer shows only the newest few per column.
const FOOTER_LIMIT = 8;

const allMotion = registry.find((c) => c.slug === "motion")?.components ?? [];
const allBlocks = registry.find((c) => c.slug === "blocks")?.components ?? [];
const motionComponents = allMotion.slice(-FOOTER_LIMIT).reverse();
const blockComponents = allBlocks.slice(-FOOTER_LIMIT).reverse();

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 pt-14 pb-10">
      <div className="mx-auto max-w-7xl">
        {/* Main grid */}
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <p className="font-display text-lg font-medium text-foreground">karaUI</p>
            <p className="mt-2 max-w-[220px] text-sm leading-6 text-muted-foreground">
              Animated components for React and Next.js. Copy-paste via the
              shadcn registry.
            </p>
            <p className="mt-5 text-xs text-muted-foreground">
              Created by{" "}
              <Link
                href="https://kamisama-v0.my.id"
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                kara
              </Link>
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Link
                href="https://github.com/kamisama-v0/Karaui"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="GitHub"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <GithubIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Components */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Components
            </p>
            <ul className="space-y-2.5">
              {motionComponents.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/components/motion/${c.slug}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/components/motion"
                  className="text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
                >
                  View all ({allMotion.length})
                </Link>
              </li>
            </ul>
          </div>

          {/* Blocks */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Blocks
            </p>
            <ul className="space-y-2.5">
              {blockComponents.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/components/blocks/${c.slug}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/components/blocks"
                  className="text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
                >
                  View all ({allBlocks.length})
                </Link>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Links
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="https://github.com/starc007/beui"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  beUI (Base Project)
                </Link>
              </li>
              <li>
                <Link
                  href="https://usemarkd.app"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Markd
                </Link>
              </li>
              <li>
                <Link
                  href="/components/motion"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Browse all
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/kamisama-v0/Karaui"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  href="/tribute"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tribute to beUI
                </Link>
              </li>
              <li>
                <Link
                  href="https://kamisama-v0.my.id"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Website
                </Link>
              </li>
              <li>
                <Link
                  href="/llms.txt"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  llms.txt
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            © 2026 karaUI. Built upon{" "}
            <Link
              href="https://github.com/starc007/beui"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-4 hover:text-foreground"
            >
              beUI
            </Link>{" "}
            by Saurabh Chauhan as the base project. MIT License.
          </p>
        </div>
      </div>
    </footer>
  );
}
