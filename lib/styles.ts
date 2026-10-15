/**
 * Site-wide design styles: a style re-skins every token (palette, radius
 * scale, shadow scale, fonts) independently of light/dark mode.
 *
 * A style is applied with `data-style="<id>"` on <html> (set before paint by
 * the inline script from `styleInitScript()`), or on any element to scope it
 * locally — the /docs/theme gallery renders each card in its own style. The
 * selectors are generated so a scoped element inside `.dark` gets the dark
 * variant, and every style writes a complete token set so a scoped element
 * never inherits a token from the page's style.
 *
 * Radius tokens override Tailwind's `--radius-*` directly. Shadows and fonts
 * go through `--style-shadow-*` / `--style-font-*`, which app/globals.css
 * reads with the stock Tailwind values as fallbacks, so the default look is
 * byte-for-byte unchanged while no style is set.
 */

export type DesignStyleId =
  | "default"
  | "minimalism"
  | "neobrutalism"
  | "constructivism"
  | "swiss"
  | "editorial"
  | "hand-drawn"
  | "retro"
  | "flat"
  | "bento";

type Vars = Record<string, string>;

export type DesignStyle = {
  id: DesignStyleId;
  name: string;
  description: string;
  traits: string[];
  /** Mode-independent tokens: radius scale, shadow scale, fonts. */
  shared: Vars;
  light: Vars;
  dark: Vars;
};

export const STYLE_STORAGE_KEY = "karaui-style";
export const DEFAULT_STYLE: DesignStyleId = "default";

/* -------------------------------------------------------------------------- */
/*                                  Builders                                  */
/* -------------------------------------------------------------------------- */

type PaletteInput = {
  background: string;
  foreground: string;
  card: string;
  muted?: string;
  mutedForeground: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryForeground: string;
  secondary?: string;
  secondaryForeground?: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  ring?: string;
  charts: [string, string, string, string, string];
  gradientBg?: string;
  gradientAccent?: string;
  success?: string;
  warning?: string;
};

/** Expands a compact palette into the full karaUI + shadcn token set. */
function palette(p: PaletteInput): Vars {
  return {
    "--background": p.background,
    "--foreground": p.foreground,
    "--card": p.card,
    "--card-foreground": p.foreground,
    "--popover": p.card,
    "--popover-foreground": p.foreground,
    "--primary": p.primary,
    "--primary-foreground": p.primaryForeground,
    "--secondary": p.secondary ?? p.card,
    "--secondary-foreground": p.secondaryForeground ?? p.foreground,
    "--muted": p.muted ?? p.card,
    "--muted-foreground": p.mutedForeground,
    "--accent": p.accent,
    "--accent-foreground": p.accentForeground,
    "--accent-fg": p.accentForeground,
    "--destructive": p.destructive,
    "--danger": p.destructive,
    "--success": p.success ?? "oklch(70% 0.18 155)",
    "--warning": p.warning ?? "oklch(78% 0.18 75)",
    "--neon": "oklch(80% 0.22 145)",
    "--violet": "oklch(68% 0.22 295)",
    "--border": p.border,
    "--border-strong": p.borderStrong,
    "--input": p.border,
    "--ring": p.ring ?? p.borderStrong,
    "--chart-1": p.charts[0],
    "--chart-2": p.charts[1],
    "--chart-3": p.charts[2],
    "--chart-4": p.charts[3],
    "--chart-5": p.charts[4],
    "--glass-bg": `color-mix(in oklab, ${p.card} 60%, transparent)`,
    "--glass-border": p.border,
    "--glass-strong-bg": `color-mix(in oklab, ${p.card} 72%, transparent)`,
    "--glass-thin-bg": `color-mix(in oklab, ${p.background} 50%, transparent)`,
    "--gradient-bg":
      p.gradientBg ?? `linear-gradient(135deg, ${p.background} 0%, ${p.card} 100%)`,
    "--gradient-accent":
      p.gradientAccent ?? `linear-gradient(to right, ${p.accent} 0%, ${p.primary} 100%)`,
  };
}

const RADIUS_KEYS = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"] as const;
const SHADOW_KEYS = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"] as const;

function radii(values: [string, string, string, string, string, string, string, string]): Vars {
  return Object.fromEntries(RADIUS_KEYS.map((k, i) => [`--radius-${k}`, values[i]]));
}

function shadows(values: [string, string, string, string, string, string, string]): Vars {
  const out: Vars = Object.fromEntries(
    SHADOW_KEYS.map((k, i) => [`--style-shadow-${k}`, values[i]]),
  );
  // Tailwind's bare `shadow` utility.
  out["--style-shadow"] = values[2];
  return out;
}

