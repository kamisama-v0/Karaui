import { promises as fs } from "node:fs";
import path from "node:path";

const FONT_FILES = {
  regular: "og/fonts/Geist-Regular.ttf",
  medium: "og/fonts/Geist-Medium.ttf",
  mono: "og/fonts/GeistMono-Medium.ttf",
} as const;

let cache: ReturnType<typeof createFonts> | undefined;

// Read from disk rather than fetching our own origin: behind a reverse proxy
// the request origin (https://host:3000) is not something the server can reach.
function loadFont(rel: string) {
  return fs.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", rel));
}

async function createFonts() {
  const [regular, medium, mono] = await Promise.all([
    loadFont(FONT_FILES.regular),
    loadFont(FONT_FILES.medium),
    loadFont(FONT_FILES.mono),
  ]);

  return [
    { name: "Geist", data: regular, weight: 400 as const },
    { name: "Geist", data: medium, weight: 500 as const },
    { name: "Geist Mono", data: mono, weight: 500 as const },
  ];
}

export function getOgFonts() {
  cache ??= createFonts();
  return cache;
}
