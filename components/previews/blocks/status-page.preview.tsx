"use client";

import { ScrollArea } from "@/components/motion/scroll-area";
import {
  type ServiceDay,
  type StatusIncident,
  StatusPage,
  type StatusService,
} from "@/components/motion/status-page";

// Deterministic demo data: a fixed end date and a seeded PRNG, so the server
// and client render the same bars.
const END = Date.UTC(2026, 9, 14);
const DAY = 86_400_000;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (offset: number) => new Date(END - offset * DAY).toISOString().slice(0, 10);

function makeDays(seed: number, pinned: Record<number, Omit<ServiceDay, "date">>): ServiceDay[] {
  const rand = mulberry32(seed);
  return Array.from({ length: 90 }, (_, i) => {
    const offset = 89 - i;
    const r = rand();
    const fixed = pinned[offset];
    if (fixed) return { date: iso(offset), ...fixed };
    return {
      date: iso(offset),
      status: r > 0.975 ? "degraded" : r > 0.965 ? "partial" : "operational",
    };
  });
}

const SERVICES: StatusService[] = [
  {
    id: "api",
    name: "API",
    description: "REST and GraphQL",
    days: makeDays(7, {
      0: { status: "degraded", incidents: ["Elevated API latency in eu-west"] },
      23: { status: "major", incidents: ["API errors after config rollout"] },
    }),
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Event delivery",
    days: makeDays(31, { 23: { status: "partial", incidents: ["API errors after config rollout"] } }),
  },
];

const INCIDENTS: StatusIncident[] = [
  {
    id: "inc-3",
    title: "Elevated API latency in eu-west",
    impact: "minor",
    status: "monitoring",
    services: ["API"],
    updates: [
      {
        id: "u3",
        status: "monitoring",
        message: "A fix has been deployed and p95 latency is back under 200 ms. We're monitoring.",
        at: "2026-10-14T09:42:00Z",
      },
      {
        id: "u2",
        status: "identified",
        message: "A saturated connection pool on one database replica is the cause.",
        at: "2026-10-14T08:55:00Z",
      },
      {
        id: "u1",
        status: "investigating",
        message: "We're investigating slower responses for requests routed through eu-west.",
        at: "2026-10-14T08:31:00Z",
      },
    ],
  },
  {
    id: "inc-2",
    title: "API errors after config rollout",
    impact: "major",
    status: "resolved",
    services: ["API", "Webhooks"],
    updates: [
      {
        id: "u5",
        status: "resolved",
        message: "The configuration was rolled back and error rates are normal.",
        at: "2026-09-21T15:10:00Z",
      },
      {
        id: "u4",
        status: "investigating",
        message: "Some requests return 502 errors. Webhook deliveries are delayed.",
        at: "2026-09-21T14:22:00Z",
      },
    ],
  },
];

export function StatusPagePreview() {
  return (
    <ScrollArea aria-label="Status page demo" className="h-[400px] w-full max-w-xl" fadeEdges type="always">
      <div className="p-1">
        <StatusPage
          services={SERVICES}
          incidents={INCIDENTS}
          title="Acme status"
          lastUpdated="Updated Oct 14, 10:05 UTC"
          defaultExpandedIncidents={[]}
        />
      </div>
    </ScrollArea>
  );
}
