"use client";

import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings, User } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Breadcrumb, type BreadcrumbDataItem } from "@/components/motion/breadcrumb";
import { Drawer } from "@/components/motion/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/motion/dropdown-menu";
import { KbdCombo } from "@/components/motion/kbd";
import { Tooltip } from "@/components/motion/tooltip";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { TOUCH_TARGET_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** Small count or text after the label (a dot when collapsed). */
  badge?: ReactNode;
}

export interface DashboardNavGroup {
  id: string;
  label?: string;
  items: DashboardNavItem[];
}

export interface DashboardUserMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  onSelect?: () => void;
}

export interface DashboardShellProps {
  nav: DashboardNavGroup[];
  /** Controlled active nav id. */
  active?: string;
  defaultActive?: string;
  onActiveChange?: (id: string) => void;
  /** Controlled desktop collapse (icons only). */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  brand: { name: string; logo?: ReactNode };
  user: { name: string; email?: string; avatar?: string };
  /** Avatar menu rows. Defaults to Profile, Settings and Sign out. */
  userMenu?: DashboardUserMenuItem[];
  searchPlaceholder?: string;
  /** Fires on Enter in the search field. */
  onSearch?: (query: string) => void;
  /** Also focus search on Mod+K anywhere on the page (default: only while focus is inside the shell). */
  globalShortcut?: boolean;
  breadcrumbs?: BreadcrumbDataItem[];
  title?: ReactNode;
  description?: ReactNode;
  /** Page-header actions (buttons). */
  actions?: ReactNode;
  /**
   * Shell width in px below which the sidebar moves into a Drawer behind a
   * menu button. Measured on the shell itself (a CSS container query), not the
   * viewport. Default 768, which matches `md` when the shell spans the page.
   */
  mobileBelow?: number;
  children?: ReactNode;
  className?: string;
}

