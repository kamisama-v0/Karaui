"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef } from "react";
import {
  isHeightMessage,
  isReadyMessage,
  MSG_PREFS,
  type PrefsMessage,
} from "@/lib/preview-frame";
import { cn } from "@/lib/utils";

/**
 * The iframe of a bare /preview page. Pushes the page's theme setting, design
 * style and accent into the frame as they change, and hands the frame's
 * reported content height up. Messages are accepted only from this frame's
 * window on this origin.
 */
export function PreviewFrame({
  src,
  title,
  height,
  onContentHeight,
  passive,
  className,
}: {
  src: string;
  title: string;
  height: number;
  onContentHeight: (height: number) => void;
  /** Ignore pointer input (while the width handle is dragged over it). */
  passive?: boolean;
  className?: string;
}) {
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onHeightRef = useRef(onContentHeight);
  onHeightRef.current = onContentHeight;

  const postPrefs = useCallback(() => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    const root = document.documentElement;
    const message: PrefsMessage = {
      type: MSG_PREFS,
      theme: themeRef.current ?? null,
      style: root.getAttribute("data-style"),
      accent: root.getAttribute("data-accent"),
    };
    target.postMessage(message, window.location.origin);
  }, []);

  // Theme setting changes (light/dark/system) are pushed right away; the
  // observer below catches the class flip as well as style/accent changes.
  useEffect(() => {
    themeRef.current = theme;
    postPrefs();
  }, [theme, postPrefs]);

  useEffect(() => {
    const observer = new MutationObserver(postPrefs);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-style", "data-accent"],
    });
    return () => observer.disconnect();
  }, [postPrefs]);

  useEffect(() => {
    const origin = window.location.origin;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      if (isHeightMessage(event.data)) onHeightRef.current(event.data.height);
      else if (isReadyMessage(event.data)) postPrefs();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postPrefs]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      loading="lazy"
      onLoad={postPrefs}
      className={cn("block w-full border-0 bg-background", passive && "pointer-events-none", className)}
      style={{ height }}
    />
  );
}
