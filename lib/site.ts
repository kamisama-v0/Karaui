/** Canonical site origin. Override per environment via NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://karaui.kamisama-v0.my.id"
).replace(/\/$/, "");

/** shadcn namespace the install commands use (`npx shadcn add @karaui/…`). */
export const REGISTRY_NAMESPACE = "@karaui";

/** Item URL template for the namespace; `{name}` is the install slug. */
export const REGISTRY_URL_TEMPLATE = `${SITE_URL}/r/{name}.json`;

/**
 * One-time `components.json` entry that makes the namespace resolve. Needed
 * until @karaui is listed in shadcn's public registry directory.
 */
export const REGISTRY_CONFIG = JSON.stringify(
  { registries: { [REGISTRY_NAMESPACE]: REGISTRY_URL_TEMPLATE } },
  null,
  2,
);
