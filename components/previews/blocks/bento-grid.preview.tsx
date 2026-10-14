"use client";

import { BarChart3, Code2, Globe2, SlidersHorizontal, Users } from "lucide-react";
import { BentoCard, BentoGrid } from "@/components/motion/bento-grid";

// Deterministic demo data; every visual is plain CSS/SVG, no network images.
const BARS = [32, 48, 40, 62, 54, 70, 66, 84, 76, 92, 88, 100];

function ChartVisual() {
  const w = 300;
  const h = 72;
  const step = w / (BARS.length - 1);
  const line = BARS.map(
    (v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${(h - (v / 100) * (h - 8)).toFixed(1)}`,
  ).join("");
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${w} ${h}`} className="h-[72px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="bento-preview-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line}L${w},${h}L0,${h}Z`} fill="url(#bento-preview-fill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function TogglesVisual() {
  const rows = [
    { label: "Alerts", on: true },
    { label: "Digest", on: false },
    { label: "Beta", on: true },
  ];
  return (
    <div className="flex w-full flex-col gap-1.5">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground"
        >
          {row.label}
          <span
            className={`flex h-3.5 w-6 items-center rounded-full p-0.5 ${row.on ? "justify-end bg-primary" : "justify-start bg-border"}`}
          >
            <span className="size-2.5 rounded-full bg-background" />
          </span>
        </div>
      ))}
    </div>
  );
}

function CodeVisual() {
  const lines = [
    ["w-6", "w-10", "w-8"],
    ["w-4", "w-14"],
    ["w-8", "w-6", "w-12"],
    ["w-4", "w-9"],
  ];
  const tones = ["bg-[var(--chart-1)]", "bg-[var(--chart-3)]", "bg-muted-foreground/40"];
  return (
    <div className="flex w-full flex-col gap-1.5 rounded-lg border border-border bg-muted/50 p-2.5 font-mono">
      {lines.map((tokens, row) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static decorative rows.
        <div key={row} className="flex gap-1" style={{ paddingLeft: row % 2 ? 10 : 0 }}>
          {tokens.map((width, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static decorative tokens.
              key={i}
              className={`h-1.5 rounded-full opacity-80 ${width} ${tones[(row + i) % tones.length]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Rounded so server and client trig output serialize identically.
const round = (n: number) => Math.round(n * 100) / 100;

// Dots on a sphere: a fixed lat/long lattice, front hemisphere only.
const GLOBE_DOTS = (() => {
  const dots: { x: number; y: number; o: number }[] = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const r = Math.cos((lat * Math.PI) / 180);
    const count = Math.max(4, Math.round(16 * r));
    for (let k = 0; k < count; k++) {
      const lon = (k / count) * Math.PI * 2;
      const z = Math.cos(lon) * r;
      if (z < 0) continue;
      dots.push({
        x: round(40 + Math.sin(lon) * r * 34),
        y: round(40 - Math.sin((lat * Math.PI) / 180) * 34),
        o: round(0.25 + z * 0.75),
      });
    }
  }
  return dots;
})();

function GlobeVisual() {
  return (
    <svg aria-hidden="true" viewBox="0 0 80 80" className="size-20">
      <circle cx={40} cy={40} r={36} fill="none" stroke="var(--border)" />
      {GLOBE_DOTS.map((d) => (
        <circle
          key={`${d.x}-${d.y}`}
          cx={d.x}
          cy={d.y}
          r={1.3}
          fill="var(--chart-3)"
          opacity={d.o}
        />
      ))}
    </svg>
  );
}

function AvatarsVisual() {
  const people = [
    { initials: "MC", color: "var(--chart-1)" },
    { initials: "LP", color: "var(--chart-2)" },
    { initials: "AR", color: "var(--chart-3)" },
    { initials: "SO", color: "var(--chart-5)" },
  ];
  return (
    <div className="flex items-center">
      {people.map((p) => (
        <span
          key={p.initials}
          className="-ml-2 flex size-9 items-center justify-center rounded-full border-2 border-card text-[11px] font-semibold text-white first:ml-0"
          style={{ background: p.color }}
        >
          {p.initials}
        </span>
      ))}
      <span className="-ml-2 flex size-9 items-center justify-center rounded-full border-2 border-card bg-muted text-[11px] font-medium text-muted-foreground">
        +8
      </span>
    </div>
  );
}

export function BentoGridPreview() {
  return (
    <div className="w-full max-w-[40rem] p-1">
      <BentoGrid>
        <BentoCard
          colSpan={2}
          icon={<BarChart3 />}
          title="Realtime analytics"
          description="Traffic, revenue and retention in one live view."
          visual={<ChartVisual />}
          href="#analytics"
          cta="Open dashboard"
        />
        <BentoCard
          icon={<SlidersHorizontal />}
          title="Feature flags"
          description="Ship dark, flip on later."
          visual={<TogglesVisual />}
        />
        <BentoCard
          icon={<Code2 />}
          title="Typed SDK"
          description="Autocomplete for every endpoint."
          visual={<CodeVisual />}
        />
        <BentoCard
          icon={<Globe2 />}
          title="Edge network"
          description="Served from 300+ cities."
          visual={<GlobeVisual />}
        />
        <BentoCard
          icon={<Users />}
          title="Multiplayer"
          description="Invite your whole team."
          visual={<AvatarsVisual />}
          onClick={() => {}}
          cta="Invite"
        />
      </BentoGrid>
    </div>
  );
}
