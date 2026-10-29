import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/app/analytics/json-ld";
import { CodeBlock } from "@/components/app/docs/code-block";
import { breadcrumbJsonLd, docsArticleJsonLd } from "@/lib/seo";

const PAGE_TITLE = "Mobile & responsive";
const PAGE_DESCRIPTION =
  "How karaUI components adapt to phones and narrow containers: container queries, 44px touch targets, stacked tables, adaptive navigation and overlays, and touch gestures.";
const PAGE_PATH = "/docs/mobile";
const PAGE_IMAGE = "/api/og?page=mobile";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: `${PAGE_TITLE} · karaUI`,
    description: PAGE_DESCRIPTION,
    url: PAGE_PATH,
    type: "article",
    siteName: "karaUI",
    images: [
      {
        url: PAGE_IMAGE,
        width: 1200,
        height: 630,
        alt: "karaUI on mobile and in narrow containers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} · karaUI`,
    description: PAGE_DESCRIPTION,
    images: [
      { url: PAGE_IMAGE, alt: "karaUI on mobile and in narrow containers" },
    ],
  },
};

const CONTAINER_SNIPPET = `// Viewport breakpoints work as usual (sm: md: lg: …).
// Container queries respond to the nearest @container instead:
<aside className="@container w-80">
  <div className="grid gap-3 @lg:grid-cols-2">
    {/* one column in this 320px aside, two once it is ≥ 32rem wide */}
  </div>
</aside>`;

const TOUCH_SNIPPET = `import type { ComponentProps } from "react";
import { TOUCH_TARGET_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

// A 32px icon button that still gets a 44×44px hit area on touch screens.
export function IconButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        // relative: the invisible ::after box is positioned against it.
        "relative inline-grid size-8 place-items-center rounded-md",
        TOUCH_TARGET_CLASS,
        className,
      )}
      {...props}
    />
  );
}`;

const TABLE_SNIPPET = `import { Table, type TableColumn } from "@/components/motion/table";

type Invoice = {
  id: string;
  customer: string;
  email: string;
  status: string;
  amount: number;
};

const columns: TableColumn<Invoice>[] = [
  // Card title. Without any \`primary\` flag the first column is used.
  { key: "customer", header: "Customer", primary: true, sortable: true },
  { key: "status", header: "Status" },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    sortable: true,
    cell: (row) =>
      row.amount.toLocaleString("en-US", { style: "currency", currency: "USD" }),
  },
  // Shown in the table, left out of the cards.
  { key: "email", header: "Email", hideOnMobile: true },
];

export function Invoices({ data }: { data: Invoice[] }) {
  return (
    <Table
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      mobileLayout="stack"
      stackBelow={600} // px of the table's own width (default 560)
    />
  );
}`;

const DATA_TABLE_SNIPPET = `import {
  DataTable,
  type DataTableColumn,
} from "@/components/motion/table/data-table";

// Same column flags, plus DataTable's filter options.
const columns: DataTableColumn<Invoice>[] = [
  { key: "customer", header: "Customer", primary: true, sortable: true },
  { key: "status", header: "Status", filter: "select" },
  { key: "email", header: "Email", hideOnMobile: true },
];

<DataTable data={data} columns={columns} selectable mobileLayout="stack" />`;

const DIALOG_SNIPPET = `// Below sm, DialogContent is a bottom sheet by default.
// Opt out to keep the centered panel on phones:
<DialogContent sheetOnMobile={false}>…</DialogContent>`;

type ComponentRef = { name: string; href: string; note?: string };

const TOUCH_TARGETS: ComponentRef[] = [
  { name: "Button", href: "/components/motion/button", note: "every size, including StatefulButton" },
  { name: "Checkbox", href: "/components/motion/checkbox" },
  { name: "Radio Group", href: "/components/motion/radio" },
  { name: "Switch", href: "/components/motion/switch" },
  { name: "Toggle / ToggleGroup", href: "/components/motion/toggle-group" },
  { name: "Select", href: "/components/motion/select", note: "trigger" },
  { name: "Tabs", href: "/components/motion/tabs", note: "pill and segment triggers" },
  { name: "Pagination", href: "/components/motion/pagination", note: "dots grow vertically only" },
  { name: "Number Stepper", href: "/components/motion/number-stepper", note: "± buttons" },
  { name: "Copy Button", href: "/components/motion/copy-button" },
];

