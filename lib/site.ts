/** Canonical site origin. Override per environment via NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://karaui.kamisama-v0.my.id"
).replace(/\/$/, "");

/** shadcn namespace the install commands use (`npx shadcn add @karaui/…`). */
export const REGISTRY_NAMESPACE = "@karaui";

/** Item URL template for the namespace; `{name}` is the install slug. */
export const REGISTRY_URL_TEMPLATE = `${SITE_URL}/r/{name}.json`;

/**
 * `components.json` entry that makes the namespace resolve. @karaui is listed
 * in shadcn's public registry directory, so current CLIs resolve it without
 * this; it stays as a fallback for older CLIs and pinned/mirrored setups.
 */
export const REGISTRY_CONFIG = JSON.stringify(
  { registries: { [REGISTRY_NAMESPACE]: REGISTRY_URL_TEMPLATE } },
  null,
  2,
);
