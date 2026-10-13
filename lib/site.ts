/** Canonical site origin. Override per environment via NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://karaui.dev"
).replace(/\/$/, "");
