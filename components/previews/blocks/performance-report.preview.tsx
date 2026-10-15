"use client";

import { Activity, DollarSign, MousePointerClick, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DateRange } from "@/components/motion/calendar";
import type { DateRangePreset } from "@/components/motion/date-range-picker";
import { type PerformanceReportData, PerformanceReport } from "@/components/motion/performance-report";

const DAY = 86_400_000;

// mulberry32 — a tiny seeded PRNG; seeded by the range so a range always
// reports the same numbers.
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const utcDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

function report(range: { from: Date; to: Date }): PerformanceReportData {
  const start = utcDay(range.from);
  const days = Math.min(90, Math.max(2, Math.round((utcDay(range.to) - start) / DAY) + 1));
  const rand = rng(start / DAY + days * 31);
  const trend = Array.from({ length: days }, (_, i) => {
    const weekly = Math.sin(((start / DAY + i) % 7) * 0.9) * 260;
    const current = Math.round(3200 + i * (900 / days) + weekly + rand() * 420);
    const previous = Math.round(current * (0.78 + rand() * 0.2));
    return { date: new Date(start + i * DAY).toISOString().slice(0, 10), current, previous };
  });
  const sessions = trend.reduce((s, p) => s + p.current, 0);
  const prevSessions = trend.reduce((s, p) => s + (p.previous ?? 0), 0);
  const conv = 0.028 + rand() * 0.012;
  const shares = [0.38, 0.24, 0.17, 0.13, 0.08];
  return {
    trendLabel: "Sessions",
    breakdownLabel: "Channel",
    trend,
    kpis: [
      { id: "sessions", label: "Sessions", value: sessions, previous: prevSessions, format: "compact", icon: <Activity /> },
      { id: "revenue", label: "Revenue", value: Math.round(sessions * conv * 64), previous: Math.round(prevSessions * conv * 61), format: "currency", icon: <DollarSign /> },
      { id: "conversion", label: "Conversion", value: conv, previous: conv * (1.02 + rand() * 0.06), format: "percent", icon: <MousePointerClick /> },
      { id: "latency", label: "p95 ms", value: Math.round(180 + rand() * 60), previous: Math.round(210 + rand() * 50), goodDirection: "down", icon: <Timer /> },
    ],
    breakdown: ["Organic", "Paid search", "Email", "Social", "Referral"].map((label, i) => {
      const value = Math.round(sessions * shares[i] * (0.9 + rand() * 0.2));
      return { id: label.toLowerCase(), label, value, previous: Math.round(value * (0.7 + rand() * 0.45)) };
    }),
  };
}

// Fixed default window, so the first render matches on server and client.
const DEFAULT_RANGE = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 14) };

const PRESETS: DateRangePreset[] = [7, 14, 30].map((n) => ({
  label: `Last ${n} days`,
  range: () => {
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    return { from: new Date(to.getTime() - (n - 1) * DAY), to };
  },
}));

export function PerformanceReportPreview() {
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const [data, setData] = useState<PerformanceReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  // Simulated fetch: every range change shows skeletons for a beat.
  const load = (r: { from: Date; to: Date }) => {
    setLoading(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setData(report(r));
      setLoading(false);
    }, 650);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: initial load only.
  useEffect(() => {
    load(DEFAULT_RANGE);
    return () => window.clearTimeout(timer.current);
  }, []);

  return (
    <div className="w-full max-w-[40rem] p-1">
      <PerformanceReport
        data={data}
        loading={loading}
        range={range}
        onRangeChange={(r) => {
          setRange(r);
          load(r);
        }}
        presets={PRESETS}
      />
    </div>
  );
}
