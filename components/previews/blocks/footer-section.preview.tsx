"use client";

import {
  type FooterLinkColumn,
  FooterSection,
  type FooterSocialLink,
} from "@/components/motion/footer-section";
import { ThemeToggle } from "@/components/motion/theme-toggle";

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const SOCIALS: FooterSocialLink[] = [
  {
    label: "GitHub",
    href: "https://github.com/",
    icon: (
      <Glyph d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    ),
  },
  {
    label: "X",
    href: "https://x.com/",
    icon: <Glyph d="M4 4l16 16M20 4L4 20" />,
  },
  {
    label: "RSS feed",
    href: "#rss",
    icon: <Glyph d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M5 19h.01" />,
  },
];

const COLUMNS: FooterLinkColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Components", href: "#components" },
      { label: "Blocks", href: "#blocks" },
      { label: "Changelog", href: "#changelog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "#docs" },
      { label: "Registry", href: "#registry" },
      { label: "Examples", href: "#examples" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Blog", href: "#blog" },
      { label: "Contact", href: "#contact" },
    ],
  },
];

function Logo() {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground"
      >
        N
      </span>
      Northstar
    </span>
  );
}

/** Demo only: resolves after a short delay, rejects for addresses at "fail.dev". */
function subscribe(email: string) {
  return new Promise<void>((resolve, reject) => {
    window.setTimeout(() => {
      if (email.endsWith("@fail.dev")) reject(new Error("Rejected"));
      else resolve();
    }, 1100);
  });
}

export function FooterSectionPreview() {
  return (
    <div className="w-full max-w-[40rem] px-2">
      <FooterSection
        logo={<Logo />}
        tagline="Motion-first UI for teams who care about the details."
        socials={SOCIALS}
        columns={COLUMNS}
        newsletter={{
          title: "Get the monthly digest",
          description: "New components and notes, once a month.",
        }}
        onSubscribe={subscribe}
        copyright="Northstar Labs"
        year={2026}
        legalLinks={[
          { label: "Privacy", href: "#privacy" },
          { label: "Terms", href: "#terms" },
        ]}
        themeToggle={
          <ThemeToggle className="size-8 rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground" iconClassName="size-3.5" />
        }
      />
    </div>
  );
}
