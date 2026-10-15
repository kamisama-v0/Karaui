"use client";

import {
  AnimatePresence,
  type MotionValue,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { type CSSProperties, useEffect, useRef } from "react";
import { EASE_IN_OUT, EASE_OUT, SPRING_GLIDE } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type VoiceOrbState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceOrbProps {
  state?: VoiceOrbState;
  /** Audio amplitude 0..1 (mic input while listening, output while speaking). */
  level?: number;
  /** Synthesize a plausible `level` for the current state (no audio needed). */
  simulate?: boolean;
  /** Diameter in px. Default 160. */
  size?: number;
  /** Accessible name; the current state is appended. Default "Voice assistant". */
  label?: string;
  className?: string;
}

const STATE_TEXT: Record<VoiceOrbState, string> = {
  idle: "idle",
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
};

// Per-state motion character: how fast the blobs orbit, how far they drift
// from center and how much the audio level swells the core.
const STATE_MOTION: Record<VoiceOrbState, { speed: number; drift: number; gain: number }> = {
  idle: { speed: 0.25, drift: 0.05, gain: 0 },
  listening: { speed: 0.6, drift: 0.08, gain: 0.18 },
  thinking: { speed: 1.4, drift: 0.11, gain: 0 },
  speaking: { speed: 0.9, drift: 0.1, gain: 0.3 },
};

// Blob layers: token color, orbit phase offset and relative size.
const BLOBS = [
  { color: "var(--chart-1)", phase: 0, scale: 0.78 },
  { color: "var(--chart-2)", phase: 2.1, scale: 0.7 },
  { color: "var(--chart-3)", phase: 4.2, scale: 0.66 },
  { color: "var(--primary)", phase: 1.05, scale: 0.6 },
] as const;

/** Deterministic pseudo-speech envelope: layered sines read as syllables. */
function syntheticLevel(state: VoiceOrbState, t: number) {
  if (state === "speaking") {
    const syllable = Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1));
    const phrase = 0.55 + 0.45 * Math.sin(t * 0.8);
    return Math.min(1, 0.15 + syllable * 0.85 * phrase);
  }
  if (state === "listening") {
    const burst = Math.max(0, Math.sin(t * 1.3)) ** 2;
    return 0.08 + burst * Math.abs(Math.sin(t * 9.1)) * 0.55;
  }
  return 0;
}

