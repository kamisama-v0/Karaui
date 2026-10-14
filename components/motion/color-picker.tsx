"use client";

import { Pipette } from "lucide-react";
import {
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/components/motion/popover-morph";
import { EASE_OUT, SPRING_LAYOUT, SPRING_MOUSE } from "@/lib/ease";
import { useSlider } from "@/lib/hooks/use-slider";
import { capturePointer, releasePointer, TOUCH_GESTURE_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                 Color math                                 */
/* -------------------------------------------------------------------------- */

/** Hue 0–360, saturation/value/alpha 0–1. */
export interface HSVA {
  h: number;
  s: number;
  v: number;
  a: number;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

export function hsvToRgb({ h, s, v, a }: HSVA): RGBA {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return {
    r: Math.round(f(5) * 255),
    g: Math.round(f(3) * 255),
    b: Math.round(f(1) * 255),
    a,
  };
}

/** `fallbackHue` keeps the hue when the color is gray, where hue is undefined. */
export function rgbToHsv({ r, g, b, a }: RGBA, fallbackHue = 0): HSVA {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = fallbackHue;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max, a };
}

/** Accepts `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, with or without `#`. */
export function parseHex(input: string): RGBA | null {
  let hex = input.trim().replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]+$/.test(hex) || ![3, 4, 6, 8].includes(hex.length)) {
    return null;
  }
  if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("");
  const n = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? n(6) / 255 : 1 };
}

const byte = (n: number) => Math.round(n).toString(16).padStart(2, "0");

/** Lowercase `#rrggbb`, or `#rrggbbaa` when `withAlpha` and alpha < 1. */
export function rgbToHex({ r, g, b, a }: RGBA, withAlpha = false): string {
  const base = `#${byte(r)}${byte(g)}${byte(b)}`;
  return withAlpha && a < 1 ? `${base}${byte(a * 255)}` : base;
}

export const hsvaToHex = (c: HSVA, withAlpha = false) =>
  rgbToHex(hsvToRgb(c), withAlpha);

function hexToHsva(hex: string, fallbackHue = 0): HSVA | null {
  const rgba = parseHex(hex);
  return rgba ? rgbToHsv(rgba, fallbackHue) : null;
}

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const DEFAULT_SWATCHES = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#18181b",
];

const HUE_GRADIENT =
  "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)";

const CHECKER = {
  backgroundImage: "repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%)",
  backgroundSize: "8px 8px",
} as const;

const SHAKE = { x: [0, -5, 5, -3, 3, 0] };

// A click that wanders less than this still counts as a click, so the
// jump-spring is not cut short by hand jitter.
const DRAG_SLOP = 3;

