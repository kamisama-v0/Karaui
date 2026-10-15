"use client";

import { Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/motion/dropdown-menu";
import { useDesignStyle } from "@/components/app/chrome/use-design-style";
import {
  DESIGN_STYLES,
  type DesignStyle,
  isDesignStyleId,
  styleSwatch,
} from "@/lib/styles";
import { cn } from "@/lib/utils";

/** Mini preview of a style: its canvas, three key colors and its corner. */
export function StyleSwatch({
  style,
  mode,
  className,
}: {
  style: DesignStyle;
  mode: "light" | "dark";
  className?: string;
}) {
  const sw = styleSwatch(style, mode);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center justify-center gap-0.5 border",
        className,
      )}
      style={{
        background: sw.background,
        borderColor: sw.border,
        borderRadius: sw.radius,
      }}
    >
      {sw.dots.map((color, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed three-dot swatch
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: color }}
        />
      ))}
    </span>
  );
}

/** Light/dark of the page, read after mount so SSR and hydration agree. */
export function useResolvedMode(): "light" | "dark" {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && resolvedTheme === "dark" ? "dark" : "light";
}

/**
 * Site chrome: picks the design style (independent from light/dark). Opens the
 * library DropdownMenu with a radio row per style; rows stay open so styles
 * can be compared one after another.
 */
export function StylePicker({
  className,
  iconClassName,
  side = "bottom",
  align = "end",
  menuClassName,
}: {
  className?: string;
  iconClassName?: string;
  side?: "bottom" | "top";
  align?: "start" | "center" | "end";
  /** Class for the menu's wrapper element (e.g. h-full w-full in a dock). */
  menuClassName?: string;
}) {
  const { style, setStyle } = useDesignStyle();
  const mode = useResolvedMode();
  const current = DESIGN_STYLES.find((s) => s.id === style);

  return (
    // No hover tooltip: it would sit on top of the open menu. The trigger's
    // accessible name and title carry the label instead.
    <DropdownMenu className={menuClassName}>
      <DropdownMenuTrigger>
        <button
          type="button"
          aria-label={`Design style: ${current?.name ?? "karaUI"}`}
          title="Design style"
          className={className}
        >
          <Palette className={cn("h-4 w-4", iconClassName)} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        ariaLabel="Design style"
        className="w-60"
      >
        <DropdownMenuLabel>Design style</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={style}
          onValueChange={(v) => {
            if (isDesignStyleId(v)) setStyle(v);
          }}
          ariaLabel="Design styles"
        >
          {DESIGN_STYLES.map((s) => (
            <DropdownMenuRadioItem key={s.id} value={s.id} textValue={s.name}>
              <span className="flex items-center gap-2.5">
                <StyleSwatch style={s} mode={mode} />
                <span className="truncate">{s.name}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
