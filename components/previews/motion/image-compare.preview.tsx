"use client";

import { ImageCompare } from "@/components/motion/image-compare";

type Palette = {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  glow: string;
};

const LIGHT: Palette = {
  bg: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#94a3b8",
  accent: "#6366f1",
  accentSoft: "#e0e7ff",
  glow: "radial-gradient(circle at 80% 0%, rgba(99,102,241,0.18), transparent 55%)",
};

const DARK: Palette = {
  bg: "linear-gradient(135deg, #0b0b12 0%, #151528 100%)",
  surface: "#17172a",
  border: "#2a2a44",
  text: "#f1f5f9",
  muted: "#64748b",
  accent: "#a78bfa",
  accentSoft: "#2e2850",
  glow: "radial-gradient(circle at 80% 0%, rgba(167,139,250,0.28), transparent 55%)",
};

const BARS = [38, 62, 46, 78, 54, 88, 70, 96].map((h, i) => ({ h, x: i * 20 + 3, last: i === 7 }));

function Scene({ p }: { p: Palette }) {
  return (
    <div
      className="relative flex size-full flex-col gap-3 p-4 pt-12 sm:p-5 sm:pt-12"
      style={{ background: p.bg, color: p.text }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: p.glow }} />
      {/* top bar */}
      <div className="relative flex items-center gap-2">
        <div className="size-6 rounded-lg" style={{ background: p.accent }} />
        <div className="h-2.5 w-20 rounded-full" style={{ background: p.text, opacity: 0.85 }} />
        <div className="ml-auto flex gap-1.5">
          <div className="h-2.5 w-10 rounded-full" style={{ background: p.muted, opacity: 0.6 }} />
          <div className="h-2.5 w-10 rounded-full" style={{ background: p.muted, opacity: 0.6 }} />
          <div className="size-6 rounded-full" style={{ background: p.accentSoft, border: `1px solid ${p.border}` }} />
        </div>
      </div>
      {/* content */}
      <div className="relative grid min-h-0 flex-1 grid-cols-3 gap-3">
        <div
          className="col-span-2 flex flex-col gap-2 rounded-xl p-3"
          style={{ background: p.surface, border: `1px solid ${p.border}` }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tabular-nums">$48.2k</span>
            <span className="rounded-full px-1.5 text-[10px] font-medium" style={{ background: p.accentSoft, color: p.accent }}>
              +12%
            </span>
          </div>
          <svg viewBox="0 0 160 60" preserveAspectRatio="none" className="min-h-0 w-full flex-1" aria-hidden="true">
            {BARS.map(({ h, x, last }) => (
              <rect
                key={x}
                x={x}
                y={60 - (h / 100) * 58}
                width={13}
                height={(h / 100) * 58}
                rx={3}
                fill={last ? p.accent : p.accentSoft}
              />
            ))}
          </svg>
        </div>
        <div className="flex flex-col gap-3">
          {[0, 1].map((n) => (
            <div
              key={n}
              className="flex flex-1 flex-col justify-center gap-1.5 rounded-xl p-3"
              style={{ background: p.surface, border: `1px solid ${p.border}` }}
            >
              <div className="h-2 w-10 rounded-full" style={{ background: p.muted, opacity: 0.7 }} />
              <div className="h-3 w-14 rounded-full" style={{ background: n ? p.accent : p.text, opacity: 0.9 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ImageComparePreview() {
  return (
    <div className="flex h-[400px] w-full items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <ImageCompare
          aria-label="Light and dark theme comparison"
          before={<Scene p={LIGHT} />}
          after={<Scene p={DARK} />}
          beforeLabel="Light"
          afterLabel="Dark"
          defaultValue={50}
        />
      </div>
    </div>
  );
}