const ADAPTIVE: { name: string; href: string; body: ReactNode }[] = [
  {
    name: "Navigation Menu",
    href: "/components/blocks/navigation-menu",
    body: (
      <>
        Below the viewport <Code>md</Code> breakpoint the top items collapse
        into a hamburger that opens a sheet with accordion sections.
      </>
    ),
  },
  {
    name: "Animated Sidebar",
    href: "/components/motion/animated-sidebar",
    body: (
      <>
        Below <Code>md</Code> (viewport) the provider switches to a
        focus-managed mobile sheet; the same toggle opens it.
      </>
    ),
  },
  {
    name: "Dashboard Shell",
    href: "/components/blocks/dashboard-shell",
    body: (
      <>
        Container-aware: when the shell itself is narrower than{" "}
        <Code>mobileBelow</Code> (default <Code>768</Code>) a hamburger opens
        the nav in a left Drawer, which closes again if the shell widens. Done
        with a scoped CSS container query, so it is server-rendered with no
        hydration swap.
      </>
    ),
  },
  {
    name: "Dialog",
    href: "/components/motion/dialog",
    body: (
      <>
        Becomes a bottom-anchored sheet below the viewport <Code>sm</Code>{" "}
        breakpoint. <Code>sheetOnMobile</Code> defaults to <Code>true</Code>.
      </>
    ),
  },
  {
    name: "Bottom Sheet",
    href: "/components/motion/bottom-sheet",
    body: (
      <>
        A draggable sheet with <Code>snapPoints</Code> (default{" "}
        <Code>[0.5, 0.92]</Code>) and fling-to-dismiss, for phone-first
        overlays.
      </>
    ),
  },
  {
    name: "Drawer",
    href: "/components/motion/drawer",
    body: (
      <>
        A <Code>side</Code> <Code>&quot;left&quot;</Code> or{" "}
        <Code>&quot;right&quot;</Code> panel for off-canvas navigation and
        filters.
      </>
    ),
  },
  {
    name: "Footer Section",
    href: "/components/blocks/footer-section",
    body: (
      <>
        Link columns become disclosures below the container&apos;s{" "}
        <Code>@md</Code> width.
      </>
    ),
  },
  {
    name: "Comparison Table",
    href: "/components/blocks/comparison-table",
    body: (
      <>
        Wide (<Code>@xl</Code>) it is a full plan × feature grid; narrower it
        shows a plan switcher and one value column that cross-fades.
      </>
    ),
  },
  {
    name: "Contact Form",
    href: "/components/blocks/contact-form",
    body: (
      <>
        Name and email sit side by side from <Code>@lg</Code>; the contact
        methods move from a grid under the form to a side column at{" "}
        <Code>@3xl</Code>.
      </>
    ),
  },
  {
    name: "Checkout",
    href: "/components/blocks/checkout",
    body: (
      <>
        The order summary stacks under the steps and moves beside them at{" "}
        <Code>@xl</Code>.
      </>
    ),
  },
];

const GESTURES: { name: string; href: string; body: string }[] = [
  {
    name: "Carousel",
    href: "/components/motion/carousel",
    body: "Pan drag with momentum, snap and rubber-band edges.",
  },
  {
    name: "Swipeable List",
    href: "/components/blocks/swipeable-list",
    body: "Swipe rows left or right to reveal actions.",
  },
  {
    name: "Pull to Refresh",
    href: "/components/motion/pull-to-refresh",
    body: "Pull with resistance and a threshold, then an async refresh.",
  },
  {
    name: "Bottom Sheet",
    href: "/components/motion/bottom-sheet",
    body: "Drag between snap points with inertia; fling down to dismiss.",
  },
  {
    name: "Kanban Board",
    href: "/components/blocks/kanban-board",
    body: "Touch drag starts after a ~220ms still press, so swipes still scroll the columns.",
  },
  {
    name: "Wheel Picker",
    href: "/components/motion/wheel-picker",
    body: "iOS-style drum with momentum coast and spring-back settle.",
  },
];

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  );
}

