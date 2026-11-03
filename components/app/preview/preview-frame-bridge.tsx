"use client";

import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useRef } from "react";
import { isAccentColor } from "@/lib/accents";
import {
  isPrefsMessage,
  MSG_HEIGHT,
  MSG_READY,
  type PrefsMessage,
} from "@/lib/preview-frame";
import { DEFAULT_STYLE, isDesignStyleId } from "@/lib/styles";

function applyPrefs(
  { style, accent }: PrefsMessage,
  root: HTMLElement = document.documentElement,
) {
  if (isDesignStyleId(style) && style !== DEFAULT_STYLE) root.setAttribute("data-style", style);
  else root.removeAttribute("data-style");
  if (isAccentColor(accent) && accent !== "default") root.setAttribute("data-accent", accent);
  else root.removeAttribute("data-accent");
}

/**
 * Wraps a preview on the bare /preview route. When framed by a component
 * page it reports the content height to the parent (so the frame can fit it)
 * and applies the parent's theme, design style and accent as they change.
 * Opened directly in a tab it is just a centered preview; the pre-paint init
 * scripts in the root layout already applied the saved preferences.
 */
export function PreviewFrameBridge({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const parent = window.parent;
    const el = contentRef.current;
    if (parent === window || !el) return;
    const origin = window.location.origin;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== parent) return;
      if (!isPrefsMessage(event.data)) return;
      applyPrefs(event.data);
      const next = event.data.theme;
      if (next && next !== themeRef.current) setTheme(next);
    };
    window.addEventListener("message", onMessage);
    parent.postMessage({ type: MSG_READY }, origin);

    // Report the content's own height, not the document's: the page is at
    // least one viewport tall, so the document would never let the frame
    // shrink back down.
    let last = -1;
    let frame = 0;
    const report = () => {
      frame = 0;
      const height = Math.ceil(Math.max(el.getBoundingClientRect().height, el.scrollHeight));
      if (height === last) return;
      last = height;
      parent.postMessage({ type: MSG_HEIGHT, height }, origin);
    };
    const observer = new ResizeObserver(() => {
      if (!frame) frame = requestAnimationFrame(report);
    });
    observer.observe(el);
    report();

    return () => {
      window.removeEventListener("message", onMessage);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [setTheme]);

  return (
    <div className="preview-stage flex min-h-dvh items-center justify-center">
      <div ref={contentRef} className="flex w-full min-w-0 justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
