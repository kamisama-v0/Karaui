import Link from "next/link";
import { Callout, H2, H3, Table } from "@/components/app/blog/prose";
import { CodeBlock } from "@/components/app/docs/code-block";
import type { BlogPostMeta, BlogTocItem } from "@/lib/blog";

export const meta: BlogPostMeta = {
  slug: "choosing-an-animated-react-component-library",
  title: "Choosing an animated React component library in 2026",
  description:
    "An honest comparison of karaUI, Magic UI, Aceternity UI, Motion Primitives, React Bits and shadcn/ui: how each is distributed, what it animates with, theming, reduced motion, scope, license and pricing, with every claim checked against the libraries' own sites.",
  date: "2026-10-20",
  author: "kara",
  tags: ["Comparison", "React", "shadcn/ui", "Animation", "Component libraries", "Tailwind CSS"],
  readingMinutes: 9,
  category: "Comparison",
  related: [
    { category: "agents", slug: "chat-app" },
    { category: "agents", slug: "prompt-input" },
    { category: "agents", slug: "tool-approval" },
    { category: "blocks", slug: "dashboard-shell" },
    { category: "blocks", slug: "command-palette" },
  ],
};

export const toc: BlogTocItem[] = [
  { id: "how-to-read", label: "How to read this" },
  { id: "at-a-glance", label: "At a glance" },
  {
    id: "criteria",
    label: "The criteria",
    children: [
      { id: "distribution", label: "Distribution" },
      { id: "animation-dependency", label: "Animation dependency" },
      { id: "theming", label: "Light, dark and theming" },
      { id: "reduced-motion", label: "Reduced motion" },
      { id: "scope", label: "Scope" },
      { id: "license-pricing", label: "License and pricing" },
      { id: "maintenance", label: "Maintenance" },
    ],
  },
  { id: "where-karaui-fits", label: "Where karaUI fits, and where it doesn't" },
  { id: "picking", label: "Picking one" },
  { id: "sources", label: "Sources" },
];

const INSTALL_SNIPPET = `# The same CLI, different namespaces
npx shadcn@latest add @magicui/marquee
npx shadcn@latest add @aceternity/3d-card
npx shadcn@latest add @react-bits/SplitText-TS-TW
npx shadcn@latest add @karaui/button

# Motion Primitives ships its own CLI
npx motion-primitives@latest add text-effect`;

const REGISTRY_SNIPPET = `// components.json: one-time entry so @karaui resolves
{
  "registries": {
    "@karaui": "https://karaui.kamisama-v0.my.id/r/{name}.json"
  }
}`;

const NV = "Not verified";

