"use client";

import { ChevronRight, Ellipsis } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { EASE_OUT_CSS, SPRING_LAYOUT, SPRING_PANEL } from "@/lib/ease";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------------ */
/* Composable primitives                                                     */
/* ------------------------------------------------------------------------ */

export type BreadcrumbDataItem = {
  label: ReactNode;
  href?: string;
  icon?: ReactNode;
  /** Render the link through your router, e.g. `(p) => <Link {...p} />`. */
  render?: (props: BreadcrumbLinkRenderProps) => ReactElement;
};

type BreadcrumbNavProps = ComponentPropsWithoutRef<"nav">;

export type BreadcrumbProps = BreadcrumbNavProps & {
  /** Data-driven mode. Omit to compose `BreadcrumbList` children yourself. */
  items?: BreadcrumbDataItem[];
  /** Collapse middle items into "…" when there are more than this many. */
  maxItems?: number;
  /** "expand" reveals hidden items inline; "menu" lists them in a dropdown. */
  collapse?: "expand" | "menu";
  separator?: ReactNode;
};

export function Breadcrumb({
  items,
  maxItems = 4,
  collapse = "expand",
  separator,
  className,
  children,
  ...props
}: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)} {...props}>
      {items ? (
        <BreadcrumbTrail
          items={items}
          maxItems={maxItems}
          collapse={collapse}
          separator={separator}
        />
      ) : (
        children
      )}
    </nav>
  );
}

export function BreadcrumbList({ className, ...props }: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2",
        className,
      )}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className, ...props }: ComponentPropsWithoutRef<"li">) {
  return <li className={cn("inline-flex min-w-0 items-center gap-1.5", className)} {...props} />;
}

export type BreadcrumbLinkRenderProps = {
  href: string;
  className: string;
  children: ReactNode;
};

export type BreadcrumbLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href" | "children"> & {
  href: string;
  children: ReactNode;
  /** Swap the `<a>` for a router link: `render={(p) => <Link {...p} />}`. */
  render?: (props: BreadcrumbLinkRenderProps) => ReactElement;
};

const linkClass =
  "group/crumb relative inline-flex min-w-0 items-center gap-1.5 rounded-sm text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function LinkContent({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      {/* Underline slides in from the left and leaves to the right: the origin
          flips on hover, so scaleX grows and shrinks in the travel direction. */}
      <span
        aria-hidden
        style={{ transitionTimingFunction: EASE_OUT_CSS }}
        className="pointer-events-none absolute inset-x-0 -bottom-0.5 h-px origin-right scale-x-0 bg-current transition-transform duration-300 group-hover/crumb:origin-left group-hover/crumb:scale-x-100 group-focus-visible/crumb:origin-left group-focus-visible/crumb:scale-x-100 motion-reduce:transition-none"
      />
    </>
  );
}

export function BreadcrumbLink({
  href,
  render,
  className,
  children,
  ...props
}: BreadcrumbLinkProps) {
  const merged = cn(linkClass, className);
  if (render) {
    return render({ href, className: merged, children: <LinkContent>{children}</LinkContent> });
  }
  return (
    <a href={href} className={merged} {...props}>
      <LinkContent>{children}</LinkContent>
    </a>
  );
}

export function BreadcrumbPage({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      aria-current="page"
      className={cn("inline-flex min-w-0 items-center gap-1.5 truncate font-medium text-foreground", className)}
      {...props}
    />
  );
}

