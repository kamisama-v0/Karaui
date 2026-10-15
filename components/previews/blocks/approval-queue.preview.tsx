"use client";

import { useEffect, useState } from "react";
import { type ApprovalRequest, ApprovalQueue } from "@/components/motion/approval-queue";

type Seed = Omit<ApprovalRequest, "createdAt" | "status"> & { minutesAgo: number };

const SEEDS: Seed[] = [
  { id: "r1", kind: "expense", title: "Team offsite dinner", requester: { name: "Maya Chen" }, amount: 1240, details: "Marketing · 14 guests", priority: "high", minutesAgo: 190 },
  { id: "r2", kind: "access", title: "Admin on billing", requester: { name: "Theo Okafor" }, details: "Stripe dashboard · 30 days", priority: "urgent", minutesAgo: 42 },
  { id: "r3", kind: "deploy", title: "api-gateway v2.14.0", requester: { name: "Deploy Bot" }, details: "production · 3 services", priority: "normal", minutesAgo: 12 },
  { id: "r4", kind: "purchase", title: "Figma seats ×5", requester: { name: "Priya Raman" }, amount: 900, details: "Annual plan", priority: "normal", minutesAgo: 600 },
  { id: "r5", kind: "time-off", title: "Vacation Nov 3–7", requester: { name: "Jonas Weber" }, details: "5 working days", priority: "low", minutesAgo: 1500 },
  { id: "r6", kind: "expense", title: "Conference travel", requester: { name: "Ana Souza" }, amount: 2310, details: "React Summit · flights + hotel", priority: "high", minutesAgo: 75 },
  { id: "r7", kind: "access", title: "Read-only prod DB", requester: { name: "Leo Martin" }, details: "Incident #4821", priority: "urgent", minutesAgo: 6 },
];

const RESOLVED: Seed[] = [
  { id: "r8", kind: "deploy", title: "web v5.2.1", requester: { name: "Deploy Bot" }, details: "production", priority: "normal", minutesAgo: 2900 },
  { id: "r9", kind: "expense", title: "Client lunch", requester: { name: "Maya Chen" }, amount: 186, details: "Sales", priority: "low", minutesAgo: 3100 },
];

export function ApprovalQueuePreview() {
  // Ages are relative to "now", so the demo queue is built after mount.
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  useEffect(() => {
    const now = Date.now();
    const at = ({ minutesAgo, ...rest }: Seed) => ({ ...rest, createdAt: now - minutesAgo * 60_000 });
    setRequests([
      ...SEEDS.map((s) => ({ ...at(s), status: "pending" as const })),
      { ...at(RESOLVED[0]), status: "approved" },
      { ...at(RESOLVED[1]), status: "rejected", reason: "Needs a receipt" },
    ]);
  }, []);

  return (
    <div className="w-full max-w-[38rem] p-1">
      <ApprovalQueue requests={requests} onRequestsChange={setRequests} listHeight="19rem" />
    </div>
  );
}
