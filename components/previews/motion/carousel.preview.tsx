"use client";

import { Carousel } from "@/components/motion/carousel";

type Art = {
  title: string;
  caption: string;
  /** Two theme chart colors the card is painted with. */
  a: string;
  b: string;
  shape: "orbits" | "waves" | "grid" | "peaks" | "bloom";
};

const ART: Art[] = [
  { title: "Orbits", caption: "Collection 01", a: "var(--chart-1)", b: "var(--chart-3)", shape: "orbits" },
  { title: "Tidal", caption: "Collection 02", a: "var(--chart-2)", b: "var(--chart-1)", shape: "waves" },
  { title: "Lattice", caption: "Collection 03", a: "var(--chart-4)", b: "var(--chart-2)", shape: "grid" },
  { title: "Ridge", caption: "Collection 04", a: "var(--chart-5)", b: "var(--chart-4)", shape: "peaks" },
  { title: "Bloom", caption: "Collection 05", a: "var(--chart-3)", b: "var(--chart-5)", shape: "bloom" },
];

const GRID_DOTS = Array.from({ length: 60 }, (_, k) => {
  const r = Math.floor(k / 10);
  const c = k % 10;
  return { id: `d${k}`, cx: 30 + c * 27, cy: 25 + r * 26, r: ((r + c) % 4) + 1.5 };
});

function Shape({ shape }: { shape: Art["shape"] }) {
  const stroke = "rgb(255 255 255 / 0.55)";
  switch (shape) {
    case "orbits":
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.5">
          <circle cx="150" cy="90" r="22" fill="rgb(255 255 255 / 0.85)" stroke="none" />
          <ellipse cx="150" cy="90" rx="70" ry="26" />
          <ellipse cx="150" cy="90" rx="110" ry="44" opacity="0.6" />
          <circle cx="220" cy="90" r="5" fill="white" stroke="none" />
        </g>
      );
    case "waves":
      return (
        <g fill="none" stroke={stroke} strokeWidth="2">
          {[50, 75, 100, 125].map((y) => (
            <path key={y} d={`M0 ${y} C 60 ${y - 28}, 90 ${y + 28}, 150 ${y} S 240 ${y - 28}, 300 ${y}`} />
          ))}
        </g>
      );
    case "grid":
      return (
        <g fill="rgb(255 255 255 / 0.7)">
          {GRID_DOTS.map((dot) => (
            <circle key={dot.id} cx={dot.cx} cy={dot.cy} r={dot.r} />
          ))}
        </g>
      );
    case "peaks":
      return (
        <g>
          <path d="M0 180 L70 80 L120 130 L180 50 L250 120 L300 90 L300 180 Z" fill="rgb(255 255 255 / 0.25)" />
          <path d="M0 180 L90 110 L150 150 L220 95 L300 140 L300 180 Z" fill="rgb(255 255 255 / 0.45)" />
          <circle cx="235" cy="45" r="14" fill="rgb(255 255 255 / 0.85)" />
        </g>
      );
    default:
      return (
        <g fill="rgb(255 255 255 / 0.35)">
          {Array.from({ length: 8 }, (_, k) => {
            const angle = (k * Math.PI) / 4;
            const cx = Math.round(150 + Math.cos(angle) * 34);
            const cy = Math.round(90 + Math.sin(angle) * 34);
            return <ellipse key={angle} cx={cx} cy={cy} rx="30" ry="14" transform={`rotate(${k * 45} ${cx} ${cy})`} />;
          })}
          <circle cx="150" cy="90" r="16" fill="rgb(255 255 255 / 0.9)" />
        </g>
      );
  }
}

function ArtCard({ art, compact = false }: { art: Art; compact?: boolean }) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl"
      style={{ background: `linear-gradient(135deg, ${art.a}, ${art.b})` }}
    >
      <svg
        viewBox="0 0 300 180"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <Shape shape={art.shape} />
      </svg>
      {compact ? null : (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/45 to-transparent p-4 text-white">
          <div>
            <p className="font-semibold text-lg leading-tight">{art.title}</p>
            <p className="text-white/75 text-xs">{art.caption}</p>
          </div>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] backdrop-blur-sm">
            Generative
          </span>
        </div>
      )}
    </div>
  );
}

export function CarouselPreview() {
  return (
    <div className="flex w-full flex-col items-center gap-6 p-4">
      <Carousel
        loop
        autoplay={4500}
        aria-label="Featured collections"
        className="max-w-[520px]"
      >
        {ART.map((art) => (
          <div key={art.title} className="h-52">
            <ArtCard art={art} />
          </div>
        ))}
      </Carousel>
      <Carousel
        slidesPerView={{ 0: 2, 460: 3 }}
        gap={10}
        indicators="thumbnails"
        renderThumbnail={(i) => <ArtCard art={ART[i % ART.length]} compact />}
        aria-label="Collection thumbnails"
        className="max-w-[520px]"
      >
        {[...ART, ...ART.slice(0, 2)].map((art, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: demo list repeats titles.
          <div key={i} className="h-20">
            <ArtCard art={art} compact />
          </div>
        ))}
      </Carousel>
    </div>
  );
}