export function VoiceOrb({
  state = "idle",
  level = 0,
  simulate = false,
  size = 160,
  label = "Voice assistant",
  className,
}: VoiceOrbProps) {
  const reduce = useReducedMotion() ?? false;
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const target = useMotionValue(0);
  const smooth = useSpring(target, SPRING_GLIDE);
  // `clock` integrates speed over time so a state change eases the orbit
  // rate instead of jumping the blobs to a new phase; drift and gain ease too.
  const clock = useMotionValue(0);
  const drift = useMotionValue(STATE_MOTION[state].drift);
  const gain = useMotionValue(STATE_MOTION[state].gain);
  const speed = useRef(STATE_MOTION[state].speed);

  useEffect(() => {
    if (!simulate) target.set(Math.max(0, Math.min(1, level)));
  }, [level, simulate, target]);

  // Motion values update per frame without re-rendering React.
  useAnimationFrame((t, delta) => {
    if (reduce) return;
    const goal = STATE_MOTION[stateRef.current];
    const k = Math.min(1, delta / 400);
    speed.current += (goal.speed - speed.current) * k;
    drift.set(drift.get() + (goal.drift - drift.get()) * k);
    gain.set(gain.get() + (goal.gain - gain.get()) * k);
    clock.set(clock.get() + (delta / 1000) * speed.current);
    if (simulate) target.set(syntheticLevel(stateRef.current, t / 1000));
  });

  const coreScale = useTransform(() => 0.92 + smooth.get() * gain.get());
  const haloScale = useTransform(() => 1 + smooth.get() * gain.get() * 1.4);
  const haloOpacity = useTransform(smooth, (l) => 0.35 + l * 0.5);

  return (
    <div
      role="img"
      aria-label={`${label}, ${STATE_TEXT[state]}`}
      data-state={state}
      className={cn("relative isolate inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Soft halo that breathes with the level. */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-[6%] rounded-full blur-xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 45%, transparent), transparent 70%)",
          scale: reduce ? 1 : haloScale,
          opacity: reduce ? 0.5 : haloOpacity,
        }}
      />

      {/* Listening: rings ripple outward. */}
      <AnimatePresence>
        {state === "listening" && !reduce && (
          <motion.span
            key="ripples"
            aria-hidden="true"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-[14%] rounded-full border border-primary/40"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: [0.9, 1.35], opacity: [0.7, 0] }}
                transition={{
                  duration: 2.1,
                  ease: EASE_OUT,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.7,
                }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Thinking: a comet arc circles the orb. */}
      <AnimatePresence>
        {state === "thinking" && (
          <motion.span
            key="arc"
            aria-hidden="true"
            className="absolute inset-[4%] rounded-full"
            style={
              {
                background:
                  "conic-gradient(from 0deg, transparent 0turn, color-mix(in oklab, var(--chart-2) 80%, transparent) 0.22turn, transparent 0.24turn)",
                WebkitMask: "radial-gradient(closest-side, transparent calc(100% - 3px), black calc(100% - 2px))",
                mask: "radial-gradient(closest-side, transparent calc(100% - 3px), black calc(100% - 2px))",
              } as CSSProperties
            }
            initial={{ opacity: 0 }}
            animate={reduce ? { opacity: [0.3, 0.8, 0.3] } : { opacity: 1, rotate: 360 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={
              reduce
                ? { duration: 1.8, ease: EASE_IN_OUT, repeat: Number.POSITIVE_INFINITY }
                : {
                    rotate: { duration: 1.1, ease: "linear", repeat: Number.POSITIVE_INFINITY },
                    opacity: { duration: 0.25 },
                  }
            }
          />
        )}
      </AnimatePresence>

      {/* Core: a clipped sphere holding drifting color blobs. */}
      <motion.span
        aria-hidden="true"
        className="relative size-[72%] overflow-hidden rounded-full bg-card shadow-lg ring-1 ring-foreground/10"
        style={{ scale: reduce ? 1 : coreScale }}
        animate={
          reduce
            ? { opacity: state === "idle" ? [0.7, 0.85, 0.7] : [0.75, 1, 0.75] }
            : { opacity: 1 }
        }
        transition={
          reduce
            ? { duration: state === "speaking" ? 1.2 : 2.4, ease: EASE_IN_OUT, repeat: Number.POSITIVE_INFINITY }
            : { duration: 0.3 }
        }
      >
        {BLOBS.map((blob, i) => (
          <Blob
            key={blob.color}
            index={i}
            color={blob.color}
            phase={blob.phase}
            blobScale={blob.scale}
            clock={clock}
            level={smooth}
            drift={drift}
            gain={gain}
            still={reduce}
          />
        ))}
        {/* Specular highlight keeps it reading as a sphere. */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 26%, color-mix(in oklab, var(--background) 70%, transparent), transparent 42%)",
          }}
        />
      </motion.span>
      <span className="sr-only" aria-live="polite">
        {STATE_TEXT[state]}
      </span>
    </div>
  );
}

function Blob({
  index,
  color,
  phase,
  blobScale,
  clock,
  level,
  drift,
  gain,
  still,
}: {
  index: number;
  color: string;
  phase: number;
  blobScale: number;
  clock: MotionValue<number>;
  level: MotionValue<number>;
  drift: MotionValue<number>;
  gain: MotionValue<number>;
  still: boolean;
}) {
  const dir = index % 2 === 0 ? 1 : -1;
  // Each blob orbits on its own Lissajous path (percent of the core), and the
  // level pushes it outward so loud audio visibly churns the colors.
  const x = useTransform(() => {
    const t = clock.get() * dir + phase;
    const r = (drift.get() + level.get() * gain.get() * 0.35) * 100;
    return `${Math.cos(t) * r}%`;
  });
  const y = useTransform(() => {
    const t = clock.get() * 1.3 + phase * 1.7;
    const r = (drift.get() + level.get() * gain.get() * 0.35) * 100;
    return `${Math.sin(t) * r}%`;
  });
  const scale = useTransform(() => {
    const t = clock.get() * 0.7 + phase;
    return blobScale * (1 + 0.08 * Math.sin(t * 2) + level.get() * gain.get() * 0.6);
  });

  const staticOffset = [
    ["-18%", "-14%"],
    ["16%", "-6%"],
    ["-4%", "18%"],
    ["10%", "10%"],
  ][index] ?? ["0%", "0%"];

  return (
    <motion.span
      className="absolute inset-0 m-auto size-full rounded-full mix-blend-normal blur-md"
      style={{
        background: `radial-gradient(circle, ${color} 0%, color-mix(in oklab, ${color} 50%, transparent) 45%, transparent 70%)`,
        x: still ? staticOffset[0] : x,
        y: still ? staticOffset[1] : y,
        scale: still ? blobScale : scale,
        opacity: 0.9,
      }}
    />
  );
}
