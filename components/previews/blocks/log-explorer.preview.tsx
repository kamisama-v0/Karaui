"use client";

import { useEffect, useRef, useState } from "react";
import { type LogEntry, LogExplorer, type LogLevel } from "@/components/motion/log-explorer";

// Fixed epoch: the demo stream is identical on server and client.
const BASE = Date.UTC(2026, 9, 14, 9, 0, 0);

const SERVICES = ["api-gateway", "auth", "billing", "worker", "search"];
const MESSAGES: Record<LogLevel, ((r: () => number) => [string, Record<string, unknown>])[]> = {
  debug: [
    (r) => [`cache hit key=user:${Math.floor(r() * 9000 + 1000)}`, { ttl_ms: 30000 }],
    () => ["pool stats active=12 idle=4", { pool: "pg-primary" }],
  ],
  info: [
    (r) => {
      const ms = Math.floor(r() * 180 + 12);
      return [`GET /v1/orders 200 in ${ms}ms`, { method: "GET", path: "/v1/orders", status: 200, duration_ms: ms }];
    },
    (r) => [`user signed in method=passkey`, { user_id: `u_${Math.floor(r() * 99999)}`, mfa: true }],
    (r) => [`job invoice.render completed`, { job_id: `j_${Math.floor(r() * 99999)}`, attempts: 1 }],
    () => ["POST /v1/checkout 201", { method: "POST", path: "/v1/checkout", status: 201 }],
  ],
  warn: [
    (r) => {
      const ms = Math.floor(r() * 900 + 800);
      return [`slow query took ${ms}ms`, { table: "orders", duration_ms: ms, rows: 1240 }];
    },
    () => ["rate limit at 85% for tenant acme", { tenant: "acme", limit: 1000, used: 850 }],
  ],
  error: [
    () => ["upstream timeout calling payments-svc", { upstream: "payments-svc", timeout_ms: 5000, retry: true }],
    (r) => [`ECONNRESET on queue consumer`, { queue: "emails", consumer: `c${Math.floor(r() * 8)}` }],
    () => ["POST /v1/checkout 502 Bad Gateway", { method: "POST", path: "/v1/checkout", status: 502 }],
  ],
};

// mulberry32 — a tiny seeded PRNG.
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeLine(r: () => number, id: number, ms: number): LogEntry {
  // An incident window between minutes 17 and 20 skews toward errors.
  const minute = (ms - BASE) / 60_000;
  const incident = minute > 17 && minute < 20;
  const x = r();
  const level: LogLevel = incident
    ? x < 0.35 ? "error" : x < 0.6 ? "warn" : "info"
    : x < 0.04 ? "error" : x < 0.12 ? "warn" : x < 0.3 ? "debug" : "info";
  const pick = MESSAGES[level];
  const [message, fields] = pick[Math.floor(r() * pick.length)](r);
  const service = incident && level === "error" ? "billing" : SERVICES[Math.floor(r() * SERVICES.length)];
  return {
    id: `l${id}`,
    timestamp: ms,
    level,
    service,
    message,
    fields: { ...fields, trace_id: Math.floor(r() * 0xffffff).toString(16).padStart(6, "0"), region: "eu-west-1" },
  };
}

function initial(): { logs: LogEntry[]; next: number; at: number; rand: () => number } {
  const rand = rng(1014);
  const logs: LogEntry[] = [];
  let at = BASE;
  for (let i = 0; i < 700; i++) {
    const minute = (at - BASE) / 60_000;
    at += Math.floor(rand() * (minute > 17 && minute < 20 ? 900 : 3600) + 200);
    logs.push(makeLine(rand, i, at));
  }
  return { logs, next: logs.length, at, rand };
}

export function LogExplorerPreview() {
  const seed = useRef<ReturnType<typeof initial> | null>(null);
  if (seed.current === null) seed.current = initial();
  const [logs, setLogs] = useState(seed.current.logs);
  const [live, setLive] = useState(false);

  // Live tail: append a line or two every ~0.8s, continuing the seeded stream.
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => {
      const s = seed.current;
      if (!s) return;
      const batch: LogEntry[] = [];
      const n = s.rand() > 0.7 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        s.at += Math.floor(s.rand() * 700 + 150);
        batch.push(makeLine(s.rand, s.next++, s.at));
      }
      setLogs((prev) => [...prev, ...batch].slice(-2500));
    }, 800);
    return () => window.clearInterval(t);
  }, [live]);

  return (
    <div className="w-full max-w-[40rem] p-1">
      <LogExplorer logs={logs} live={live} onLiveChange={setLive} height={252} />
    </div>
  );
}
