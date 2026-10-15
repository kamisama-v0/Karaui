"use client";

import { ArrowUpRight, MapPin } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { type ReactNode, useId, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/motion/dialog";
import { EASE_OUT, EASE_OUT_CSS, SPRING_LAYOUT } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export interface TeamSocialLink {
  /** Accessible name, e.g. "GitHub". */
  label: string;
  href: string;
  icon: ReactNode;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  /** Filter group, e.g. "Engineering". */
  department?: string;
  bio?: ReactNode;
  location?: string;
  /** Portrait: an image URL or any node (illustration, gradient). Falls back to initials. */
  photo?: string | ReactNode;
  /** Background for the initials fallback (any CSS color). */
  color?: string;
  socials?: TeamSocialLink[];
}

export interface TeamSectionProps {
  members: TeamMember[];
  eyebrow?: ReactNode;
  heading?: ReactNode;
  description?: ReactNode;
  /** Show department chips. Default true when members span 2+ departments. */
  filterable?: boolean;
  /** Department order. Defaults to first-seen order in `members`. */
  departments?: string[];
  allLabel?: string;
  /** Controlled active department (`allLabel` or a department). */
  department?: string;
  defaultDepartment?: string;
  onDepartmentChange?: (department: string) => void;
  /** Most columns at wide container sizes. Default 4. */
  columns?: 2 | 3 | 4;
  /** Called when a member's detail panel opens. */
  onMemberOpen?: (member: TeamMember) => void;
  className?: string;
}

// Static class maps so Tailwind sees every class.
const GRID_COLS: Record<2 | 3 | 4, string> = {
  2: "@lg:grid-cols-2",
  3: "@lg:grid-cols-3",
  4: "@lg:grid-cols-3 @3xl:grid-cols-4",
};

const STAGGER = 0.06;
const CHART_VARS = [1, 2, 3, 4, 5].map((n) => `var(--chart-${n})`);

/** Deterministic fallback color from the name, so SSR and client agree. */
function colorFor(member: TeamMember) {
  if (member.color) return member.color;
  let hash = 0;
  for (const ch of member.name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return CHART_VARS[Math.abs(hash) % CHART_VARS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return ((parts[0]?.[0] ?? "") + last).toUpperCase();
}

function Portrait({ member, className }: { member: TeamMember; className?: string }) {
  if (typeof member.photo === "string") {
    return (
      // biome-ignore lint/performance/noImgElement: library component, framework-agnostic.
      <img src={member.photo} alt="" className={cn("block h-full w-full object-cover", className)} />
    );
  }
  if (member.photo) {
    return <div className={cn("h-full w-full", className)}>{member.photo}</div>;
  }
  const color = colorFor(member);
  return (
    <div
      className={cn("grid h-full w-full place-items-center", className)}
      style={{
        background: `linear-gradient(140deg, color-mix(in oklab, ${color} 55%, var(--card)), color-mix(in oklab, ${color} 20%, var(--card)))`,
      }}
    >
      <span className="text-3xl font-semibold tracking-tight text-foreground/80">
        {initials(member.name)}
      </span>
    </div>
  );
}

function SocialLinks({
  socials,
  size = "sm",
  className,
}: {
  socials: TeamSocialLink[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <ul className={cn("m-0 flex list-none gap-1.5 p-0", className)}>
      {socials.map((social) => (
        <li key={social.href}>
          <a
            href={social.href}
            aria-label={social.label}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              "grid place-items-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              size === "sm" ? "size-7 [&_svg]:size-3.5" : "size-9 [&_svg]:size-4",
            )}
          >
            {social.icon}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Team page section: a header (eyebrow, heading, description), department
 * filter chips with a gliding pill, and a grid of member cards that stagger in
 * on view. Hovering or focusing a card slides up its bio and social links;
 * clicking a member opens a detail dialog with the full bio and links. The
 * grid reflows with spring layout when the filter changes and picks its
 * column count from its own container width.
 */
export function TeamSection({
  members,
  eyebrow = "Team",
  heading = "The people behind the work",
  description,
  filterable,
  departments: departmentsProp,
  allLabel = "Everyone",
  department: departmentProp,
  defaultDepartment,
  onDepartmentChange,
  columns = 4,
  onMemberOpen,
  className,
}: TeamSectionProps) {
  const reduce = useReducedMotion() ?? false;
  const canHover = useHoverCapable();
  const uid = useId();

  const departments = useMemo(() => {
    if (departmentsProp) return departmentsProp;
    const seen: string[] = [];
    for (const member of members) {
      if (member.department && !seen.includes(member.department)) seen.push(member.department);
    }
    return seen;
  }, [members, departmentsProp]);
  const showFilters = filterable ?? departments.length > 1;

  const [internal, setInternal] = useState(defaultDepartment ?? allLabel);
  const active = departmentProp ?? internal;
  const setActive = (next: string) => {
    if (departmentProp === undefined) setInternal(next);
    onDepartmentChange?.(next);
  };

  const visible = useMemo(
    () => (active === allLabel ? members : members.filter((m) => m.department === active)),
    [members, active, allLabel],
  );

  // Keep the last member while the dialog plays its exit.
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [open, setOpen] = useState(false);
  const openMember = (member: TeamMember) => {
    setSelected(member);
    setOpen(true);
    onMemberOpen?.(member);
  };

  const layoutTransition = reduce ? { duration: 0 } : SPRING_LAYOUT;
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
    exit: {
      opacity: 0,
      scale: reduce ? 1 : 0.96,
      transition: { duration: 0.15, ease: EASE_OUT },
    },
  };

  return (
    <section className={cn("@container w-full text-foreground", className)}>
      <LayoutGroup id={uid}>
        <div className="mb-6 flex flex-col gap-3">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          {heading ? (
            <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight @3xl:text-3xl">
              {heading}
            </h2>
          ) : null}
          {description ? (
            <p className="max-w-xl text-pretty text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {showFilters ? (
          <fieldset className="-mx-1 mb-5 flex min-w-0 gap-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <legend className="sr-only">Filter by department</legend>
            {[allLabel, ...departments].map((name) => {
              const isActive = name === active;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActive(name)}
                  className={cn(
                    "relative h-8 shrink-0 rounded-full px-3.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isActive ? (
                    <motion.span
                      aria-hidden
                      layoutId={`${uid}-chip`}
                      transition={layoutTransition}
                      className="absolute inset-0 rounded-full bg-primary"
                    />
                  ) : null}
                  <span className="relative">{name}</span>
                </button>
              );
            })}
          </fieldset>
        ) : null}

        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={{ show: { transition: { staggerChildren: STAGGER } } }}
          className={cn("m-0 grid list-none grid-cols-2 gap-3 p-0", GRID_COLS[columns])}
        >
          <AnimatePresence mode="popLayout">
            {visible.map((member) => (
              // Layout animation is the point: cards glide into the gaps
              // left by members filtered out.
              <motion.li
                key={member.id}
                layout={!reduce}
                variants={item}
                exit="exit"
                transition={{ layout: layoutTransition }}
              >
                <MemberCard
                  member={member}
                  canHover={canHover}
                  reduce={reduce}
                  onOpen={() => openMember(member)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </LayoutGroup>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          {selected ? <MemberDetail member={selected} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function MemberCard({
  member,
  canHover,
  reduce,
  onOpen,
}: {
  member: TeamMember;
  canHover: boolean;
  reduce: boolean;
  onOpen: () => void;
}) {
  const socials = member.socials ?? [];
  const reveal = canHover && (member.bio || socials.length > 0);

  return (
    <article className="group/member relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground transition-colors hover:border-border-strong">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <div
          className={cn(
            "h-full w-full transition-transform duration-500",
            canHover && !reduce && "group-hover/member:scale-[1.04]",
          )}
          style={{ transitionTimingFunction: EASE_OUT_CSS }}
        >
          <Portrait member={member} />
        </div>
        {reveal ? (
          // Hover/focus reveal. Sits above the stretched button (z-20) so the
          // social links stay clickable; the panel itself lets clicks through.
          <div
            className={cn(
              "pointer-events-none absolute inset-x-2 bottom-2 z-20 flex flex-col gap-2 rounded-xl border border-border bg-card/90 p-2.5 opacity-0 shadow-lg backdrop-blur transition duration-300",
              "group-hover/member:opacity-100 group-focus-within/member:opacity-100",
              !reduce &&
                "translate-y-3 group-hover/member:translate-y-0 group-focus-within/member:translate-y-0",
            )}
            style={{ transitionTimingFunction: EASE_OUT_CSS }}
          >
            {member.bio ? (
              <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{member.bio}</p>
            ) : null}
            {socials.length > 0 ? (
              <SocialLinks socials={socials} className="pointer-events-auto" />
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <h3 className="text-sm font-semibold leading-snug">
          {/* Stretched button: its ::after covers the card, so the whole
              card opens the detail panel while staying one tab stop. */}
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            className="rounded-sm text-left outline-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:content-[''] focus-visible:ring-2 focus-visible:ring-ring"
          >
            {member.name}
          </button>
        </h3>
        <p className="text-xs text-muted-foreground">{member.role}</p>
        {!canHover && socials.length > 0 ? (
          <SocialLinks socials={socials} className="relative z-20 mt-2" />
        ) : null}
      </div>
    </article>
  );
}

function MemberDetail({ member }: { member: TeamMember }) {
  const socials = member.socials ?? [];
  return (
    <>
      <div className="flex items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
          <Portrait member={member} className="[&_span]:text-xl" />
        </div>
        <DialogHeader>
          <DialogTitle>{member.name}</DialogTitle>
          <DialogDescription>{member.role}</DialogDescription>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            {member.department ? (
              <span className="rounded-full border border-border bg-card px-2 py-0.5">
                {member.department}
              </span>
            ) : null}
            {member.location ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5">
                <MapPin aria-hidden className="size-3" />
                {member.location}
              </span>
            ) : null}
          </div>
        </DialogHeader>
      </div>
      {member.bio ? (
        <p className="text-pretty text-sm leading-6 text-muted-foreground">{member.bio}</p>
      ) : null}
      {socials.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {socials.map((social) => (
            <li key={social.href}>
              <a
                href={social.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
              >
                {social.icon}
                {social.label}
                <ArrowUpRight aria-hidden className="size-3.5 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
