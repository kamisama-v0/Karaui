"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { SPRING_LAYOUT, SPRING_PANEL, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------------ */
/* Types                                                                     */
/* ------------------------------------------------------------------------ */

export type NavigationMenuLinkRenderProps = {
  href: string;
  className: string;
  children: ReactNode;
  onClick?: () => void;
};

type RenderLink = (props: NavigationMenuLinkRenderProps) => ReactElement;

export type NavigationMenuLink = {
  label: ReactNode;
  href: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** Route through your router: `(p) => <Link {...p} />`. */
  render?: RenderLink;
};

export type NavigationMenuSection = {
  title?: ReactNode;
  links: NavigationMenuLink[];
};

export type NavigationMenuItem =
  | {
      id: string;
      label: ReactNode;
      /** A plain top-level link. */
      href: string;
      render?: RenderLink;
    }
  | {
      id: string;
      label: ReactNode;
      /** Link columns. Also feed the mobile accordion. */
      sections: NavigationMenuSection[];
      /** Extra column on desktop, e.g. a featured card. */
      featured?: ReactNode;
      /** Replace the desktop panel body entirely (mobile still uses `sections`). */
      content?: ReactNode;
    };

export interface NavigationMenuProps {
  items: NavigationMenuItem[];
  /** Brand slot on the left of the bar. */
  logo?: ReactNode;
  /** Right-hand slot (CTA buttons); hidden below `md`, repeated in the sheet. */
  actions?: ReactNode;
  /** Open panel id, `""` when closed. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Hover-intent delay before the first panel opens (ms). */
  openDelay?: number;
  /** Grace period after the pointer leaves before closing (ms). */
  closeDelay?: number;
  "aria-label"?: string;
  className?: string;
}

type Size = { w: number; h: number };
type Geom = Size & { x: number };

const SLIDE = 28;

const panelVariants = {
  enter: ({ dir, reduce }: { dir: number; reduce: boolean }) => ({
    opacity: 0,
    x: reduce ? 0 : dir * SLIDE,
  }),
  center: { opacity: 1, x: 0 },
  exit: ({ dir, reduce }: { dir: number; reduce: boolean }) => ({
    opacity: 0,
    x: reduce ? 0 : dir * -SLIDE,
    transition: { duration: 0.14 },
  }),
};

const linkRowClass =
  "group/link flex items-start gap-3 rounded-xl p-2.5 outline-none transition-colors hover:bg-muted focus-visible:bg-muted";

