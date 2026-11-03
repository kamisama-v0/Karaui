import { describe, expect, test } from "bun:test";
import {
  clampFrameHeight,
  clampFrameWidth,
  FRAME_BOUNDS,
  isHeightMessage,
  isPrefsMessage,
  isReadyMessage,
  MIN_FRAME_WIDTH,
  MSG_HEIGHT,
  MSG_PREFS,
  MSG_READY,
  PRESET_WIDTHS,
  presetFor,
  presetTarget,
  previewPath,
} from "@/lib/preview-frame";
import { buildFileTree } from "@/lib/file-tree";
import { entryFilesFor, findComponent, installSlugFor } from "@/lib/registry";
import sitemap from "@/app/sitemap";

describe("preview frame protocol", () => {
  test("accepts well-formed messages only", () => {
    expect(isHeightMessage({ type: MSG_HEIGHT, height: 420 })).toBe(true);
    expect(isHeightMessage({ type: MSG_HEIGHT, height: Number.NaN })).toBe(false);
    expect(isHeightMessage({ type: MSG_HEIGHT, height: "420" })).toBe(false);
    expect(isHeightMessage({ type: MSG_PREFS, height: 420 })).toBe(false);
    expect(isHeightMessage(null)).toBe(false);
    expect(isReadyMessage({ type: MSG_READY })).toBe(true);
    expect(isPrefsMessage({ type: MSG_PREFS, theme: "dark", style: null, accent: "blue" })).toBe(true);
    expect(isPrefsMessage({ type: MSG_PREFS, theme: 1, style: null, accent: null })).toBe(false);
    expect(isPrefsMessage({ type: MSG_PREFS })).toBe(false);
  });

  test("clamps the frame height per viewer kind", () => {
    expect(clampFrameHeight(10)).toBe(FRAME_BOUNDS.primitive.min);
    expect(clampFrameHeight(5000)).toBe(FRAME_BOUNDS.primitive.max);
    expect(clampFrameHeight(500.2)).toBe(501);
    expect(clampFrameHeight(10, "block")).toBe(FRAME_BOUNDS.block.min);
    expect(clampFrameHeight(5000, "block")).toBe(FRAME_BOUNDS.block.max);
  });

  test("clamps the frame width to the row", () => {
    expect(clampFrameWidth(2000, 1000)).toBe(1000);
    expect(clampFrameWidth(10, 1000)).toBe(MIN_FRAME_WIDTH);
    expect(clampFrameWidth(10, 200)).toBe(200);
    expect(clampFrameWidth(500.4, 1000)).toBe(500);
  });

  test("maps presets to widths and back", () => {
    expect(presetTarget("desktop")).toBeNull();
    expect(presetTarget("tablet")).toBe(PRESET_WIDTHS.tablet);
    expect(presetTarget("mobile")).toBe(PRESET_WIDTHS.mobile);
    expect(presetFor(null)).toBe("desktop");
    expect(presetFor(768)).toBe("tablet");
    expect(presetFor(375)).toBe("mobile");
    expect(presetFor(512)).toBeNull();
  });

  test("preview pages stay out of the sitemap", () => {
    expect(previewPath("motion/button")).toBe("/preview/motion/button");
    expect(sitemap().some((entry) => entry.url.includes("/preview/"))).toBe(false);
  });
});

describe("block viewer code view", () => {
  test("builds a compact, sorted file tree", () => {
    const tree = buildFileTree([
      "components/previews/blocks/swap.preview.tsx",
      "components/motion/swap.tsx",
      "components/motion/swap/token.tsx",
      "lib/utils.ts",
      "lib/ease.ts",
    ]);
    expect(tree.map((node) => node.name)).toEqual(["components", "lib"]);
    const components = tree[0];
    if (components?.type !== "folder") throw new Error("expected a folder");
    expect(components.children.map((node) => node.name)).toEqual(["motion", "previews/blocks"]);
    const lib = tree[1];
    if (lib?.type !== "folder") throw new Error("expected a folder");
    expect(lib.children.map((node) => node.path)).toEqual(["lib/ease.ts", "lib/utils.ts"]);
  });

  test("resolves install slugs and entry files for variants", () => {
    const button = findComponent("motion", "button");
    const tilt = findComponent("motion", "tilt-card");
    if (!button?.examples?.[0] || !tilt) throw new Error("registry entries missing");
    const base = button.examples[0];
    expect(installSlugFor(button)).toBeNull();
    expect(installSlugFor(button, base)).toBe(base.installSlug ?? null);
    expect(entryFilesFor(button, base)).toEqual([base.file]);
    expect(installSlugFor(tilt)).toBe("tilt-card");
    expect(entryFilesFor(tilt)).toEqual([tilt.file]);
  });
});
