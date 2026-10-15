"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  type PanInfo,
  motion,
  type Transition,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { EASE_OUT, EASE_OUT_CSS, SPRING_LAYOUT, SPRING_PANEL } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export interface GalleryItem {
  /** Stable id; also scopes the shared-layout morph into the lightbox. */
  id: string;
  title: string;
  /** Shown in the hover caption and under the lightbox image. */
  caption?: ReactNode;
  /** Filter group, e.g. "Architecture". */
  category?: string;
  /** Width / height. Drives masonry heights and the lightbox frame. Default 1. */
  aspectRatio?: number;
  /** Image URL. Rendered as a cover `<img>`. */
  src?: string;
  /** Alt text for `src`. Defaults to `title`. */
  alt?: string;
  /** Any node instead of `src` (illustration, canvas, gradient scene). */
  content?: ReactNode;
}

export interface ImageGalleryProps {
  items: GalleryItem[];
  /** "masonry" keeps each item's aspect ratio; "grid" crops to uniform tiles. */
  layout?: "masonry" | "grid";
  /** Tile aspect ratio (width / height) for `layout="grid"`. Default 1. */
  gridAspectRatio?: number;
  /** Most columns the gallery will use. Default 3. */
  columns?: number;
  /** Narrowest a column may get before one is dropped, in px. Default 170. */
  minColumnWidth?: number;
  /** Show category chips. Default true when items span 2+ categories. */
  filterable?: boolean;
  /** Category order. Defaults to first-seen order in `items`. */
  categories?: string[];
  /** Label of the chip that shows everything. Default "All". */
  allLabel?: string;
  /** Controlled active category (`allLabel` or a category). */
  category?: string;
  defaultCategory?: string;
  onCategoryChange?: (category: string) => void;
  /** Called whenever the lightbox opens on, or navigates to, an item. */
  onOpenItem?: (item: GalleryItem) => void;
  /** Accessible name for the gallery region. Default "Gallery". */
  label?: string;
  className?: string;
}

const GAP_PX = 12; // matches gap-3 between lanes/tiles
const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 400;

const FADE: Transition = { duration: 0.2, ease: EASE_OUT };
const EXIT: Transition = { duration: 0.14, ease: EASE_OUT };

