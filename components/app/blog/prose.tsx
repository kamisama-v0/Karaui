import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Typography for inline content (links, code, emphasis), as literal strings so
 * Tailwind sees every class. `PROSE_INLINE` only reaches into text blocks that
 * are direct children of `Prose`, so demos, figures and code blocks keep their
 * own styles. `NESTED_INLINE` is the same look for text inside `Callout` and
 * figure captions.
 */
const PROSE_INLINE = cn(
  "[&>:is(p,ul,ol,blockquote)_a]:font-medium [&>:is(p,ul,ol,blockquote)_a]:text-foreground [&>:is(p,ul,ol,blockquote)_a]:underline [&>:is(p,ul,ol,blockquote)_a]:decoration-border-strong [&>:is(p,ul,ol,blockquote)_a]:underline-offset-4 [&>:is(p,ul,ol,blockquote)_a]:transition-colors [&>:is(p,ul,ol,blockquote)_a:hover]:decoration-foreground",
  "[&>:is(p,ul,ol,blockquote,h2,h3)_code]:rounded [&>:is(p,ul,ol,blockquote,h2,h3)_code]:bg-foreground/5 [&>:is(p,ul,ol,blockquote,h2,h3)_code]:px-1.5 [&>:is(p,ul,ol,blockquote,h2,h3)_code]:py-0.5 [&>:is(p,ul,ol,blockquote,h2,h3)_code]:font-mono [&>:is(p,ul,ol,blockquote,h2,h3)_code]:text-[0.85em] [&>:is(p,ul,ol,blockquote,h2,h3)_code]:text-foreground",
  "[&>:is(p,ul,ol,blockquote)_strong]:font-semibold [&>:is(p,ul,ol,blockquote)_strong]:text-foreground",
);

const NESTED_INLINE = cn(
  "[&_:is(p,li,figcaption)_a]:font-medium [&_:is(p,li,figcaption)_a]:text-foreground [&_:is(p,li,figcaption)_a]:underline [&_:is(p,li,figcaption)_a]:decoration-border-strong [&_:is(p,li,figcaption)_a]:underline-offset-4 [&_:is(p,li,figcaption)_a]:transition-colors [&_:is(p,li,figcaption)_a:hover]:decoration-foreground",
  "[&_:is(p,li,figcaption)_code]:rounded [&_:is(p,li,figcaption)_code]:bg-foreground/5 [&_:is(p,li,figcaption)_code]:px-1.5 [&_:is(p,li,figcaption)_code]:py-0.5 [&_:is(p,li,figcaption)_code]:font-mono [&_:is(p,li,figcaption)_code]:text-[0.85em] [&_:is(p,li,figcaption)_code]:text-foreground",
  "[&_:is(p,li,figcaption)_strong]:font-semibold [&_:is(p,li,figcaption)_strong]:text-foreground",
);

/**
 * Article body. Styles its direct children — `h2`, `h3`, `p`, `ul`, `ol`,
 * `blockquote`, `hr` — plus links, inline code and `strong` inside text.
 * Anything else (`Demo`, `Figure`, `Callout`, `CodeBlock`) styles itself and
 * just gets vertical rhythm.
 */
export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 text-base leading-7 text-muted-foreground",
        "[&>*]:mt-5 [&>*:first-child]:mt-0",
        "[&>h2]:mt-12 [&>h2]:scroll-mt-24 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:tracking-tight [&>h2]:text-foreground",
        "[&>h3]:mt-8 [&>h3]:scroll-mt-24 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:tracking-tight [&>h3]:text-foreground",
        "[&>h2+*]:mt-3 [&>h3+*]:mt-2",
        "[&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>:is(ul,ol)_li]:mt-2 [&>:is(ul,ol)_li]:pl-1 [&>:is(ul,ol)_li::marker]:text-muted-foreground",
        "[&>blockquote]:border-l-2 [&>blockquote]:border-border-strong [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-foreground",
        "[&>hr]:my-10 [&>hr]:border-border",
        PROSE_INLINE,
        className,
      )}
    >
      {children}
    </div>
  );
}

type HeadingProps = { id: string; children: ReactNode; className?: string };

function Anchor({ id, children }: { id: string; children: ReactNode }) {
  return (
    <a
      href={`#${id}`}
      className="group/anchor inline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <span
        aria-hidden="true"
        className="ml-2 font-normal text-muted-foreground opacity-0 transition-opacity group-hover/anchor:opacity-100 group-focus-visible/anchor:opacity-100"
      >
        #
      </span>
    </a>
  );
}