function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange: ((next: T) => void) | undefined,
) {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const set = useCallback(
    (next: T) => {
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set] as const;
}

const isShortcut = (e: { key: string; metaKey: boolean; ctrlKey: boolean }) =>
  (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";

const DEFAULT_MENU: DashboardUserMenuItem[] = [
  { id: "profile", label: "Profile", icon: <User aria-hidden /> },
  { id: "settings", label: "Settings", icon: <Settings aria-hidden /> },
  { id: "sign-out", label: "Sign out", icon: <LogOut aria-hidden />, destructive: true },
];

/**
 * Container-sized app shell: a sidebar that collapses to icons (labels fade,
 * tooltips take over, the active pill glides between rows), a top bar with a
 * Mod+K search field and avatar menu, and a content slot with breadcrumbs,
 * title and actions that cross-fades per page. When the shell itself is
 * narrower than `mobileBelow` (768px) the sidebar moves into a Drawer behind a
 * menu button. Fills its parent's box, unlike the viewport-height
 * `AnimatedSidebar` primitives.
 *
 * The switch is a CSS container query on the shell's own width, so it also
 * folds inside a docs frame or a split view. Tailwind variants are static and
 * the breakpoint is a prop, so the query is a small `<style>` scoped to this
 * instance; it renders on the server too, so the first paint already has the
 * right layout and nothing is measured or swapped after hydration.
 */
export function DashboardShell({
  nav,
  active: activeProp,
  defaultActive,
  onActiveChange,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  brand,
  user,
  userMenu = DEFAULT_MENU,
  searchPlaceholder = "Search…",
  onSearch,
  globalShortcut = false,
  breadcrumbs,
  title,
  description,
  actions,
  mobileBelow = 768,
  children,
  className,
}: DashboardShellProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [active, setActive] = useControllable(
    activeProp,
    defaultActive ?? nav[0]?.items[0]?.id ?? "",
    onActiveChange,
  );
  const [collapsed, setCollapsed] = useControllable(
    collapsedProp,
    defaultCollapsed,
    onCollapsedChange,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // One container name per instance, so nested shells each answer to their
  // own width. useId is stable across server and client, so the CSS matches.
  const scope = `dash-shell-${baseId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const breakpoint = Number.isFinite(mobileBelow) ? Math.max(0, mobileBelow) : 768;
  // No `<`/`>` or quotes in here: React escapes text children on the server.
  const layoutCss =
    `@container ${scope} not (min-width: ${breakpoint}px){[data-shell-desktop=${scope}]{display:none}}` +
    `@container ${scope} (min-width: ${breakpoint}px){[data-shell-mobile=${scope}]{display:none}[data-shell-pad=${scope}]{padding:1.25rem}}`;

  // The drawer only exists in the narrow layout. If the shell widens past the
  // breakpoint while it is open (rotation, a resized split), close it rather
  // than leave a mobile drawer over the desktop sidebar.
  useEffect(() => {
    const el = rootRef.current;
    if (!drawerOpen || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth >= breakpoint) setDrawerOpen(false);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawerOpen, breakpoint]);

  useEffect(() => {
    if (!globalShortcut) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!isShortcut(e)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [globalShortcut]);

  const onShellKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (globalShortcut || !isShortcut(e)) return;
    e.preventDefault();
    searchRef.current?.focus();
  };

  const pick = (id: string) => {
    setActive(id);
    setDrawerOpen(false);
  };

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: scoped Mod+K shortcut; every control inside is a real element.
    <div
      ref={rootRef}
      onKeyDown={onShellKey}
      style={{ containerName: `shell ${scope}` }}
      className={cn(
        "@container/shell relative flex h-full min-h-0 w-full overflow-hidden rounded-2xl border border-border bg-background text-foreground",
        className,
      )}
    >
      <style>{layoutCss}</style>
      {/* Desktop sidebar. Width is animated on purpose: collapsing is a layout
          change — the content column has to reflow into the freed space. */}
      <motion.aside
        aria-label="Sidebar"
        initial={false}
        animate={{ width: collapsed ? 56 : 200 }}
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        data-shell-desktop={scope}
        className="flex shrink-0 flex-col overflow-hidden border-r border-border bg-muted/40"
      >
        <div className="flex h-12 shrink-0 items-center gap-2 px-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            {brand.logo ?? brand.name.slice(0, 1)}
          </span>
          <FadeLabel show={!collapsed} className="text-sm font-semibold">
            {brand.name}
          </FadeLabel>
        </div>
        <NavList
          nav={nav}
          active={active}
          collapsed={collapsed}
          layoutGroup={`${baseId}-desktop`}
          onPick={pick}
        />
      </motion.aside>

      {/* Mobile drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} side="left" ariaLabel="Navigation" className="w-64">
        <div className="flex h-12 items-center gap-2 px-4">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            {brand.logo ?? brand.name.slice(0, 1)}
          </span>
          <span className="text-sm font-semibold">{brand.name}</span>
        </div>
        <NavList
          nav={nav}
          active={active}
          collapsed={false}
          layoutGroup={`${baseId}-mobile`}
          onPick={pick}
        />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
            data-shell-mobile={scope}
            className={cn(
              "relative grid size-8 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary",
              TOUCH_TARGET_CLASS,
            )}
          >
            <Menu aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
            data-shell-desktop={scope}
            className={cn(
              "relative grid size-8 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary",
              TOUCH_TARGET_CLASS,
            )}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={collapsed ? "open" : "close"}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.7 }}
                transition={{ duration: 0.15, ease: EASE_OUT }}
              >
                {collapsed ? (
                  <PanelLeftOpen aria-hidden className="size-4" />
                ) : (
                  <PanelLeftClose aria-hidden className="size-4" />
                )}
              </motion.span>
            </AnimatePresence>
          </button>

          <label className="group flex h-8 min-w-0 max-w-64 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs transition-colors focus-within:border-border-strong focus-within:ring-2 focus-within:ring-primary/30">
            <Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="sr-only">Search</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch?.(query);
                if (e.key === "Escape") e.currentTarget.blur();
              }}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground pointer-coarse:text-base [&::-webkit-search-cancel-button]:hidden"
            />
            <KbdCombo keys={["mod", "k"]} size="sm" className="hidden group-focus-within:opacity-0 @min-[40rem]/shell:inline-flex" />
          </label>

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <button
                  type="button"
                  aria-label={`Account menu for ${user.name}`}
                  className={cn(
                    "relative grid size-8 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-primary",
                    TOUCH_TARGET_CLASS,
                  )}
                >
                  {user.avatar ? (
                    // biome-ignore lint/performance/noImgElement: library component, framework-agnostic.
                    <img src={user.avatar} alt="" className="size-full rounded-[inherit] object-cover" />
                  ) : (
                    initials
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
                  {user.email ? (
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userMenu.map((item, i) => (
                  <MenuRow key={item.id} item={item} separatorBefore={item.destructive && i > 0} />
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              data-shell-pad={scope}
              className="p-4"
            >
              {breadcrumbs || title || actions ? (
                <div className="mb-4 flex flex-wrap items-end gap-3">
                  <div className="min-w-0 flex-1">
                    {breadcrumbs ? <Breadcrumb items={breadcrumbs} className="mb-1.5 text-xs" /> : null}
                    {title ? <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2> : null}
                    {description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                    ) : null}
                  </div>
                  {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
                </div>
              ) : null}
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function MenuRow({
  item,
  separatorBefore,
}: {
  item: DashboardUserMenuItem;
  separatorBefore?: boolean;
}) {
  return (
    <>
      {separatorBefore ? <DropdownMenuSeparator /> : null}
      <DropdownMenuItem
        icon={item.icon}
        variant={item.destructive ? "destructive" : "default"}
        onSelect={() => item.onSelect?.()}
      >
        {item.label}
      </DropdownMenuItem>
    </>
  );
}

function FadeLabel({
  show,
  children,
  className,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.18 } }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          className={cn("min-w-0 truncate whitespace-nowrap", className)}
        >
          {children}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}

function NavList({
  nav,
  active,
  collapsed,
  layoutGroup,
  onPick,
}: {
  nav: DashboardNavGroup[];
  active: string;
  collapsed: boolean;
  layoutGroup: string;
  onPick: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <LayoutGroup id={layoutGroup}>
        {nav.map((group) => (
          <div key={group.id} className="flex flex-col gap-0.5">
            {group.label ? (
              <div className="relative h-5 px-2">
                <FadeLabel
                  show={!collapsed}
                  className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {group.label}
                </FadeLabel>
                {collapsed ? (
                  <span aria-hidden className="absolute inset-x-3 top-1/2 h-px bg-border" />
                ) : null}
              </div>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = item.id === active;
                const row = (
                  <button
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    onClick={() => onPick(item.id)}
                    className={cn(
                      "relative flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                      TOUCH_TARGET_CLASS,
                      isActive ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="nav-active"
                        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                        className="absolute inset-0 rounded-lg border border-border bg-background shadow-sm"
                      />
                    ) : null}
                    <span className="relative shrink-0 [&_svg]:size-4">{item.icon}</span>
                    <FadeLabel show={!collapsed} className="relative flex-1">
                      {item.label}
                    </FadeLabel>
                    {item.badge !== undefined && item.badge !== null ? (
                      collapsed ? (
                        <span aria-hidden className="absolute top-1.5 left-6 size-1.5 rounded-full bg-primary" />
                      ) : (
                        <span className="relative rounded-full bg-primary/10 px-1.5 text-[10px] tabular-nums text-foreground">
                          {item.badge}
                        </span>
                      )
                    ) : null}
                  </button>
                );
                return (
                  <li key={item.id}>
                    {collapsed ? (
                      <Tooltip content={item.label} side="right" wrapperClassName="block w-full">
                        {row}
                      </Tooltip>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </LayoutGroup>
    </nav>
  );
}