// Lightbox slides: `custom` is the signed offset, read at exit time through
// AnimatePresence so a direction change also flips the leaving image.
const SLIDE: Variants = {
  enter: (offset: number) => ({ opacity: 0, x: offset }),
  center: { opacity: 1, x: 0 },
  exit: (offset: number) => ({ opacity: 0, x: -offset, transition: EXIT }),
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Column count from the gallery's own width; server/first render uses `max`. */
function useLaneCount(
  ref: React.RefObject<HTMLDivElement | null>,
  max: number,
  minWidth: number,
) {
  const [lanes, setLanes] = useState(max);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      const fit = Math.floor((width + GAP_PX) / (minWidth + GAP_PX));
      setLanes(Math.max(1, Math.min(max, fit)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, max, minWidth]);
  return lanes;
}

/** Greedy shortest-lane placement, deterministic for a given order. */
function distribute(items: GalleryItem[], lanes: number) {
  const out: GalleryItem[][] = Array.from({ length: lanes }, () => []);
  const heights = new Array<number>(lanes).fill(0);
  for (const item of items) {
    let target = 0;
    for (let i = 1; i < lanes; i++) if (heights[i] < heights[target]) target = i;
    out[target].push(item);
    heights[target] += 1 / (item.aspectRatio ?? 1);
  }
  return out;
}

function Media({ item, className }: { item: GalleryItem; className?: string }) {
  if (item.content) {
    return <span className={cn("block h-full w-full", className)}>{item.content}</span>;
  }
  if (item.src) {
    return (
      // biome-ignore lint/performance/noImgElement: library component, framework-agnostic.
      <img
        src={item.src}
        alt={item.alt ?? item.title}
        draggable={false}
        className={cn("block h-full w-full object-cover", className)}
      />
    );
  }
  return <span className={cn("block h-full w-full bg-muted", className)} />;
}

/**
 * Photo gallery: masonry or uniform grid of media tiles that zoom slightly and
 * reveal their caption on hover, category chips with a gliding pill that
 * reflow the tiles with shared layout, and a lightbox that grows out of the
 * clicked tile (shared `layoutId`) with prev/next, arrow keys, Escape, swipe,
 * a counter and a focus trap. Reduced motion swaps every move for a fade.
 */
export function ImageGallery({
  items,
  layout = "masonry",
  gridAspectRatio = 1,
  columns = 3,
  minColumnWidth = 170,
  filterable,
  categories: categoriesProp,
  allLabel = "All",
  category: categoryProp,
  defaultCategory,
  onCategoryChange,
  onOpenItem,
  label = "Gallery",
  className,
}: ImageGalleryProps) {
  const reduce = useReducedMotion() ?? false;
  const canHover = useHoverCapable();
  const uid = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const lanes = useLaneCount(rootRef, columns, minColumnWidth);

  const categories = useMemo(() => {
    if (categoriesProp) return categoriesProp;
    const seen: string[] = [];
    for (const item of items) {
      if (item.category && !seen.includes(item.category)) seen.push(item.category);
    }
    return seen;
  }, [items, categoriesProp]);
  const showFilters = filterable ?? categories.length > 1;

  const [internalCategory, setInternalCategory] = useState(
    defaultCategory ?? allLabel,
  );
  const active = categoryProp ?? internalCategory;
  const setCategory = (next: string) => {
    if (categoryProp === undefined) setInternalCategory(next);
    onCategoryChange?.(next);
  };

  const visible = useMemo(
    () =>
      active === allLabel ? items : items.filter((item) => item.category === active),
    [items, active, allLabel],
  );

  // Lightbox: index into `visible`; `originId` is the tile it grew out of.
  // Only that item carries the shared layoutId, so prev/next slide instead of
  // flying in from other tiles.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [originId, setOriginId] = useState<string | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const current = openIndex === null ? null : (visible[openIndex] ?? null);

  const open = (index: number) => {
    setOriginId(visible[index]?.id ?? null);
    setDirection(1);
    setOpenIndex(index);
    const item = visible[index];
    if (item) onOpenItem?.(item);
  };

  const step = useCallback(
    (dir: 1 | -1) => {
      if (openIndex === null || visible.length < 2) return;
      const next = (openIndex + dir + visible.length) % visible.length;
      setDirection(dir);
      setOriginId(null);
      setOpenIndex(next);
      const item = visible[next];
      if (item) onOpenItem?.(item);
    },
    [openIndex, visible, onOpenItem],
  );

  const close = useCallback(() => setOpenIndex(null), []);

  // Close if filtering removes the open item (e.g. a controlled category change).
  useEffect(() => {
    if (openIndex !== null && !visible[openIndex]) setOpenIndex(null);
  }, [openIndex, visible]);

  const shared = (id: string) => (reduce ? undefined : `${uid}-media-${id}`);
  const layoutTransition = reduce ? { duration: 0 } : SPRING_LAYOUT;
  const zoom = canHover && !reduce;

  const tile = (item: GalleryItem, index: number) => {
    const ratio = layout === "grid" ? gridAspectRatio : (item.aspectRatio ?? 1);
    return (
      // Layout animation is the point: tiles glide to their new lanes and
      // slots when a filter changes. layoutId carries them across lanes.
      <motion.li
        key={item.id}
        layoutId={reduce ? undefined : `${uid}-tile-${item.id}`}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: reduce ? 1 : 0.94, transition: EXIT }}
        transition={{ layout: layoutTransition, ...FADE }}
        className="list-none"
      >
        <button
          type="button"
          onClick={() => open(index)}
          aria-label={`Open ${item.title}`}
          aria-haspopup="dialog"
          className="group/tile relative block w-full overflow-hidden rounded-xl bg-muted text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{ aspectRatio: ratio }}
        >
          <motion.span
            layoutId={shared(item.id)}
            transition={layoutTransition}
            className="absolute inset-0 block overflow-hidden"
          >
            {/* Hover zoom lives on an inner layer so it never fights the
                shared-layout transform on the element above. */}
            <span
              className={cn(
                "block h-full w-full transition-transform duration-500",
                zoom && "group-hover/tile:scale-[1.06]",
              )}
              style={{ transitionTimingFunction: EASE_OUT_CSS }}
            >
              <Media item={item} />
            </span>
          </motion.span>
          {/* Caption over a scrim. Photos are dark or light regardless of the
              theme, so the scrim and its text stay fixed black/white. */}
          <span
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-linear-to-t from-black/70 via-black/25 to-transparent px-3 pt-8 pb-2.5 text-white transition duration-300",
              canHover
                ? "opacity-0 group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100"
                : "opacity-100",
              zoom && "translate-y-1 group-hover/tile:translate-y-0 group-focus-visible/tile:translate-y-0",
            )}
            style={{ transitionTimingFunction: EASE_OUT_CSS }}
          >
            <span className="truncate text-sm font-medium">{item.title}</span>
            {item.category ? (
              <span className="truncate text-xs text-white/75">{item.category}</span>
            ) : null}
          </span>
        </button>
      </motion.li>
    );
  };

  const indexOf = new Map(visible.map((item, i) => [item.id, i]));

  return (
    <section aria-label={label} className={cn("@container w-full text-foreground", className)}>
      <LayoutGroup id={uid}>
        {showFilters ? (
          <fieldset className="-mx-1 mb-4 flex min-w-0 gap-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <legend className="sr-only">Filter by category</legend>
            {[allLabel, ...categories].map((name) => {
              const selected = name === active;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCategory(name)}
                  className={cn(
                    "relative h-8 shrink-0 rounded-full px-3.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {selected ? (
                    <motion.span
                      aria-hidden
                      layoutId={`${uid}-chip`}
                      transition={layoutTransition}
                      className="absolute inset-0 rounded-full bg-primary"
                    />
                  ) : null}
                  <span className="relative">{name}</span>
                </button>
              );
            })}
          </fieldset>
        ) : null}

        <div ref={rootRef}>
          {layout === "masonry" ? (
            <div className="flex items-start gap-3">
              {distribute(visible, lanes).map((lane, laneIndex) => (
                <ul
                  // biome-ignore lint/suspicious/noArrayIndexKey: lanes are positional.
                  key={laneIndex}
                  className="m-0 flex min-w-0 flex-1 flex-col gap-3 p-0"
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    {lane.map((item) => tile(item, indexOf.get(item.id) ?? 0))}
                  </AnimatePresence>
                </ul>
              ))}
            </div>
          ) : (
            <ul
              className="m-0 grid gap-3 p-0"
              style={{ gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))` }}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((item, i) => tile(item, i))}
              </AnimatePresence>
            </ul>
          )}
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-strong px-5 py-10 text-center text-sm text-muted-foreground">
              Nothing in this category yet.
            </p>
          ) : null}
        </div>

        <Lightbox
          item={current}
          index={openIndex ?? 0}
          total={visible.length}
          direction={direction}
          sharedId={current && current.id === originId ? shared(current.id) : undefined}
          reduce={reduce}
          onStep={step}
          onClose={close}
        />
      </LayoutGroup>
    </section>
  );
}

function Lightbox({
  item,
  index,
  total,
  direction,
  sharedId,
  reduce,
  onStep,
  onClose,
}: {
  item: GalleryItem | null;
  index: number;
  total: number;
  direction: 1 | -1;
  sharedId: string | undefined;
  reduce: boolean;
  onStep: (dir: 1 | -1) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {item ? (
        <LightboxSurface
          key="lightbox"
          item={item}
          index={index}
          total={total}
          direction={direction}
          sharedId={sharedId}
          reduce={reduce}
          onStep={onStep}
          onClose={onClose}
        />
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function LightboxSurface({
  item,
  index,
  total,
  direction,
  sharedId,
  reduce,
  onStep,
  onClose,
}: {
  item: GalleryItem;
  index: number;
  total: number;
  direction: 1 | -1;
  sharedId: string | undefined;
  reduce: boolean;
  onStep: (dir: 1 | -1) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const handlers = useRef({ onStep, onClose });
  handlers.current = { onStep, onClose };
  const multiple = total > 1;
  const ratio = item.aspectRatio ?? 1;

  // Focus, keyboard, focus trap, scroll lock and focus return — once per open.
  useEffect(() => {
    const returnTo =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handlers.current.onClose();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handlers.current.onStep(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlers.current.onStep(-1);
      } else if (event.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeEl = document.activeElement;
        const outside = !panel.contains(activeEl);
        if (event.shiftKey && (activeEl === first || outside)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (activeEl === last || outside)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
    };
  }, []);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (!multiple) return;
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onStep(1);
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onStep(-1);
  };

  const slide = reduce ? 0 : 48 * direction;
  const navClass =
    "pointer-events-auto absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/80 text-foreground shadow-md backdrop-blur outline-none transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title}, image ${index + 1} of ${total}`}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <motion.button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: EXIT }}
        transition={FADE}
        className="absolute inset-0 h-full w-full cursor-default bg-background/85 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: EXIT }}
        transition={FADE}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4"
      >
        <p aria-live="polite" className="rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium tabular-nums text-foreground backdrop-blur">
          {index + 1} / {total}
        </p>
        <button
          ref={closeRef}
          type="button"
          aria-label="Close gallery"
          onClick={onClose}
          className="pointer-events-auto grid size-10 place-items-center rounded-full border border-border bg-card/80 text-foreground shadow-md backdrop-blur outline-none transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden className="size-4" />
        </button>
      </motion.div>

      <figure className="pointer-events-none relative z-0 m-0 flex max-h-full flex-col items-center gap-3">
        <AnimatePresence initial={false} mode="popLayout" custom={slide}>
          <motion.div
            key={item.id}
            custom={slide}
            variants={SLIDE}
            initial={sharedId ? false : "enter"}
            animate="center"
            exit="exit"
            transition={reduce ? FADE : SPRING_PANEL}
            className="pointer-events-auto"
          >
            <motion.div
              drag={multiple && !reduce ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={onDragEnd}
              className="touch-pan-y"
            >
              <motion.div
                layoutId={sharedId}
                transition={SPRING_LAYOUT}
                className="overflow-hidden rounded-2xl bg-muted shadow-2xl"
                style={{
                  aspectRatio: ratio,
                  // Fit within ~88% of the viewport width and ~72% of its height.
                  width: `min(88vw, 56rem, calc(72dvh * ${ratio}))`,
                }}
              >
                <Media item={item} className="pointer-events-none select-none" />
              </motion.div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
        <motion.figcaption
          key={`caption-${item.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: EXIT }}
          transition={{ ...FADE, delay: 0.08 }}
          className="pointer-events-auto max-w-xl px-2 text-center"
        >
          <span className="block text-sm font-medium text-foreground">{item.title}</span>
          {item.caption ? (
            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              {item.caption}
            </span>
          ) : null}
        </motion.figcaption>
      </figure>

      {multiple ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: EXIT }}
          transition={FADE}
          className="pointer-events-none absolute inset-x-0 top-1/2 z-10"
        >
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => onStep(-1)}
            className={cn(navClass, "left-3 sm:left-6")}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => onStep(1)}
            className={cn(navClass, "right-3 sm:right-6")}
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </motion.div>
      ) : null}
    </div>
  );
}