/** Section heading with a self-link. `id` feeds the URL hash and the post's `toc`. */
export function H2({ id, children, className }: HeadingProps) {
  return (
    <h2 id={id} className={cn("scroll-mt-24", className)}>
      <Anchor id={id}>{children}</Anchor>
    </h2>
  );
}

/** Sub-section heading with a self-link. */
export function H3({ id, children, className }: HeadingProps) {
  return (
    <h3 id={id} className={cn("scroll-mt-24", className)}>
      <Anchor id={id}>{children}</Anchor>
    </h3>
  );
}

export type CalloutTone = "note" | "tip" | "warning";

const CALLOUT_TONE: Record<
  CalloutTone,
  { icon: typeof Info; className: string; label: string }
> = {
  note: {
    icon: Info,
    label: "Note",
    className: "border-border bg-card",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    className:
      "border-[color-mix(in_oklab,var(--success)_35%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,var(--card))]",
  },
  warning: {
    icon: TriangleAlert,
    label: "Heads up",
    className:
      "border-[color-mix(in_oklab,var(--warning)_45%,transparent)] bg-[color-mix(in_oklab,var(--warning)_10%,var(--card))]",
  },
};

/** Aside box. `title` defaults to the tone's label ("Note", "Tip", "Heads up"). */
export function Callout({
  tone = "note",
  title,
  children,
  className,
}: {
  tone?: CalloutTone;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: toneClass, label } = CALLOUT_TONE[tone];
  return (
    <aside
      className={cn(
        "flex gap-3 rounded-2xl border p-4 text-sm leading-6 text-muted-foreground",
        toneClass,
        NESTED_INLINE,
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-foreground" />
      <div className="min-w-0 [&>*+*]:mt-2">
        <p className="font-semibold text-foreground">{title ?? label}</p>
        {children}
      </div>
    </aside>
  );
}

/** Image, diagram or any node with an optional caption underneath. */
export function Figure({
  caption,
  children,
  className,
}: {
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("min-w-0", NESTED_INLINE, className)}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {children}
      </div>
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export type TableRow = {
  /** Row header text, also the React key: keep it unique within the table. */
  header: string;
  /** One cell per entry in `columns` after the first. */
  cells: ReactNode[];
};

/**
 * Data table for posts. The first column holds row headers (`<th scope="row">`)
 * and stays pinned while the rest scrolls sideways on narrow screens. Column
 * names double as React keys, so keep them unique. `caption` is required: it
 * names the table for screen readers and is shown under it.
 */
export function Table({
  caption,
  columns,
  rows,
  className,
}: {
  caption: ReactNode;
  columns: string[];
  rows: TableRow[];
  className?: string;
}) {
  const [corner, ...dataColumns] = columns;
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      <div
        className={cn(
          "overflow-x-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]",
          "[&_:is(td,th)_code]:rounded [&_:is(td,th)_code]:bg-foreground/5 [&_:is(td,th)_code]:px-1 [&_:is(td,th)_code]:py-0.5 [&_:is(td,th)_code]:font-mono [&_:is(td,th)_code]:text-[0.85em] [&_:is(td,th)_code]:text-foreground",
        )}
      >
      <table className="w-full min-w-[60rem] border-collapse text-left text-sm leading-6">
        {/* Named for screen readers here; the visible copy sits outside the scroller so it never scrolls away. */}
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 border-b border-r border-border bg-card px-4 py-3 align-bottom font-semibold text-foreground"
            >
              {corner}
            </th>
            {dataColumns.map((column) => (
              <th
                key={column}
                scope="col"
                className="border-b border-border px-4 py-3 align-bottom font-semibold text-foreground"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>*]:border-b-0">
          {rows.map((row) => (
            <tr key={row.header}>
              <th
                scope="row"
                className="sticky left-0 z-10 border-b border-r border-border bg-card px-4 py-3 align-top font-semibold text-foreground"
              >
                {row.header}
              </th>
              {dataColumns.map((column, i) => (
                <td
                  key={column}
                  className="border-b border-border px-4 py-3 align-top text-muted-foreground"
                >
                  {row.cells[i]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p
        aria-hidden="true"
        className="border-t border-border px-4 py-3 text-sm text-muted-foreground"
      >
        {caption}
      </p>
    </div>
  );
}
