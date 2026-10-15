"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACCENT_STORAGE_KEY,
  type AccentColor,
  isAccentColor,
} from "@/lib/accents";

export type { AccentColor };
// Future: "hugeicons" | "phosphor" | "tabler"
export type IconSet = "lucide";

type Preferences = {
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  iconSet: IconSet;
  setIconSet: (set: IconSet) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
};

const PreferencesCtx = createContext<Preferences | null>(null);

export function usePreferences() {
  const ctx = useContext(PreferencesCtx);
  if (!ctx)
    throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return ctx;
}

/**
 * Site-only customization: the accent color (saved in localStorage and
 * applied before paint by accentInitScript, as data-accent on <html>) and the
 * icon set (not persisted yet).
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  // Starts at "default" on both server and client; the real value is read
  // from the attribute the init script already set, after mount.
  const [accent, setAccentState] = useState<AccentColor>("default");
  const [iconSet, setIconSet] = useState<IconSet>("lucide");
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const saved = document.documentElement.dataset.accent;
    if (isAccentColor(saved)) setAccentState(saved);
  }, []);

  const setAccent = useCallback((next: AccentColor) => {
    setAccentState(next);
    const el = document.documentElement;
    if (next === "default") delete el.dataset.accent;
    else el.dataset.accent = next;
    try {
      if (next === "default") localStorage.removeItem(ACCENT_STORAGE_KEY);
      else localStorage.setItem(ACCENT_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies.
    }
  }, []);

  const value = useMemo(
    () => ({
      accent,
      setAccent,
      iconSet,
      setIconSet,
      panelOpen,
      setPanelOpen,
    }),
    [accent, setAccent, iconSet, panelOpen],
  );

  return (
    <PreferencesCtx.Provider value={value}>{children}</PreferencesCtx.Provider>
  );
}
