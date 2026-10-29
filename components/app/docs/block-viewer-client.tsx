"use client";

import {
  Check,
  ExternalLink,
  Monitor,
  RotateCw,
  Smartphone,
  Tablet,
  Terminal,
} from "lucide-react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import Link from "next/link";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { PreviewFrame } from "@/components/app/docs/viewer-frame";
import {
  ViewerCode,
  type ViewerCodeFile,
  type ViewerDependency,
} from "@/components/app/docs/viewer-code";
import { SegmentedControl } from "@/components/motion/segmented-control";
import { Tooltip } from "@/components/motion/tooltip";
import { trackEvent } from "@/lib/analytics";
import { SPRING_LAYOUT } from "@/lib/ease";
import {
  clampFrameHeight,
  clampFrameWidth,
  FRAME_BOUNDS,
  MIN_FRAME_WIDTH,
  PRESET_WIDTHS,
  presetFor,
  presetTarget,
  type ViewerKind,
  type ViewerPreset,
} from "@/lib/preview-frame";
import { REGISTRY_NAMESPACE } from "@/lib/site";
import { capturePointer, releasePointer, TOUCH_GESTURE_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

// Below md the row is narrower than a tablet: no drag handle, no Tablet
// preset, and the frame fills the row.
const NARROW_QUERY = "(max-width: 767.98px)";

function subscribeNarrow(onChange: () => void) {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
const readNarrow = () => window.matchMedia(NARROW_QUERY).matches;
const serverNarrow = () => false;

/** Width of the drag handle column (w-4). */
const HANDLE_WIDTH = 16;
/** The frame is box-content: its 1px border sits outside the exact-width iframe. */
const FRAME_BORDER = 2;
const KEY_STEP = 10;
const KEY_STEP_LARGE = 50;
const CODE_MIN_HEIGHT = 480;
/** How long the width readout stays up after a keyboard resize. */
const WIDTH_READOUT_MS = 900;

const PRESETS: { value: ViewerPreset; label: string; icon: ReactNode }[] = [
  { value: "desktop", label: "Desktop", icon: <Monitor aria-hidden="true" /> },
  {
    value: "tablet",
    label: `Tablet (${PRESET_WIDTHS.tablet}px)`,
    icon: <Tablet aria-hidden="true" />,
  },
  {
    value: "mobile",
    label: `Mobile (${PRESET_WIDTHS.mobile}px)`,
    icon: <Smartphone aria-hidden="true" />,
  },
];

const TOOL_BUTTON =
  "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-muted aria-pressed:text-foreground [&_svg]:size-3.5";

type View = "preview" | "code";

export type BlockViewerClientProps = {
  name: string;
  kind: ViewerKind;
  /** The bare /preview route to frame. */
  src: string;
  installSlug: string | null;
  /** Highlighted files for the Code view. Without them, `codeHref` links out. */
  files?: ViewerCodeFile[];
  dependencies?: ViewerDependency[];
  /** Where Code goes when this viewer carries no files (the blocks gallery). */
  codeHref?: string;
  /** Element id; when the URL hash equals it, the viewer opens on Code. */
  codeAnchor?: string;
  className?: string;
};

/**
 * Block viewer modelled on ui.shadcn.com/blocks: one toolbar of controls
 * (Preview/Code, Desktop/Tablet/Mobile, open in new tab, refresh, install
 * command), the preview always in an iframe of the bare /preview route whose
 * width can be dragged from a handle on its right edge, and a Code view with
 * a file tree of the install.
 */
export function BlockViewerClient({
  name,
  kind,
  src,
  installSlug,
  files,
  dependencies = [],
  codeHref,
  codeAnchor,
  className,
}: BlockViewerClientProps) {
  const reduce = useReducedMotion();
  const narrow = useSyncExternalStore(subscribeNarrow, readNarrow, serverNarrow);
  const hasCode = Boolean(files?.length);
  const frameId = useId();

  const [view, setView] = useState<View>("preview");
  const [reloadKey, setReloadKey] = useState(0);
  const [requested, setRequested] = useState<number | null>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [readout, setReadout] = useState(false);
  const [inView, setInView] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const requestedRef = useRef<number | null>(null);
  const availableRef = useRef<number | null>(null);
  const readoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(
    null,
  );

  const width = useMotionValue(0);
  const widthLabel = useTransform(width, (v) => `${Math.round(v)}px`);
  // The handle's aria-valuenow follows the live width without re-rendering
  // the viewer on every drag frame.
  useMotionValueEvent(width, "change", (v) => {
    handleRef.current?.setAttribute("aria-valuenow", String(Math.round(v)));
  });

  const commitRequested = useCallback((next: number | null) => {
    requestedRef.current = next;
    setRequested(next);
  }, []);

  // Track the row width; the frame keeps its requested width when it fits.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      // Hidden (Code view): keep the last measurement.
      if (row.clientWidth === 0) return;
      const next = Math.max(0, row.clientWidth - (narrow ? 0 : HANDLE_WIDTH) - FRAME_BORDER);
      availableRef.current = next;
      setAvailable(next);
      width.stop();
      width.set(clampFrameWidth(requestedRef.current ?? next, next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [narrow, width]);

  // Mount the iframe only once the viewer nears the viewport.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setInView(true);
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  // /components/...#<codeAnchor> opens the Code view (linked from the gallery).
  useEffect(() => {
    if (!codeAnchor || !hasCode) return;
    const sync = () => {
      if (window.location.hash === `#${codeAnchor}`) setView("code");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [codeAnchor, hasCode]);

  useEffect(
    () => () => {
      if (readoutTimer.current) clearTimeout(readoutTimer.current);
    },
    [],
  );

  const flashReadout = () => {
    setReadout(true);
    if (readoutTimer.current) clearTimeout(readoutTimer.current);
    readoutTimer.current = setTimeout(() => setReadout(false), WIDTH_READOUT_MS);
  };

  /**
   * Request a frame width (null fills the row). Drags and key presses that
   * reach the full row width settle on Desktop; presets keep their own width
   * so Tablet stays selected even while the row is narrower than 768px.
   */
  const resizeTo = (next: number | null, animated: boolean, settle = true) => {
    const avail = availableRef.current;
    const settled = settle && avail !== null && next !== null && next >= avail ? null : next;
    commitRequested(settled);
    if (avail === null) return;
    const to = clampFrameWidth(settled ?? avail, avail);
    if (animated && !reduce) animate(width, to, SPRING_LAYOUT);
    else {
      width.stop();
      width.set(to);
    }
  };

  const selectPreset = (preset: ViewerPreset) => resizeTo(presetTarget(preset), true, false);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || availableRef.current === null) return;
    event.preventDefault();
    event.currentTarget.focus();
    capturePointer(event.currentTarget, event.pointerId);
    width.stop();
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width.get(),
    };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const avail = availableRef.current;
    if (!state || state.pointerId !== event.pointerId || avail === null) return;
    width.set(clampFrameWidth(state.startWidth + event.clientX - state.startX, avail));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    releasePointer(event.currentTarget, event.pointerId);
    drag.current = null;
    setDragging(false);
    resizeTo(Math.round(width.get()), false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const avail = availableRef.current;
    if (avail === null) return;
    const current = Math.round(width.get());
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    let next: number | null;
    switch (event.key) {
      case "ArrowLeft":
        next = clampFrameWidth(current - step, avail);
        break;
      case "ArrowRight":
        next = clampFrameWidth(current + step, avail);
        break;
      case "Home":
        next = clampFrameWidth(MIN_FRAME_WIDTH, avail);
        break;
      case "End":
        next = null;
        break;
      default:
        return;
    }
    event.preventDefault();
    resizeTo(next, false);
    flashReadout();
  };

  const bounds = FRAME_BOUNDS[kind];
  const frameHeight =
    contentHeight === null ? bounds.initial : clampFrameHeight(contentHeight, kind);
  const activePreset = presetFor(requested);
  const presets = narrow ? PRESETS.filter((p) => p.value !== "tablet") : PRESETS;
  const ariaWidth =
    available === null ? undefined : clampFrameWidth(requested ?? available, available);

  return (
    <div
      ref={rootRef}
      id={codeAnchor}
      className={cn("min-w-0 scroll-mt-24", className)}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {hasCode ? (
          <SegmentedControl
            size="sm"
            aria-label={`${name} view`}
            options={[
              { value: "preview", label: "Preview" },
              { value: "code", label: "Code" },
            ]}
            value={view}
            onValueChange={(value) => setView(value === "code" ? "code" : "preview")}
          />
        ) : codeHref ? (
          <CodeLinkToggle href={codeHref} name={name} />
        ) : null}

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {view === "preview" ? (
            <div className="flex h-8 items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
              <fieldset className="flex items-center gap-0.5">
                <legend className="sr-only">{`${name} preview width`}</legend>
                {presets.map((preset) => (
                  <Tooltip key={preset.value} content={preset.label} side="bottom">
                    <button
                      type="button"
                      className={TOOL_BUTTON}
                      aria-label={preset.label}
                      aria-pressed={activePreset === preset.value}
                      onClick={() => selectPreset(preset.value)}
                    >
                      {preset.icon}
                    </button>
                  </Tooltip>
                ))}
              </fieldset>
              <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
              <Tooltip content="Open in new tab" side="bottom">
                <a
                  href={src}
                  target="_blank"
                  rel="noopener"
                  className={TOOL_BUTTON}
                  aria-label={`Open ${name} preview in a new tab`}
                >
                  <ExternalLink aria-hidden="true" />
                </a>
              </Tooltip>
              <Tooltip content="Refresh preview" side="bottom">
                <button
                  type="button"
                  className={TOOL_BUTTON}
                  aria-label={`Refresh ${name} preview`}
                  onClick={() => setReloadKey((key) => key + 1)}
                >
                  <RotateCw aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          ) : null}
          {installSlug ? <InstallChip slug={installSlug} /> : null}
        </div>
      </div>

      <div hidden={view !== "preview"}>
        <div ref={rowRef} className="relative flex w-full items-stretch">
          <motion.div
            id={frameId}
            className="relative box-content min-w-0 overflow-hidden rounded-2xl border border-border bg-background"
            style={{ width: available === null ? "100%" : width }}
          >
            {inView ? (
              <PreviewFrame
                key={reloadKey}
                src={src}
                title={`${name} preview`}
                height={frameHeight}
                onContentHeight={setContentHeight}
                passive={dragging}
              />
            ) : (
              <div aria-hidden="true" className="preview-stage" style={{ height: frameHeight }} />
            )}
            {dragging || readout ? (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-2 py-0.5 font-mono text-[11px] text-background tabular-nums shadow-sm"
              >
                {widthLabel}
              </motion.span>
            ) : null}
          </motion.div>
          {narrow ? null : (
            // biome-ignore lint/a11y/useSemanticElements: a focusable window splitter (WAI-ARIA) is a separator widget; <hr> cannot take focus or children.
            <div
              ref={handleRef}
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-controls={frameId}
              aria-label={`Resize ${name} preview width`}
              aria-valuemin={available === null ? undefined : Math.min(MIN_FRAME_WIDTH, available)}
              aria-valuemax={available ?? undefined}
              aria-valuenow={ariaWidth}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onKeyDown}
              onDoubleClick={() => selectPreset("desktop")}
              className={cn(
                "group/handle relative hidden w-4 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none select-none md:flex",
                TOUCH_GESTURE_CLASS,
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-8 w-1 rounded-full bg-border opacity-60 transition-[background-color,opacity,transform,box-shadow] duration-150",
                  "group-hover/handle:scale-y-150 group-hover/handle:bg-muted-foreground group-hover/handle:opacity-100 group-focus-visible/handle:opacity-100",
                  "group-focus-visible/handle:scale-y-150 group-focus-visible/handle:bg-ring group-focus-visible/handle:ring-2 group-focus-visible/handle:ring-ring group-focus-visible/handle:ring-offset-2 group-focus-visible/handle:ring-offset-background",
                  dragging && "scale-y-150 bg-muted-foreground opacity-100",
                )}
              />
            </div>
          )}
        </div>
      </div>

      {hasCode && files && view === "code" ? (
        <ViewerCode
          name={name}
          files={files}
          dependencies={dependencies}
          height={Math.max(frameHeight, CODE_MIN_HEIGHT)}
        />
      ) : null}
    </div>
  );
}

/** Preview | Code where Code is a link to the component page (gallery viewers). */
function CodeLinkToggle({ href, name }: { href: string; name: string }) {
  return (
    <div className="inline-flex h-8 items-stretch rounded-xl border border-border bg-muted p-0.5 text-xs font-medium">
      <span className="inline-flex items-center rounded-lg border border-border bg-card px-2.5 text-foreground shadow-sm">
        Preview
      </span>
      <Link
        href={href}
        aria-label={`${name} code`}
        className="inline-flex items-center rounded-lg px-2.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        Code
      </Link>
    </div>
  );
}

function InstallChip({ slug }: { slug: string }) {
  const command = `npx shadcn@latest add ${REGISTRY_NAMESPACE}/${slug}`;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
    trackEvent("copy_install_command", { label: slug, chars: command.length });
  };

  return (
    <Tooltip
      content={copied ? "Copied" : "Copy install command"}
      side="bottom"
      // Phones get the install command from the page's Install section; the
      // chip would force the toolbar onto a third row.
      wrapperClassName="hidden min-w-0 max-w-full sm:inline-flex"
    >
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Install command copied" : `Copy install command: ${command}`}
        className="inline-flex h-8 min-w-0 max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 font-mono text-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5 [&_svg]:shrink-0"
      >
        {copied ? (
          <Check aria-hidden="true" className="text-(--color-success)" />
        ) : (
          <Terminal aria-hidden="true" />
        )}
        <span className="truncate">{command}</span>
      </button>
    </Tooltip>
  );
}