function defaultLink({ href, className, children, onClick }: NavigationMenuLinkRenderProps) {
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

const sectionKey = (section: NavigationMenuSection) =>
  section.links.map((l) => l.href).join("|");

function hasPanel(
  item: NavigationMenuItem,
): item is Extract<NavigationMenuItem, { sections: NavigationMenuSection[] }> {
  return "sections" in item;
}

/* ------------------------------------------------------------------------ */
/* Panel body                                                                */
/* ------------------------------------------------------------------------ */

function LinkRow({ link, onNavigate }: { link: NavigationMenuLink; onNavigate: () => void }) {
  return (link.render ?? defaultLink)({
    href: link.href,
    className: linkRowClass,
    onClick: onNavigate,
    children: (
      <>
        {link.icon ? (
          <span
            aria-hidden
            className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors group-hover/link:text-foreground group-focus-visible/link:text-foreground [&>svg]:size-4"
          >
            {link.icon}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{link.label}</span>
          {link.description ? (
            <span className="text-xs leading-snug text-muted-foreground">{link.description}</span>
          ) : null}
        </span>
      </>
    ),
  });
}

function PanelBody({
  item,
  onNavigate,
}: {
  item: Extract<NavigationMenuItem, { sections: NavigationMenuSection[] }>;
  onNavigate: () => void;
}) {
  if (item.content) return <>{item.content}</>;
  return (
    <div className="flex gap-2 p-2">
      {item.sections.map((section) => (
        <div key={sectionKey(section)} className="flex w-60 flex-col gap-0.5">
          {section.title ? (
            <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
          ) : null}
          <ul className="flex flex-col gap-0.5">
            {section.links.map((link) => (
              <li key={link.href}>
                <LinkRow link={link} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      {item.featured ? <div className="flex w-56 shrink-0">{item.featured}</div> : null}
    </div>
  );
}

/** Reports its natural (untransformed) size so the viewport can morph to it. */
function Measured({ onSize, children }: { onSize: (size: Size) => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const report = () => onSize({ w: el.offsetWidth, h: el.offsetHeight });
    report();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onSize]);
  return (
    <div ref={ref} className="w-max">
      {children}
    </div>
  );
}

const focusables = (root: HTMLElement | null) =>
  Array.from(
    root?.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])") ?? [],
  );

/* ------------------------------------------------------------------------ */
/* NavigationMenu                                                            */
/* ------------------------------------------------------------------------ */

export function NavigationMenu({
  items,
  logo,
  actions,
  value,
  defaultValue = "",
  onValueChange,
  openDelay = 150,
  closeDelay = 250,
  "aria-label": ariaLabel = "Main",
  className,
}: NavigationMenuProps) {
  const reduce = useReducedMotion() ?? false;
  const uid = useId();
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const open = controlled ? value : internal;

  const [hovered, setHovered] = useState<string | null>(null);
  const [dir, setDir] = useState(1);
  const [geom, setGeom] = useState<Geom | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const openRef = useRef(open);
  openRef.current = open;
  const sizeRef = useRef<Size | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedBy = useRef<"hover" | "click">("click");
  const focusPanelOnOpen = useRef(false);
  // The first frame after opening snaps to size; later switches morph.
  const snap = useRef(true);

  const panelIds = items.filter(hasPanel).map((i) => i.id);
  const panelIdsRef = useRef(panelIds);
  panelIdsRef.current = panelIds;
  const panelId = (id: string) => `${uid}-panel-${id}`;

  const setOpen = useCallback(
    (next: string) => {
      if (next === openRef.current) return;
      const from = panelIdsRef.current.indexOf(openRef.current);
      const to = panelIdsRef.current.indexOf(next);
      if (from >= 0 && to >= 0) setDir(to > from ? 1 : -1);
      if (!controlled) setInternal(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange],
  );

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const schedule = (fn: () => void, ms: number) => {
    clearTimer();
    timer.current = setTimeout(fn, ms);
  };

  /* -- geometry ---------------------------------------------------------- */

  const place = useCallback((size: Size) => {
    const nav = navRef.current;
    const trigger = triggerRefs.current[openRef.current];
    if (!nav || !trigger) return;
    const navRect = nav.getBoundingClientRect();
    const tRect = trigger.getBoundingClientRect();
    const max = Math.max(0, navRect.width - size.w);
    const x = Math.min(Math.max(0, tRect.left - navRect.left - 8), max);
    setGeom((g) => (g && g.x === x && g.w === size.w && g.h === size.h ? g : { x, ...size }));
  }, []);

  // Last measured size per panel. A panel revived mid-exit (A → B → A fast)
  // keeps its mounted node and never re-measures, so reuse its cached size.
  const sizes = useRef<Record<string, Size>>({});
  const onPanelSize = useCallback(
    (id: string) => (size: Size) => {
      sizes.current[id] = size;
      if (id !== openRef.current) return; // an exiting panel; ignore it
      sizeRef.current = size;
      place(size);
    },
    [place],
  );
  useLayoutEffect(() => {
    const cached = open ? sizes.current[open] : undefined;
    if (cached) {
      sizeRef.current = cached;
      place(cached);
    }
  }, [open, place]);
  // Stable per-id callbacks so Measured's effect does not re-subscribe.
  const sizeCallbacks = useRef<Record<string, (size: Size) => void>>({});
  const sizeCallback = (id: string) => {
    sizeCallbacks.current[id] ??= onPanelSize(id);
    return sizeCallbacks.current[id];
  };

  useEffect(() => {
    snap.current = geom === null;
  }, [geom]);

  useEffect(() => {
    if (!open) {
      setGeom(null);
      sizeRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => sizeRef.current && place(sizeRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, place]);

  /* -- dismissal --------------------------------------------------------- */

  useEffect(() => {
    if (!open && !mobileOpen) return;
    const onPointer = (event: globalThis.PointerEvent) => {
      if (navRef.current?.contains(event.target as Node)) return;
      setOpen("");
      setMobileOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, mobileOpen, setOpen]);

  useEffect(() => {
    if (!open || !focusPanelOnOpen.current || !geom) return;
    focusPanelOnOpen.current = false;
    focusables(viewportRef.current)[0]?.focus();
  }, [open, geom]);

  const close = (refocus: boolean) => {
    const current = openRef.current;
    clearTimer();
    setOpen("");
    if (refocus && current) triggerRefs.current[current]?.focus();
  };

  /* -- pointer intent ---------------------------------------------------- */

  const onTriggerEnter = (event: PointerEvent, id: string) => {
    if (event.pointerType !== "mouse") return;
    setHovered(id);
    if (openRef.current) {
      clearTimer();
      openedBy.current = "hover";
      setOpen(id); // already open: switch instantly, no intent delay
    } else {
      schedule(() => {
        openedBy.current = "hover";
        setOpen(id);
      }, openDelay);
    }
  };

  const onLinkEnter = (event: PointerEvent, id: string) => {
    if (event.pointerType !== "mouse") return;
    setHovered(id);
    if (openRef.current) schedule(() => setOpen(""), closeDelay);
    else clearTimer();
  };

  const onRegionLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    if (openRef.current) schedule(() => setOpen(""), closeDelay);
    else clearTimer();
  };

  const onRegionEnter = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    if (openRef.current) clearTimer();
  };

  const onTriggerClick = (id: string) => {
    clearTimer();
    if (openRef.current === id) {
      // A hover-opened panel stays put on the click that usually follows.
      if (openedBy.current === "hover") openedBy.current = "click";
      else setOpen("");
      return;
    }
    openedBy.current = "click";
    setOpen(id);
  };

  /* -- keyboard ---------------------------------------------------------- */

  // Top-level controls are each <li>'s own <a>/<button> (links may come from a
  // render prop, so they are found structurally instead of by attribute).
  const topItems = () =>
    Array.from(
      listRef.current?.querySelectorAll<HTMLElement>(":scope > li > a, :scope > li > button") ?? [],
    );
  const idOf = (el: Element | null | undefined) =>
    el?.closest<HTMLElement>("li[data-nav-id]")?.dataset.navId;

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const tops = topItems();
    const target = event.target as HTMLElement;
    const at = tops.indexOf(target);
    if (at < 0) return;
    const item = items.find((i) => i.id === idOf(target));
    if (!item) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = tops[(at + delta + tops.length) % tops.length];
      next?.focus();
      // Keep an open menu following focus across panel triggers.
      const nextId = idOf(next);
      if (openRef.current && nextId) setOpen(panelIds.includes(nextId) ? nextId : "");
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      tops[event.key === "Home" ? 0 : tops.length - 1]?.focus();
    } else if (hasPanel(item) && event.key === "ArrowDown") {
      event.preventDefault();
      if (openRef.current === item.id) focusables(viewportRef.current)[0]?.focus();
      else {
        focusPanelOnOpen.current = true;
        openedBy.current = "click";
        setOpen(item.id);
      }
    } else if (hasPanel(item) && event.key === "Tab" && !event.shiftKey && openRef.current === item.id) {
      // The panel lives after the bar in the DOM; walk Tab into it.
      const first = focusables(viewportRef.current)[0];
      if (first) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === "Escape" && openRef.current) {
      event.preventDefault();
      close(true);
    }
  };

  const onViewportKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const links = focusables(viewportRef.current);
    const at = links.indexOf(document.activeElement as HTMLElement);
    const trigger = triggerRefs.current[openRef.current];
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      links[(at + delta + links.length) % links.length]?.focus();
    } else if (event.key === "Tab" && event.shiftKey && at === 0 && trigger) {
      event.preventDefault();
      trigger.focus();
    } else if (event.key === "Tab" && !event.shiftKey && at === links.length - 1 && trigger) {
      // Leaving the panel forward: continue to the item after its trigger.
      const tops = topItems();
      const after = tops[tops.indexOf(trigger) + 1] ?? focusables(actionsRef.current)[0];
      close(false);
      if (after) {
        event.preventDefault();
        after.focus();
      }
    }
  };

  /* -- render ------------------------------------------------------------ */

  const openItem = items.find((i) => i.id === open);
  const indicator = hovered ?? (open || null);
  const morph = reduce || snap.current ? { duration: 0 } : SPRING_LAYOUT;

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className={cn("relative z-40 w-full", className)}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && !navRef.current?.contains(next)) {
          setOpen("");
          setMobileOpen(false);
        }
      }}
    >
      <div className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-card/90 px-3 shadow-sm backdrop-blur-md">
        {logo ? <div className="flex shrink-0 items-center pl-1 pr-2">{logo}</div> : null}

        {/* layoutRoot: the hover pill's shared layout stays local to the bar. */}
        <motion.ul
          ref={listRef}
          layoutRoot
          className="relative hidden items-center gap-0.5 md:flex"
          onKeyDown={onListKeyDown}
          onPointerEnter={onRegionEnter}
          onPointerLeave={(e) => {
            setHovered(null);
            onRegionLeave(e);
          }}
        >
          {items.map((item) => {
            const isOpen = open === item.id;
            const pill =
              indicator === item.id ? (
                <motion.span
                  layoutId={`${uid}-pill`}
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                  className="absolute inset-0 -z-10 rounded-lg bg-muted"
                />
              ) : null;
            const topClass = cn(
              "relative isolate inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring",
              isOpen || indicator === item.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            );
            if (!hasPanel(item)) {
              return (
                <li
                  key={item.id}
                  data-nav-id={item.id}
                  className="relative"
                  onPointerEnter={(e) => onLinkEnter(e, item.id)}
                >
                  {pill}
                  {(item.render ?? defaultLink)({
                    href: item.href,
                    className: topClass,
                    children: item.label,
                  })}
                </li>
              );
            }
            return (
              <li
                key={item.id}
                data-nav-id={item.id}
                className="relative"
                onPointerEnter={(e) => onTriggerEnter(e, item.id)}
              >
                {pill}
                <button
                  ref={(el) => {
                    triggerRefs.current[item.id] = el;
                  }}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? panelId(item.id) : undefined}
                  onClick={() => onTriggerClick(item.id)}
                  className={topClass}
                >
                  {item.label}
                  <motion.span
                    aria-hidden
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={reduce ? { duration: 0 } : SPRING_SWAP}
                    className="inline-flex"
                  >
                    <ChevronDown className="size-3.5 opacity-70" />
                  </motion.span>
                </button>
              </li>
            );
          })}
        </motion.ul>

        <div ref={actionsRef} className="ml-auto hidden items-center gap-2 md:flex">
          {actions}
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setMobileOpen(false);
          }}
          className="relative ml-auto inline-flex size-9 items-center justify-center rounded-lg text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={mobileOpen ? "close" : "open"}
              aria-hidden
              initial={reduce ? { opacity: 0 } : { opacity: 0, rotate: -90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.6 }}
              transition={SPRING_SWAP}
              className="inline-flex"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      {/* Desktop viewport ------------------------------------------------ */}
      <AnimatePresence>
        {openItem && hasPanel(openItem) ? (
          // biome-ignore lint/a11y/noStaticElementInteractions: hover-intent region and key delegation for the panel's links
          <div
            key="viewport"
            className="pointer-events-none absolute left-0 top-full hidden w-full pt-2 md:block"
            onKeyDown={onViewportKeyDown}
          >
            <motion.div
              ref={viewportRef}
              onPointerEnter={onRegionEnter}
              onPointerLeave={onRegionLeave}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                // Sizing is this component's point: the viewport morphs its
                // width/height between measured panels (and glides under the
                // active trigger), so these layout values animate on purpose.
                x: geom?.x ?? 0,
                width: geom?.w ?? "auto",
                height: geom?.h ?? "auto",
              }}
              exit={
                reduce
                  ? { opacity: 0, transition: { duration: 0.12 } }
                  : { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.14 } }
              }
              transition={{ ...SPRING_PANEL, x: morph, width: morph, height: morph }}
              style={{ transformOrigin: "top left" }}
              className="pointer-events-auto relative overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl"
            >
              <AnimatePresence initial={false} custom={{ dir, reduce }}>
                <motion.div
                  key={openItem.id}
                  id={panelId(openItem.id)}
                  custom={{ dir, reduce }}
                  variants={panelVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={reduce ? { duration: 0.12 } : SPRING_LAYOUT}
                  className="absolute left-0 top-0"
                >
                  <Measured onSize={sizeCallback(openItem.id)}>
                    <PanelBody item={openItem} onNavigate={() => close(false)} />
                  </Measured>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* Mobile sheet ----------------------------------------------------- */}
      <AnimatePresence>
        {mobileOpen ? (
          <MobileSheet
            items={items}
            actions={actions}
            reduce={reduce}
            onClose={(refocus) => {
              setMobileOpen(false);
              if (refocus) navRef.current?.querySelector<HTMLElement>("[aria-label='Close menu']")?.focus();
            }}
          />
        ) : null}
      </AnimatePresence>
    </nav>
  );
}

