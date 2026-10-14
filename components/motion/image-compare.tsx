"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { SPRING_GLIDE, SPRING_PRESS } from "@/lib/ease";
import {
  capturePointer,
  isHoveringPointer,
  releasePointer,
  TOUCH_GESTURE_CLASS,
} from "@/lib/touch";
import { cn } from "@/lib/utils";

export interface ImageCompareProps {
  /** Left / underneath layer. An image URL or any node. */
  before: ReactNode | string;
  /** Right / clipped top layer. An image URL or any node. */
  after: ReactNode | string;
  /** Alt text when `before` is a URL. */
  beforeAlt?: string;
  /** Alt text when `after` is a URL. */
  afterAlt?: string;
  /** Divider position in percent (controlled). */
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Divider follows the pointer while hovering instead of needing a drag. */
  hover?: boolean;
  beforeLabel?: ReactNode;
  afterLabel?: ReactNode;
  showLabels?: boolean;
  "aria-label"?: string;
  className?: string;
}

const KEY_STEP = 1;
const KEY_STEP_LARGE = 10;

const clamp = (v: number) => Math.min(100, Math.max(0, v));

function Layer({ content, alt }: { content: ReactNode | string; alt?: string }) {
  if (typeof content === "string") {
    return (
      // biome-ignore lint/performance/noImgElement: keeps the component framework-agnostic and both layers pixel-aligned.
      <img
        src={content}
        alt={alt ?? ""}
        draggable={false}
        className="absolute inset-0 size-full object-cover"
      />
    );
  }
  return <div className="absolute inset-0 size-full">{content}</div>;
}

export function ImageCompare({
  before,
  after,
  beforeAlt,
  afterAlt,
  value,
  defaultValue = 50,
  onValueChange,
  hover = false,
  beforeLabel = "Before",
  afterLabel = "After",
  showLabels = true,
  "aria-label": ariaLabel = "Comparison divider",
  className,
}: ImageCompareProps) {
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [internal, setInternal] = useState(clamp(defaultValue));
  const controlled = value !== undefined;
  const percent = clamp(controlled ? value : internal);
  const [dragging, setDragging] = useState(false);

  const target = useMotionValue(percent);
  useEffect(() => {
    target.set(percent);
  }, [percent, target]);
  const smooth = useSpring(target, SPRING_GLIDE);
  const pos = reduce ? target : smooth;

  // Clip the top ("after") layer from the left edge up to the divider.
  const clipPath = useMotionTemplate`inset(0 0 0 ${pos}%)`;
  const left = useMotionTemplate`${pos}%`;
  // Chips fade as their side shrinks toward the edge.
  const beforeOpacity = useTransform(pos, [4, 18], [0, 1]);
  const afterOpacity = useTransform(pos, [82, 96], [1, 0]);

  const setValue = useCallback(
    (next: number) => {
      const v = Math.round(clamp(next) * 10) / 10;
      if (!controlled) setInternal(v);
      onValueChange?.(v);
    },
    [controlled, onValueChange],
  );

  const fromPointer = (clientX: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    setValue(((clientX - rect.left) / rect.width) * 100);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    capturePointer(event.currentTarget, event.pointerId);
    handleRef.current?.focus({ preventScroll: true });
    setDragging(true);
    fromPointer(event.clientX);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging || (hover && isHoveringPointer(event))) {
      fromPointer(event.clientX);
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    releasePointer(event.currentTarget, event.pointerId);
    setDragging(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = percent - step;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = percent + step;
        break;
      case "PageDown":
        next = percent - KEY_STEP_LARGE;
        break;
      case "PageUp":
        next = percent + KEY_STEP_LARGE;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 100;
        break;
      default:
        return;
    }
    event.preventDefault();
    setValue(next);
  };

  return (
    <div
      ref={stageRef}
      data-dragging={dragging || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        "relative isolate aspect-video w-full touch-pan-y overflow-hidden rounded-2xl bg-muted",
        TOUCH_GESTURE_CLASS,
        hover ? "cursor-ew-resize" : "cursor-grab data-dragging:cursor-grabbing",
        className,
      )}
    >
      <Layer content={before} alt={beforeAlt} />
      <motion.div className="absolute inset-0" style={{ clipPath }}>
        <Layer content={after} alt={afterAlt} />
      </motion.div>

      {showLabels ? (
        <>
          <motion.span
            aria-hidden
            style={{ opacity: beforeOpacity }}
            className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
          >
            {beforeLabel}
          </motion.span>
          <motion.span
            aria-hidden
            style={{ opacity: afterOpacity }}
            className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
          >
            {afterLabel}
          </motion.span>
        </>
      ) : null}

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
        style={{ left }}
      />
      <motion.div
        ref={handleRef}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={`${Math.round(percent)}% before, ${Math.round(100 - percent)}% after`}
        onKeyDown={onKeyDown}
        style={{ left }}
        animate={{ scale: dragging && !reduce ? 1.08 : 1 }}
        transition={SPRING_PRESS}
        className={cn(
          "absolute top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 grid-flow-col place-items-center rounded-full bg-white text-neutral-900 shadow-lg outline-none",
          "ring-offset-2 focus-visible:ring-2 focus-visible:ring-white/90",
        )}
      >
        <ChevronLeft aria-hidden className="-mr-1 size-4" />
        <ChevronRight aria-hidden className="-ml-1 size-4" />
      </motion.div>
    </div>
  );
}
