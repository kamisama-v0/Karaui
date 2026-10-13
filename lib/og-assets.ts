export function getOgAssets(origin: string) {
  return {
    logoSrc: new URL("/karaui-mark.png", origin).toString(),
    backgroundSrc: new URL("/og/dither-wave.png", origin).toString(),
  };
}