export default function ChoosingAnimatedLibraryPost() {
  return (
    <>
      <p>
        I maintain karaUI, so read this with that in mind. I wrote it because
        &ldquo;which animated React library should I use?&rdquo; rarely has a
        single answer, and most of the comparisons I found were lists of
        screenshots. The libraries below are good at different things. Some of
        those things karaUI doesn&apos;t do at all, and I&apos;ll say so.
      </p>

      <H2 id="how-to-read">How to read this</H2>
      <p>
        Every claim about another library comes from its own website, docs,
        registry files or GitHub repository, checked on{" "}
        <strong>October 20, 2026</strong>. Links are in{" "}
        <a href="#sources">Sources</a> at the end. Where I couldn&apos;t confirm
        something from a primary source, I left it out or marked it{" "}
        <em>not verified</em>, which means only that I didn&apos;t confirm it,
        not that the library lacks it. Prices and counts change; treat them as
        a snapshot.
      </p>
      <p>
        The six: <strong>karaUI</strong>, <strong>Magic UI</strong>,{" "}
        <strong>Aceternity UI</strong>, <strong>Motion Primitives</strong>,{" "}
        <strong>React Bits</strong>, and <strong>shadcn/ui</strong> itself,
        which most of the others build on.
      </p>

      <H2 id="at-a-glance">At a glance</H2>
      <Table
        caption="Snapshot as of October 20, 2026. “Not verified” means I couldn't confirm it from the library's own pages, not that the feature is missing."
        columns={[
          "Library",
          "Distribution",
          "Animation",
          "Theming",
          "Reduced motion",
          "Scope",
          "License / pricing",
        ]}
        rows={[
          {
            header: "karaUI",
            cells: [
              <>
                shadcn CLI, <code>@karaui</code> namespace (one-time{" "}
                <code>components.json</code> entry)
              </>,
              "Motion (motion/react); Lenis for smooth scroll",
              "Light + dark token sets for each of 10 design styles",
              "Library-wide convention: movement drops, opacity stays",
              "App primitives, AI agent interfaces, app blocks",
              "MIT, free",
            ],
          },
          {
            header: "Magic UI",
            cells: [
              <>
                shadcn CLI, <code>@magicui</code> namespace
              </>,
              "Motion in many components; Cobe (WebGL) for Globe",
              NV,
              NV,
              "Animated components and effects, landing pages",
              "MIT; paid Pro with templates and premium components",
            ],
          },
          {
            header: "Aceternity UI",
            cells: [
              <>
                shadcn CLI, <code>@aceternity</code> namespace
              </>,
              "Varies: Motion in some, plain React/CSS in others",
              NV,
              NV,
              "Effects, backgrounds, 3D, landing sections and templates",
              "Free tier; paid All-Access (one-time payment)",
            ],
          },
          {
            header: "Motion Primitives",
            cells: [
              <>
                Own CLI (<code>motion-primitives</code>) or copy-paste
              </>,
              "Motion",
              NV,
              NV,
              "Motion components; Pro adds sections and templates",
              "MIT; separate Pro site",
            ],
          },
          {
            header: "React Bits",
            cells: [
              <>
                shadcn CLI (<code>@react-bits</code>), jsrepo, or copy-paste;
                JS/TS × CSS/Tailwind
              </>,
              "Per component: GSAP in some, raw WebGL in some backgrounds",
              NV,
              "Checked in every component I read",
              "Text animations, effects, backgrounds, components",
              "MIT + Commons Clause; paid Pro",
            ],
          },
          {
            header: "shadcn/ui",
            cells: [
              "Its own CLI and registry schema; the others build on it",
              "Not its focus",
              <>
                CSS variables; dark overrides tokens in <code>.dark</code>
              </>,
              NV,
              "General app components",
              "MIT, free",
            ],
          },
        ]}
      />

      <H2 id="criteria">The criteria</H2>

      <H3 id="distribution">Distribution</H3>
      <p>
        All six put source code in your repo rather than shipping a runtime
        package you import. The difference is how the code gets there. shadcn/ui
        describes itself as &ldquo;a code distribution platform&rdquo;: a schema
        and a CLI. Magic UI, Aceternity UI and React Bits publish shadcn
        registry items under their own namespaces, so one CLI serves them all.
        React Bits also supports jsrepo and lets you pick one of four flavors
        (JavaScript or TypeScript, CSS or Tailwind) per component. Motion
        Primitives has its own CLI, or you copy the file by hand.
      </p>
      <CodeBlock code={INSTALL_SNIPPET} lang="bash" filename="terminal" />
      <p>
        karaUI uses the same shadcn item format, with one wrinkle: the{" "}
        <code>@karaui</code> namespace isn&apos;t in shadcn&apos;s public
        registry directory yet, so you add it to <code>components.json</code>{" "}
        once. Its registry follows each file&apos;s imports and bundles what it
        finds, so a component that uses a shared hook or the easing tokens
        brings them along.
      </p>
      <CodeBlock code={REGISTRY_SNIPPET} lang="json" filename="components.json" />

      <H3 id="animation-dependency">Animation dependency</H3>
      <p>
        This matters more than it looks: it decides your bundle, your mental
        model, and whether two libraries can share a page without pulling in
        two animation engines. Motion Primitives is built on Motion and says so
        up front. Magic UI&apos;s registry items list <code>motion</code> as a
        dependency in components such as Blur Fade and Dock, and its Globe is
        built on Cobe, which renders with WebGL. Aceternity varies by
        component: Floating Dock depends on <code>motion</code>, while 3D Card
        and Aurora Background ship as plain React and CSS. React Bits is the
        most mixed: Split Text uses GSAP, and backgrounds such as Galaxy draw
        with WebGL2 directly, no library at all.
      </p>
      <p>
        karaUI uses Motion everywhere, with shared easing and spring tokens so
        components feel related, and Lenis for its smooth-scroll provider. It
        has no WebGL code. If your app already uses Motion, karaUI, Magic UI
        and Motion Primitives slot in without a second engine.
      </p>

      <H3 id="theming">Light, dark and theming</H3>
      <p>
        shadcn/ui set the pattern most of this ecosystem follows: semantic CSS
        variables like <code>background</code> and <code>foreground</code>,
        with dark mode done by overriding the same tokens inside{" "}
        <code>.dark</code>. Components don&apos;t change; only values do. I
        couldn&apos;t confirm a documented, library-wide theming policy for the
        other four from their own pages, so the table marks those cells as not
        verified. Check the components you plan to use in both modes.
      </p>
      <p>
        karaUI goes one step further. It has{" "}
        <Link href="/docs/theme">10 design styles</Link> (default, minimalism,
        neobrutalism, constructivism, swiss, editorial, hand-drawn, retro, flat
        and bento), independent of light and dark. Each style writes a full
        light and a full dark token set, plus its own radii, shadows and fonts,
        and a <code>data-style</code> attribute can scope a style to one
        section of a page.
      </p>

      <H3 id="reduced-motion">Reduced motion</H3>
      <p>
        An animated library should respect{" "}
        <code>prefers-reduced-motion</code>, and a global CSS rule isn&apos;t
        enough, because it can&apos;t stop JavaScript-driven springs. Each
        React Bits component I read (Split Text, Iridescence, Galaxy, Dock)
        checks the media query in its source. That was four files, not an
        audit of the library. For the others I didn&apos;t find a stated
        library-wide policy, which isn&apos;t the same as not having one: read
        the source of what you install.
      </p>
      <p>
        In karaUI it&apos;s a rule every component follows: transform-based
        motion is gated behind Motion&apos;s <code>useReducedMotion()</code>,
        movement is dropped, and opacity and color transitions stay, so state
        changes are still visible. Decorative hover effects are also gated to
        devices that can actually hover, so touch screens don&apos;t get stuck
        hover states.
      </p>

      <H3 id="scope">Scope</H3>
      <p>
        This is where the libraries differ most, and where karaUI is
        clearly not the strongest pick for every job.{" "}
        <strong>
          Magic UI, Aceternity UI and React Bits have far more visual effects
          and backgrounds than karaUI.
        </strong>{" "}
        React Bits&apos; README lists 215+ free components and backgrounds as
        of October 2026, with backgrounds as its largest category. Aceternity
        groups its catalog into backgrounds and effects, 3D, scroll and
        parallax, text and more, and its pricing page lists 100+ free
        components as of October 2026. Magic UI describes itself as
        &ldquo;animated components and effects&rdquo; and sells templates. If
        you&apos;re building a launch page and want a shader background or a
        3D globe, start there.
      </p>
      <p>
        Motion Primitives is a focused set of motion building blocks; its
        README notes the project is in beta. shadcn/ui is the base layer: the
        accessible, general-purpose app components most of these libraries are
        designed to sit next to.
      </p>
      <p>
        karaUI aims at product interfaces: inputs, tables, dialogs and date
        pickers with motion built in; an{" "}
        <Link href="/docs/ai-agents">AI agent category</Link> with a chat
        workspace, prompt input, tool approval, streaming response, citations,
        model selector and context meter; and app blocks like a dashboard
        shell, inbox, file manager, checkout and command palette.
      </p>

      <H3 id="license-pricing">License and pricing</H3>
      <p>
        shadcn/ui, Magic UI and Motion Primitives are MIT on GitHub. React Bits
        is &ldquo;MIT + Commons Clause&rdquo;, which its README describes as
        free for personal and commercial use; the Commons Clause part restricts
        selling the software itself, so read it if you plan to redistribute.
      </p>
      <p>Four have paid tiers alongside the free one:</p>
      <ul>
        <li>
          <strong>Magic UI Pro</strong>: templates and premium components for a
          one-time payment with lifetime access ($199 on its docs page as of
          October 2026).
        </li>
        <li>
          <strong>Aceternity UI All-Access</strong>: one-time payments, not a
          subscription, as a 1-year license, a lifetime license or a team plan.
          Its licence page is written around purchased items, so read it before
          shipping free components in client work.
        </li>
        <li>
          <strong>Motion Primitives Pro</strong>: premium sections and
          templates on a separate site. I couldn&apos;t find its pricing model
          on the pages I read.
        </li>
        <li>
          <strong>React Bits Pro</strong>: components, marketing and app
          blocks, Next.js templates and an agent kit for AI coding tools.
        </li>
      </ul>
      <p>
        karaUI is MIT and has no paid tier. It began as a fork of beUI, and the
        license keeps that attribution.
      </p>

      <H3 id="maintenance">Maintenance</H3>
      <p>
        On October 20, 2026, the public repos for shadcn/ui and React Bits had
        commits within the previous two days, Magic UI within the previous
        week, and Motion Primitives in late September. None were archived. I
        didn&apos;t find a public source repository for Aceternity UI to check
        the same way. karaUI is younger and smaller than all of them, and that
        is a fair thing to weigh.
      </p>

      <H2 id="where-karaui-fits">Where karaUI fits, and where it doesn&apos;t</H2>
      <p>Pick something else when:</p>
      <ul>
        <li>
          You want WebGL or shader backgrounds, particle fields or 3D scenes.
          karaUI has none.
        </li>
        <li>
          You need a large catalog of hero effects and landing sections today.
          Magic UI, Aceternity UI and React Bits are much broader there.
        </li>
        <li>
          You want only a handful of motion primitives on top of your own
          design system; Motion Primitives or plain shadcn/ui may be all you
          need.
        </li>
      </ul>
      <p>karaUI is a reasonable fit when:</p>
      <ul>
        <li>
          You&apos;re building an AI product and want agent interface
          components (messages, tool approval, reasoning, citations) that
          share one motion and token system with the rest of the app.
        </li>
        <li>
          You need app screens rather than landing pages: tables, forms,
          calendars and composed blocks.
        </li>
        <li>
          You care about light/dark parity across several visual styles, and
          about reduced-motion behavior being consistent rather than per
          component.
        </li>
        <li>
          Your app is used on phones. Small controls get 44px touch targets
          without changing their drawn size, Dialog can become a bottom sheet
          on small screens, Table and Data Table can stack rows into cards,
          and Dashboard Shell swaps its sidebar for a drawer. The{" "}
          <Link href="/docs/mobile">Mobile &amp; responsive</Link> page lists
          the rest.
        </li>
      </ul>
      <Callout tone="tip" title="You can mix them">
        <p>
          Because these are all source in your repo, nothing stops you from
          using a React Bits background on the landing page and karaUI for the
          app behind it. Watch for two things: duplicate animation engines in
          one bundle, and components that read different theme tokens, so
          dark mode doesn&apos;t switch half the page.
        </p>
      </Callout>

      <H2 id="picking">Picking one</H2>
      <p>
        Start from the screen you&apos;re building, not the demo you liked.
        For a marketing page full of effects, the effect-heavy libraries have
        more to offer than karaUI does. For an app, or an AI interface, look at
        how components behave in dark mode, under reduced motion and on a
        phone, because those are the parts a demo doesn&apos;t show. Whatever
        you choose, install one component, read its source, and check the
        license before you ship.
      </p>

      <H2 id="sources">Sources</H2>
      <p>All checked on October 20, 2026.</p>
      <ul>
        <li>
          shadcn/ui:{" "}
          <a href="https://ui.shadcn.com/docs">introduction</a>,{" "}
          <a href="https://ui.shadcn.com/docs/theming">theming</a>,{" "}
          <a href="https://github.com/shadcn-ui/ui">GitHub repository</a>
        </li>
        <li>
          Magic UI:{" "}
          <a href="https://magicui.design/docs/installation">installation</a>,{" "}
          <a href="https://magicui.design/docs/components/globe">Globe</a>,{" "}
          <a href="https://magicui.design/r/blur-fade.json">Blur Fade registry item</a>,{" "}
          <a href="https://github.com/magicuidesign/magicui">GitHub repository</a>
        </li>
        <li>
          Aceternity UI:{" "}
          <a href="https://ui.aceternity.com/components">components</a>,{" "}
          <a href="https://ui.aceternity.com/components/3d-card-effect">3D Card</a>,{" "}
          <a href="https://ui.aceternity.com/registry/floating-dock.json">
            Floating Dock registry item
          </a>
          , <a href="https://ui.aceternity.com/pricing">pricing</a>,{" "}
          <a href="https://ui.aceternity.com/licence">licence</a>
        </li>
        <li>
          Motion Primitives:{" "}
          <a href="https://motion-primitives.com/docs">introduction</a>,{" "}
          <a href="https://motion-primitives.com/docs/installation">installation</a>,{" "}
          <a href="https://pro.motion-primitives.com/">Pro</a>,{" "}
          <a href="https://github.com/ibelick/motion-primitives">GitHub repository</a>
        </li>
        <li>
          React Bits:{" "}
          <a href="https://reactbits.dev/get-started/installation">installation</a>,{" "}
          <a href="https://reactbits.dev/r/SplitText-TS-TW.json">Split Text registry item</a>,{" "}
          <a href="https://reactbits.dev/r/Galaxy-TS-TW.json">Galaxy registry item</a>,{" "}
          <a href="https://reactbits.dev/pro">Pro</a>,{" "}
          <a href="https://github.com/DavidHDev/react-bits">GitHub repository</a>
        </li>
        <li>
          karaUI: <Link href="/docs/theme">Theme</Link>,{" "}
          <Link href="/docs/mobile">Mobile &amp; responsive</Link>,{" "}
          <Link href="/docs/ai-agents">AI agents</Link>, and this site&apos;s
          source
        </li>
      </ul>
    </>
  );
}
