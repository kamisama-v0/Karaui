"use client";

import { Brain, Check, ChevronDown, Eye, Search, Wrench, Zap } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Badge } from "@/components/motion/badge";
import { Kbd } from "@/components/motion/kbd";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/components/motion/popover-morph";
import { ScrollArea } from "@/components/motion/scroll-area";
import { SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type ModelCapability = "vision" | "tools" | "reasoning" | "fast";

export type ProviderGlyphShape =
  | "circle"
  | "square"
  | "triangle"
  | "hexagon"
  | "diamond"
  | "spark";

export interface ModelProvider {
  id: string;
  name: string;
  /** Generic geometric glyph. Defaults by provider order. */
  shape?: ProviderGlyphShape;
  /** Replaces the generic glyph entirely (e.g. your own logo). */
  icon?: ReactNode;
}

export interface ModelOption {
  value: string;
  name: string;
  /** `ModelProvider.id` the model is grouped under. */
  provider: string;
  description?: string;
  capabilities?: ModelCapability[];
  /** Context window in tokens. */
  contextWindow?: number;
  /** Relative cost from 1 (cheapest) to 4. */
  cost?: 1 | 2 | 3 | 4;
  isNew?: boolean;
  disabled?: boolean;
}

export interface ModelSelectorProps {
  models: ModelOption[];
  /** Provider order and naming. Providers missing here are derived from `models`. */
  providers?: ModelProvider[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "end";
  disabled?: boolean;
  /** Hide the keyboard hint footer. */
  hideHints?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  "aria-label"?: string;
}

const SHAPES: ProviderGlyphShape[] = [
  "spark",
  "hexagon",
  "circle",
  "diamond",
  "square",
  "triangle",
];

const CAPABILITIES: Record<
  ModelCapability,
  { label: string; icon: ReactNode }
> = {
  vision: { label: "Vision", icon: <Eye /> },
  tools: { label: "Tools", icon: <Wrench /> },
  reasoning: { label: "Reasoning", icon: <Brain /> },
  fast: { label: "Fast", icon: <Zap /> },
};

/** 200000 → "200k", 1048576 → "1M". */
export function formatContextWindow(tokens: number) {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}k`;
  return String(tokens);
}

function GlyphShape({ shape }: { shape: ProviderGlyphShape }) {
  switch (shape) {
    case "circle":
      return <circle cx="8" cy="8" r="5.25" />;
    case "square":
      return <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="2.5" />;
    case "triangle":
      return <path d="M8 2.4 13.9 12.9H2.1Z" />;
    case "hexagon":
      return <path d="M8 1.9 13.3 4.95V11.05L8 14.1 2.7 11.05V4.95Z" />;
    case "diamond":
      return <path d="M8 1.6 14.4 8 8 14.4 1.6 8Z" />;
    default:
      return (
        <path d="M8 1.5C8.6 5.6 10.4 7.4 14.5 8 10.4 8.6 8.6 10.4 8 14.5 7.4 10.4 5.6 8.6 1.5 8 5.6 7.4 7.4 5.6 8 1.5Z" />
      );
  }
}

/** Generic provider mark: a geometric shape on a tinted tile, colored by `--chart-*`. */
export function ProviderGlyph({
  provider,
  index = 0,
  className,
}: {
  provider?: ModelProvider;
  index?: number;
  className?: string;
}) {
  const shape = provider?.shape ?? SHAPES[index % SHAPES.length];
  return (
    <span
      aria-hidden="true"
      style={{ color: `var(--chart-${(index % 5) + 1})` }}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-lg bg-current/12 [&_svg]:size-4",
        className,
      )}
    >
      {provider?.icon ?? (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        >
          <GlyphShape shape={shape} />
        </svg>
      )}
    </span>
  );
}

function CostDots({ cost }: { cost: number }) {
  return (
    <span className="flex items-center gap-0.5">
      <span className="sr-only">Relative cost {cost} of 4</span>
      {[1, 2, 3, 4].map((dot) => (
        <span
          key={dot}
          aria-hidden="true"
          className={cn(
            "size-1 rounded-full",
            dot <= cost ? "bg-foreground/70" : "bg-foreground/15",
          )}
        />
      ))}
    </span>
  );
}

const optionId = (uid: string, value: string) =>
  `${uid}-opt-${value.replace(/\W/g, "_")}`;

function matches(model: ModelOption, providerName: string, query: string) {
  const haystack = [
    model.name,
    providerName,
    model.description ?? "",
    ...(model.capabilities ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function ModelSelector({
  models,
  providers,
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  placeholder = "Choose a model",
  searchPlaceholder = "Search models…",
  emptyMessage = "No models match your search.",
  side = "bottom",
  align = "start",
  disabled = false,
  hideHints = false,
  className,
  triggerClassName,
  contentClassName,
  "aria-label": ariaLabel = "Model",
}: ModelSelectorProps) {
  const reduce = useReducedMotion() ?? false;
  const uid = useId().replace(/:/g, "");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const current = value ?? internalValue;
  const isOpen = open ?? internalOpen;

  // Provider order: explicit list first, then any provider only seen in models.
  const providerList = useMemo(() => {
    const list = [...(providers ?? [])];
    for (const model of models) {
      if (!list.some((provider) => provider.id === model.provider)) {
        list.push({ id: model.provider, name: model.provider });
      }
    }
    return list;
  }, [models, providers]);

  const providerIndex = (id: string) =>
    Math.max(
      0,
      providerList.findIndex((provider) => provider.id === id),
    );

  const selected = models.find((model) => model.value === current);

  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const select = (model: ModelOption) => {
    if (model.disabled) return;
    if (value === undefined) setInternalValue(model.value);
    onValueChange?.(model.value);
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  return (
    <MorphPopover
      open={isOpen}
      onOpenChange={setOpen}
      className={cn("max-w-full", className)}
    >
      <MorphPopoverTrigger>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={`${ariaLabel}: ${selected?.name ?? placeholder}`}
        className={cn(
          "inline-flex h-9 max-w-full items-center gap-2 rounded-xl border border-border bg-background pr-2 pl-1 text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          triggerClassName,
        )}
      >
        {selected ? (
          <ProviderGlyph
            provider={providerList[providerIndex(selected.provider)]}
            index={providerIndex(selected.provider)}
            className="size-7 [&_svg]:size-3.5"
          />
        ) : null}
        <span
          className={cn(
            "min-w-0 truncate",
            !selected && "pl-2 text-muted-foreground",
          )}
        >
          {selected?.name ?? placeholder}
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : SPRING_SWAP}
          className="grid shrink-0 place-items-center text-muted-foreground"
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
      </button>
      </MorphPopoverTrigger>

      <MorphPopoverContent
        side={side}
        align={align}
        radius={14}
        className={cn("w-[min(22rem,calc(100vw-2rem))]", contentClassName)}
      >
        <ModelList
          uid={uid}
          models={models}
          providerList={providerList}
          providerIndex={providerIndex}
          current={current}
          reduce={reduce}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          hideHints={hideHints}
          ariaLabel={ariaLabel}
          onSelect={select}
        />
      </MorphPopoverContent>
    </MorphPopover>
  );
}

function ModelList({
  uid,
  models,
  providerList,
  providerIndex,
  current,
  reduce,
  searchPlaceholder,
  emptyMessage,
  hideHints,
  ariaLabel,
  onSelect,
}: {
  uid: string;
  models: ModelOption[];
  providerList: ModelProvider[];
  providerIndex: (id: string) => number;
  current: string | undefined;
  reduce: boolean;
  searchPlaceholder: string;
  emptyMessage: ReactNode;
  hideHints: boolean;
  ariaLabel: string;
  onSelect: (model: ModelOption) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const listId = `${uid}-list`;

  const groups = useMemo(
    () =>
      providerList
        .map((provider) => ({
          provider,
          models: models.filter(
            (model) =>
              model.provider === provider.id &&
              matches(model, provider.name, query),
          ),
        }))
        .filter((group) => group.models.length > 0),
    [models, providerList, query],
  );

  const enabled = useMemo(
    () =>
      groups.flatMap((group) => group.models).filter((model) => !model.disabled),
    [groups],
  );

  const [active, setActive] = useState<string | undefined>(() =>
    enabled.some((model) => model.value === current)
      ? current
      : enabled[0]?.value,
  );

  // Keep the active row valid as the filter narrows the list.
  const activeValue = enabled.some((model) => model.value === active)
    ? active
    : enabled[0]?.value;

  // The panel mounts with the popover; hand focus to the search field once it
  // is laid out (the morph keeps it hidden until measured).
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      inputRef.current?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!activeValue) return;
    document
      .getElementById(optionId(uid, activeValue))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeValue, uid]);

  const move = (delta: number) => {
    if (!enabled.length) return;
    const index = enabled.findIndex((model) => model.value === activeValue);
    const next = (index + delta + enabled.length) % enabled.length;
    setActive(enabled[next].value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "PageDown" || (event.key === "End" && event.ctrlKey)) {
      event.preventDefault();
      setActive(enabled.at(-1)?.value);
    } else if (event.key === "PageUp" || (event.key === "Home" && event.ctrlKey)) {
      event.preventDefault();
      setActive(enabled[0]?.value);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const model = enabled.find((item) => item.value === activeValue);
      if (model) onSelect(model);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={`Search ${ariaLabel.toLowerCase()}s`}
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeValue ? optionId(uid, activeValue) : undefined}
          value={query}
          placeholder={searchPlaceholder}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      <ScrollArea
        aria-label={`${ariaLabel} list`}
        viewportClassName="max-h-[17.5rem]"
        fadeEdges
      >
        <div
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="relative isolate p-1.5"
        >
          {groups.map((group) => {
            const index = providerIndex(group.provider.id);
            return (
              <fieldset key={group.provider.id} className="m-0 min-w-0 border-0 p-0 pb-1">
                <legend className="w-full px-2 pt-1.5 pb-1 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {group.provider.name}
                </legend>
                {group.models.map((model) => {
                  const isActive = model.value === activeValue;
                  const isSelected = model.value === current;
                  return (
                    <button
                      key={model.value}
                      id={optionId(uid, model.value)}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={isSelected}
                      aria-disabled={model.disabled || undefined}
                      onMouseDown={(event) => event.preventDefault()}
                      onPointerMove={() => {
                        if (!model.disabled && !isActive) setActive(model.value);
                      }}
                      onClick={() => onSelect(model)}
                      className={cn(
                        "relative flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left outline-none",
                        model.disabled && "cursor-not-allowed opacity-45",
                      )}
                    >
                      {isActive ? (
                        <motion.span
                          aria-hidden="true"
                          layoutId={`${uid}-active`}
                          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                          className="absolute inset-0 -z-10 rounded-lg bg-muted"
                        />
                      ) : null}
                      <ProviderGlyph provider={group.provider} index={index} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-foreground">
                            {model.name}
                          </span>
                          {model.isNew ? (
                            <Badge size="sm" variant="default" className="h-4 px-1.5 text-[10px]">
                              New
                            </Badge>
                          ) : null}
                        </span>
                        {model.description ? (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {model.description}
                          </span>
                        ) : null}
                        {model.capabilities?.length ? (
                          <span className="mt-1.5 flex flex-wrap gap-1">
                            {model.capabilities.map((capability) => (
                              <Badge
                                key={capability}
                                size="sm"
                                variant="secondary"
                                icon={CAPABILITIES[capability].icon}
                                className="h-[18px] font-normal text-muted-foreground"
                              >
                                {CAPABILITIES[capability].label}
                              </Badge>
                            ))}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                        {model.contextWindow ? (
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                            <span className="sr-only">Context window </span>
                            {formatContextWindow(model.contextWindow)}
                          </span>
                        ) : null}
                        {model.cost ? <CostDots cost={model.cost} /> : null}
                      </span>
                      <span className="grid size-4 shrink-0 place-items-center self-center text-foreground">
                        {isSelected ? (
                          <motion.span
                            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={reduce ? { duration: 0 } : SPRING_SWAP}
                          >
                            <Check aria-hidden="true" className="size-4" />
                          </motion.span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </fieldset>
            );
          })}
          {groups.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : null}
        </div>
      </ScrollArea>

      {hideHints ? null : (
        <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd size="sm">up</Kbd>
            <Kbd size="sm">down</Kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd size="sm">enter</Kbd>
            Select
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Kbd size="sm">esc</Kbd>
            Close
          </span>
        </div>
      )}
    </div>
  );
}
