"use client";

import { useId } from "react";
import { type GalleryItem, ImageGallery } from "@/components/motion/image-gallery";

/* Fake "photos": layered gradients and SVG silhouettes, no network images. */

function Mountains({ sky, ridge, near }: { sky: string; ridge: string; near: string }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <rect width="400" height="300" fill={sky} />
      <circle cx="300" cy="80" r="26" fill="#fff6dc" opacity="0.9" />
      <path d="M0 210 L80 120 L140 180 L220 90 L310 190 L360 150 L400 180 V300 H0Z" fill={ridge} />
      <path d="M0 250 L70 200 L150 240 L240 190 L330 245 L400 220 V300 H0Z" fill={near} />
    </svg>
  );
}

function Dunes({ sky }: { sky: string }) {
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <rect width="300" height="400" fill={sky} />
      <circle cx="90" cy="120" r="34" fill="#fff1c9" opacity="0.85" />
      <path d="M0 260 Q90 210 170 250 T300 240 V400 H0Z" fill="#d98a4e" />
      <path d="M0 310 Q110 270 200 315 T300 300 V400 H0Z" fill="#b8643a" />
      <path d="M0 360 Q120 330 300 365 V400 H0Z" fill="#8e4a2c" />
    </svg>
  );
}

function City() {
  const id = useId();
  return (
    <svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1f4b" />
          <stop offset="1" stopColor="#e2708a" />
        </linearGradient>
      </defs>
      <rect width="300" height="420" fill={`url(#${id})`} />
      {[
        [10, 220, 50],
        [62, 160, 44],
        [110, 250, 40],
        [154, 120, 56],
        [214, 200, 38],
        [256, 170, 44],
      ].map(([x, y, w]) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={420 - y} fill="#141633" />
          {Array.from({ length: 6 }, (_, row) => (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: decorative windows.
              key={row}
              x={x + 8}
              y={y + 16 + row * 28}
              width={w - 16}
              height="6"
              fill="#ffd27a"
              opacity={(row + x) % 3 === 0 ? 0.15 : 0.7}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

function Arches({ base, shade }: { base: string; shade: string }) {
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <rect width="400" height="400" fill={base} />
      {[40, 160, 280].map((x) => (
        <path key={x} d={`M${x} 400 V200 A40 40 0 0 1 ${x + 80} 200 V400Z`} fill={shade} />
      ))}
      <rect y="360" width="400" height="40" fill={shade} opacity="0.6" />
    </svg>
  );
}

function Waves() {
  const id = useId();
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb17a" />
          <stop offset="1" stopColor="#ff7a8a" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#${id})`} />
      <circle cx="200" cy="140" r="40" fill="#fff0c2" />
      <rect y="140" width="400" height="120" fill="#2b4a7a" />
      {[160, 185, 210, 235].map((y) => (
        <path key={y} d={`M0 ${y} Q50 ${y - 6} 100 ${y} T200 ${y} T300 ${y} T400 ${y}`} stroke="#9cc3ff" strokeOpacity="0.35" strokeWidth="2" fill="none" />
      ))}
    </svg>
  );
}

function Forest() {
  return (
    <svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <rect width="300" height="380" fill="#cfe3d2" />
      {[
        [20, 0.55, "#5e8f6b"],
        [90, 0.7, "#3f6f50"],
        [170, 0.6, "#5e8f6b"],
        [230, 0.8, "#2f5a40"],
        [55, 0.95, "#24452f"],
        [150, 1, "#1d3a27"],
      ].map(([x, s, c]) => {
        const scale = s as number;
        const cx = x as number;
        const top = 380 - 300 * scale;
        return (
          <path key={`${cx}-${scale}`} d={`M${cx} ${top} L${cx + 60 * scale} 380 L${cx - 60 * scale} 380Z`} fill={c as string} />
        );
      })}
    </svg>
  );
}

const ITEMS: GalleryItem[] = [
  { id: "ridge", title: "Blue ridge at dusk", caption: "Layered ridgelines above the Calder valley.", category: "Landscape", aspectRatio: 4 / 3, content: <Mountains sky="#9ab8e6" ridge="#5470a8" near="#2c3e6e" /> },
  { id: "tower", title: "Neon district", caption: "Late trains and lit windows in Port Ardent.", category: "City", aspectRatio: 5 / 7, content: <City /> },
  { id: "dunes", title: "Copper dunes", caption: "Wind-cut ridges in the Sarel basin.", category: "Landscape", aspectRatio: 3 / 4, content: <Dunes sky="#f6d3a0" /> },
  { id: "arcade", title: "Quiet arcade", caption: "Morning shade in the old Halden market.", category: "Architecture", aspectRatio: 1, content: <Arches base="#efe2cf" shade="#c7a982" /> },
  { id: "tide", title: "Low tide", caption: "Sunset over the Mirren coast.", category: "Landscape", aspectRatio: 3 / 2, content: <Waves /> },
  { id: "pines", title: "Pine stand", caption: "Fog clearing from the north slope.", category: "Nature", aspectRatio: 4 / 5, content: <Forest /> },
  { id: "cloister", title: "Rose cloister", caption: "Repeating arches at the Vell library.", category: "Architecture", aspectRatio: 4 / 5, content: <Arches base="#f2cfd1" shade="#b46f78" /> },
  { id: "alpine", title: "Alpine glow", caption: "First light on the Teren peaks.", category: "Nature", aspectRatio: 4 / 3, content: <Mountains sky="#f5c1a5" ridge="#a0607a" near="#5a3557" /> },
];

export function ImageGalleryPreview() {
  return (
    <div className="h-[440px] w-full max-w-[40rem] overflow-y-auto px-1 py-2 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
      <ImageGallery items={ITEMS} columns={3} minColumnWidth={150} />
    </div>
  );
}
