/**
 * Accent colors: a brand hue layered on top of whichever design style is
 * active. Unlike a full palette they only touch the brand tokens, so surfaces,
 * text, borders and chart colors stay the style's own and never clash.
 */
export type AccentColor =
  | "default"
  | "violet"
  | "blue"
  | "green"
  | "amber"
  | "blood-orange"
  | "rose"
  | "red"
  | "teal"
  | "indigo"
  | "lime";

type Ramp = { hue: string; onHue: string; ring: string };
type Accent = { name: string; swatch: string; light: Ramp; dark: Ramp };

export const ACCENT_STORAGE_KEY = "karaui-accent";

const ACCENTS: Record<Exclude<AccentColor, "default">, Accent> = {
  violet: {
    name: "Violet",
    swatch: "oklch(55% 0.2 290)",
    light: { hue: "oklch(55% 0.2 290)", onHue: "oklch(99% 0 0)", ring: "oklch(55% 0.2 290 / 0.5)" },
    dark: { hue: "oklch(72% 0.16 290)", onHue: "oklch(15% 0 0)", ring: "oklch(72% 0.16 290 / 0.55)" },
  },
  blue: {
    name: "Blue",
    swatch: "oklch(55% 0.18 255)",
    light: { hue: "oklch(55% 0.18 255)", onHue: "oklch(99% 0 0)", ring: "oklch(55% 0.18 255 / 0.5)" },
    dark: { hue: "oklch(70% 0.15 255)", onHue: "oklch(15% 0 0)", ring: "oklch(70% 0.15 255 / 0.55)" },
  },
  green: {
    name: "Green",
    swatch: "oklch(56% 0.14 150)",
    light: { hue: "oklch(56% 0.14 150)", onHue: "oklch(99% 0 0)", ring: "oklch(56% 0.14 150 / 0.5)" },
    dark: { hue: "oklch(72% 0.15 150)", onHue: "oklch(15% 0 0)", ring: "oklch(72% 0.15 150 / 0.55)" },
  },
  amber: {
    name: "Amber",
    swatch: "oklch(74% 0.15 70)",
    light: { hue: "oklch(74% 0.15 70)", onHue: "oklch(20% 0.02 70)", ring: "oklch(74% 0.15 70 / 0.5)" },
    dark: { hue: "oklch(80% 0.15 75)", onHue: "oklch(18% 0.02 75)", ring: "oklch(80% 0.15 75 / 0.55)" },
  },
  "blood-orange": {
    name: "Blood Orange",
    swatch: "oklch(60% 0.19 40)",
    light: { hue: "oklch(60% 0.19 40)", onHue: "oklch(99% 0 0)", ring: "oklch(60% 0.19 40 / 0.5)" },
    dark: { hue: "oklch(72% 0.17 42)", onHue: "oklch(15% 0 0)", ring: "oklch(72% 0.17 42 / 0.55)" },
  },
  rose: {
    name: "Rose",
    swatch: "oklch(58% 0.2 12)",
    light: { hue: "oklch(58% 0.2 12)", onHue: "oklch(99% 0 0)", ring: "oklch(58% 0.2 12 / 0.5)" },
    dark: { hue: "oklch(70% 0.17 12)", onHue: "oklch(15% 0 0)", ring: "oklch(70% 0.17 12 / 0.55)" },
  },
  red: {
    name: "Red",
    swatch: "oklch(55% 0.22 25)",
    light: { hue: "oklch(55% 0.22 25)", onHue: "oklch(99% 0 0)", ring: "oklch(55% 0.22 25 / 0.5)" },
    dark: { hue: "oklch(68% 0.19 25)", onHue: "oklch(15% 0 0)", ring: "oklch(68% 0.19 25 / 0.55)" },
  },
  teal: {
    name: "Teal",
    swatch: "oklch(55% 0.12 185)",
    light: { hue: "oklch(55% 0.12 185)", onHue: "oklch(99% 0 0)", ring: "oklch(55% 0.12 185 / 0.5)" },
    dark: { hue: "oklch(72% 0.13 185)", onHue: "oklch(15% 0 0)", ring: "oklch(72% 0.13 185 / 0.55)" },
  },
  indigo: {
    name: "Indigo",
    swatch: "oklch(50% 0.2 275)",
    light: { hue: "oklch(50% 0.2 275)", onHue: "oklch(99% 0 0)", ring: "oklch(50% 0.2 275 / 0.5)" },
    dark: { hue: "oklch(70% 0.16 275)", onHue: "oklch(15% 0 0)", ring: "oklch(70% 0.16 275 / 0.55)" },
  },
  lime: {
    name: "Lime",
    swatch: "oklch(72% 0.18 130)",
    light: { hue: "oklch(72% 0.18 130)", onHue: "oklch(20% 0.04 130)", ring: "oklch(72% 0.18 130 / 0.5)" },
    dark: { hue: "oklch(80% 0.18 130)", onHue: "oklch(18% 0.04 130)", ring: "oklch(80% 0.18 130 / 0.55)" },
  },
};

/** Swatch list for pickers; "default" keeps the active style's own brand. */
export const ACCENT_LIST: { id: AccentColor; name: string; swatch: string | null }[] = [
  { id: "default", name: "Style default", swatch: null },
  ...(Object.entries(ACCENTS) as [Exclude<AccentColor, "default">, Accent][]).map(
    ([id, a]) => ({ id, name: a.name, swatch: a.swatch }),
  ),
];

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === "string" && ACCENT_LIST.some((a) => a.id === value);
}

function declarations(r: Ramp, important: boolean): string[] {
  const bang = important ? " !important" : "";
  return [
    `--primary: ${r.hue}${bang};`,
    `--primary-foreground: ${r.onHue}${bang};`,
    `--accent: ${r.hue}${bang};`,
    `--accent-foreground: ${r.onHue}${bang};`,
    `--ring: ${r.ring}${bang};`,
  ];
}

/**
 * Accent rules keyed by data-accent on <html>. !important so the accent wins
 * over every design style's own brand tokens (styles never use !important);
 * elements scoped with their own data-style still declare their tokens and
 * keep their palette, which is what the style gallery wants.
 */
export function accentStylesheet(): string {
  return (Object.entries(ACCENTS) as [string, Accent][])
    .map(
      ([id, a]) =>
        `html[data-accent="${id}"] { ${declarations(a.light, true).join(" ")} }\nhtml.dark[data-accent="${id}"] { ${declarations(a.dark, true).join(" ")} }`,
    )
    .join("\n");
}

/** Copyable CSS for a user's globals.css: brand tokens for :root and .dark. */
export function accentExportCss(id: AccentColor): string | null {
  if (id === "default") return null;
  const a = ACCENTS[id];
  const block = (sel: string, r: Ramp) =>
    `${sel} {\n${declarations(r, false)
      .map((d) => `  ${d}`)
      .join("\n")}\n}`;
  return `${block(":root", a.light)}\n\n${block(".dark", a.dark)}`;
}

/** Applies the saved accent before first paint (runs in <head>). */
export function accentInitScript(): string {
  const ids = JSON.stringify(ACCENT_LIST.map((a) => a.id).filter((id) => id !== "default"));
  return `(function(){try{var a=localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)});if(a&&${ids}.indexOf(a)>-1)document.documentElement.setAttribute("data-accent",a)}catch(e){}})();`;
}
