"use client";

import { Cookie, Lock } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/motion/button";
import { Switch } from "@/components/motion/switch";
import { EASE_OUT, SPRING_PANEL } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface CookiePreferences {
  /** Always true — required for the site to work. */
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export type CookieConsentPosition = "bottom-left" | "bottom" | "bottom-right";

type OptionalCategory = "analytics" | "marketing";

const CATEGORIES: {
  key: keyof CookiePreferences;
  label: string;
  description: string;
}[] = [
  {
    key: "necessary",
    label: "Necessary",
    description: "Sign-in, security and saving these choices. Always on.",
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Anonymous usage stats that help us improve the product.",
  },
  {
    key: "marketing",
    label: "Marketing",
    description: "Personalised ads and measuring campaigns across sites.",
  },
];

const POSITION_CLASS: Record<CookieConsentPosition, string> = {
  "bottom-left": "bottom-4 left-4 max-w-sm",
  bottom: "inset-x-0 bottom-4 mx-auto max-w-xl",
  "bottom-right": "right-4 bottom-4 max-w-sm",
};

export interface CookieConsentProps {
  /** Called with the final preferences whenever the visitor decides. */
  onConsentChange?: (preferences: CookiePreferences) => void;
  /**
   * Persist the choice to `localStorage` under this key. When a saved choice
   * exists the banner stays hidden. Read after mount, so SSR output is stable.
   */
  storageKey?: string;
  position?: CookieConsentPosition;
  /**
   * Position inside the nearest positioned ancestor (`absolute`) instead of the
   * viewport (`fixed`). Use for previews and contained layouts.
   */
  contained?: boolean;
  /** Delay before sliding up, in ms. Default 500. */
  delay?: number;
  /** Starting state of the optional toggles in the Customize panel. */
  defaultPreferences?: Partial<Pick<CookiePreferences, OptionalCategory>>;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
}

function readStored(key: string): CookiePreferences | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookiePreferences> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

function writeStored(key: string, preferences: CookiePreferences) {
  try {
    window.localStorage.setItem(key, JSON.stringify(preferences));
  } catch {
    // Private mode / blocked storage: the callback still reports the choice.
  }
}

/**
 * Cookie consent card that slides up after mount with Accept all / Reject
 * non-essential / Customize. Customize grows the card into per-category
 * toggles (Necessary locked on) with Save. Non-modal: it never traps focus.
 */
export function CookieConsent({
  onConsentChange,
  storageKey,
  position = "bottom-right",
  contained = false,
  delay = 500,
  defaultPreferences,
  title = "We use cookies",
  description = "Some are essential to run the site. Others help us understand usage and show relevant ads — only with your permission.",
  className,
}: CookieConsentProps) {
  const reduce = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState({
    analytics: defaultPreferences?.analytics ?? false,
    marketing: defaultPreferences?.marketing ?? false,
  });
  const titleId = useId();
  const firstToggleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (storageKey && readStored(storageKey)) return;
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [storageKey, delay]);

  // Move focus into the expanded panel so keyboard users land on the toggles.
  useEffect(() => {
    if (!customizing) return;
    const frame = requestAnimationFrame(() => {
      firstToggleRef.current
        ?.querySelector<HTMLElement>("[role='switch']:not([disabled])")
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [customizing]);

  const decide = (preferences: CookiePreferences) => {
    if (storageKey) writeStored(storageKey, preferences);
    onConsentChange?.(preferences);
    setVisible(false);
  };

  const acceptAll = () => decide({ necessary: true, analytics: true, marketing: true });
  const rejectAll = () => decide({ necessary: true, analytics: false, marketing: false });
  const save = () => decide({ necessary: true, ...draft });

  return (
    <AnimatePresence>
      {visible ? (
        <motion.section
          key="cookie-consent"
          aria-labelledby={titleId}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.15 } }
              : { opacity: 0, y: 24, transition: { duration: 0.18, ease: EASE_OUT } }
          }
          transition={reduce ? { duration: 0.2 } : SPRING_PANEL}
          className={cn(
            contained ? "absolute" : "fixed",
            "z-50 w-[calc(100%-2rem)] rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-2xl",
            POSITION_CLASS[position],
            className,
          )}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/[0.06] text-foreground"
            >
              <Cookie className="size-[18px]" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id={titleId} className="text-sm font-semibold tracking-tight">
                {title}
              </h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          {/* Height is animated on purpose: growing the card into the toggle
              list is what this disclosure is for. */}
          <AnimatePresence initial={false}>
            {customizing ? (
              <motion.div
                key="categories"
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: "auto",
                  opacity: 1,
                  transition: reduce
                    ? { height: { duration: 0 }, opacity: { duration: 0.2 } }
                    : {
                        height: { duration: 0.28, ease: EASE_OUT },
                        opacity: { duration: 0.2, delay: 0.08 },
                      },
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: reduce
                    ? { height: { duration: 0, delay: 0.12 }, opacity: { duration: 0.12 } }
                    : { height: { duration: 0.2, ease: EASE_OUT }, opacity: { duration: 0.1 } },
                }}
                className="overflow-hidden"
              >
                <div ref={firstToggleRef} className="mt-4 flex flex-col divide-y divide-border rounded-2xl border border-border bg-background">
                  {CATEGORIES.map((category) => {
                    const locked = category.key === "necessary";
                    const checked = locked ? true : draft[category.key as OptionalCategory];
                    return (
                      <div key={category.key} className="flex items-center gap-3 px-3.5 py-3">
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-center gap-1.5 text-[13px] font-medium">
                            {category.label}
                            {locked ? (
                              <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
                            ) : null}
                          </span>
                          <span className="text-xs leading-snug text-muted-foreground">
                            {category.description}
                          </span>
                        </div>
                        <Switch
                          checked={checked}
                          disabled={locked}
                          ariaLabel={locked ? `${category.label} cookies (always on)` : `${category.label} cookies`}
                          onCheckedChange={(next) => {
                            if (locked) return;
                            setDraft((prev) => ({ ...prev, [category.key]: next }));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            {customizing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setCustomizing(false)}>
                  Back
                </Button>
                <Button size="sm" variant="outline" onClick={acceptAll}>
                  Accept all
                </Button>
                <Button size="sm" onClick={save}>
                  Save preferences
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCustomizing(true)}
                  className="mr-auto"
                >
                  Customize
                </Button>
                <Button size="sm" variant="outline" onClick={rejectAll}>
                  Reject non-essential
                </Button>
                <Button size="sm" onClick={acceptAll}>
                  Accept all
                </Button>
              </>
            )}
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
