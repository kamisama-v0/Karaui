"use client";

import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { Toggle } from "@/components/motion/toggle-group";
import { EASE_IN_OUT, EASE_OUT, SPRING_LAYOUT, SPRING_PANEL, SPRING_SWAP } from "@/lib/ease";
import { useSlider } from "@/lib/hooks/use-slider";
import { cn } from "@/lib/utils";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  /** Length in seconds. Drives the simulated clock when there is no `src`. */
  duration: number;
  /** Cover image URL. Without one a gradient from the theme's chart tokens is drawn. */
  cover?: string;
  /** Optional audio file. Without one playback is simulated. */
  src?: string;
}

export type MusicRepeat = "off" | "all" | "one";

export interface MusicPlayerProps {
  tracks: MusicTrack[];
  /** Controlled track index. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Controlled playing state. */
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  /** Controlled volume, 0–1. */
  volume?: number;
  defaultVolume?: number;
  onVolumeChange?: (volume: number) => void;
  defaultShuffle?: boolean;
  defaultRepeat?: MusicRepeat;
  /** Open the queue drawer initially. */
  defaultQueueOpen?: boolean;
  className?: string;
}

function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange: ((next: T) => void) | undefined,
) {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const set = useCallback(
    (next: T) => {
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set] as const;
}

const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Deterministic shuffle (mulberry32) that keeps `first` at the front. */
function shuffledOrder(length: number, first: number, seed: number) {
  let t = seed >>> 0;
  const rand = () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const rest = Array.from({ length }, (_, i) => i).filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [first, ...rest];
}

// Simulated network: the buffer starts this many seconds ahead and fills at
// this multiple of real time, so the buffered bar visibly leads the playhead.
const SIM_PREBUFFER = 14;
const SIM_BUFFER_RATE = 3;

/** Two chart tokens per track, picked deterministically from its index. */
function coverGradient(i: number) {
  const a = (i % 5) + 1;
  const b = ((i + 2) % 5) + 1;
  return `radial-gradient(circle at 25% 20%, color-mix(in oklab, var(--chart-${b}) 70%, transparent), transparent 60%), linear-gradient(135deg, var(--chart-${a}), var(--chart-${b}))`;
}

/**
 * Now-playing card: cover art that breathes with playback, title/artist that
 * cross-fade in the skip direction, a scrub bar with buffered and played
 * layers, a play/pause icon swap, shuffle and repeat toggles, volume, and a
 * queue drawer that slides up over the card. Playback is simulated unless a
 * track has a `src`, in which case a hidden `<audio>` element drives the clock.
 */
export function MusicPlayer({
  tracks,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  playing: playingProp,
  defaultPlaying = false,
  onPlayingChange,
  volume: volumeProp,
  defaultVolume = 0.8,
  onVolumeChange,
  defaultShuffle = false,
  defaultRepeat = "off",
  defaultQueueOpen = false,
  className,
}: MusicPlayerProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [index, setIndex] = useControllable(indexProp, defaultIndex, onIndexChange);
  const [playing, setPlaying] = useControllable(playingProp, defaultPlaying, onPlayingChange);
  const [volume, setVolume] = useControllable(volumeProp, defaultVolume, onVolumeChange);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(defaultShuffle);
  const [order, setOrder] = useState<number[]>(() =>
    defaultShuffle
      ? shuffledOrder(tracks.length, defaultIndex, tracks.length * 31 + defaultIndex)
      : tracks.map((_, i) => i),
  );
  const [repeat, setRepeat] = useState<MusicRepeat>(defaultRepeat);
  const [queueOpen, setQueueOpen] = useState(defaultQueueOpen);
  const [dir, setDir] = useState<1 | -1>(1);
  const [second, setSecond] = useState(0);

  const safeIndex = Math.min(Math.max(index, 0), Math.max(tracks.length - 1, 0));
  const track = tracks[safeIndex];
  const duration = track?.duration ?? 0;

  const audioRef = useRef<HTMLAudioElement>(null);
  const time = useMotionValue(0);
  const buffered = useMotionValue(0);
  const playedScale = useTransform(time, (t) => (duration > 0 ? t / duration : 0));
  const bufferedScale = useTransform(buffered, (b) => (duration > 0 ? b / duration : 0));
  const thumbX = useTransform(playedScale, (p) => `${p * 100}%`);

  const syncSecond = useCallback(
    (t: number) => setSecond((prev) => (Math.floor(t) === prev ? prev : Math.floor(t))),
    [],
  );

  const seek = useCallback(
    (t: number) => {
      const next = Math.min(Math.max(t, 0), duration);
      time.set(next);
      if (buffered.get() < next) buffered.set(Math.min(duration, next + SIM_PREBUFFER));
      if (audioRef.current) audioRef.current.currentTime = next;
      syncSecond(next);
    },
    [duration, time, buffered, syncSecond],
  );

  const go = useCallback(
    (nextIndex: number, direction: 1 | -1) => {
      // Same track (one-song queue): the reset effect won't fire, so rewind here.
      if (nextIndex === safeIndex) seek(0);
      setDir(direction);
      setIndex(nextIndex);
    },
    [setIndex, safeIndex, seek],
  );

  const step = useCallback(
    (direction: 1 | -1, auto = false) => {
      const pos = order.indexOf(safeIndex);
      const target = pos + direction;
      if (target >= order.length) {
        if (auto && repeat === "off") {
          setPlaying(false);
          seek(0);
          return;
        }
        go(order[0], 1);
      } else if (target < 0) {
        go(order[order.length - 1], -1);
      } else {
        go(order[target], direction);
      }
    },
    [order, safeIndex, repeat, go, setPlaying, seek],
  );

  const previous = () => {
    if (time.get() > 3) seek(0);
    else step(-1);
  };

  // Reset the clock whenever the track changes.
  const trackId = track?.id;
  useEffect(() => {
    if (trackId === undefined) return;
    time.set(0);
    buffered.set(Math.min(duration, SIM_PREBUFFER));
    setSecond(0);
  }, [trackId, duration, time, buffered]);

  // Drive the real element when a source exists.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new track swaps `src`, which stops playback, so it has to resume.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [playing, setPlaying, trackId]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // One frame loop advances the playhead (simulated) or mirrors the audio
  // element, written to motion values so the bar never re-renders React.
  const onEnded = useRef<() => void>(() => {});
  onEnded.current = () => {
    if (repeat === "one") {
      seek(0);
      audioRef.current?.play().catch(() => {});
    } else step(1, true);
  };
  useEffect(() => {
    if (!playing || duration <= 0) return;
    let frame = 0;
    let last = performance.now();
    // Fire the end handler once per arrival at the end; a rewind re-arms it.
    let ended = false;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const audio = audioRef.current;
      let t: number;
      if (audio) {
        t = audio.currentTime;
        const ranges = audio.buffered;
        if (ranges.length > 0) buffered.set(ranges.end(ranges.length - 1));
      } else {
        t = Math.min(duration, time.get() + dt);
        buffered.set(Math.min(duration, Math.max(buffered.get(), t) + dt * SIM_BUFFER_RATE));
      }
      time.set(t);
      syncSecond(t);
      if (!audio && t >= duration) {
        if (!ended) {
          ended = true;
          onEnded.current();
        }
      } else ended = false;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration, time, buffered, syncSecond]);

  const toggleShuffle = (on: boolean) => {
    setShuffle(on);
    // Seeded from the queue and the current track so it is stable per toggle.
    setOrder(
      on
        ? shuffledOrder(tracks.length, safeIndex, tracks.length * 31 + safeIndex)
        : tracks.map((_, i) => i),
    );
  };

  const cycleRepeat = () =>
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));

  const scrub = useSlider({
    value: second,
    onValueChange: seek,
    min: 0,
    max: Math.max(1, Math.floor(duration)),
    step: 1,
    "aria-label": "Seek",
    formatValueText: (v) => `${formatTime(v)} of ${formatTime(duration)}`,
  });

  const shownVolume = muted ? 0 : volume;
  const vol = useSlider({
    value: Math.round(shownVolume * 100),
    onValueChange: (v) => {
      setMuted(false);
      setVolume(v / 100);
    },
    min: 0,
    max: 100,
    step: 5,
    "aria-label": "Volume",
    formatValueText: (v) => `${v}%`,
  });

  if (!track) return null;

  // Variants read the skip direction through `custom`, so the outgoing item
  // (whose props froze on its last render) still exits the right way.
  const textSlide = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 24 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -24 }),
  };
  const coverSlide = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 40, scale: 0.9 }),
    exit: (d: number) =>
      reduce
        ? { opacity: 0 }
        : { opacity: 0, x: d * -40, scale: 0.85, transition: { duration: 0.18 } },
  };

  const VolumeIcon = shownVolume === 0 ? VolumeX : shownVolume < 0.5 ? Volume1 : Volume2;
  const queueId = `${baseId}-queue`;

  return (
    <section
      aria-label="Music player"
      className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-lg",
        className,
      )}
    >
      {track.src ? (
        // biome-ignore lint/a11y/useMediaCaption: music playback; there is no spoken content to caption.
        <audio
          ref={audioRef}
          src={track.src}
          preload="metadata"
          onEnded={() => onEnded.current()}
          className="hidden"
        />
      ) : null}

      <div className="flex items-center gap-4">
        <div className="relative size-28 shrink-0">
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <motion.div
              key={track.id}
              custom={dir}
              variants={coverSlide}
              initial="enter"
              animate={{
                opacity: 1,
                x: 0,
                scale: reduce || playing ? 1 : 0.9,
              }}
              exit="exit"
              transition={SPRING_LAYOUT}
              className="absolute inset-0 overflow-hidden rounded-2xl shadow-md"
              style={track.cover ? undefined : { backgroundImage: coverGradient(safeIndex) }}
            >
              {track.cover ? (
                // biome-ignore lint/performance/noImgElement: library component, framework-agnostic.
                <img src={track.cover} alt="" className="size-full object-cover" />
              ) : (
                <span
                  aria-hidden
                  className="absolute inset-0 grid place-items-center text-3xl font-semibold text-background/80"
                >
                  {track.title.slice(0, 1)}
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative min-w-0 flex-1 self-stretch overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <motion.div
              key={track.id}
              custom={dir}
              variants={textSlide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.24, ease: EASE_OUT }}
              className="flex h-full flex-col justify-center"
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {playing ? "Now playing" : "Paused"}
              </p>
              <h3 className="mt-1 truncate text-base font-semibold">{track.title}</h3>
              <p className="truncate text-sm text-muted-foreground">{track.artist}</p>
              {track.album ? (
                <p className="truncate text-xs text-muted-foreground/80">{track.album}</p>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Scrub bar */}
      <div className="mt-5">
        <div
          {...scrub.trackProps}
          className="group relative flex h-4 cursor-pointer touch-none items-center"
        >
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <motion.div
              style={{ scaleX: bufferedScale }}
              className="absolute inset-0 origin-left rounded-full bg-foreground/15"
            />
            <motion.div
              style={{ scaleX: playedScale }}
              className="absolute inset-0 origin-left rounded-full bg-primary"
            />
          </div>
          {/* Full-width layer translated by the played fraction carries the thumb. */}
          <motion.div style={{ x: thumbX }} className="pointer-events-none absolute inset-0">
            <span
              {...scrub.sliderProps}
              className={cn(
                "pointer-events-auto absolute top-1/2 left-0 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm outline-none ring-primary/30 transition-transform focus-visible:ring-4",
                scrub.dragging ? "scale-125" : "scale-0 group-hover:scale-100 focus-visible:scale-100",
              )}
            />
          </motion.div>
        </div>
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>{formatTime(second)}</span>
          <span>-{formatTime(duration - second)}</span>
        </div>
      </div>

      {/* Transport */}
      <div className="mt-2 flex items-center justify-between">
        <Toggle
          size="sm"
          variant="outline"
          aria-label="Shuffle"
          pressed={shuffle}
          onPressedChange={toggleShuffle}
          className={cn("rounded-full", shuffle && "text-primary")}
        >
          <Shuffle aria-hidden />
        </Toggle>
        <div className="flex items-center gap-2">
          <TransportButton label="Previous track" onClick={previous}>
            <SkipBack aria-hidden className="size-5 fill-current" />
          </TransportButton>
          <motion.button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => setPlaying(!playing)}
            whileTap={reduce ? undefined : { scale: 0.9 }}
            transition={SPRING_SWAP}
            className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-md outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={playing ? "pause" : "play"}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 90 }}
                transition={SPRING_SWAP}
                className="grid place-items-center"
              >
                {playing ? (
                  <Pause aria-hidden className="size-5 fill-current" />
                ) : (
                  <Play aria-hidden className="ml-0.5 size-5 fill-current" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <TransportButton label="Next track" onClick={() => step(1)}>
            <SkipForward aria-hidden className="size-5 fill-current" />
          </TransportButton>
        </div>
        <button
          type="button"
          aria-label={`Repeat: ${repeat}`}
          aria-pressed={repeat !== "off"}
          onClick={cycleRepeat}
          className={cn(
            "grid size-7 place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary [&_svg]:size-3.5",
            repeat === "off" ? "text-muted-foreground hover:text-foreground" : "bg-muted text-primary",
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={repeat === "one" ? "one" : "all"}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
              transition={SPRING_SWAP}
            >
              {repeat === "one" ? <Repeat1 aria-hidden /> : <Repeat aria-hidden />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      {/* Volume + queue */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={() => setMuted(!muted)}
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
        >
          <VolumeIcon aria-hidden className="size-4" />
        </button>
        <div {...vol.trackProps} className="relative flex h-4 flex-1 cursor-pointer touch-none items-center">
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-foreground/10">
            <motion.div
              animate={{ scaleX: vol.percent / 100 }}
              transition={vol.dragging || reduce ? { duration: 0 } : SPRING_LAYOUT}
              className="absolute inset-0 origin-left rounded-full bg-foreground/60"
            />
          </div>
          <motion.div
            animate={{ x: `${vol.percent}%` }}
            transition={vol.dragging || reduce ? { duration: 0 } : SPRING_LAYOUT}
            className="pointer-events-none absolute inset-0"
          >
            <span
              {...vol.sliderProps}
              className="pointer-events-auto absolute top-1/2 left-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </motion.div>
        </div>
        <button
          type="button"
          aria-label="Queue"
          aria-expanded={queueOpen}
          aria-controls={queueId}
          onClick={() => setQueueOpen(!queueOpen)}
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
            queueOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ListMusic aria-hidden className="size-4" />
        </button>
      </div>

      {/* Queue drawer */}
      <AnimatePresence>
        {queueOpen ? (
          <motion.div
            id={queueId}
            key="queue"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%", transition: { duration: 0.2, ease: EASE_OUT } }}
            transition={SPRING_PANEL}
            className="absolute inset-x-0 bottom-0 z-10 flex max-h-[75%] flex-col rounded-t-3xl border-t border-border bg-card/95 shadow-lg backdrop-blur"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h4 className="text-sm font-semibold">Up next</h4>
              <button
                type="button"
                aria-label="Close queue"
                onClick={() => setQueueOpen(false)}
                className="grid size-7 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <ol className="flex-1 overflow-y-auto px-2 pb-3 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
              {order.map((i, pos) => {
                const t = tracks[i];
                const current = i === safeIndex;
                return (
                  <motion.li
                    key={t.id}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: EASE_OUT, delay: reduce ? 0 : pos * 0.03 }}
                  >
                    <button
                      type="button"
                      aria-current={current ? "true" : undefined}
                      onClick={() => {
                        go(i, i >= safeIndex ? 1 : -1);
                        setPlaying(true);
                      }}
                      className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {current ? (
                        <motion.span
                          layoutId={`${baseId}-queue-active`}
                          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                          className="absolute inset-0 rounded-xl bg-muted"
                        />
                      ) : null}
                      <span
                        aria-hidden
                        className="relative size-8 shrink-0 rounded-md"
                        style={t.cover ? undefined : { backgroundImage: coverGradient(i) }}
                      >
                        {t.cover ? (
                          // biome-ignore lint/performance/noImgElement: library component, framework-agnostic.
                          <img src={t.cover} alt="" className="size-full rounded-md object-cover" />
                        ) : null}
                      </span>
                      <span className="relative min-w-0 flex-1">
                        <span className={cn("block truncate text-sm", current && "font-medium")}>
                          {t.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{t.artist}</span>
                      </span>
                      {current && playing ? (
                        <Equalizer reduce={Boolean(reduce)} />
                      ) : (
                        <span className="relative text-xs tabular-nums text-muted-foreground">
                          {formatTime(t.duration)}
                        </span>
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function TransportButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={reduce ? undefined : { scale: 0.85 }}
      transition={SPRING_SWAP}
      className="grid size-10 place-items-center rounded-full text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
    </motion.button>
  );
}

// Bar heights for the equalizer loop, as scaleY keyframes per bar.
const EQ_BARS = [
  [0.35, 1, 0.5, 0.8, 0.35],
  [1, 0.45, 0.9, 0.3, 1],
  [0.6, 0.85, 0.3, 1, 0.6],
];

function Equalizer({ reduce }: { reduce: boolean }) {
  return (
    <span aria-hidden className="relative flex h-3.5 items-end gap-0.5">
      {EQ_BARS.map((frames, i) => (
        <motion.span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative bars.
          key={i}
          className="h-full w-0.5 origin-bottom rounded-full bg-primary"
          initial={{ scaleY: frames[0] }}
          animate={reduce ? { scaleY: 0.6 } : { scaleY: frames }}
          transition={
            reduce ? { duration: 0 } : { duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: EASE_IN_OUT }
          }
        />
      ))}
    </span>
  );
}
