"use client";

import { motion, useReducedMotion } from "motion/react";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                  Platform                                  */
/* -------------------------------------------------------------------------- */

function detectApple() {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * True on Apple platforms. Always `true` on the server and the first client
 * render (so markup matches), then corrected after mount — `Mod` therefore
 * renders ⌘ first and swaps to Ctrl on other platforms.
 */
export function useIsApple() {
  const [apple, setApple] = useState(true);
  useEffect(() => setApple(detectApple()), []);
  return apple;
}

type KeyLabel = { glyph: string; name: string };

/** Display glyph + spoken name for a key token like "mod", "shift", "k". */
export function keyLabel(key: string, apple: boolean): KeyLabel {
  const k = key.toLowerCase();
  switch (k) {
    case "mod":
      return apple
        ? { glyph: "⌘", name: "Command" }
        : { glyph: "Ctrl", name: "Control" };
    case "cmd":
    case "command":
    case "meta":
      return apple
        ? { glyph: "⌘", name: "Command" }
        : { glyph: "Win", name: "Windows" };
    case "ctrl":
    case "control":
      return apple
        ? { glyph: "⌃", name: "Control" }
        : { glyph: "Ctrl", name: "Control" };
    case "shift":
      return apple
        ? { glyph: "⇧", name: "Shift" }
        : { glyph: "Shift", name: "Shift" };
    case "alt":
    case "option":
      return apple
        ? { glyph: "⌥", name: "Option" }
        : { glyph: "Alt", name: "Alt" };
    case "enter":
    case "return":
      return { glyph: "↵", name: "Enter" };
    case "esc":
    case "escape":
      return { glyph: "Esc", name: "Escape" };
    case "backspace":
      return { glyph: "⌫", name: "Backspace" };
    case "delete":
      return { glyph: "⌦", name: "Delete" };
    case "tab":
      return { glyph: "⇥", name: "Tab" };
    case "space":
      return { glyph: "Space", name: "Space" };
    case "up":
    case "arrowup":
      return { glyph: "↑", name: "Up arrow" };
    case "down":
    case "arrowdown":
      return { glyph: "↓", name: "Down arrow" };
    case "left":
    case "arrowleft":
      return { glyph: "←", name: "Left arrow" };
    case "right":
    case "arrowright":
      return { glyph: "→", name: "Right arrow" };
    default:
      return key.length === 1
        ? { glyph: key.toUpperCase(), name: key.toUpperCase() }
        : { glyph: key, name: key };
  }
}

/* -------------------------------------------------------------------------- */
/*                               Key listening                                */
/* -------------------------------------------------------------------------- */

/** Does this keyboard event's key correspond to the token? */
function eventMatches(token: string, event: KeyboardEvent, apple: boolean) {
  const k = token.toLowerCase();
  const key = event.key.toLowerCase();
  switch (k) {
    case "mod":
      return key === (apple ? "meta" : "control");
    case "cmd":
    case "command":
    case "meta":
      return key === "meta";
    case "ctrl":
    case "control":
      return key === "control";
    case "alt":
    case "option":
      return key === "alt";
    case "esc":
      return key === "escape";
    case "return":
      return key === "enter";
    case "space":
      return event.code === "Space";
    case "up":
    case "down":
    case "left":
    case "right":
      return key === `arrow${k}`;
    default:
      // Letters and digits by physical key, so Shift/Option variants
      // ("P" with Shift, "π" with Option) still match.
      if (/^[a-z]$/.test(k)) return event.code === `Key${k.toUpperCase()}`;
      if (/^[0-9]$/.test(k)) return event.code === `Digit${k}`;
      return key === k;
  }
}

const MODIFIERS = new Set(["meta", "control", "shift", "alt"]);

/**
 * Tracks which of `keys` are physically held. Listens on window without
 * preventing default, so it never steals the shortcut from the page.
 */
export function useKeysPressed(keys: string[], enabled = true) {
  const apple = useIsApple();
  const [held, setHeld] = useState<boolean[]>(() => keys.map(() => false));
  const signature = keys.join("+");

  useEffect(() => {
    const tokens = signature.split("+");
    setHeld(tokens.map(() => false));
    if (!enabled) return;
    const down = new Set<number>();
    const sync = () => setHeld(tokens.map((_, i) => down.has(i)));

    const onDown = (event: KeyboardEvent) => {
      let changed = false;
      tokens.forEach((token, i) => {
        if (!down.has(i) && eventMatches(token, event, apple)) {
          down.add(i);
          changed = true;
        }
      });
      if (changed) sync();
    };
    const onUp = (event: KeyboardEvent) => {
      // macOS swallows keyup for other keys while ⌘ is held, so releasing a
      // modifier releases everything.
      if (MODIFIERS.has(event.key.toLowerCase()) && apple) {
        down.clear();
        sync();
        return;
      }
      let changed = false;
      tokens.forEach((token, i) => {
        if (down.has(i) && eventMatches(token, event, apple)) {
          down.delete(i);
          changed = true;
        }
      });
      if (changed) sync();
    };
    const reset = () => {
      down.clear();
      sync();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", reset);
    };
  }, [signature, enabled, apple]);

  return held;
}

/* -------------------------------------------------------------------------- */
/*                                    Kbd                                     */
/* -------------------------------------------------------------------------- */

type KbdSize = "sm" | "md";

const SIZE: Record<KbdSize, string> = {
  sm: "h-5 min-w-5 px-1 text-[11px] rounded-[5px] border-b-[2px]",
  md: "h-6 min-w-6 px-1.5 text-xs rounded-md border-b-[3px]",
};

// How far the key drops when pressed, in px — matches the thicker bottom edge
// so the cap visibly sinks into its base.
const DIP: Record<KbdSize, number> = { sm: 1.5, md: 2 };

export interface KbdProps {
  /** A key token ("mod", "shift", "k", "enter"…) or any custom content. */
  children: ReactNode;
  size?: KbdSize;
  /** Show the key pressed (spring dip). */
  pressed?: boolean;
  /** Dip when the real key is held. Needs `children` to be a key token string. */
  listen?: boolean;
  className?: string;
}

/**
 * A single keyboard key. String children are treated as key tokens, so
 * `<Kbd>mod</Kbd>` renders ⌘ on Apple platforms and Ctrl elsewhere.
 */
export function Kbd({
  children,
  size = "md",
  pressed = false,
  listen = false,
  className,
}: KbdProps) {
  const apple = useIsApple();
  const token = typeof children === "string" ? children : null;
  const [held] = useKeysPressed(token ? [token] : [], listen && token !== null);
  const label = token ? keyLabel(token, apple) : null;

  return (
    <KeyCap
      size={size}
      pressed={pressed || Boolean(held)}
      title={label?.name}
      className={className}
    >
      {label ? label.glyph : children}
    </KeyCap>
  );
}

function KeyCap({
  children,
  size,
  pressed,
  title,
  className,
}: {
  children: ReactNode;
  size: KbdSize;
  pressed: boolean;
  title?: string;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.kbd
      title={title}
      data-pressed={pressed ? "" : undefined}
      initial={false}
      animate={
        reduce
          ? { opacity: pressed ? 0.7 : 1 }
          : { y: pressed ? DIP[size] : 0, scale: pressed ? 0.96 : 1 }
      }
      transition={reduce ? { duration: 0.1 } : SPRING_PRESS}
      className={cn(
        "inline-flex select-none items-center justify-center border border-border border-b-border-strong bg-muted font-sans font-medium leading-none text-muted-foreground",
        "data-[pressed]:border-b-border data-[pressed]:bg-foreground/[0.08] data-[pressed]:text-foreground",
        SIZE[size],
        className,
      )}
    >
      {children}
    </motion.kbd>
  );
}

export interface KbdComboProps {
  /** Key tokens, e.g. ["mod", "shift", "p"]. */
  keys: string[];
  size?: KbdSize;
  /** Show every key pressed. */
  pressed?: boolean;
  /** Dip each key while the real key is held. */
  listen?: boolean;
  /** Text between keys. Default none on Apple, "+" elsewhere. */
  separator?: ReactNode;
  className?: string;
}

/**
 * A key combination: one chip per key, platform-aware, with a spoken label
 * ("Command + Shift + P") for assistive tech.
 */
export function KbdCombo({
  keys,
  size = "md",
  pressed = false,
  listen = false,
  separator,
  className,
}: KbdComboProps) {
  const apple = useIsApple();
  const held = useKeysPressed(keys, listen);
  const labels = keys.map((key) => keyLabel(key, apple));
  const sep = separator === undefined ? (apple ? null : "+") : separator;

  return (
    <kbd
      className={cn(
        "inline-flex items-center gap-1 font-sans text-muted-foreground",
        className,
      )}
    >
      <span className="sr-only">{labels.map((l) => l.name).join(" + ")}</span>
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        {labels.map((label, i) => (
          <Fragment key={keys[i]}>
            {i > 0 && sep !== null ? (
              <span className="text-[10px] text-muted-foreground/70">{sep}</span>
            ) : null}
            <KeyCap size={size} pressed={pressed || Boolean(held[i])}>
              {label.glyph}
            </KeyCap>
          </Fragment>
        ))}
      </span>
    </kbd>
  );
}
