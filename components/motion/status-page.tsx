"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Wrench, XCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { Badge, type BadgeVariant } from "@/components/motion/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/motion/collapsible";
import { EASE_OUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type ServiceDayStatus =
  | "operational"
  | "degraded"
  | "partial"
  | "major"
  | "maintenance"
  | "nodata";

export interface ServiceDay {
  /** Calendar day, `YYYY-MM-DD` (read as UTC so server and client agree). */
  date: string;
  status: ServiceDayStatus;
  /** Incident titles that touched this day; shown in the bar tooltip. */
  incidents?: string[];
}

export interface StatusService {
  id: string;
  name: string;
  description?: string;
  /** Oldest first; typically 90 entries. The last day is "today". */
  days: ServiceDay[];
  /** Override the computed uptime percentage. */
  uptime?: number;
}

export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";
export type IncidentImpact = "minor" | "major" | "critical" | "maintenance";

export interface IncidentUpdate {
  id: string;
  status: IncidentStatus;
  message: string;
  /** ISO timestamp. */
  at: string;
}

export interface StatusIncident {
  id: string;
  title: string;
  impact: IncidentImpact;
  status: IncidentStatus;
  /** Newest first. */
  updates: IncidentUpdate[];
  /** Affected service names. */
  services?: string[];
}

export interface StatusPageProps {
  services: StatusService[];
  incidents?: StatusIncident[];
  title?: ReactNode;
  /** Pre-formatted "last updated" text (never computed, so markup stays deterministic). */
  lastUpdated?: ReactNode;
  /** Ids of incidents expanded on mount. Default: unresolved ones. */
  defaultExpandedIncidents?: string[];
  locale?: string;
  /** IANA time zone for incident timestamps. Default "UTC" so SSR matches. */
  timeZone?: string;
  className?: string;
}

const DAY_TONE: Record<ServiceDayStatus, string> = {
  operational: "bg-success",
  degraded: "bg-warning/70",
  partial: "bg-warning",
  major: "bg-destructive",
  maintenance: "bg-chart-2",
  nodata: "bg-foreground/10",
};

const DAY_LABEL: Record<ServiceDayStatus, string> = {
  operational: "No downtime",
  degraded: "Degraded performance",
  partial: "Partial outage",
  major: "Major outage",
  maintenance: "Scheduled maintenance",
  nodata: "No data",
};

// Share of the day counted as up, for the computed uptime figure.
const DAY_UPTIME: Record<ServiceDayStatus, number | null> = {
  operational: 1,
  degraded: 0.998,
  partial: 0.99,
  major: 0.95,
  maintenance: 1,
  nodata: null,
};

const SEVERITY: ServiceDayStatus[] = ["operational", "maintenance", "degraded", "partial", "major"];

const IMPACT_BADGE: Record<IncidentImpact, BadgeVariant> = {
  minor: "warning",
  major: "destructive",
  critical: "destructive",
  maintenance: "secondary",
};

const STATUS_TEXT: Record<IncidentStatus, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

export function computeUptime(days: ServiceDay[]) {
  const counted = days
    .map((d) => DAY_UPTIME[d.status])
    .filter((v): v is number => v != null);
  if (counted.length === 0) return 100;
  return (counted.reduce((a, b) => a + b, 0) / counted.length) * 100;
}

function overallOf(services: StatusService[]) {
  let worst: ServiceDayStatus = "operational";
  for (const s of services) {
    const today = s.days[s.days.length - 1]?.status ?? "operational";
    if (SEVERITY.indexOf(today) > SEVERITY.indexOf(worst)) worst = today;
  }
  return worst;
}

const BANNER: Record<
  ServiceDayStatus,
  { text: string; icon: ReactNode; className: string }
> = {
  operational: {
    text: "All systems operational",
    icon: <CheckCircle2 aria-hidden="true" />,
    className: "border-success/30 bg-success/10 text-[color-mix(in_oklab,var(--success)_70%,var(--foreground))]",
  },
  nodata: {
    text: "All systems operational",
    icon: <CheckCircle2 aria-hidden="true" />,
    className: "border-success/30 bg-success/10 text-[color-mix(in_oklab,var(--success)_70%,var(--foreground))]",
  },
  maintenance: {
    text: "Scheduled maintenance in progress",
    icon: <Wrench aria-hidden="true" />,
    className: "border-chart-2/30 bg-chart-2/10 text-foreground",
  },
  degraded: {
    text: "Degraded performance",
    icon: <AlertTriangle aria-hidden="true" />,
    className: "border-warning/40 bg-warning/10 text-[color-mix(in_oklab,var(--warning)_60%,var(--foreground))]",
  },
  partial: {
    text: "Partial system outage",
    icon: <AlertTriangle aria-hidden="true" />,
    className: "border-warning/40 bg-warning/15 text-[color-mix(in_oklab,var(--warning)_60%,var(--foreground))]",
  },
  major: {
    text: "Major system outage",
    icon: <XCircle aria-hidden="true" />,
    className: "border-destructive/40 bg-destructive/10 text-[color-mix(in_oklab,var(--destructive)_70%,var(--foreground))]",
  },
};

export function StatusPage({
  services,
  incidents = [],
  title = "System status",
  lastUpdated,
  defaultExpandedIncidents,
  locale = "en-US",
  timeZone = "UTC",
  className,
}: StatusPageProps) {
  const reduce = useReducedMotion() ?? false;
  const overall = overallOf(services);
  const banner = BANNER[overall];
  const dayFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
    [locale],
  );
  const stampFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone,
        timeZoneName: "short",
      }),
    [locale, timeZone],
  );

  return (
    <div className={cn("flex w-full flex-col gap-4 text-sm", className)}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {lastUpdated && <p className="text-xs text-muted-foreground">{lastUpdated}</p>}
      </div>

      <div
        role="status"
        className={cn(
          "relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-border px-4 py-3 font-medium [&_svg]:size-5 [&_svg]:shrink-0",
          banner.className,
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={overall}
            className="flex items-center gap-2.5"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={SPRING_SWAP}
          >
            {banner.icon}
            {banner.text}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {services.map((service, i) => (
          <ServiceRow
            key={service.id}
            service={service}
            dayFormat={dayFormat}
            reduce={reduce}
            index={i}
          />
        ))}
        <div className="flex items-center justify-between px-4 py-2 text-[11px] text-muted-foreground">
          <span>{services[0]?.days.length ?? 90} days ago</span>
          <span className="flex items-center gap-3">
            {(["operational", "degraded", "major"] as const).map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span aria-hidden="true" className={cn("size-2 rounded-sm", DAY_TONE[s])} />
                {s === "operational" ? "Up" : s === "degraded" ? "Degraded" : "Outage"}
              </span>
            ))}
          </span>
          <span>Today</span>
        </div>
      </div>

      {incidents.length > 0 && (
        <section aria-label="Incidents" className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent incidents
          </h3>
          <ol className="flex flex-col gap-2">
            {incidents.map((incident) => (
              <IncidentItem
                key={incident.id}
                incident={incident}
                stampFormat={stampFormat}
                defaultOpen={
                  defaultExpandedIncidents
                    ? defaultExpandedIncidents.includes(incident.id)
                    : incident.status !== "resolved"
                }
                reduce={reduce}
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function ServiceRow({
  service,
  dayFormat,
  reduce,
  index,
}: {
  service: StatusService;
  dayFormat: Intl.DateTimeFormat;
  reduce: boolean;
  index: number;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(service.days.length - 1);
  const barsRef = useRef<HTMLFieldSetElement>(null);
  const uptime = service.uptime ?? computeUptime(service.days);
  const today = service.days[service.days.length - 1]?.status ?? "operational";
  const count = service.days.length;
  const active = hover != null ? service.days[hover] : undefined;

  const formatDay = (date: string) => dayFormat.format(new Date(`${date}T00:00:00Z`));

  // One tab stop per row; arrows walk the days.
  const onKeyDown = (event: KeyboardEvent<HTMLFieldSetElement>) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -count, End: count };
    const delta = step[event.key];
    if (delta == null) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(count - 1, focusIndex + delta));
    setFocusIndex(next);
    setHover(next);
    barsRef.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">{service.name}</span>
        {service.description && (
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">{service.description}</span>
        )}
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          {uptime.toFixed(2)}% uptime
        </span>
        <span
          className={cn("size-2 rounded-full", DAY_TONE[today === "nodata" ? "operational" : today])}
          aria-label={DAY_LABEL[today]}
          role="img"
        />
      </div>
      <div className="relative">
        <fieldset
          ref={barsRef}
          aria-label={`${service.name}, last ${count} days`}
          onKeyDown={onKeyDown}
          onPointerLeave={() => setHover(null)}
          className="m-0 flex h-8 min-w-0 items-end gap-px border-0 p-0"
        >
          {service.days.map((day, i) => (
            <motion.button
              key={day.date}
              type="button"
              tabIndex={i === focusIndex ? 0 : -1}
              aria-label={`${formatDay(day.date)}: ${DAY_LABEL[day.status]}${
                day.incidents?.length ? `, ${day.incidents.join("; ")}` : ""
              }`}
              aria-describedby={hover === i ? `${id}-tip` : undefined}
              onPointerEnter={() => setHover(i)}
              onFocus={() => {
                setHover(i);
                setFocusIndex(i);
              }}
              onBlur={() => setHover(null)}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scaleY: 0.2 }}
              whileInView={{ opacity: 1, scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: EASE_OUT, delay: index * 0.06 + i * 0.004 }}
              className={cn(
                "h-full min-w-0 flex-1 origin-bottom rounded-xs outline-none transition-opacity",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
                DAY_TONE[day.status],
                hover != null && hover !== i && "opacity-60",
              )}
            />
          ))}
        </fieldset>
        <AnimatePresence>
          {active && hover != null && (
            <motion.div
              id={`${id}-tip`}
              role="tooltip"
              key="tip"
              style={{ left: `${((hover + 0.5) / count) * 100}%` }}
              initial={{ opacity: 0, y: reduce ? 0 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.14, ease: EASE_OUT }}
              className={cn(
                "pointer-events-none absolute bottom-full z-20 mb-2 w-48 rounded-lg border border-border bg-popover p-2.5 text-xs text-popover-foreground shadow-md",
                hover < count * 0.2 ? "translate-x-[-10%]" : hover > count * 0.8 ? "-translate-x-[90%]" : "-translate-x-1/2",
              )}
            >
              <p className="font-medium text-foreground">{formatDay(active.date)}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                <span aria-hidden="true" className={cn("size-2 rounded-sm", DAY_TONE[active.status])} />
                {DAY_LABEL[active.status]}
              </p>
              {active.incidents?.length ? (
                <ul className="mt-1.5 space-y-0.5 border-t border-border pt-1.5 text-foreground">
                  {active.incidents.map((t) => (
                    <li key={t} className="truncate">
                      {t}
                    </li>
                  ))}
                </ul>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function IncidentItem({
  incident,
  stampFormat,
  defaultOpen,
  reduce,
}: {
  incident: StatusIncident;
  stampFormat: Intl.DateTimeFormat;
  defaultOpen: boolean;
  reduce: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const latest = incident.updates[0];
  const resolved = incident.status === "resolved";

  return (
    <li className="rounded-xl border border-border bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span
            aria-hidden="true"
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              resolved ? "bg-success" : incident.impact === "maintenance" ? "bg-chart-2" : "bg-warning",
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">{incident.title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge size="sm" variant={resolved ? "success" : "warning"} dot={resolved ? true : "pulse"}>
                {STATUS_TEXT[incident.status]}
              </Badge>
              <Badge size="sm" variant={IMPACT_BADGE[incident.impact]}>
                {incident.impact === "maintenance" ? "Maintenance" : `${incident.impact[0]?.toUpperCase()}${incident.impact.slice(1)} impact`}
              </Badge>
              {latest && (
                <time dateTime={latest.at} className="text-xs text-muted-foreground">
                  {stampFormat.format(new Date(latest.at))}
                </time>
              )}
            </span>
          </span>
          <motion.span
            aria-hidden="true"
            animate={{ rotate: open ? 180 : 0 }}
            transition={reduce ? { duration: 0 } : SPRING_SWAP}
            className="mt-0.5 text-muted-foreground"
          >
            <ChevronDown className="size-4" />
          </motion.span>
        </CollapsibleTrigger>
        <CollapsibleContent innerClassName="px-4 pb-4">
          <ol className="relative ml-1 flex flex-col gap-3 border-l border-border pl-4">
            {incident.updates.map((update, i) => (
              <li key={update.id} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-card",
                    i === 0 ? (resolved ? "bg-success" : "bg-warning") : "bg-foreground/25",
                  )}
                />
                <p className="text-xs">
                  <span className="font-medium text-foreground">{STATUS_TEXT[update.status]}</span>
                  <span className="text-muted-foreground"> · </span>
                  <time dateTime={update.at} className="text-muted-foreground">
                    {stampFormat.format(new Date(update.at))}
                  </time>
                </p>
                <p className="mt-0.5 text-muted-foreground">{update.message}</p>
              </li>
            ))}
          </ol>
          {incident.services?.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Affected: <span className="text-foreground">{incident.services.join(", ")}</span>
            </p>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
