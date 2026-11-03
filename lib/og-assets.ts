import { promises as fs } from "node:fs";
import path from "node:path";

let cache: Promise<{ logoSrc: string; backgroundSrc: string }> | undefined;

// Inline the images as data URIs so rendering never fetches our own origin.
async function dataUri(rel: string) {
  const file = await fs.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", rel));
  return `data:image/png;base64,${file.toString("base64")}`;
}

export function getOgAssets() {
  cache ??= Promise.all([dataUri("karaui-mark.png"), dataUri("og/dither-wave.png")]).then(
    ([logoSrc, backgroundSrc]) => ({ logoSrc, backgroundSrc }),
  );
  return cache;
}