const NO_SHADOW = "0 0 #0000";
const flatShadows = () =>
  shadows([NO_SHADOW, NO_SHADOW, NO_SHADOW, NO_SHADOW, NO_SHADOW, NO_SHADOW, NO_SHADOW]);

/** Hard offset shadows in the given color, growing with the scale. */
const hardShadows = (color: string, steps: [number, number, number, number, number, number, number]) =>
  shadows(steps.map((n) => `${n}px ${n}px 0 0 ${color}`) as [string, string, string, string, string, string, string]);

const SANS_STACK = "ui-sans-serif, system-ui, sans-serif";
function fonts(sans: string, display: string, mono = "var(--font-geist-mono)"): Vars {
  return {
    "--style-font-sans": `${sans}, ${SANS_STACK}`,
    "--style-font-display": `${display}, ${SANS_STACK}`,
    "--style-font-mono": `${mono}, ui-monospace, monospace`,
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Catalog                                  */
/* -------------------------------------------------------------------------- */

// Mirrors :root / .dark in app/globals.css so a scoped `data-style="default"`
// element inside another style resets to the stock look.
const DEFAULT_LIGHT = palette({
  background: "oklch(99% 0 0)",
  foreground: "oklch(15% 0 0)",
  card: "oklch(97% 0 0)",
  mutedForeground: "oklch(50% 0 0)",
  border: "oklch(15% 0 0 / 0.06)",
  borderStrong: "oklch(15% 0 0 / 0.12)",
  primary: "oklch(15% 0 0)",
  primaryForeground: "oklch(99% 0 0)",
  accent: "oklch(72% 0.18 195)",
  accentForeground: "oklch(15% 0 0)",
  destructive: "oklch(62% 0.22 25)",
  charts: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"],
  gradientBg: "linear-gradient(135deg, oklch(99% 0 0) 0%, oklch(96% 0.008 210) 100%)",
  gradientAccent: "linear-gradient(to right, oklch(72% 0.18 195) 0%, oklch(68% 0.22 295) 100%)",
});
DEFAULT_LIGHT["--glass-bg"] = "oklch(99% 0 0 / 0.55)";
DEFAULT_LIGHT["--glass-border"] = "oklch(15% 0 0 / 0.08)";
DEFAULT_LIGHT["--glass-strong-bg"] = "rgb(255 255 255 / 0.7)";
DEFAULT_LIGHT["--glass-thin-bg"] = "rgb(255 255 255 / 0.45)";

const DEFAULT_DARK = palette({
  background: "#151515",
  foreground: "oklch(96% 0 0)",
  card: "#1c1c1c",
  mutedForeground: "oklch(62% 0 0)",
  border: "rgb(255 255 255 / 0.05)",
  borderStrong: "rgb(255 255 255 / 0.1)",
  primary: "oklch(96% 0 0)",
  primaryForeground: "#151515",
  accent: "oklch(80% 0.18 195)",
  accentForeground: "#151515",
  destructive: "oklch(62% 0.22 25)",
  charts: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"],
  gradientBg: "linear-gradient(135deg, oklch(19% 0 0) 0%, oklch(22% 0.008 210) 100%)",
  gradientAccent: "linear-gradient(to right, oklch(80% 0.18 195) 0%, oklch(72% 0.18 295) 100%)",
});
DEFAULT_DARK["--glass-bg"] = "rgb(28 28 28 / 0.55)";
DEFAULT_DARK["--glass-border"] = "rgb(255 255 255 / 0.08)";
DEFAULT_DARK["--glass-strong-bg"] = "rgb(28 28 28 / 0.6)";
DEFAULT_DARK["--glass-thin-bg"] = "rgb(21 21 21 / 0.45)";

// `initial` makes a custom property guaranteed-invalid, so the fallbacks in
// globals.css (the stock Tailwind values) take over again.
const DEFAULT_SHARED: Vars = {
  ...radii(["0.125rem", "0.25rem", "0.375rem", "0.5rem", "0.75rem", "1rem", "1.5rem", "2rem"]),
  ...Object.fromEntries(SHADOW_KEYS.map((k) => [`--style-shadow-${k}`, "initial"])),
  "--style-shadow": "initial",
  "--style-font-sans": "initial",
  "--style-font-display": "initial",
  "--style-font-mono": "initial",
};

export const DESIGN_STYLES: DesignStyle[] = [
  {
    id: "default",
    name: "karaUI",
    description: "The stock karaUI look: soft neutrals, glass and a cyan accent.",
    traits: ["Soft neutral surfaces", "Glass and gentle depth", "Geist type"],
    shared: DEFAULT_SHARED,
    light: DEFAULT_LIGHT,
    dark: DEFAULT_DARK,
  },
  {
    id: "minimalism",
    name: "Minimalism",
    description: "Monochrome, hairline borders and lots of air. Nothing decorative.",
    traits: ["Few elements", "No decorative details", "Lots of negative space", "Minimal bold colors"],
    shared: {
      ...radii(["1px", "2px", "3px", "4px", "6px", "8px", "10px", "12px"]),
      ...flatShadows(),
      ...fonts("var(--font-geist-sans)", "var(--font-geist-sans)"),
    },
    light: palette({
      background: "#ffffff",
      foreground: "#111111",
      card: "#fafafa",
      mutedForeground: "#6b6b6b",
      border: "rgb(17 17 17 / 0.08)",
      borderStrong: "rgb(17 17 17 / 0.18)",
      primary: "#111111",
      primaryForeground: "#ffffff",
      accent: "#525252",
      accentForeground: "#ffffff",
      destructive: "#c62828",
      charts: ["#262626", "#4f6d8a", "#8a8a8a", "#b08d57", "#c4c4c4"],
    }),
    dark: palette({
      background: "#0a0a0a",
      foreground: "#ededed",
      card: "#111111",
      mutedForeground: "#8f8f8f",
      border: "rgb(255 255 255 / 0.07)",
      borderStrong: "rgb(255 255 255 / 0.16)",
      primary: "#ededed",
      primaryForeground: "#0a0a0a",
      accent: "#a3a3a3",
      accentForeground: "#0a0a0a",
      destructive: "#ef5350",
      charts: ["#e5e5e5", "#7fa3c4", "#8a8a8a", "#c9a46b", "#525252"],
    }),
  },
  {
    id: "neobrutalism",
    name: "Neobrutalism",
    description: "Clashing saturated color, thick black outlines and hard offset shadows.",
    traits: ["Provocative layouts", "Clashing color palettes", "Heavy shadows and outlines"],
    shared: {
      ...radii(["2px", "3px", "4px", "5px", "6px", "8px", "10px", "12px"]),
      ...hardShadows("var(--foreground)", [1, 2, 3, 4, 5, 6, 8]),
      ...fonts("var(--font-space-grotesk)", "var(--font-space-grotesk)"),
    },
    light: palette({
      background: "#fffbeb",
      foreground: "#000000",
      card: "#ffffff",
      muted: "#fff1a8",
      mutedForeground: "#3d3a30",
      border: "#000000",
      borderStrong: "#000000",
      primary: "#000000",
      primaryForeground: "#ffffff",
      secondary: "#7df9ff",
      secondaryForeground: "#000000",
      accent: "#ff6fb5",
      accentForeground: "#000000",
      destructive: "#e0002a",
      ring: "#000000",
      charts: ["#ff4f9a", "#00a6d6", "#ffc800", "#7c3aed", "#16a34a"],
      gradientAccent: "linear-gradient(to right, #ffc800 0%, #ff6fb5 50%, #7df9ff 100%)",
    }),
    dark: palette({
      background: "#121212",
      foreground: "#fffbeb",
      card: "#1e1e1e",
      muted: "#2b2810",
      mutedForeground: "#e8e2c4",
      border: "#fffbeb",
      borderStrong: "#fffbeb",
      primary: "#ffd400",
      primaryForeground: "#000000",
      secondary: "#00c2e0",
      secondaryForeground: "#000000",
      accent: "#ff6fb5",
      accentForeground: "#000000",
      destructive: "#ff4d6d",
      ring: "#fffbeb",
      charts: ["#ff6fb5", "#22d3ee", "#ffd400", "#a78bfa", "#4ade80"],
      gradientAccent: "linear-gradient(to right, #ffd400 0%, #ff6fb5 50%, #22d3ee 100%)",
    }),
  },
  {
    id: "constructivism",
    name: "Constructivism",
    description: "Red, black and cream, condensed uppercase headlines and sharp geometry.",
    traits: ["Sans-serif fonts", "Various geometric shapes", "Elements aligned to one side"],
    shared: {
      ...radii(["0", "0", "0", "0", "0", "0", "0", "0"]),
      ...shadows([
        NO_SHADOW,
        NO_SHADOW,
        "2px 2px 0 0 var(--foreground)",
        "4px 4px 0 0 var(--foreground)",
        "6px 6px 0 0 var(--primary)",
        "8px 8px 0 0 var(--primary)",
        "12px 12px 0 0 var(--primary)",
      ]),
      ...fonts("var(--font-geist-sans)", "var(--font-oswald)"),
    },
    light: palette({
      background: "#f2e9d6",
      foreground: "#161412",
      card: "#faf4e6",
      muted: "#ebe0c8",
      mutedForeground: "#574d40",
      border: "rgb(22 20 18 / 0.2)",
      borderStrong: "#161412",
      primary: "#b5121b",
      primaryForeground: "#ffffff",
      secondary: "#161412",
      secondaryForeground: "#f2e9d6",
      accent: "#b5121b",
      accentForeground: "#ffffff",
      destructive: "#b5121b",
      charts: ["#b5121b", "#161412", "#d19a00", "#2f5d8a", "#8c6d46"],
      gradientAccent: "linear-gradient(115deg, #b5121b 0% 60%, #161412 60% 100%)",
    }),
    dark: palette({
      background: "#14110f",
      foreground: "#f2e9d6",
      card: "#1f1a16",
      muted: "#28211b",
      mutedForeground: "#b8ab92",
      border: "rgb(242 233 214 / 0.16)",
      borderStrong: "#f2e9d6",
      primary: "#ef3b3b",
      primaryForeground: "#14110f",
      secondary: "#f2e9d6",
      secondaryForeground: "#14110f",
      accent: "#ef3b3b",
      accentForeground: "#14110f",
      destructive: "#ff5a4f",
      charts: ["#ef3b3b", "#f2e9d6", "#e0aa1a", "#5b8fd1", "#b08a5a"],
      gradientAccent: "linear-gradient(115deg, #ef3b3b 0% 60%, #f2e9d6 60% 100%)",
    }),
  },
  {
    id: "swiss",
    name: "Swiss",
    description: "International Typographic Style: a strict grid, tight grotesk type and one red.",
    traits: ["Strong modular grid", "Clean sans-serif fonts", "Minimal realistic imagery", "Poster-inspired composition"],
    shared: {
      ...radii(["0", "0", "0", "0", "0", "0", "0", "0"]),
      ...flatShadows(),
      ...fonts("var(--font-inter)", "var(--font-inter)"),
    },
    light: palette({
      background: "#ffffff",
      foreground: "#000000",
      card: "#f4f4f4",
      mutedForeground: "#595959",
      border: "rgb(0 0 0 / 0.14)",
      borderStrong: "#000000",
      primary: "#000000",
      primaryForeground: "#ffffff",
      accent: "#d40000",
      accentForeground: "#ffffff",
      destructive: "#d40000",
      charts: ["#d40000", "#000000", "#0057b8", "#f2a900", "#7a7a7a"],
      gradientAccent: "linear-gradient(to right, #d40000 0%, #d40000 100%)",
    }),
    dark: palette({
      background: "#0a0a0a",
      foreground: "#ffffff",
      card: "#161616",
      mutedForeground: "#a6a6a6",
      border: "rgb(255 255 255 / 0.16)",
      borderStrong: "#ffffff",
      primary: "#ffffff",
      primaryForeground: "#000000",
      accent: "#ff4136",
      accentForeground: "#000000",
      destructive: "#ff4136",
      charts: ["#ff4136", "#ffffff", "#4c9aff", "#ffc233", "#8c8c8c"],
      gradientAccent: "linear-gradient(to right, #ff4136 0%, #ff4136 100%)",
    }),
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Print-inspired: paper and ink, a high-contrast serif and fine rules.",
    traits: ["Print-inspired", "High-contrast fonts", "Large visuals", "Decorative elements"],
    shared: {
      ...radii(["0", "1px", "2px", "2px", "3px", "4px", "4px", "6px"]),
      ...shadows([
        NO_SHADOW,
        NO_SHADOW,
        "0 1px 0 0 var(--border-strong)",
        "0 1px 0 0 var(--border-strong), 0 6px 16px -10px rgb(0 0 0 / 0.25)",
        "0 1px 0 0 var(--border-strong), 0 12px 28px -16px rgb(0 0 0 / 0.3)",
        "0 1px 0 0 var(--border-strong), 0 18px 40px -20px rgb(0 0 0 / 0.35)",
        "0 1px 0 0 var(--border-strong), 0 28px 60px -28px rgb(0 0 0 / 0.4)",
      ]),
      ...fonts("var(--font-geist-sans)", "var(--font-instrument-serif)"),
    },
    light: palette({
      background: "#f6f1e7",
      foreground: "#141210",
      card: "#fdfaf3",
      muted: "#efe8da",
      mutedForeground: "#5b544a",
      border: "rgb(20 18 16 / 0.14)",
      borderStrong: "rgb(20 18 16 / 0.45)",
      primary: "#141210",
      primaryForeground: "#f6f1e7",
      accent: "#8a1c1c",
      accentForeground: "#ffffff",
      destructive: "#a3231b",
      charts: ["#1f3a5f", "#8a1c1c", "#b5862a", "#3f6b4f", "#6b4f7a"],
      gradientAccent: "linear-gradient(to right, #8a1c1c 0%, #141210 100%)",
    }),
    dark: palette({
      background: "#12110f",
      foreground: "#efe9dd",
      card: "#1b1916",
      muted: "#221f1b",
      mutedForeground: "#a59e90",
      border: "rgb(239 233 221 / 0.12)",
      borderStrong: "rgb(239 233 221 / 0.4)",
      primary: "#efe9dd",
      primaryForeground: "#12110f",
      accent: "#e08a72",
      accentForeground: "#12110f",
      destructive: "#ef6a5a",
      charts: ["#7fa6d6", "#e08a72", "#d9b25c", "#7fb08f", "#b39bc7"],
      gradientAccent: "linear-gradient(to right, #e08a72 0%, #efe9dd 100%)",
    }),
  },
  {
    id: "hand-drawn",
    name: "Hand-drawn",
    description: "Sketchbook energy: a handwritten face, wobbly corners and pencil lines.",
    traits: ["Handwritten or script fonts", "Sketches and brush strokes", "Free-form layout", "Intentional visual chaos"],
    shared: {
      "--radius-xs": "3px 2px 4px 2px / 2px 4px 2px 3px",
      "--radius-sm": "6px 3px 7px 3px / 3px 7px 3px 6px",
      "--radius-md": "10px 4px 12px 5px / 5px 12px 4px 10px",
      "--radius-lg": "16px 5px 18px 6px / 6px 18px 5px 16px",
      "--radius-xl": "28px 8px 32px 9px / 9px 30px 8px 28px",
      "--radius-2xl": "60px 12px 56px 12px / 12px 56px 12px 60px",
      "--radius-3xl": "120px 15px 110px 15px / 15px 110px 15px 120px",
      "--radius-4xl": "255px 15px 225px 15px / 15px 225px 15px 255px",
      ...shadows([
        NO_SHADOW,
        "1px 1px 0 0 var(--border-strong)",
        "2px 2px 0 0 var(--border-strong)",
        "2px 3px 0 0 var(--border-strong)",
        "3px 4px 0 0 var(--border-strong)",
        "4px 5px 0 0 var(--border-strong)",
        "6px 7px 0 0 var(--border-strong)",
      ]),
      ...fonts("var(--font-geist-sans)", "var(--font-caveat)"),
    },
    light: palette({
      background: "#fbf8f1",
      foreground: "#2a2826",
      card: "#fffefa",
      muted: "#f3eee2",
      mutedForeground: "#5e584f",
      border: "rgb(42 40 38 / 0.32)",
      borderStrong: "rgb(42 40 38 / 0.8)",
      primary: "#2a2826",
      primaryForeground: "#fbf8f1",
      accent: "#264a8f",
      accentForeground: "#ffffff",
      destructive: "#b8323f",
      charts: ["#264a8f", "#d1495b", "#e09f3e", "#00798c", "#5f9a6f"],
      gradientAccent: "linear-gradient(to right, #264a8f 0%, #d1495b 100%)",
    }),
    dark: palette({
      background: "#1d2320",
      foreground: "#f1eee4",
      card: "#252c28",
      muted: "#2c342f",
      mutedForeground: "#b7b3a6",
      border: "rgb(241 238 228 / 0.28)",
      borderStrong: "rgb(241 238 228 / 0.75)",
      primary: "#f1eee4",
      primaryForeground: "#1d2320",
      accent: "#9cbcff",
      accentForeground: "#1d2320",
      destructive: "#ff7b86",
      charts: ["#9cbcff", "#ff8a98", "#f2c06b", "#5fc7d4", "#93cf9f"],
      gradientAccent: "linear-gradient(to right, #9cbcff 0%, #ff8a98 100%)",
    }),
  },
  {
    id: "retro",
    name: "Retro",
    description: "Sunset gradients, film grain and old-school terminal type on chunky shapes.",
    traits: ["Bright palettes and gradients", "Grainy textures", "Old-school tech"],
    shared: {
      ...radii(["4px", "6px", "8px", "12px", "16px", "20px", "24px", "28px"]),
      ...shadows([
        NO_SHADOW,
        "0 1px 0 0 var(--border-strong)",
        "0 2px 0 0 var(--border-strong)",
        "0 4px 0 0 color-mix(in oklab, var(--primary) 45%, transparent)",
        "0 6px 0 0 color-mix(in oklab, var(--primary) 45%, transparent)",
        "0 8px 0 0 color-mix(in oklab, var(--primary) 45%, transparent), 0 20px 40px -20px color-mix(in oklab, var(--accent) 60%, transparent)",
        "0 10px 0 0 color-mix(in oklab, var(--primary) 45%, transparent), 0 30px 60px -24px color-mix(in oklab, var(--accent) 60%, transparent)",
      ]),
      ...fonts("var(--font-space-grotesk)", "var(--font-geist-mono)"),
    },
    light: palette({
      background: "#fff3e3",
      foreground: "#2a1838",
      card: "#fff9f0",
      muted: "#ffe7cf",
      mutedForeground: "#6a4a63",
      border: "rgb(42 24 56 / 0.14)",
      borderStrong: "rgb(42 24 56 / 0.35)",
      primary: "#c81d6b",
      primaryForeground: "#ffffff",
      secondary: "#ffd9b0",
      secondaryForeground: "#2a1838",
      accent: "#0b7f7c",
      accentForeground: "#ffffff",
      destructive: "#c42424",
      charts: ["#f26b1d", "#c81d6b", "#0b7f7c", "#6c2bd9", "#e0a800"],
      gradientBg: "linear-gradient(160deg, #fff3e3 0%, #ffe1ec 55%, #dff5f1 100%)",
      gradientAccent: "linear-gradient(to right, #f26b1d 0%, #c81d6b 50%, #0b7f7c 100%)",
    }),
    dark: palette({
      background: "#1a1026",
      foreground: "#fde9d8",
      card: "#251634",
      muted: "#2e1c40",
      mutedForeground: "#c9adc8",
      border: "rgb(253 233 216 / 0.12)",
      borderStrong: "rgb(253 233 216 / 0.32)",
      primary: "#ff5fa8",
      primaryForeground: "#1a1026",
      secondary: "#3a2350",
      secondaryForeground: "#fde9d8",
      accent: "#2dd4bf",
      accentForeground: "#1a1026",
      destructive: "#ff6b6b",
      charts: ["#ff8a3d", "#ff5fa8", "#2dd4bf", "#a78bfa", "#facc15"],
      gradientBg: "linear-gradient(160deg, #1a1026 0%, #2a1236 55%, #0f2a2e 100%)",
      gradientAccent: "linear-gradient(to right, #ff8a3d 0%, #ff5fa8 50%, #2dd4bf 100%)",
    }),
  },
  {
    id: "flat",
    name: "Flat",
    description: "Totally flat: pastel fills, no shadows or depth, friendly readable type.",
    traits: ["No shadows or 3D", "Pastel tones", "Clean readable fonts"],
    shared: {
      ...radii(["3px", "5px", "8px", "10px", "12px", "14px", "18px", "22px"]),
      ...flatShadows(),
      ...fonts("var(--font-inter)", "var(--font-inter)"),
    },
    light: palette({
      background: "#f6f7fb",
      foreground: "#1f2533",
      card: "#ffffff",
      muted: "#eceff7",
      mutedForeground: "#566074",
      border: "#e1e5ef",
      borderStrong: "#c9d0df",
      primary: "#4d5bd1",
      primaryForeground: "#ffffff",
      secondary: "#ffe3ec",
      secondaryForeground: "#1f2533",
      accent: "#c6efdc",
      accentForeground: "#1f2533",
      destructive: "#c53030",
      ring: "#9aa4ff",
      charts: ["#6f7cff", "#ff8fab", "#43c59e", "#ffb547", "#a98bff"],
      gradientAccent: "linear-gradient(to right, #c6efdc 0%, #ffe3ec 100%)",
    }),
    dark: palette({
      background: "#1a1e29",
      foreground: "#e9ecf4",
      card: "#232836",
      muted: "#2a3040",
      mutedForeground: "#a5adbf",
      border: "#2f3647",
      borderStrong: "#434b60",
      primary: "#a3acff",
      primaryForeground: "#1a1e29",
      secondary: "#4a2f3a",
      secondaryForeground: "#ffe3ec",
      accent: "#92e3c0",
      accentForeground: "#1a1e29",
      destructive: "#ff7a7a",
      ring: "#a3acff",
      charts: ["#8f9bff", "#ff9bb3", "#5ad1a8", "#ffc266", "#b9a0ff"],
      gradientAccent: "linear-gradient(to right, #92e3c0 0%, #a3acff 100%)",
    }),
  },
  {
    id: "bento",
    name: "Bento",
    description: "Big rounded tiles on a tinted canvas, packed tight, no tricks.",
    traits: ["Rounded rectangular blocks", "Little empty space", "No decorative tricks"],
    shared: {
      ...radii(["6px", "8px", "12px", "16px", "20px", "24px", "28px", "32px"]),
      ...shadows([
        NO_SHADOW,
        "0 1px 1px 0 rgb(0 0 0 / 0.03)",
        "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "0 2px 6px -1px rgb(0 0 0 / 0.06)",
        "0 8px 20px -6px rgb(0 0 0 / 0.1)",
        "0 14px 32px -10px rgb(0 0 0 / 0.14)",
        "0 24px 56px -16px rgb(0 0 0 / 0.2)",
      ]),
      ...fonts("var(--font-geist-sans)", "var(--font-geist-sans)"),
    },
    light: palette({
      background: "#eceef2",
      foreground: "#111318",
      card: "#ffffff",
      muted: "#f4f5f8",
      mutedForeground: "#575d69",
      border: "rgb(17 19 24 / 0.06)",
      borderStrong: "rgb(17 19 24 / 0.14)",
      primary: "#111318",
      primaryForeground: "#ffffff",
      accent: "#c2410c",
      accentForeground: "#ffffff",
      destructive: "#c2255c",
      charts: ["#3b82f6", "#f97316", "#10b981", "#eab308", "#ec4899"],
    }),
    dark: palette({
      background: "#09090b",
      foreground: "#f2f3f5",
      card: "#18191d",
      muted: "#1f2025",
      mutedForeground: "#9ba1ab",
      border: "rgb(255 255 255 / 0.06)",
      borderStrong: "rgb(255 255 255 / 0.14)",
      primary: "#f2f3f5",
      primaryForeground: "#09090b",
      accent: "#ff7a45",
      accentForeground: "#09090b",
      destructive: "#f06595",
      charts: ["#60a5fa", "#fb923c", "#34d399", "#facc15", "#f472b6"],
    }),
  },
];

export const STYLE_IDS = DESIGN_STYLES.map((s) => s.id);

export function isDesignStyleId(value: unknown): value is DesignStyleId {
  return typeof value === "string" && (STYLE_IDS as string[]).includes(value);
}

export function getDesignStyle(id: DesignStyleId): DesignStyle {
  return DESIGN_STYLES.find((s) => s.id === id) ?? DESIGN_STYLES[0];
}

/** Three representative colors for a swatch preview. */
export function styleSwatch(style: DesignStyle, mode: "light" | "dark") {
  const v = mode === "dark" ? style.dark : style.light;
  return {
    background: v["--background"],
    foreground: v["--foreground"],
    dots: [v["--primary"], v["--accent"], v["--chart-2"]] as [string, string, string],
    border: v["--border-strong"],
    radius: style.shared["--radius-lg"],
  };
}

/* -------------------------------------------------------------------------- */
/*                                 CSS output                                 */
/* -------------------------------------------------------------------------- */

function block(selector: string, vars: Vars, extra = ""): string {
  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}${extra}\n}`;
}

// Scoped elements don't inherit `body`'s font-family recalculation, so they
// set it themselves from their own tokens.
const SCOPED_FONT = `\n  font-family: var(--style-font-sans, var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif);`;

/**
 * Stylesheet with every style's tokens. Selectors per style:
 * - light: `:root[data-style=x]` (accent colors in lib/accents.ts override
 *   only the brand tokens, with !important) and
 *   `[data-style=x]` for scoped elements;
 * - dark: `:root.dark[data-style=x]`, `.dark [data-style=x]` (scoped element
 *   on a dark page) and `[data-style=x].dark`.
 * `default` is emitted for scoped elements only; on <html> the attribute is
 * removed so the stock tokens (and color presets) apply untouched.
 */
export function designStylesStylesheet(): string {
  return DESIGN_STYLES.map((s) => {
    const sel = `[data-style="${s.id}"]`;
    if (s.id === "default") {
      return [
        block(`${sel}:not(:root)`, { ...s.shared, ...s.light }, SCOPED_FONT),
        block(`.dark ${sel}:not(:root), ${sel}.dark:not(:root)`, s.dark),
      ].join("\n");
    }
    return [
      block(`:root${sel}, ${sel}`, { ...s.shared, ...s.light }, SCOPED_FONT),
      block(`:root.dark${sel}, .dark ${sel}, ${sel}.dark`, s.dark),
    ].join("\n");
  }).join("\n\n");
}

/**
 * Copyable CSS for a user's globals.css: plain :root / .dark token blocks plus
 * the @theme lines that route Tailwind's shadow and font utilities through the
 * style variables.
 */
export function styleExportCss(id: DesignStyleId): string {
  const s = getDesignStyle(id);
  const isDefault = s.id === "default";
  const shared = Object.fromEntries(
    Object.entries(s.shared).filter(([, v]) => v !== "initial"),
  );
  const root = block(":root", { ...shared, ...s.light });
  const dark = block(".dark", s.dark);
  if (isDefault) return `${root}\n\n${dark}\n`;
  const fontNote = fontNoteFor(s);
  const theme = `@theme {\n${["", ...SHADOW_KEYS.map((k) => `-${k}`)]
    .map((k) => `  --shadow${k}: var(--style-shadow${k});`)
    .join("\n")}\n}\n\n@theme inline {\n  --font-sans: var(--style-font-sans);\n  --font-display: var(--style-font-display);\n  --font-mono: var(--style-font-mono);\n}`;
  return `/* karaUI style: ${s.name}${fontNote} */\n${root}\n\n${dark}\n\n${theme}\n`;
}

const FONT_LABELS: Record<string, string> = {
  "--font-space-grotesk": "Space Grotesk",
  "--font-oswald": "Oswald",
  "--font-inter": "Inter",
  "--font-instrument-serif": "Instrument Serif",
  "--font-caveat": "Caveat",
  "--font-geist-sans": "Geist",
  "--font-geist-mono": "Geist Mono",
};

function fontNoteFor(s: DesignStyle): string {
  const used = new Set<string>();
  for (const key of ["--style-font-sans", "--style-font-display", "--style-font-mono"]) {
    const m = s.shared[key]?.match(/var\((--font-[a-z-]+)\)/);
    if (m) used.add(m[1]);
  }
  const list = [...used].map((v) => `${FONT_LABELS[v] ?? v} as ${v}`);
  return list.length ? `. Load fonts with next/font (variable names): ${list.join(", ")}` : "";
}

/**
 * Inline <head> script: applies the saved style before first paint.
 * Stringified once on the server; must stay dependency-free.
 */
export function styleInitScript(): string {
  const ids = JSON.stringify(STYLE_IDS.filter((id) => id !== "default"));
  return `(function(){try{var s=localStorage.getItem(${JSON.stringify(STYLE_STORAGE_KEY)});if(s&&${ids}.indexOf(s)>-1)document.documentElement.setAttribute("data-style",s)}catch(e){}})();`;
}

/* -------------------------------------------------------------------------- */
/*                               shadcn registry                              */
/* -------------------------------------------------------------------------- */

export type StyleRegistryItem = {
  $schema: "https://ui.shadcn.com/schema/registry-item.json";
  name: string;
  type: "registry:theme";
  title: string;
  description: string;
  author: string;
  cssVars: { theme: Vars; light: Vars; dark: Vars };
};

const stripDashes = (vars: Vars): Vars =>
  Object.fromEntries(Object.entries(vars).map(([k, v]) => [k.replace(/^--/, ""), v]));

/** Registry slug for a style: `style-<id>`, served at /r/style-<id>.json. */
export const styleRegistrySlug = (id: DesignStyleId) => `style-${id}`;

export function findStyleByRegistrySlug(slug: string): DesignStyle | null {
  if (!slug.startsWith("style-")) return null;
  const id = slug.slice("style-".length);
  return isDesignStyleId(id) ? getDesignStyle(id) : null;
}

/**
 * shadcn `registry:theme` item for a style. Radius, shadow and font tokens go
 * to `theme` (written into @theme inline), colors to light/dark. Fonts are
 * referenced by next/font variable name; the project loads them itself.
 */
export function styleRegistryItem(style: DesignStyle): StyleRegistryItem {
  const theme: Vars = {};
  for (const [k, v] of Object.entries(style.shared)) {
    if (v === "initial") continue;
    if (k.startsWith("--radius-")) theme[k.slice(2)] = v;
    else if (k.startsWith("--style-shadow")) theme[k.replace("--style-", "")] = v;
    else if (k.startsWith("--style-font-")) theme[k.replace("--style-", "")] = v;
  }
  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: styleRegistrySlug(style.id),
    type: "registry:theme",
    title: `${style.name} style`,
    description: `${style.description} ${style.traits.join(" · ")}${fontNoteFor(style)}.`,
    author: "kara <ztzyrant@gmail.com>",
    cssVars: { theme, light: stripDashes(style.light), dark: stripDashes(style.dark) },
  };
}