function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
    >
      {children}
    </Link>
  );
}

export default function MobilePage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: PAGE_TITLE, path: PAGE_PATH },
          ]),
          docsArticleJsonLd({
            path: PAGE_PATH,
            headline: PAGE_TITLE,
            description: PAGE_DESCRIPTION,
            image: PAGE_IMAGE,
            datePublished: "2026-10-20",
            dateModified: "2026-10-20",
            about: [
              "Responsive React components",
              "Container queries",
              "Touch targets",
              "karaUI",
            ],
          }),
        ]}
      />
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Guide
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Mobile &amp; responsive
        </h1>
        <p className="mt-3 text-muted-foreground">
          karaUI components are built to work on phones without extra wiring:
          layouts follow the space they are given, small controls stay easy to
          tap, and wide surfaces like tables and dashboards switch to a layout
          that fits. This page covers what happens automatically and the few
          props that control it.
        </p>

        <h2
          id="responsiveness"
          className="mt-10 text-xl font-semibold tracking-tight text-foreground"
        >
          How components respond
        </h2>
        <p className="mt-2 text-muted-foreground">
          Tailwind CSS 4&apos;s viewport breakpoints (<Code>sm:</Code>,{" "}
          <Code>md:</Code>, <Code>lg:</Code>…) are available as-is in your own
          markup. Most blocks, though, use{" "}
          <strong className="font-medium text-foreground">
            container queries
          </strong>
          : they mark their root with <Code>@container</Code> and lay out with{" "}
          <Code>@md:</Code>, <Code>@xl:</Code> and friends. They adapt to the
          width of their own box, not the window — so a pricing table in a
          sidebar, a split view or a docs frame gets its narrow layout even on a
          wide monitor.
        </p>
        <div className="mt-4">
          <CodeBlock code={CONTAINER_SNIPPET} lang="tsx" filename="sidebar.tsx" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          A few components measure themselves in JavaScript instead, for the
          same reason: <DocLink href="/components/motion/carousel">Carousel</DocLink>{" "}
          takes <Code>slidesPerView</Code> as a map keyed by its own width (
          <Code>{"{ 0: 1, 480: 2, 768: 3 }"}</Code>), and the tables below
          stack by their own width. Overlays that cover the screen (Dialog,
          Navigation Menu, Animated Sidebar) follow the viewport.
        </p>

        <h2
          id="touch-targets"
          className="mt-10 text-xl font-semibold tracking-tight text-foreground"
        >
          Touch targets
        </h2>
        <p className="mt-2 text-muted-foreground">
          On coarse pointers (phones, tablets) small controls get an invisible
          hit area of at least 44×44px (WCAG 2.5.5, Apple HIG). It is an{" "}
          <Code>::after</Code> box centered on the control, so the control looks
          and lays out the same, and mouse and trackpad rendering is unchanged.
          These components have it built in:
        </p>
        <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
          {TOUCH_TARGETS.map((item) => (
            <li key={item.href + item.name}>
              <DocLink href={item.href}>{item.name}</DocLink>
              {item.note ? <> — {item.note}</> : null}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-muted-foreground">
          Apply the same behavior to your own controls with{" "}
          <Code>TOUCH_TARGET_CLASS</Code> from <Code>lib/touch.ts</Code> (it
          ships with any component that uses it, such as Button). Use{" "}
          <Code>TOUCH_TARGET_Y_CLASS</Code> for controls packed closer than
          about 32px apart in a row: it grows the hit area vertically only, so
          neighbours don&apos;t take over each other&apos;s taps.
        </p>
        <div className="mt-4">
          <CodeBlock code={TOUCH_SNIPPET} lang="tsx" filename="icon-button.tsx" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          The element it goes on must be <Code>relative</Code> (the containing
          block), must not be <Code>overflow-hidden</Code> (the overhang would
          be clipped), must render children (<Code>&lt;input&gt;</Code> and
          other void elements have no <Code>::after</Code> — put it on the
          wrapper or label), and must not already use <Code>::after</Code> for
          something visible. Inside a scroller, a control flush against the
          edge can add a few pixels of scroll on touch screens; pad that side.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          <DocLink href="/components/motion/input">Input</DocLink> and{" "}
          <DocLink href="/components/motion/textarea">Textarea</DocLink> use
          16px text, so iOS Safari doesn&apos;t zoom the page when they get
          focus.
        </p>

        <h2
          id="tables"
          className="mt-10 text-xl font-semibold tracking-tight text-foreground"
        >
          Tables on phones
        </h2>
        <p className="mt-2 text-muted-foreground">
          <DocLink href="/components/motion/table">Table</DocLink> and{" "}
          <DocLink href="/components/motion/table">DataTable</DocLink> scroll
          sideways by default (<Code>mobileLayout=&quot;scroll&quot;</Code>).
          With <Code>mobileLayout=&quot;stack&quot;</Code>, whenever the
          table&apos;s own width is below <Code>stackBelow</Code> (default{" "}
          <Code>560</Code>px) each row becomes a card: <Code>primary</Code>{" "}
          columns (the first column if none is flagged) form the title, and the
          rest render as header/value pairs. <Code>hideOnMobile</Code> leaves a
          column out of the cards.
        </p>
        <div className="mt-4">
          <CodeBlock code={TABLE_SNIPPET} lang="tsx" filename="invoices.tsx" />
        </div>
        <p className="mt-4 text-muted-foreground">
          The stacked list keeps the table&apos;s features: a select-all
          checkbox and a native sort select sit above the cards.{" "}
          <Code>Table</Code> stays virtualized, with editable cells and a
          per-card row menu; <Code>DataTable</Code> adds filter chips that open
          the column menu and keeps row expansion and Shift-range selection.
        </p>
        <div className="mt-4">
          <CodeBlock code={DATA_TABLE_SNIPPET} lang="tsx" filename="orders.tsx" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          The server always renders the table; the switch to cards happens
          after hydration, before the first paint, and then follows the
          table&apos;s width as it resizes.
        </p>

        <h2
          id="navigation-overlays"
          className="mt-10 text-xl font-semibold tracking-tight text-foreground"
        >
          Navigation and overlays
        </h2>
        <p className="mt-2 text-muted-foreground">
          These change shape on small screens or in narrow containers. Breakpoints
          written as <Code>sm</Code>/<Code>md</Code> are viewport-based; ones
          written as <Code>@md</Code>/<Code>@xl</Code> are container queries.
        </p>
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {ADAPTIVE.map((item) => (
            <li key={item.name} className="p-4">
              <DocLink href={item.href}>{item.name}</DocLink>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <CodeBlock code={DIALOG_SNIPPET} lang="tsx" filename="dialog.tsx" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Other blocks follow the same container-query pattern — Pricing
          Table, Bento Grid, Settings Page and Inbox App among them — so check a
          component&apos;s preview at a narrow width to see its small layout.
        </p>

        <h2
          id="gestures"
          className="mt-10 text-xl font-semibold tracking-tight text-foreground"
        >
          Gestures
        </h2>
        <p className="mt-2 text-muted-foreground">
          These components handle touch gestures directly (mouse drag works
          too), and opt out of iOS&apos;s long-press callout and selection where
          the surface owns the gesture:
        </p>
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {GESTURES.map((item) => (
            <li key={item.name} className="p-4">
              <DocLink href={item.href}>{item.name}</DocLink>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
