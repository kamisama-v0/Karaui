"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  type AuditActionType,
  type AuditActor,
  type AuditEntry,
  type AuditSeverity,
  AuditTrail,
} from "@/components/motion/audit-trail";
import { Button } from "@/components/motion/button";

const ACTORS: AuditActor[] = [
  { id: "u1", name: "Maya Chen" },
  { id: "u2", name: "Theo Okafor" },
  { id: "u3", name: "Priya Raman" },
  { id: "u4", name: "Jonas Weber" },
  { id: "sys", name: "Deploy Bot" },
];

type Template = {
  action: string;
  type: AuditActionType;
  target: string;
  category: string;
  severity: AuditSeverity;
  changes?: AuditEntry["changes"];
};

const TEMPLATES: Template[] = [
  {
    action: "updated",
    type: "update",
    target: "billing-plan",
    category: "Billing",
    severity: "notice",
    changes: [
      { field: "plan", before: "Team", after: "Business" },
      { field: "seats", before: "12", after: "20" },
    ],
  },
  {
    action: "rotated",
    type: "update",
    target: "API key ••4f2a",
    category: "Security",
    severity: "warning",
    changes: [{ field: "expires_at", before: "2026-11-01", after: "2027-05-01" }],
  },
  { action: "created", type: "create", target: "project/atlas", category: "Projects", severity: "info" },
  {
    action: "changed role of",
    type: "update",
    target: "jonas@acme.dev",
    category: "Members",
    severity: "warning",
    changes: [{ field: "role", before: "Viewer", after: "Admin" }],
  },
  { action: "deleted", type: "delete", target: "webhook/slack-alerts", category: "Integrations", severity: "critical" },
  { action: "signed in to", type: "access", target: "dashboard", category: "Auth", severity: "info" },
  {
    action: "edited",
    type: "update",
    target: "env/PRODUCTION_URL",
    category: "Settings",
    severity: "notice",
    changes: [{ field: "value", before: "api.acme.dev", after: "api.eu.acme.dev" }],
  },
  { action: "exported", type: "access", target: "invoices-2026-Q3.csv", category: "Billing", severity: "notice" },
  { action: "invited", type: "create", target: "sam@acme.dev", category: "Members", severity: "info" },
  {
    action: "disabled",
    type: "update",
    target: "SSO enforcement",
    category: "Security",
    severity: "critical",
    changes: [{ field: "enforced", before: "true", after: "false" }],
  },
];

// mulberry32 — a tiny seeded PRNG so the demo log is identical on every load.
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(now: number): AuditEntry[] {
  const rand = rng(20261014);
  let ago = 4 * 60_000;
  return Array.from({ length: 22 }, (_, i) => {
    const t = TEMPLATES[Math.floor(rand() * TEMPLATES.length)];
    const actor = t.type === "create" && rand() > 0.6 ? ACTORS[4] : ACTORS[Math.floor(rand() * 4)];
    ago += Math.floor(rand() * 5 * 3_600_000) + 10 * 60_000;
    return { id: `a${i}`, actor, ...t, timestamp: now - ago };
  });
}

export function AuditTrailPreview() {
  // Timestamps are relative to "now", so the demo log is built after mount.
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [status, setStatus] = useState("");
  const counter = useRef(0);
  useEffect(() => setEntries(build(Date.now())), []);

  const simulate = () => {
    const i = counter.current++;
    const t = TEMPLATES[(i * 3 + 1) % TEMPLATES.length];
    setEntries((prev) => [
      { id: `live-${i}`, actor: ACTORS[i % 4], ...t, timestamp: Date.now() },
      ...prev,
    ]);
  };

  return (
    <div className="flex w-full max-w-[38rem] flex-col gap-2 p-1">
      <AuditTrail
        entries={entries}
        listHeight="17.5rem"
        onExport={(rows) => setStatus(`Exported ${rows.length} events (stub)`)}
      />
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {status || "Expand an entry to see its field diff."}
        </p>
        <Button variant="secondary" size="sm" onClick={simulate}>
          <Plus className="size-3.5" aria-hidden />
          Simulate event
        </Button>
      </div>
    </div>
  );
}
