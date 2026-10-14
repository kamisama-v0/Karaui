"use client";

import { Check, Loader2, Mic, MicOff, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { TextShimmer } from "@/components/motion/text-shimmer";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type VoiceInputState =
  | "idle"
  | "requesting"
  | "recording"
  | "processing"
  | "done"
  | "error";

export type VoiceInputMode = "recorder" | "speech";

export interface VoiceInputProps {
  /**
   * Turns the recorded audio into text. Receives the MediaRecorder blob (an
   * empty blob when `simulate` is on). Not called when `mode="speech"` and the
   * browser's SpeechRecognition API handled the transcript.
   */
  onTranscribe?: (audio: Blob) => Promise<string>;
  /** Called with the final transcript when the done state is reached. */
  onTranscript?: (text: string) => void;
  /** Called when recording or transcription is cancelled. */
  onCancel?: () => void;
  onStateChange?: (state: VoiceInputState) => void;
  onError?: (error: unknown) => void;
  /**
   * `recorder` captures audio and delegates to `onTranscribe`. `speech` uses
   * the browser SpeechRecognition API when available, falling back to
   * `recorder` otherwise.
   */
  mode?: VoiceInputMode;
  /** BCP-47 language for `mode="speech"`. Defaults to the browser language. */
  lang?: string;
  /** Fake an animated waveform without touching the microphone. */
  simulate?: boolean;
  /** Number of waveform bars. */
  bars?: number;
  /** Auto-confirm after this many seconds of recording. */
  maxDuration?: number;
  /** How long the done state shows the transcript before returning to idle (ms). */
  doneDuration?: number;
  disabled?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------------ */
/* Browser API shapes (SpeechRecognition is not in every TS DOM lib).        */
/* ------------------------------------------------------------------------ */

interface SpeechAlternativeLike {
  transcript: string;
}
interface SpeechResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechAlternativeLike;
}
interface SpeechEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function getAudioContext(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

/* ------------------------------------------------------------------------ */
/* Resource bookkeeping — everything that must be released lives here.       */
/* ------------------------------------------------------------------------ */

type Resources = {
  stream?: MediaStream;
  ctx?: AudioContext;
  analyser?: AnalyserNode;
  recorder?: MediaRecorder;
  chunks: Blob[];
  recognition?: SpeechRecognitionLike;
  speechFinal: string;
  speechInterim: string;
  raf?: number;
  tick?: number;
  maxTimer?: number;
};

function freshResources(): Resources {
  return { chunks: [], speechFinal: "", speechInterim: "" };
}

function stopLoops(r: Resources) {
  if (r.raf !== undefined) cancelAnimationFrame(r.raf);
  if (r.tick !== undefined) window.clearInterval(r.tick);
  if (r.maxTimer !== undefined) window.clearTimeout(r.maxTimer);
  r.raf = undefined;
  r.tick = undefined;
  r.maxTimer = undefined;
}

function release(r: Resources) {
  stopLoops(r);
  if (r.recorder) {
    r.recorder.ondataavailable = null;
    r.recorder.onstop = null;
    if (r.recorder.state !== "inactive") {
      try {
        r.recorder.stop();
      } catch {
        // already stopped
      }
    }
  }
  if (r.recognition) {
    r.recognition.onresult = null;
    r.recognition.onerror = null;
    r.recognition.onend = null;
    try {
      r.recognition.abort();
    } catch {
      // already ended
    }
  }
  if (r.stream) {
    for (const track of r.stream.getTracks()) track.stop();
  }
  if (r.ctx && r.ctx.state !== "closed") r.ctx.close().catch(() => {});
  r.stream = undefined;
  r.ctx = undefined;
  r.analyser = undefined;
  r.recorder = undefined;
  r.recognition = undefined;
}

function stopRecorder(r: Resources): Promise<Blob> {
  const recorder = r.recorder;
  const type = recorder?.mimeType || "audio/webm";
  if (!recorder || recorder.state === "inactive") {
    return Promise.resolve(new Blob(r.chunks, { type }));
  }
  return new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(r.chunks, { type }));
    recorder.stop();
  });
}

/** Stop recognition and wait for its final results (bounded). */
function stopRecognition(r: Resources): Promise<string> {
  const recognition = r.recognition;
  const read = () => `${r.speechFinal} ${r.speechInterim}`.trim();
  if (!recognition) return Promise.resolve(read());
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(read()), 1500);
    recognition.onend = () => {
      window.clearTimeout(timer);
      resolve(read());
    };
    try {
      recognition.stop();
    } catch {
      window.clearTimeout(timer);
      resolve(read());
    }
  });
}

function errorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access was blocked.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No microphone was found.";
  }
  if (name === "NotReadableError") return "The microphone is in use.";
  return "Couldn't start the microphone.";
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** RMS of the time-domain signal, mapped to a perceptual 0..1 level. */
function readLevel(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>) {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (const sample of buffer) {
    const v = (sample - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / buffer.length);
  return Math.min(1, Math.sqrt(rms) * 1.6);
}

/** Speech-like bursts: a slow envelope over faster syllable wobble + noise. */
function simulatedLevel(time: number) {
  const t = time / 1000;
  const envelope = 0.5 + 0.5 * Math.sin(t * 1.3) * Math.sin(t * 0.7 + 1);
  const syllable = Math.abs(Math.sin(t * 7.3)) * 0.6 + Math.abs(Math.sin(t * 3.1)) * 0.4;
  return Math.min(1, Math.max(0.04, envelope * syllable * 0.95 + Math.random() * 0.18));
}

const BAR_FLOOR = 0.12;
/** Waveform history step. Reduced motion samples slower so bars move less. */
const SAMPLE_MS = 55;
const SAMPLE_MS_REDUCED = 180;

/* ------------------------------------------------------------------------ */
/* Motion                                                                   */
/* ------------------------------------------------------------------------ */

const CONTENT_VARIANTS: Variants = {
  initial: { opacity: 0, filter: "blur(4px)", x: -6 },
  animate: {
    opacity: 1,
    filter: "blur(0px)",
    x: 0,
    transition: { ...SPRING_SWAP, opacity: { duration: 0.18, delay: 0.04 } },
  },
  exit: {
    opacity: 0,
    filter: "blur(4px)",
    transition: { duration: 0.12, ease: EASE_OUT },
  },
};

const ICON_VARIANTS: Variants = {
  initial: { opacity: 0, scale: 0.4, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: SPRING_SWAP },
  exit: {
    opacity: 0,
    scale: 0.4,
    filter: "blur(6px)",
    transition: { duration: 0.12, ease: EASE_OUT },
  },
};

const FADE_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

/* ------------------------------------------------------------------------ */

function PillButton({
  label,
  onClick,
  tone = "muted",
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "muted" | "primary";
  children: ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={reduce ? undefined : { scale: 0.88 }}
      transition={SPRING_PRESS}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4",
        tone === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </motion.button>
  );
}

export function VoiceInput({
  onTranscribe,
  onTranscript,
  onCancel,
  onStateChange,
  onError,
  mode = "recorder",
  lang,
  simulate = false,
  bars = 24,
  maxDuration,
  doneDuration = 2400,
  disabled = false,
  className,
}: VoiceInputProps) {
  const reduce = useReducedMotion() ?? false;
  const [state, setState] = useState<VoiceInputState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string>();
  const [transcript, setTranscript] = useState("");

  const micRef = useRef<HTMLButtonElement>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const history = useRef<number[]>([]);
  const resources = useRef<Resources>(freshResources());
  const session = useRef(0);
  const doneTimer = useRef<number | undefined>(undefined);
  const phase = useRef<VoiceInputState>("idle");

  // Latest props for async flows that outlive the render that started them.
  const latest = useRef({
    onTranscribe,
    onTranscript,
    onCancel,
    onStateChange,
    onError,
    mode,
    lang,
    simulate,
    maxDuration,
    doneDuration,
    reduce,
  });
  latest.current = {
    onTranscribe,
    onTranscript,
    onCancel,
    onStateChange,
    onError,
    mode,
    lang,
    simulate,
    maxDuration,
    doneDuration,
    reduce,
  };

  const barCount = Math.max(4, Math.floor(bars));

  useEffect(() => {
    const r = resources.current;
    return () => {
      session.current++;
      release(r);
      if (doneTimer.current) window.clearTimeout(doneTimer.current);
    };
  }, []);

  const transition = (next: VoiceInputState) => {
    phase.current = next;
    setState(next);
    latest.current.onStateChange?.(next);
  };

  const fail = (message: string, cause: unknown) => {
    release(resources.current);
    setError(message);
    transition("error");
    latest.current.onError?.(cause);
  };

  const paint = () => {
    const values = history.current;
    barRefs.current.forEach((el, i) => {
      if (!el) return;
      const v = values[i] ?? 0;
      el.style.transform = `scaleY(${BAR_FLOOR + v * (1 - BAR_FLOOR)})`;
    });
  };

  const beginRecording = (
    id: number,
    stream: MediaStream | null,
    speech: SpeechRecognitionCtor | undefined,
  ) => {
    const r = resources.current;
    const { simulate: fake, lang: language } = latest.current;

    if (stream) {
      r.stream = stream;
      const Ctx = getAudioContext();
      if (Ctx) {
        try {
          const ctx = new Ctx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(analyser);
          r.ctx = ctx;
          r.analyser = analyser;
        } catch {
          // No analyser — the waveform falls back to a flat idle line.
        }
      }
      if (!speech) {
        try {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) r.chunks.push(event.data);
          };
          recorder.start(250);
          r.recorder = recorder;
        } catch (cause) {
          fail("Recording isn't supported in this browser.", cause);
          return;
        }
      }
    }

    if (speech && !fake) {
      try {
        const recognition = new speech();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang =
          language ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
        recognition.onresult = (event) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result?.[0]?.transcript ?? "";
            if (result?.isFinal) r.speechFinal += `${text} `;
            else interim += text;
          }
          r.speechInterim = interim;
        };
        recognition.onerror = (event) => {
          if (session.current !== id) return;
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            fail("Speech recognition was blocked.", event);
          }
        };
        recognition.start();
        r.recognition = recognition;
      } catch (cause) {
        fail("Speech recognition couldn't start.", cause);
        return;
      }
    }

    history.current = Array.from({ length: barCount }, () => 0);
    const buffer = r.analyser
      ? new Uint8Array(new ArrayBuffer(r.analyser.fftSize))
      : null;
    let lastPush = 0;
    const loop = (now: number) => {
      if (session.current !== id) return;
      const step = latest.current.reduce ? SAMPLE_MS_REDUCED : SAMPLE_MS;
      if (now - lastPush >= step) {
        lastPush = now;
        const level =
          r.analyser && buffer
            ? readLevel(r.analyser, buffer)
            : fake
              ? simulatedLevel(now)
              : 0;
        history.current.shift();
        history.current.push(level);
        paint();
      }
      r.raf = requestAnimationFrame(loop);
    };
    r.raf = requestAnimationFrame(loop);

    const started = performance.now();
    setElapsed(0);
    r.tick = window.setInterval(() => {
      setElapsed(Math.floor((performance.now() - started) / 1000));
    }, 250);

    const limit = latest.current.maxDuration;
    if (limit && limit > 0) {
      r.maxTimer = window.setTimeout(() => {
        if (session.current === id) void confirm();
      }, limit * 1000);
    }

    transition("recording");
  };

  const start = async () => {
    if (disabled) return;
    const id = ++session.current;
    if (doneTimer.current) window.clearTimeout(doneTimer.current);
    release(resources.current);
    resources.current = freshResources();
    setError(undefined);
    setTranscript("");
    setElapsed(0);

    const { simulate: fake, mode: currentMode } = latest.current;
    const speech = currentMode === "speech" ? getSpeechRecognition() : undefined;

    if (fake) {
      beginRecording(id, null, speech);
      return;
    }

    transition("requesting");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      fail("Voice input isn't supported in this browser.", new Error("getUserMedia unavailable"));
      return;
    }
    if (!speech && typeof MediaRecorder === "undefined") {
      fail("Recording isn't supported in this browser.", new Error("MediaRecorder unavailable"));
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      if (session.current !== id) return;
      fail(errorMessage(cause), cause);
      return;
    }
    if (session.current !== id) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }
    beginRecording(id, stream, speech);
  };

  async function confirm() {
    if (phase.current !== "recording") return;
    const id = session.current;
    const r = resources.current;
    stopLoops(r);
    transition("processing");
    try {
      let text: string;
      if (r.recognition) {
        text = await stopRecognition(r);
      } else {
        const audio = latest.current.simulate
          ? new Blob([], { type: "audio/webm" })
          : await stopRecorder(r);
        release(r);
        const handler = latest.current.onTranscribe;
        text = handler ? await handler(audio) : "";
      }
      if (session.current !== id) return;
      release(r);
      const clean = text.trim();
      setTranscript(clean);
      transition("done");
      latest.current.onTranscript?.(clean);
      doneTimer.current = window.setTimeout(() => {
        if (session.current === id) transition("idle");
      }, latest.current.doneDuration);
    } catch (cause) {
      if (session.current !== id) return;
      fail("Couldn't transcribe that. Try again.", cause);
    }
  }

  const cancel = () => {
    const wasActive = state !== "error" && state !== "done";
    session.current++;
    if (doneTimer.current) window.clearTimeout(doneTimer.current);
    release(resources.current);
    setError(undefined);
    transition("idle");
    if (wasActive) latest.current.onCancel?.();
    // The X button unmounts with the pill content; keep focus in the widget.
    micRef.current?.focus();
  };

  const busy = state === "requesting" || state === "processing";
  const recording = state === "recording";
  const expanded = state !== "idle";

  const onMic = () => {
    if (disabled || busy) return;
    if (recording) void confirm();
    else void start();
  };

  const micLabel = recording
    ? "Stop recording and transcribe"
    : state === "error"
      ? "Retry voice input"
      : "Start voice input";

  const status: Record<VoiceInputState, string> = {
    idle: "",
    requesting: "Requesting microphone access",
    recording: "Recording",
    processing: "Transcribing",
    done: transcript ? `Transcribed: ${transcript}` : "No speech detected",
    error: error ?? "Voice input failed",
  };

  const icons: Record<VoiceInputState, ReactNode> = {
    idle: <Mic />,
    requesting: <Mic />,
    recording: <Mic />,
    processing: reduce ? (
      <Loader2 />
    ) : (
      <motion.span
        className="grid place-items-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
      >
        <Loader2 />
      </motion.span>
    ),
    done: <Check className="text-(--color-success)" />,
    error: <MicOff />,
  };

  const iconVariants = reduce ? FADE_VARIANTS : ICON_VARIANTS;
  const contentVariants = reduce ? FADE_VARIANTS : CONTENT_VARIANTS;

  let content: ReactNode = null;
  if (state === "requesting") {
    content = (
      <>
        <TextShimmer className="whitespace-nowrap px-1 text-sm">
          Waiting for microphone…
        </TextShimmer>
        <PillButton label="Cancel" onClick={cancel}>
          <X />
        </PillButton>
      </>
    );
  } else if (state === "recording") {
    content = (
      <>
        <span aria-hidden="true" className="flex h-6 items-center gap-[2px] px-1">
          {Array.from({ length: barCount }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: bars are fixed positional slots.
              key={i}
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              className="h-full w-[3px] origin-center rounded-full bg-foreground/80"
              style={{ transform: `scaleY(${BAR_FLOOR})` }}
            />
          ))}
        </span>
        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
          {formatTime(elapsed)}
        </span>
        <PillButton label="Cancel recording" onClick={cancel}>
          <X />
        </PillButton>
        <PillButton label="Finish recording" tone="primary" onClick={() => void confirm()}>
          <Check />
        </PillButton>
      </>
    );
  } else if (state === "processing") {
    content = (
      <>
        <TextShimmer className="whitespace-nowrap px-1 text-sm">
          Transcribing…
        </TextShimmer>
        <PillButton label="Cancel transcription" onClick={cancel}>
          <X />
        </PillButton>
      </>
    );
  } else if (state === "done") {
    content = (
      <span className="max-w-64 truncate px-1 pr-3 text-sm text-foreground">
        {transcript || (
          <span className="text-muted-foreground">No speech detected</span>
        )}
      </span>
    );
  } else if (state === "error") {
    content = (
      <>
        <span className="max-w-56 px-1 text-xs leading-tight text-destructive">
          {error}
        </span>
        <PillButton label="Dismiss" onClick={cancel}>
          <X />
        </PillButton>
      </>
    );
  }

  return (
    <div className={cn("inline-flex", className)} data-state={state}>
      <motion.div
        layout
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        style={{ borderRadius: 999 }}
        className={cn(
          "relative flex items-center gap-1 overflow-hidden border border-border bg-card p-1 shadow-sm",
          state === "error" && "border-destructive/40",
        )}
      >
        <motion.button
          ref={micRef}
          layout="position"
          type="button"
          aria-label={micLabel}
          aria-pressed={recording}
          aria-disabled={disabled || busy || undefined}
          disabled={disabled}
          onClick={onMic}
          whileTap={reduce || busy || disabled ? undefined : { scale: 0.88 }}
          transition={SPRING_PRESS}
          className={cn(
            "relative grid size-9 shrink-0 place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 [&_svg]:size-4",
            recording
              ? "bg-destructive/10 text-destructive"
              : state === "error"
                ? "text-destructive hover:bg-destructive/10"
                : "text-foreground hover:bg-muted",
            busy && "cursor-default",
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={state === "requesting" || state === "recording" ? "mic" : state}
              variants={iconVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="col-start-1 row-start-1 grid place-items-center"
            >
              {icons[state]}
            </motion.span>
          </AnimatePresence>
          {recording ? (
            <motion.span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            />
          ) : null}
        </motion.button>
        <AnimatePresence initial={false} mode="popLayout">
          {expanded ? (
            <motion.div
              key={state}
              layout="position"
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex items-center gap-1"
            >
              {content}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
      <span aria-live="polite" className="sr-only">
        {status[state]}
      </span>
    </div>
  );
}
