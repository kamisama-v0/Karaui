"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_STYLE,
  type DesignStyleId,
  isDesignStyleId,
  STYLE_STORAGE_KEY,
} from "@/lib/styles";

/*
 * The design style lives on <html data-style> (set before paint by the inline
 * script in the root layout). That attribute is the source of truth; this
 * module is a tiny external store over it so every picker stays in sync
 * without a provider.
 */

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readStyle(): DesignStyleId {
  const value = document.documentElement.getAttribute("data-style");
  return isDesignStyleId(value) ? value : DEFAULT_STYLE;
}

function serverStyle(): DesignStyleId {
  return DEFAULT_STYLE;
}

function applyStyle(id: DesignStyleId) {
  const root = document.documentElement;
  if (id === DEFAULT_STYLE) root.removeAttribute("data-style");
  else root.setAttribute("data-style", id);
  try {
    if (id === DEFAULT_STYLE) localStorage.removeItem(STYLE_STORAGE_KEY);
    else localStorage.setItem(STYLE_STORAGE_KEY, id);
  } catch {
    // Storage can be unavailable (private mode, blocked); the style still applies.
  }
  for (const listener of listeners) listener();
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

/**
 * Current design style plus a setter. The setter persists to localStorage and
 * re-skins the page inside a view transition (a top-down wipe) when the
 * browser supports it and the user hasn't asked for reduced motion.
 */
export function useDesignStyle() {
  const style = useSyncExternalStore(subscribe, readStyle, serverStyle);

  const setStyle = useCallback((next: DesignStyleId) => {
    if (next === readStyle()) return;
    const doc = document as ViewTransitionDocument;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof doc.startViewTransition !== "function") {
      applyStyle(next);
      return;
    }
    const root = document.documentElement;
    root.dataset.styleVt = "";
    const vt = doc.startViewTransition(() => applyStyle(next));
    vt.finished.finally(() => {
      delete root.dataset.styleVt;
    });
  }, []);

  return { style, setStyle };
}
