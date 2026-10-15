"use client";

import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  Eye,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { AgentCodeLanguage } from "@/components/agents/agent-code";
import { CodeBlock } from "@/components/agents/code-block";
import { CopyButton } from "@/components/motion/copy-button";
import { Skeleton, SkeletonText } from "@/components/motion/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { TextShimmer } from "@/components/motion/text-shimmer";
import { EASE_DRAWER, EASE_OUT, SPRING_LAYOUT, SPRING_PANEL, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface ArtifactVersion {
  id: string;
  /** Short label shown under the title ("Added dark mode"). */
  label?: string;
  code: string;
  language?: AgentCodeLanguage;
  /** Rendered output for the Preview tab. Without it the panel shows code only. */
  preview?: ReactNode;
}

export type ArtifactTab = "code" | "preview";

export interface ArtifactPanelProps {
  title: ReactNode;
  versions: ArtifactVersion[];
  /** Used by the code header and the default download. */
  filename?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Selected version id; defaults to the latest. */
  version?: string;
  defaultVersion?: string;
  onVersionChange?: (id: string) => void;
  tab?: ArtifactTab;
  defaultTab?: ArtifactTab;
  onTabChange?: (tab: ArtifactTab) => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** A new version is being written: shows a skeleton in place of the content. */
  generating?: boolean;
  /** Replace the default download (a Blob of the code saved as `filename`). */
  onDownload?: (version: ArtifactVersion) => void;
  /** Panel width in px when docked beside the chat. Default 400. */
  width?: number;
  /** The chat the panel slides in next to. Omit to render the panel alone. */
  children?: ReactNode;
  className?: string;
  panelClassName?: string;
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

function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ArtifactPanel({
  title,
  versions,
  filename = "artifact.tsx",
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  version: versionProp,
  defaultVersion,
  onVersionChange,
  tab: tabProp,
  defaultTab = "preview",
  onTabChange,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  generating = false,
  onDownload,
  width = 400,
  children,
  className,
  panelClassName,
}: ArtifactPanelProps) {
  const uid = useId();
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  const [expanded, setExpanded] = useControllable(expandedProp, defaultExpanded, onExpandedChange);
  const [tab, setTab] = useControllable<ArtifactTab>(tabProp, defaultTab, onTabChange);
  const latest = versions[versions.length - 1]?.id ?? "";
  const [versionId, setVersionId] = useControllable<string>(
    versionProp,
    defaultVersion ?? "",
    onVersionChange,
  );
  // Uncontrolled with no default follows the newest version as they arrive.
  const index = Math.max(
    0,
    versions.findIndex((v) => v.id === (versionId || latest)),
  );
  const current = versions[index];

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Escape leaves fullscreen.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        focusToggle.current = true;
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, setExpanded]);

  // Docked and fullscreen surfaces mount fresh; after a user toggle the new
  // one takes focus on its expand/minimize button.
  const focusToggle = useRef(false);
  const toggleExpanded = (next: boolean) => {
    focusToggle.current = true;
    setExpanded(next);
  };

  const effectiveTab: ArtifactTab = current?.preview == null ? "code" : tab;

  const body = current ? (
    <PanelBody
      uid={uid}
      title={title}
      filename={filename}
      versions={versions}
      index={index}
      current={current}
      tab={effectiveTab}
      onTab={setTab}
      onVersion={(i) => {
        const next = versions[i];
        if (next) setVersionId(next.id);
      }}
      generating={generating}
      expanded={expanded}
      onExpand={toggleExpanded}
      focusRef={focusToggle}
      onClose={() => {
        setExpanded(false);
        setOpen(false);
      }}
      onDownload={() =>
        onDownload ? onDownload(current) : downloadText(current.code, filename)
      }
      reduce={reduce}
    />
  ) : null;

  const surface = cn(
    "flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
    panelClassName,
  );

  return (
    <div className={cn("relative flex h-full w-full min-w-0", className)}>
      {children != null && <div className="min-w-0 flex-1">{children}</div>}
      <AnimatePresence initial={false}>
        {open && (
          // Width is animated on purpose: the docked slot opening is what
          // pushes the chat aside, so the chat reflows smoothly instead of
          // jumping. The panel inside keeps a fixed width and never reflows.
          <motion.div
            key="slot"
            className={cn("h-full shrink-0 overflow-hidden", children == null && "w-full")}
            initial={children == null || reduce ? false : { width: 0 }}
            animate={children == null ? undefined : { width: width + 12 }}
            exit={children == null || reduce ? { opacity: 0 } : { width: 0 }}
            transition={{ duration: 0.32, ease: EASE_DRAWER }}
          >
            <div
              className={cn("h-full", children != null && "pl-3")}
              style={children != null ? { width: width + 12 } : undefined}
            >
              {expanded ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border-strong text-xs text-muted-foreground">
                  Open in fullscreen
                </div>
              ) : (
                <motion.aside
                  layoutId={reduce ? undefined : `${uid}-artifact`}
                  aria-label="Artifact"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
                  transition={SPRING_PANEL}
                  className={surface}
                >
                  {body}
                </motion.aside>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && expanded && (
              <motion.div key="fullscreen" className="fixed inset-0 z-50 p-4 sm:p-8">
                <motion.button
                  type="button"
                  aria-label="Exit fullscreen"
                  tabIndex={-1}
                  className="absolute inset-0 cursor-default bg-background/70 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  onClick={() => toggleExpanded(false)}
                />
                {/* Shares a layoutId with the docked panel, so the same surface
                    grows out of the chat instead of a new one appearing. */}
                <motion.div
                  layoutId={reduce ? undefined : `${uid}-artifact`}
                  aria-label="Artifact"
                  aria-modal="true"
                  role="dialog"
                  initial={reduce ? { opacity: 0 } : undefined}
                  animate={{ opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : undefined}
                  transition={SPRING_LAYOUT}
                  className={cn(surface, "relative mx-auto max-w-5xl shadow-lg")}
                >
                  {body}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

const LABEL_ROLL: Variants = {
  enter: (d: number) => ({ opacity: 0, y: d * 10 }),
  center: { opacity: 1, y: 0 },
  exit: (d: number) => ({ opacity: 0, y: d * -10 }),
};
const LABEL_FADE: Variants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

interface PanelBodyProps {
  uid: string;
  title: ReactNode;
  filename: string;
  versions: ArtifactVersion[];
  index: number;
  current: ArtifactVersion;
  tab: ArtifactTab;
  onTab: (tab: ArtifactTab) => void;
  onVersion: (index: number) => void;
  generating: boolean;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  onClose: () => void;
  onDownload: () => void;
  focusRef: { current: boolean };
  reduce: boolean;
}

function PanelBody({
  uid,
  title,
  filename,
  versions,
  index,
  current,
  tab,
  onTab,
  onVersion,
  generating,
  expanded,
  onExpand,
  onClose,
  onDownload,
  focusRef,
  reduce,
}: PanelBodyProps) {
  const expandRef = useRef<HTMLButtonElement>(null);
  const prevIndex = useRef(index);
  const direction = index >= prevIndex.current ? 1 : -1;
  useEffect(() => {
    prevIndex.current = index;
  }, [index]);

  useEffect(() => {
    if (!focusRef.current) return;
    focusRef.current = false;
    expandRef.current?.focus();
  }, [focusRef]);

  const hasPreview = current.preview != null;
  const contentKey = generating ? "generating" : `${current.id}:${tab}`;

  return (
    <>
      <header className="flex items-start gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id={`${uid}-title`} className="truncate text-sm font-semibold text-foreground">
            {title}
          </h2>
          <div className="relative h-4 overflow-hidden text-xs text-muted-foreground">
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <motion.p
                key={generating ? "gen" : current.id}
                custom={direction}
                variants={reduce ? LABEL_FADE : LABEL_ROLL}
                initial="enter"
                animate="center"
                exit="exit"
                transition={SPRING_SWAP}
                className="truncate"
              >
                {generating ? (
                  <TextShimmer>Generating new version…</TextShimmer>
                ) : (
                  (current.label ?? `Version ${index + 1}`)
                )}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        {versions.length > 1 && (
          <fieldset
            aria-label="Version"
            className="flex shrink-0 items-center rounded-lg border border-border bg-muted/50"
          >
            <IconButton
              label="Previous version"
              disabled={index === 0 || generating}
              onClick={() => onVersion(index - 1)}
            >
              <ChevronLeft />
            </IconButton>
            <span
              aria-live="polite"
              className="min-w-11 px-0.5 text-center font-mono text-[11px] tabular-nums text-muted-foreground"
            >
              v{index + 1}
              <span className="text-muted-foreground/60">/{versions.length}</span>
            </span>
            <IconButton
              label="Next version"
              disabled={index === versions.length - 1 || generating}
              onClick={() => onVersion(index + 1)}
            >
              <ChevronRight />
            </IconButton>
          </fieldset>
        )}
        <IconButton label="Close artifact" onClick={onClose}>
          <X />
        </IconButton>
      </header>

      <div className="flex items-center gap-1 px-3 py-2">
        {hasPreview ? (
          <Tabs
            value={tab}
            onValueChange={(v) => onTab(v as ArtifactTab)}
            variant="segment"
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="preview" className="gap-1.5 px-2.5 py-1 text-xs">
                <Eye aria-hidden="true" className="size-3.5" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-1.5 px-2.5 py-1 text-xs">
                <Code2 aria-hidden="true" className="size-3.5" />
                Code
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <span className="px-1 font-mono text-xs text-muted-foreground">{filename}</span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <CopyButton
            value={current.code}
            size="icon"
            variant="ghost"
            showLabel={false}
            disabled={generating}
            aria-label="Copy code"
          />
          <IconButton label="Download" disabled={generating} onClick={onDownload}>
            <Download />
          </IconButton>
          <IconButton
            ref={expandRef}
            label={expanded ? "Exit fullscreen" : "Expand to fullscreen"}
            onClick={() => onExpand(!expanded)}
          >
            {expanded ? <Minimize2 /> : <Maximize2 />}
          </IconButton>
        </div>
      </div>

      <div className="relative grid min-h-0 flex-1 px-3 pb-3">
        <AnimatePresence initial={false}>
          <motion.div
            key={contentKey}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="min-h-0 overflow-auto rounded-xl [grid-area:1/1] [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
          >
            {generating ? (
              <div aria-busy="true" className="flex h-full flex-col gap-3 rounded-xl bg-muted/60 p-4">
                <span className="sr-only">Generating a new version</span>
                {tab === "preview" && hasPreview ? (
                  <>
                    <Skeleton height={28} width="45%" />
                    <Skeleton height={96} />
                    <SkeletonText lines={3} />
                  </>
                ) : (
                  <SkeletonText lines={9} lastLineWidth="35%" />
                )}
              </div>
            ) : tab === "preview" && hasPreview ? (
              <div className="flex min-h-full items-center justify-center rounded-xl border border-border bg-background p-4">
                {current.preview}
              </div>
            ) : (
              <CodeBlock
                code={current.code}
                language={current.language ?? "tsx"}
                filename={filename}
                copyable={false}
                maxHeight={expanded ? 2000 : 1000}
                className="rounded-xl"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

const IconButton = ({
  label,
  disabled,
  onClick,
  children,
  ref,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}) => (
  <motion.button
    ref={ref}
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    whileTap={disabled ? undefined : { scale: 0.9 }}
    transition={SPRING_SWAP}
    className={cn(
      "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors [&_svg]:size-3.5",
      "hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-40",
    )}
  >
    {children}
  </motion.button>
);
