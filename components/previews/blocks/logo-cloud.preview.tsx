"use client";

import { LogoCloud, type LogoCloudItem } from "@/components/motion/logo-cloud";

// Fictional wordmarks: a colored glyph (theme chart tokens) plus a name set
// in the inherited sans font, so they follow the theme and the muted tint.
type GlyphKind = "ring" | "diamond" | "bars" | "wave" | "dot" | "tri" | "grid" | "arc";

function Glyph({ kind, color }: { kind: GlyphKind; color: string }) {
  const fill = `var(${color})`;
  switch (kind) {
    case "ring":
      return <circle cx="12" cy="16" r="7" fill="none" stroke={fill} strokeWidth="4" />;
    case "diamond":
      return <path d="M12 6l9 10-9 10-9-10z" fill={fill} />;
    case "bars":
      return (
        <g fill={fill}>
          <rect x="4" y="12" width="4" height="12" rx="1" />
          <rect x="10" y="8" width="4" height="16" rx="1" />
          <rect x="16" y="4" width="4" height="20" rx="1" />
        </g>
      );
    case "wave":
      return (
        <path
          d="M3 18c3-6 6-6 9 0s6 6 9 0"
          fill="none"
          stroke={fill}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      );
    case "dot":
      return (
        <g fill={fill}>
          <circle cx="7" cy="11" r="4" />
          <circle cx="17" cy="11" r="4" opacity="0.6" />
          <circle cx="12" cy="20" r="4" opacity="0.8" />
        </g>
      );
    case "tri":
      return <path d="M12 5l10 19H2z" fill={fill} />;
    case "grid":
      return (
        <g fill={fill}>
          <rect x="3" y="7" width="8" height="8" rx="2" />
          <rect x="13" y="7" width="8" height="8" rx="2" opacity="0.6" />
          <rect x="3" y="17" width="8" height="8" rx="2" opacity="0.6" />
          <rect x="13" y="17" width="8" height="8" rx="2" />
        </g>
      );
    default:
      return (
        <path d="M4 24a8 8 0 0 1 16 0" fill="none" stroke={fill} strokeWidth="4" />
      );
  }
}

function Wordmark({
  name,
  kind,
  color,
  width,
}: {
  name: string;
  kind: GlyphKind;
  color: string;
  width: number;
}) {
  return (
    <svg viewBox={`0 0 ${width} 32`} width={width} height={32} aria-hidden="true">
      <Glyph kind={kind} color={color} />
      <text
        x="30"
        y="22"
        fill="currentColor"
        fontSize="17"
        fontWeight="600"
        letterSpacing="-0.4"
      >
        {name}
      </text>
    </svg>
  );
}

const BRANDS: { name: string; kind: GlyphKind; color: string; width: number }[] = [
  { name: "Northwind", kind: "ring", color: "--chart-1", width: 124 },
  { name: "Quillstack", kind: "bars", color: "--chart-2", width: 128 },
  { name: "Fernhill", kind: "wave", color: "--chart-3", width: 108 },
  { name: "Lumora", kind: "diamond", color: "--chart-4", width: 100 },
  { name: "Brightpath", kind: "tri", color: "--chart-5", width: 130 },
  { name: "Orbitly", kind: "dot", color: "--chart-1", width: 100 },
  { name: "Cobalt Co", kind: "grid", color: "--chart-2", width: 118 },
  { name: "Halcyon", kind: "arc", color: "--chart-3", width: 108 },
];

const LOGOS: LogoCloudItem[] = BRANDS.map((brand) => ({
  id: brand.name.toLowerCase().replace(/\s+/g, "-"),
  name: brand.name,
  logo: <Wordmark {...brand} />,
}));

export function LogoCloudPreview() {
  return (
    <div className="flex w-full max-w-[38rem] flex-col gap-10 px-1">
      <LogoCloud eyebrow="Trusted by product teams at" logos={LOGOS} speed={28} />
      <LogoCloud variant="grid" logos={LOGOS} columns={4} />
    </div>
  );
}