export function BreadcrumbSeparator({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"li">) {
  return (
    <li
      aria-hidden="true"
      className={cn("inline-flex items-center text-muted-foreground/60 [&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

export function BreadcrumbEllipsis({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-6 w-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      <Ellipsis className="size-4" aria-hidden />
    </button>
  );
}

/* ------------------------------------------------------------------------ */
/* Data-driven trail                                                         */
/* ------------------------------------------------------------------------ */

function CrumbBody({ item, current }: { item: BreadcrumbDataItem; current: boolean }) {
  const content = (
    <>
      {item.icon ? (
        <span aria-hidden className="inline-flex shrink-0 [&>svg]:size-3.5">
          {item.icon}
        </span>
      ) : null}
      <span className="max-w-[12rem] truncate">{item.label}</span>
    </>
  );
  if (current || !item.href) return <BreadcrumbPage aria-current={current ? "page" : undefined}>{content}</BreadcrumbPage>;
  return (
    <BreadcrumbLink href={item.href} render={item.render}>
      {content}
    </BreadcrumbLink>
  );
}

type Entry =
  | { kind: "item"; item: BreadcrumbDataItem; index: number }
  | { kind: "ellipsis"; hidden: { item: BreadcrumbDataItem; index: number }[] };

function BreadcrumbTrail({
  items,
  maxItems,
  collapse,
  separator,
}: {
  items: BreadcrumbDataItem[];
  maxItems: number;
  collapse: "expand" | "menu";
  separator?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const firstRevealed = useRef<HTMLLIElement>(null);
  const focusRevealed = useRef(false);

  const indexed = items.map((item, index) => ({ item, index }));
  const shouldCollapse = !expanded && items.length > Math.max(maxItems, 2);
  const tail = Math.max(1, maxItems - 2);
  const hidden = shouldCollapse ? indexed.slice(1, items.length - tail) : [];

  const entries: Entry[] = shouldCollapse
    ? [
        { kind: "item", ...indexed[0] },
        { kind: "ellipsis", hidden },
        ...indexed.slice(items.length - tail).map((e) => ({ kind: "item" as const, ...e })),
      ]
    : indexed.map((e) => ({ kind: "item" as const, ...e }));

  // The "…" button unmounts on expand; hand focus to the first revealed link
  // so keyboard users are not dropped back on <body>.
  useEffect(() => {
    if (expanded && focusRevealed.current) {
      focusRevealed.current = false;
      firstRevealed.current?.querySelector<HTMLElement>("a,[tabindex]")?.focus();
    }
  }, [expanded]);

  const layoutTransition = reduce ? { duration: 0 } : SPRING_LAYOUT;

  return (
    <LayoutGroup>
      {/* relative: popLayout takes exiting crumbs out of flow, absolutely. */}
      <BreadcrumbList className="relative">
        <AnimatePresence initial={false} mode="popLayout">
          {entries.flatMap((entry, i) => {
            const key = entry.kind === "item" ? `item-${entry.index}` : "ellipsis";
            const last = entry.kind === "item" && entry.index === items.length - 1;
            const isFirstRevealed = expanded && entry.kind === "item" && entry.index === 1;
            // Flat keyed <li>s (no Fragment) so AnimatePresence tracks each
            // separator and crumb on its own and plays their exits.
            const nodes: ReactElement[] = [];
            if (i > 0) {
              nodes.push(
                <motion.li
                  key={`sep-${key}`}
                  layout="position"
                  aria-hidden="true"
                  transition={layoutTransition}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="inline-flex items-center text-muted-foreground/60 [&>svg]:size-3.5"
                >
                  {separator ?? <ChevronRight />}
                </motion.li>,
              );
            }
            nodes.push(
                <motion.li
                  key={key}
                  ref={isFirstRevealed ? firstRevealed : undefined}
                  layout="position"
                  transition={layoutTransition}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: -6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="inline-flex min-w-0 items-center gap-1.5"
                >
                  {entry.kind === "item" ? (
                    <CrumbBody item={entry.item} current={last} />
                  ) : collapse === "menu" ? (
                    <CollapsedMenu hidden={entry.hidden} />
                  ) : (
                    <BreadcrumbEllipsis
                      aria-label={`Show ${entry.hidden.length} more`}
                      onClick={() => {
                        focusRevealed.current = true;
                        setExpanded(true);
                      }}
                    />
                  )}
                </motion.li>,
            );
            return nodes;
          })}
        </AnimatePresence>
      </BreadcrumbList>
    </LayoutGroup>
  );
}

function CollapsedMenu({ hidden }: { hidden: { item: BreadcrumbDataItem; index: number }[] }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    listRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    const links = Array.from(listRef.current?.querySelectorAll<HTMLElement>("a") ?? []);
    const at = links.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      links[(at + 1) % links.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      links[(at - 1 + links.length) % links.length]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: delegates Escape/arrow keys for the popup's links
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <BreadcrumbEllipsis
        ref={triggerRef}
        aria-label={`Show ${hidden.length} more`}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(open && "bg-muted text-foreground")}
      />
      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -2, transition: { duration: 0.12 } }}
            transition={SPRING_PANEL}
            className="absolute left-0 top-full z-50 mt-2 min-w-44 origin-top-left rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            <ul ref={listRef} className="flex flex-col">
              {hidden.map(({ item, index }) => (
                <li key={index}>
                  {item.href ? (
                    (item.render ?? defaultMenuLink)({
                      href: item.href,
                      className:
                        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground [&_svg]:size-3.5",
                      children: (
                        <>
                          {item.icon ? <span aria-hidden className="inline-flex">{item.icon}</span> : null}
                          <span className="truncate">{item.label}</span>
                        </>
                      ),
                    })
                  ) : (
                    <span className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground">
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function defaultMenuLink({ href, className, children }: BreadcrumbLinkRenderProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