/* ------------------------------------------------------------------------ */
/* Mobile                                                                    */
/* ------------------------------------------------------------------------ */

function MobileSheet({
  items,
  actions,
  reduce,
  onClose,
}: {
  items: NavigationMenuItem[];
  actions?: ReactNode;
  reduce: boolean;
  onClose: (refocus: boolean) => void;
}) {
  const [section, setSection] = useState<string | null>(null);
  const uid = useId();

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.14 } }}
      transition={SPRING_PANEL}
      style={{ transformOrigin: "top center" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose(true);
        }
      }}
      className="absolute inset-x-0 top-full mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex flex-col">
        {items.map((item) => {
          if (!hasPanel(item)) {
            return (
              <li key={item.id}>
                {(item.render ?? defaultLink)({
                  href: item.href,
                  onClick: () => onClose(false),
                  className:
                    "flex h-12 items-center rounded-xl px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted",
                  children: item.label,
                })}
              </li>
            );
          }
          const expanded = section === item.id;
          const regionId = `${uid}-${item.id}`;
          return (
            <li key={item.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={regionId}
                onClick={() => setSection(expanded ? null : item.id)}
                className="flex h-12 w-full items-center justify-between rounded-xl px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
              >
                {item.label}
                <motion.span
                  aria-hidden
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={reduce ? { duration: 0 } : SPRING_SWAP}
                  className="inline-flex text-muted-foreground"
                >
                  <ChevronDown className="size-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.div
                    id={regionId}
                    // Accordion height is the layout this section exists for,
                    // so height animates here on purpose.
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0, transition: { duration: 0.16 } }}
                    transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 pb-2">
                      {item.sections.map((s) => (
                        <div key={sectionKey(s)}>
                          {s.title ? (
                            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {s.title}
                            </p>
                          ) : null}
                          <ul>
                            {s.links.map((link) => (
                              <li key={link.href}>
                                <LinkRow link={link} onNavigate={() => onClose(false)} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      {actions ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border px-1 pt-3">
          {actions}
        </div>
      ) : null}
    </motion.div>
  );
}