function useElementWidth(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/**
 * Pixel position for a thumb. Pointer-down and keyboard jumps spring there
 * (SPRING_MOUSE); a drag follows the pointer 1:1.
 */
function useThumb(
  target: number,
  springNext: RefObject<boolean>,
  reduce: boolean,
): MotionValue<number> {
  const mv = useMotionValue(target);
  useEffect(() => {
    if (reduce || !springNext.current) {
      mv.jump(target);
      return;
    }
    const controls = animate(mv, target, { type: "spring", ...SPRING_MOUSE });
    return () => controls.stop();
  }, [target, mv, reduce, springNext]);
  return mv;
}

/** Shared "spring the next move" flag, flipped off once a press becomes a drag. */
function useJumpFlag() {
  const springNext = useRef(false);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  return {
    springNext,
    down(event: PointerEvent) {
      springNext.current = true;
      downAt.current = { x: event.clientX, y: event.clientY };
    },
    move(event: PointerEvent) {
      const d = downAt.current;
      if (!d) return;
      if (Math.hypot(event.clientX - d.x, event.clientY - d.y) > DRAG_SLOP) {
        springNext.current = false;
        downAt.current = null;
      }
    },
    up() {
      downAt.current = null;
    },
    key() {
      springNext.current = true;
    },
  };
}

type JumpFlag = ReturnType<typeof useJumpFlag>;

/* -------------------------------------------------------------------------- */
/*                                ColorPicker                                 */
/* -------------------------------------------------------------------------- */

export interface ColorPickerProps {
  /** Controlled hex color (`#rrggbb`, or `#rrggbbaa` with `alpha`). */
  value?: string;
  /** Uncontrolled initial color. Default `#6366f1`. */
  defaultValue?: string;
  /** Receives lowercase hex; 8-digit only when `alpha` is on and alpha < 1. */
  onChange?: (hex: string) => void;
  /** Show the alpha slider and emit 8-digit hex when translucent. */
  alpha?: boolean;
  /** Preset colors. Pass `[]` to hide the row. */
  swatches?: string[];
  /** Show the hex text field. Default true. */
  showInput?: boolean;
  /** Show an eyedropper button where the browser supports the EyeDropper API. Default true. */
  eyeDropper?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ColorPicker({
  value: valueProp,
  defaultValue = "#6366f1",
  onChange,
  alpha = false,
  swatches = DEFAULT_SWATCHES,
  showInput = true,
  eyeDropper = true,
  disabled = false,
  className,
}: ColorPickerProps) {
  const uid = useId();
  const reduce = useReducedMotion() ?? false;
  const jump = useJumpFlag();

  // HSV is the source of truth so hue survives trips through gray and black.
  const [hsva, setHsva] = useState<HSVA>(
    () =>
      hexToHsva(valueProp ?? defaultValue) ?? { h: 239, s: 0.6, v: 0.95, a: 1 },
  );
  const hex = hsvaToHex(hsva, alpha);
  const lastEmitted = useRef(hex);

  // Pull in outside changes; ignore the parent echoing our own onChange.
  useEffect(() => {
    if (valueProp === undefined) return;
    const parsed = parseHex(valueProp);
    if (!parsed) return;
    const normalized = rgbToHex(parsed, alpha);
    if (normalized === lastEmitted.current) return;
    lastEmitted.current = normalized;
    setHsva((prev) => rgbToHsv(parsed, prev.h));
  }, [valueProp, alpha]);

  const update = (next: HSVA) => {
    setHsva(next);
    const out = hsvaToHex(next, alpha);
    if (out === lastEmitted.current) return;
    lastEmitted.current = out;
    onChange?.(out);
  };

  const rgb = hsvToRgb(hsva);
  const solid = `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;

  return (
    <div
      className={cn(
        "flex w-64 flex-col gap-3",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      <SaturationArea
        hsva={hsva}
        solid={solid}
        jump={jump}
        reduce={reduce}
        disabled={disabled}
        onChange={update}
      />

      <div className="flex items-center gap-3">
        <div
          className="relative size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-border"
          style={CHECKER}
        >
          <span
            className="absolute inset-0 transition-colors duration-150"
            style={{ backgroundColor: `rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${hsva.a})` }}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2.5">
          <ChannelSlider
            label="Hue"
            value={Math.round(hsva.h)}
            max={360}
            valueText={(v) => `Hue ${v}°`}
            background={HUE_GRADIENT}
            thumbColor={`hsl(${hsva.h} 100% 50%)`}
            jump={jump}
            reduce={reduce}
            disabled={disabled}
            onChange={(h) => update({ ...hsva, h })}
          />
          {alpha ? (
            <ChannelSlider
              label="Alpha"
              value={Math.round(hsva.a * 100)}
              max={100}
              valueText={(v) => `Opacity ${v}%`}
              background={`linear-gradient(to right, transparent, ${solid})`}
              checker
              thumbColor={`rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${hsva.a})`}
              jump={jump}
              reduce={reduce}
              disabled={disabled}
              onChange={(a) => update({ ...hsva, a: a / 100 })}
            />
          ) : null}
        </div>
      </div>

      {showInput ? (
        <HexField
          id={`${uid}-hex`}
          hex={hex}
          alpha={alpha}
          disabled={disabled}
          reduce={reduce}
          eyeDropper={eyeDropper}
          onCommit={(rgba) => {
            jump.key();
            update(rgbToHsv(alpha ? rgba : { ...rgba, a: 1 }, hsva.h));
          }}
        />
      ) : null}

      {swatches.length ? (
        <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only">Preset colors</legend>
          {swatches.map((swatch) => {
            const parsed = parseHex(swatch);
            if (!parsed) return null;
            const swatchHex = rgbToHex(parsed, alpha);
            const selected =
              swatchHex === hex ||
              (parsed.a === 1 && rgbToHex(parsed) === hsvaToHex(hsva));
            return (
              <motion.button
                key={swatch}
                type="button"
                disabled={disabled}
                aria-label={swatchHex}
                aria-pressed={selected}
                whileTap={reduce ? undefined : { scale: 0.88 }}
                onClick={() => {
                  jump.key();
                  update(
                    rgbToHsv(
                      alpha ? parsed : { ...parsed, a: 1 },
                      hsva.h,
                    ),
                  );
                }}
                className="relative size-6 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span
                  className="absolute inset-0 overflow-hidden rounded-full ring-1 ring-inset ring-black/10"
                  style={CHECKER}
                >
                  <span
                    className="absolute inset-0"
                    style={{ backgroundColor: swatch }}
                  />
                </span>
                {selected ? (
                  <motion.span
                    layoutId={`${uid}-swatch-ring`}
                    transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                    className="pointer-events-none absolute -inset-1 rounded-full border-2 border-foreground"
                  />
                ) : null}
              </motion.button>
            );
          })}
        </fieldset>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Saturation area                               */
/* -------------------------------------------------------------------------- */

function SaturationArea({
  hsva,
  solid,
  jump,
  reduce,
  disabled,
  onChange,
}: {
  hsva: HSVA;
  solid: string;
  jump: JumpFlag;
  reduce: boolean;
  disabled: boolean;
  onChange: (next: HSVA) => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const { width, height } = useElementWidth(areaRef);
  const x = useThumb(hsva.s * width, jump.springNext, reduce);
  const y = useThumb((1 - hsva.v) * height, jump.springNext, reduce);

  const fromPointer = (clientX: number, clientY: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    onChange({
      ...hsva,
      s: clamp((clientX - rect.left) / rect.width, 0, 1),
      v: 1 - clamp((clientY - rect.top) / rect.height, 0, 1),
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const big = e.shiftKey ? 0.1 : 0.01;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-big, 0],
      ArrowRight: [big, 0],
      ArrowUp: [0, big],
      ArrowDown: [0, -big],
      PageUp: [0, 0.1],
      PageDown: [0, -0.1],
      Home: [-1, 0],
      End: [1, 0],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    jump.key();
    onChange({
      ...hsva,
      s: clamp(hsva.s + move[0], 0, 1),
      v: clamp(hsva.v + move[1], 0, 1),
    });
  };

  const s = Math.round(hsva.s * 100);
  const v = Math.round(hsva.v * 100);

  return (
    // Pointer surface only — the focusable slider thumb inside carries role,
    // value and keyboard.
    <div
      ref={areaRef}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        dragging.current = true;
        jump.down(e);
        capturePointer(e.currentTarget, e.pointerId);
        thumbRef.current?.focus({ preventScroll: true });
        fromPointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        jump.move(e);
        fromPointer(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        jump.up();
        releasePointer(e.currentTarget, e.pointerId);
      }}
      onPointerCancel={() => {
        dragging.current = false;
        jump.up();
      }}
      className={cn(
        "relative h-40 w-full cursor-crosshair touch-none rounded-xl",
        TOUCH_GESTURE_CLASS,
      )}
      style={{ backgroundColor: `hsl(${hsva.h} 100% 50%)` }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-linear-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-linear-to-t from-black to-transparent" />
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10" />
      <motion.div
        ref={thumbRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={s}
        aria-valuetext={`Saturation ${s}%, brightness ${v}%`}
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        style={{ x, y, backgroundColor: solid, opacity: width ? 1 : 0 }}
        className="absolute left-0 top-0 -ml-2 -mt-2 size-4 rounded-full border-2 border-white shadow-md outline-none ring-1 ring-black/25 transition-[box-shadow] focus-visible:ring-4 focus-visible:ring-white/60"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Channel slider                               */
/* -------------------------------------------------------------------------- */

function ChannelSlider({
  label,
  value,
  max,
  valueText,
  background,
  checker = false,
  thumbColor,
  jump,
  reduce,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  valueText: (v: number) => string;
  background: string;
  checker?: boolean;
  thumbColor: string;
  jump: JumpFlag;
  reduce: boolean;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  const { trackProps, sliderProps, percent } = useSlider({
    value,
    onValueChange: onChange,
    min: 0,
    max,
    step: 1,
    disabled,
    "aria-label": label,
    formatValueText: valueText,
  });
  const { width } = useElementWidth(trackProps.ref);
  const x = useThumb((percent / 100) * width, jump.springNext, reduce);

  return (
    <div
      {...trackProps}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        jump.down(e);
        trackProps.onPointerDown(e);
      }}
      onPointerMove={(e) => {
        jump.move(e);
        trackProps.onPointerMove(e);
      }}
      onPointerUp={(e) => {
        jump.up();
        trackProps.onPointerUp(e);
      }}
      className={cn(
        "relative h-3 w-full cursor-pointer touch-none rounded-full",
        TOUCH_GESTURE_CLASS,
      )}
      style={checker ? CHECKER : undefined}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/10"
        style={{ backgroundImage: background }}
      />
      <motion.div
        {...sliderProps}
        onKeyDown={(e) => {
          jump.key();
          sliderProps.onKeyDown(e);
        }}
        style={{ x, opacity: width ? 1 : 0 }}
        className="absolute left-0 top-1/2 -ml-2.5 -mt-2.5 size-5 overflow-hidden rounded-full border-2 border-white shadow-md outline-none ring-1 ring-black/25 focus-visible:ring-4 focus-visible:ring-white/60"
      >
        <span className="absolute inset-0" style={checker ? CHECKER : undefined} />
        <span
          className="absolute inset-0"
          style={{ backgroundColor: thumbColor }}
        />
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Hex field                                 */
/* -------------------------------------------------------------------------- */

interface EyeDropperCtor {
  new (): { open: () => Promise<{ sRGBHex: string }> };
}

function HexField({
  id,
  hex,
  alpha,
  disabled,
  reduce,
  eyeDropper,
  onCommit,
}: {
  id: string;
  hex: string;
  alpha: boolean;
  disabled: boolean;
  reduce: boolean;
  eyeDropper: boolean;
  onCommit: (rgba: RGBA) => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  // Feature-detected after mount so server and client render the same markup.
  const [dropper, setDropper] = useState<EyeDropperCtor | null>(null);

  useEffect(() => {
    if (!eyeDropper) return;
    const ctor = (window as unknown as { EyeDropper?: EyeDropperCtor })
      .EyeDropper;
    if (ctor) setDropper(() => ctor);
  }, [eyeDropper]);

  const shown = draft ?? hex.slice(1).toUpperCase();
  const invalid = draft !== null && parseHex(draft) === null;

  const shake = () => {
    if (!reduce && fieldRef.current) {
      animate(fieldRef.current, SHAKE, { duration: 0.35, ease: EASE_OUT });
    }
  };

  const settle = () => {
    if (draft === null) return;
    if (invalid) shake();
    setDraft(null);
  };

  return (
    <div className="flex items-center gap-2">
      <motion.div
        ref={fieldRef}
        className={cn(
          "flex h-9 flex-1 items-center rounded-lg border border-border bg-background pl-2.5 text-sm transition-colors duration-150 focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-ring/40",
          invalid &&
            "border-destructive focus-within:border-destructive focus-within:ring-destructive/25",
        )}
      >
        <label htmlFor={id} className="select-none text-muted-foreground">
          <span aria-hidden>#</span>
          <span className="sr-only">Hex color</span>
        </label>
        <input
          id={id}
          type="text"
          value={shown}
          disabled={disabled}
          maxLength={alpha ? 9 : 7}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const next = e.target.value.replace(/^#/, "");
            setDraft(next);
            // Only complete 6/8-digit codes apply live; short forms wait for
            // commit so typing "abc" on the way to "abcdef" doesn't flash.
            const ok = next.length === 6 || (alpha && next.length === 8);
            const parsed = ok ? parseHex(next) : null;
            if (parsed) onCommit(parsed);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const parsed = draft === null ? null : parseHex(draft);
              if (parsed) onCommit(parsed);
              settle();
            } else if (e.key === "Escape") {
              setDraft(null);
            }
          }}
          onBlur={() => {
            const parsed = draft === null ? null : parseHex(draft);
            if (parsed) onCommit(parsed);
            settle();
          }}
          className="h-full w-full min-w-0 bg-transparent pr-2.5 pl-0.5 font-mono uppercase tabular-nums text-foreground outline-none"
        />
      </motion.div>
      {dropper ? (
        <motion.button
          type="button"
          aria-label="Pick a color from the screen"
          disabled={disabled}
          whileTap={reduce ? undefined : { scale: 0.9 }}
          onClick={async () => {
            try {
              const result = await new dropper().open();
              const parsed = parseHex(result.sRGBHex);
              if (parsed) onCommit(parsed);
            } catch {
              // User dismissed the eyedropper.
            }
          }}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pipette className="size-4" aria-hidden />
        </motion.button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             ColorPickerPopover                             */
/* -------------------------------------------------------------------------- */

export interface ColorPickerPopoverProps
  extends Omit<ColorPickerProps, "className"> {
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Visible label next to the swatch in the trigger. */
  label?: string;
  side?: "top" | "bottom";
  align?: "start" | "end";
  className?: string;
  /** Class for the picker inside the panel. */
  pickerClassName?: string;
}

/** A swatch trigger that morphs a `ColorPicker` open in a `MorphPopover`. */
export function ColorPickerPopover({
  open,
  defaultOpen,
  onOpenChange,
  label,
  side = "bottom",
  align = "start",
  className,
  pickerClassName,
  value: valueProp,
  defaultValue = "#6366f1",
  onChange,
  disabled,
  alpha,
  ...pickerProps
}: ColorPickerPopoverProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = valueProp ?? internal;
  const swatch = useMemo(() => parseHex(value), [value]);

  return (
    <MorphPopover
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <MorphPopoverTrigger>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label ?? "Color"}: ${value}`}
          className={cn(
            "inline-flex h-10 items-center gap-2.5 rounded-xl border border-border bg-background pr-3 pl-1.5 text-sm outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            className,
          )}
        >
          <span
            className="relative size-7 overflow-hidden rounded-lg ring-1 ring-inset ring-black/10"
            style={CHECKER}
          >
            <span
              className="absolute inset-0 transition-colors duration-150"
              style={{
                backgroundColor: swatch
                  ? `rgb(${swatch.r} ${swatch.g} ${swatch.b} / ${swatch.a})`
                  : value,
              }}
            />
          </span>
          {label ? <span className="text-foreground">{label}</span> : null}
          <span className="font-mono uppercase tabular-nums text-muted-foreground">
            {value}
          </span>
        </button>
      </MorphPopoverTrigger>
      <MorphPopoverContent side={side} align={align} className="p-3">
        <ColorPicker
          {...pickerProps}
          alpha={alpha}
          disabled={disabled}
          value={value}
          onChange={(hex) => {
            if (valueProp === undefined) setInternal(hex);
            onChange?.(hex);
          }}
          className={pickerClassName}
        />
      </MorphPopoverContent>
    </MorphPopover>
  );
}
