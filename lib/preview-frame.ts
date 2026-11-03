/*
 * Shared pieces of the block viewer: frame sizing rules plus the message
 * protocol between a docs page (parent) and the bare /preview/<category>/<slug>
 * page it embeds in an <iframe>. Both sides are same-origin; each still checks
 * event.origin and event.source before trusting a message, and these guards
 * check the payload shape.
 */

export type ViewerPreset = "desktop" | "tablet" | "mobile";
export type ViewerKind = "block" | "primitive";

/** Frame widths the Tablet and Mobile presets snap to. Desktop fills the row. */
export const PRESET_WIDTHS = { tablet: 768, mobile: 375 } as const;

/** Narrowest width the drag handle allows (unless the row itself is narrower). */
export const MIN_FRAME_WIDTH = 320;

/**
 * Height bounds for the iframe, which reports its content height (the widget
 * plus the stage's 48px top/bottom padding). Frames hug their content; taller
 * content scrolls inside the frame.
 */
export const FRAME_BOUNDS: Record<ViewerKind, { min: number; max: number; initial: number }> = {
  block: { min: 320, max: 900, initial: 480 },
  primitive: { min: 240, max: 900, initial: 320 },
};

/** Viewer max widths: widget-sized blocks by default, page-like blocks wide. */
export const VIEWER_MAX_WIDTH = {
  default: "max-w-5xl",
  wide: "max-w-6xl",
} as const;

export const MSG_HEIGHT = "karaui-preview:height";
export const MSG_READY = "karaui-preview:ready";
export const MSG_PREFS = "karaui-preview:prefs";

export type HeightMessage = { type: typeof MSG_HEIGHT; height: number };
export type ReadyMessage = { type: typeof MSG_READY };
export type PrefsMessage = {
  type: typeof MSG_PREFS;
  /** next-themes setting ("light" | "dark" | "system"), not the resolved one. */
  theme: string | null;
  /** data-style on the parent's <html>, null when the default style. */
  style: string | null;
  /** data-accent on the parent's <html>, null when the default accent. */
  accent: string | null;
};

export function previewPath(previewKey: string) {
  return `/preview/${previewKey}`;
}

export function clampFrameHeight(height: number, kind: ViewerKind = "primitive") {
  const { min, max } = FRAME_BOUNDS[kind];
  return Math.min(max, Math.max(min, Math.ceil(height)));
}

/** Clamp a requested frame width to the row: at least MIN_FRAME_WIDTH, at most `available`. */
export function clampFrameWidth(width: number, available: number) {
  const min = Math.min(MIN_FRAME_WIDTH, available);
  return Math.round(Math.min(available, Math.max(min, width)));
}

/** Width a preset asks for; null means "fill the row" (Desktop). */
export function presetTarget(preset: ViewerPreset): number | null {
  return preset === "desktop" ? null : PRESET_WIDTHS[preset];
}

/** The preset a requested width corresponds to, or null after a free drag. */
export function presetFor(requested: number | null): ViewerPreset | null {
  if (requested === null) return "desktop";
  if (requested === PRESET_WIDTHS.tablet) return "tablet";
  if (requested === PRESET_WIDTHS.mobile) return "mobile";
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isHeightMessage(data: unknown): data is HeightMessage {
  return (
    isRecord(data) &&
    data.type === MSG_HEIGHT &&
    typeof data.height === "number" &&
    Number.isFinite(data.height) &&
    data.height >= 0
  );
}

export function isReadyMessage(data: unknown): data is ReadyMessage {
  return isRecord(data) && data.type === MSG_READY;
}

const nullableString = (value: unknown) => value === null || typeof value === "string";

export function isPrefsMessage(data: unknown): data is PrefsMessage {
  return (
    isRecord(data) &&
    data.type === MSG_PREFS &&
    nullableString(data.theme) &&
    nullableString(data.style) &&
    nullableString(data.accent)
  );
}
