"use client";

import {
  Bold,
  Code,
  Columns2,
  Eye,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  PenLine,
  Quote,
  Strikethrough,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type MarkdownEditorMode = "write" | "preview" | "split";

export type MarkdownAction =
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "link"
  | "heading"
  | "quote"
  | "bullet"
  | "numbered"
  | "checklist";

export interface MarkdownEditorProps {
  /** Controlled Markdown source. */
  value?: string;
  /** Initial source when uncontrolled. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Controlled view mode. */
  mode?: MarkdownEditorMode;
  defaultMode?: MarkdownEditorMode;
  onModeChange?: (mode: MarkdownEditorMode) => void;
  placeholder?: string;
  /** Textarea auto-grows between these heights (px), then scrolls. */
  minHeight?: number;
  maxHeight?: number;
  /** Floating formatting toolbar that appears over a text selection. */
  selectionToolbar?: boolean;
  /** Word / character count footer. */
  showFooter?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  id?: string;
  /** Accessible name for the textarea. */
  label?: string;
  className?: string;
  textareaClassName?: string;
  previewClassName?: string;
}

/* -------------------------------------------------------------------------- */
/*                              Safe MD renderer                              */
/* -------------------------------------------------------------------------- */

/**
 * Only http(s), mailto and relative URLs survive. Browsers strip tabs/newlines
 * and leading control chars from URLs, so the scheme check runs on a cleaned
 * copy (`java\tscript:` must not slip through).
 */
export function safeHref(raw: string): string | undefined {
  const href = raw.trim();
  if (!href) return undefined;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control chars is the point.
  const cleaned = href.replace(/[\u0000- \u007f-\u009f]/g, "");
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned);
  if (scheme) {
    const s = scheme[1].toLowerCase();
    return s === "http" || s === "https" || s === "mailto" ? href : undefined;
  }
  // No scheme: relative path, query, fragment or protocol-relative (http/https).
  return href;
}

const ESCAPABLE = "\\`*_{}[]()#+-.!~>|";

function findClosing(text: string, marker: string, from: number): number {
  let j = text.indexOf(marker, from);
  while (j !== -1) {
    if (text[j - 1] === "\\") {
      j = text.indexOf(marker, j + 1);
      continue;
    }
    // A single `*`/`_` must not close on half of a `**`/`__` run.
    if (marker.length === 1 && (text[j + 1] === marker || text[j - 1] === marker)) {
      j = text.indexOf(marker, j + 2);
      continue;
    }
    return j;
  }
  return -1;
}

function isWordChar(char: string | undefined) {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let buffer = "";
  let i = 0;
  let k = 0;
  const flush = () => {
    if (buffer) {
      out.push(buffer);
      buffer = "";
    }
  };
  const key = () => `${keyPrefix}-${k++}`;

  while (i < text.length) {
    const ch = text[i];

    if (ch === "\\" && i + 1 < text.length && ESCAPABLE.includes(text[i + 1])) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }

    if (ch === "`") {
      let run = 1;
      while (text[i + run] === "`") run++;
      const fence = "`".repeat(run);
      const end = text.indexOf(fence, i + run);
      if (end !== -1) {
        flush();
        out.push(
          <code
            key={key()}
            className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
          >
            {text.slice(i + run, end).replace(/^ (.+) $/, "$1")}
          </code>,
        );
        i = end + run;
        continue;
      }
    }

    const two = text.slice(i, i + 2);
    if (two === "**" || two === "__" || two === "~~") {
      const end = text.indexOf(two, i + 2);
      const inner = end === -1 ? "" : text.slice(i + 2, end);
      if (end !== -1 && inner.trim() && !/^\s/.test(inner)) {
        flush();
        const children = renderInline(inner, key());
        out.push(
          two === "~~" ? (
            <del key={key()} className="text-muted-foreground">
              {children}
            </del>
          ) : (
            <strong key={key()} className="font-semibold text-foreground">
              {children}
            </strong>
          ),
        );
        i = end + 2;
        continue;
      }
    }

    if ((ch === "*" || ch === "_") && text[i + 1] !== ch) {
      // `snake_case_words` stay literal: `_` only opens at a word boundary.
      const opens = ch === "*" || !isWordChar(text[i - 1]);
      const end = opens ? findClosing(text, ch, i + 1) : -1;
      const inner = end === -1 ? "" : text.slice(i + 1, end);
      if (
        end !== -1 &&
        inner.trim() &&
        !/^\s/.test(inner) &&
        (ch === "*" || !isWordChar(text[end + 1]))
      ) {
        flush();
        out.push(<em key={key()}>{renderInline(inner, key())}</em>);
        i = end + 1;
        continue;
      }
    }

    if (ch === "[") {
      const close = findBracket(text, i);
      if (close !== -1 && text[close + 1] === "(") {
        const parenEnd = findParen(text, close + 1);
        if (parenEnd !== -1) {
          const label = text.slice(i + 1, close);
          const target = text.slice(close + 2, parenEnd).trim().split(/\s+/)[0] ?? "";
          const href = safeHref(target);
          flush();
          const children = renderInline(label || target, key());
          if (href) {
            const external = /^(https?:)?\/\//i.test(href);
            out.push(
              <a
                key={key()}
                href={href}
                className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {children}
              </a>,
            );
          } else {
            // Unsafe scheme: keep the label, drop the link.
            out.push(<span key={key()}>{children}</span>);
          }
          i = parenEnd + 1;
          continue;
        }
      }
    }

    buffer += ch;
    i++;
  }
  flush();
  return out;
}

/** Matching `)` for the `(` at `open`, so URLs like `/wiki/A_(b)` stay whole. */
function findParen(text: string, open: number) {
  let depth = 0;
  for (let j = open; j < text.length; j++) {
    if (text[j] === "\\") {
      j++;
      continue;
    }
    if (text[j] === "(") depth++;
    else if (text[j] === ")") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

function findBracket(text: string, open: number) {
  let depth = 0;
  for (let j = open; j < text.length; j++) {
    if (text[j] === "\\") {
      j++;
      continue;
    }
    if (text[j] === "[") depth++;
    else if (text[j] === "]") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

function renderLines(lines: string[], keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  for (let line = 0; line < lines.length; line++) {
    // Lines are positional by nature: the key is the line slot, not data identity.
    if (line > 0) out.push(<br key={`${keyPrefix}-br-${line}`} />);
    out.push(...renderInline(lines[line], `${keyPrefix}-${line}`));
  }
  return out;
}

const FENCE_RE = /^\s{0,3}(```+|~~~+)\s*([\w+#.-]*)\s*$/;
const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const HR_RE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE_RE = /^\s{0,3}>\s?/;
const LIST_ITEM_RE = /^(\s*)([-*+]|\d{1,9}[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/;

type ListItem = {
  ordered: boolean;
  start: number;
  checked: boolean | null;
  text: string[];
  children: ListItem[];
  indent: number;
};

const HEADING_CLASS = [
  "text-2xl font-semibold tracking-tight",
  "text-xl font-semibold tracking-tight",
  "text-lg font-semibold",
  "text-base font-semibold",
  "text-sm font-semibold",
  "text-sm font-semibold text-muted-foreground",
];

function renderList(items: ListItem[], key: string): ReactNode {
  const ordered = items[0]?.ordered ?? false;
  const isTaskList = items.every((item) => item.checked !== null);
  const body = items.map((item, index) => {
    const itemKey = `${key}-${index}`;
    const content = (
      <>
        {renderLines(item.text, itemKey)}
        {item.children.length > 0 ? renderList(item.children, `${itemKey}-sub`) : null}
      </>
    );
    if (item.checked !== null) {
      return (
        <li key={itemKey} className="flex list-none items-start gap-2">
          <input
            type="checkbox"
            checked={item.checked}
            readOnly
            disabled
            aria-label={item.checked ? "Completed" : "Not completed"}
            className="mt-1 h-3.5 w-3.5 shrink-0 accent-primary"
          />
          <span className={cn("min-w-0", item.checked && "text-muted-foreground line-through")}>
            {content}
          </span>
        </li>
      );
    }
    return (
      <li key={itemKey} className="pl-1">
        {content}
      </li>
    );
  });
  const listClass = cn("my-2 space-y-1", isTaskList ? "pl-0" : "pl-5", ordered ? "list-decimal" : "list-disc");
  return ordered ? (
    <ol key={key} start={items[0]?.start !== 1 ? items[0]?.start : undefined} className={listClass}>
      {body}
    </ol>
  ) : (
    <ul key={key} className={listClass}>
      {body}
    </ul>
  );
}

function parseBlocks(lines: string[], keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  let b = 0;
  const key = () => `${keyPrefix}-${b++}`;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = FENCE_RE.exec(line);
    if (fence) {
      const marker = fence[1];
      const lang = fence[2];
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith(marker)) {
        body.push(lines[i]);
        i++;
      }
      i++; // closing fence (or end of input)
      out.push(
        <pre
          key={key()}
          data-language={lang || undefined}
          className="my-3 overflow-x-auto rounded-xl border border-border bg-muted/60 p-3 font-mono text-[12.5px] leading-5 text-foreground [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
        >
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const Tag = `h${level}` as const;
      out.push(
        <Tag key={key()} className={cn("mb-2 mt-4 first:mt-0 text-foreground", HEADING_CLASS[level - 1])}>
          {renderInline(heading[2], key())}
        </Tag>,
      );
      i++;
      continue;
    }

    if (HR_RE.test(line)) {
      out.push(<hr key={key()} className="my-4 border-0 border-t border-border" />);
      i++;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        inner.push(lines[i].replace(QUOTE_RE, ""));
        i++;
      }
      const quoteKey = key();
      out.push(
        <blockquote
          key={quoteKey}
          className="my-3 border-l-2 border-primary/40 pl-3 text-muted-foreground"
        >
          {parseBlocks(inner, quoteKey)}
        </blockquote>,
      );
      continue;
    }

    if (LIST_ITEM_RE.test(line)) {
      const roots: ListItem[] = [];
      const stack: ListItem[] = [];
      while (i < lines.length) {
        const current = lines[i];
        const match = LIST_ITEM_RE.exec(current);
        if (match) {
          const indent = match[1].replace(/\t/g, "  ").length;
          const marker = match[2];
          const item: ListItem = {
            ordered: /\d/.test(marker),
            start: Number.parseInt(marker, 10) || 1,
            checked: match[3] === undefined ? null : match[3] !== " ",
            text: [match[4]],
            children: [],
            indent,
          };
          while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
          const parent = stack[stack.length - 1];
          if (parent) parent.children.push(item);
          else roots.push(item);
          stack.push(item);
          i++;
          continue;
        }
        // Lazy continuation: an indented, non-blank line belongs to the last item.
        if (current.trim() && /^\s+/.test(current) && stack.length) {
          stack[stack.length - 1].text.push(current.trim());
          i++;
          continue;
        }
        break;
      }
      // Split the root run whenever the list type flips (bullets → numbers).
      let run: ListItem[] = [];
      const flushRun = () => {
        if (run.length) out.push(renderList(run, key()));
        run = [];
      };
      for (const item of roots) {
        if (run.length && run[0].ordered !== item.ordered) flushRun();
        run.push(item);
      }
      flushRun();
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !FENCE_RE.test(lines[i]) &&
      !HEADING_RE.test(lines[i]) &&
      !HR_RE.test(lines[i]) &&
      !QUOTE_RE.test(lines[i]) &&
      !LIST_ITEM_RE.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    const paraKey = key();
    out.push(
      <p key={paraKey} className="my-2 first:mt-0 last:mb-0">
        {renderLines(para, paraKey)}
      </p>,
    );
  }
  return out;
}

/** Render Markdown to React elements — no HTML strings, no dangerouslySetInnerHTML. */
export function renderMarkdown(source: string): ReactNode[] {
  return parseBlocks(source.replace(/\r\n?/g, "\n").split("\n"), "md");
}

export function MarkdownPreview({
  source,
  className,
  emptyLabel = "Nothing to preview",
}: {
  source: string;
  className?: string;
  emptyLabel?: ReactNode;
}) {
  const nodes = useMemo(() => renderMarkdown(source), [source]);
  return (
    <div className={cn("break-words text-sm leading-6 text-foreground/90", className)}>
      {nodes.length ? nodes : <p className="text-muted-foreground">{emptyLabel}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Editing engine                               */
/* -------------------------------------------------------------------------- */

/**
 * Replace a range so the browser's undo stack records it. `insertText` keeps
 * Ctrl+Z working; where it is unsupported (or refuses), `setRangeText` edits
 * the DOM and `commit` hands React the new value directly — a synthetic
 * input event is not reliable, since React's value tracker may swallow it.
 */
function replaceRange(textarea: HTMLTextAreaElement, edit: Edit, commit: (value: string) => void) {
  const { start, end, text, selectStart, selectEnd = selectStart } = edit;
  const expected = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  textarea.focus();
  textarea.setSelectionRange(start, end);
  let applied = false;
  try {
    applied =
      typeof document.execCommand === "function" &&
      (text === "" && start !== end
        ? document.execCommand("delete", false)
        : document.execCommand("insertText", false, text));
  } catch {
    applied = false;
  }
  if (!applied || textarea.value !== expected) {
    textarea.setRangeText(text, start, end, "end");
    commit(expected);
  }
  textarea.setSelectionRange(selectStart, selectEnd);
}

type Edit = { start: number; end: number; text: string; selectStart: number; selectEnd?: number };

function lineBounds(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  // A selection ending right after a newline should not pull in the next line.
  const effectiveEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const nl = value.indexOf("\n", effectiveEnd);
  return { lineStart, lineEnd: nl === -1 ? value.length : nl };
}

const PLACEHOLDER: Record<"bold" | "italic" | "strike" | "code", string> = {
  bold: "bold text",
  italic: "italic text",
  strike: "struck text",
  code: "code",
};

const WRAP_MARKER: Record<"bold" | "italic" | "strike" | "code", string> = {
  bold: "**",
  italic: "_",
  strike: "~~",
  code: "`",
};

function wrapEdit(
  value: string,
  start: number,
  end: number,
  kind: "bold" | "italic" | "strike" | "code",
): Edit {
  const selected = value.slice(start, end);

  if (kind === "code" && selected.includes("\n")) {
    const fenced = `\`\`\`\n${selected.replace(/\n$/, "")}\n\`\`\``;
    const before = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    const text = `${before}${fenced}`;
    return {
      start,
      end,
      text,
      selectStart: start + before.length + 4,
      selectEnd: start + before.length + 4 + selected.replace(/\n$/, "").length,
    };
  }

  const m = WRAP_MARKER[kind];
  // Unwrap: markers hug the selection from outside…
  if (value.slice(start - m.length, start) === m && value.slice(end, end + m.length) === m) {
    // …but `**bold**` must not read as italic `*` around `*bold*`.
    const outerBefore = value[start - m.length - 1];
    const outerAfter = value[end + m.length];
    if (m.length > 1 || (outerBefore !== m && outerAfter !== m)) {
      return {
        start: start - m.length,
        end: end + m.length,
        text: selected,
        selectStart: start - m.length,
        selectEnd: end - m.length,
      };
    }
  }
  // …or sit inside it.
  if (selected.length >= m.length * 2 + 1 && selected.startsWith(m) && selected.endsWith(m)) {
    const inner = selected.slice(m.length, -m.length);
    return { start, end, text: inner, selectStart: start, selectEnd: start + inner.length };
  }

  const body = selected || PLACEHOLDER[kind];
  // Keep surrounding whitespace outside the markers (`** text**` won't parse).
  const lead = /^\s*/.exec(body)?.[0] ?? "";
  const trail = /\s*$/.exec(body)?.[0] ?? "";
  const core = body.slice(lead.length, body.length - trail.length) || body;
  const text = `${lead}${m}${core}${m}${trail}`;
  const coreStart = start + lead.length + m.length;
  return { start, end, text, selectStart: coreStart, selectEnd: coreStart + core.length };
}

function linkEdit(value: string, start: number, end: number): Edit {
  const selected = value.slice(start, end);
  if (/^(https?:\/\/|mailto:)\S+$/i.test(selected.trim())) {
    const text = `[link text](${selected.trim()})`;
    return { start, end, text, selectStart: start + 1, selectEnd: start + 10 };
  }
  const label = selected || "link text";
  const text = `[${label}](https://)`;
  const urlStart = start + label.length + 3;
  // With a label already chosen, jump to the URL; otherwise select the label.
  return selected
    ? { start, end, text, selectStart: urlStart, selectEnd: urlStart + 8 }
    : { start, end, text, selectStart: start + 1, selectEnd: start + 1 + label.length };
}

const LIST_PREFIX_RE = /^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d{1,9}[.)]\s+)/;
const TASK_RE = /^\s*[-*+]\s+\[[ xX]\]\s+/;
const BULLET_RE = /^\s*[-*+]\s+(?!\[[ xX]\]\s)/;
const ORDERED_RE = /^\s*\d{1,9}[.)]\s+/;
const HEADING_PREFIX_RE = /^#{1,6}\s+/;
const QUOTE_PREFIX_RE = /^>\s?/;

function linePrefixEdit(
  value: string,
  start: number,
  end: number,
  kind: "heading" | "quote" | "bullet" | "numbered" | "checklist",
): Edit {
  const { lineStart, lineEnd } = lineBounds(value, start, end);
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const content = lines.filter((line) => line.trim());
  const targets = content.length ? content : lines;

  const has: Record<typeof kind, RegExp> = {
    heading: HEADING_PREFIX_RE,
    quote: QUOTE_PREFIX_RE,
    bullet: BULLET_RE,
    numbered: ORDERED_RE,
    checklist: TASK_RE,
  };
  const allHave = targets.every((line) => has[kind].test(line));

  let n = 0;
  const next = lines.map((line) => {
    if (!line.trim() && content.length) return line;
    if (kind === "heading") {
      return allHave ? line.replace(HEADING_PREFIX_RE, "") : `## ${line.replace(HEADING_PREFIX_RE, "")}`;
    }
    if (kind === "quote") {
      return allHave ? line.replace(QUOTE_PREFIX_RE, "") : `> ${line}`;
    }
    const indent = /^\s*/.exec(line)?.[0] ?? "";
    const rest = line.replace(LIST_PREFIX_RE, "").replace(/^\s*/, "");
    if (allHave) return `${indent}${rest}`;
    n++;
    const marker = kind === "bullet" ? "- " : kind === "numbered" ? `${n}. ` : "- [ ] ";
    return `${indent}${marker}${rest}`;
  });

  const text = next.join("\n");
  if (start === end && lines.length === 1) {
    const caret = Math.max(lineStart, start + (text.length - lines[0].length));
    return { start: lineStart, end: lineEnd, text, selectStart: caret, selectEnd: caret };
  }
  return { start: lineStart, end: lineEnd, text, selectStart: lineStart, selectEnd: lineStart + text.length };
}

function computeEdit(value: string, start: number, end: number, action: MarkdownAction): Edit {
  switch (action) {
    case "bold":
    case "italic":
    case "strike":
    case "code":
      return wrapEdit(value, start, end, action);
    case "link":
      return linkEdit(value, start, end);
    default:
      return linePrefixEdit(value, start, end, action);
  }
}

/** Enter inside a list/quote: continue it, or end it on an empty item. */
function continuationEdit(value: string, caret: number): Edit | null {
  const lineStart = value.lastIndexOf("\n", caret - 1) + 1;
  const line = value.slice(lineStart, caret);
  const list = /^(\s*)(?:([-*+])\s+(\[[ xX]\]\s+)?|(\d{1,9})([.)])\s+)/.exec(line);
  const quote = /^(\s*>\s?)/.exec(line);
  const match = list ?? quote;
  if (!match) return null;

  if (!line.slice(match[0].length).trim()) {
    // Empty item: drop the marker and leave a plain line.
    const nlAfter = value.indexOf("\n", caret);
    const rest = value.slice(caret, nlAfter === -1 ? value.length : nlAfter);
    if (rest.trim()) return null;
    return { start: lineStart, end: caret, text: "", selectStart: lineStart };
  }

  let marker: string;
  if (list) {
    const indent = list[1];
    if (list[4]) marker = `${indent}${Number.parseInt(list[4], 10) + 1}${list[5]} `;
    else marker = `${indent}${list[2]} ${list[3] ? "[ ] " : ""}`;
  } else {
    marker = match[1];
  }
  const text = `\n${marker}`;
  return { start: caret, end: caret, text, selectStart: caret + text.length };
}

/** Tab / Shift+Tab on list lines: indent or outdent by two spaces. */
function indentEdit(value: string, start: number, end: number, outdent: boolean): Edit | null {
  const { lineStart, lineEnd } = lineBounds(value, start, end);
  const lines = value.slice(lineStart, lineEnd).split("\n");
  if (!lines.some((line) => LIST_PREFIX_RE.test(line))) return null;
  let firstDelta = 0;
  const next = lines.map((line, index) => {
    if (!LIST_PREFIX_RE.test(line)) return line;
    if (outdent) {
      const remove = Math.min(2, (/^ */.exec(line)?.[0] ?? "").length);
      if (index === 0) firstDelta = -remove;
      return line.slice(remove);
    }
    if (index === 0) firstDelta = 2;
    return `  ${line}`;
  });
  const text = next.join("\n");
  const delta = text.length - (lineEnd - lineStart);
  return {
    start: lineStart,
    end: lineEnd,
    text,
    selectStart: Math.max(lineStart, start + firstDelta),
    selectEnd: Math.max(lineStart, end + (start === end ? firstDelta : delta)),
  };
}

/* -------------------------------------------------------------------------- */
/*                           Caret geometry (mirror)                          */
/* -------------------------------------------------------------------------- */

const MIRRORED_PROPS = [
  "boxSizing",
  "width",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontFamily",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "textIndent",
  "wordSpacing",
  "tabSize",
] as const;

/** Pixel position of a caret index inside a textarea (relative to its border box). */
function caretCoordinates(textarea: HTMLTextAreaElement, index: number) {
  const mirror = document.createElement("div");
  const style = window.getComputedStyle(textarea);
  for (const prop of MIRRORED_PROPS) {
    mirror.style[prop] = style[prop];
  }
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.overflow = "hidden";
  mirror.textContent = textarea.value.slice(0, index);
  const marker = document.createElement("span");
  marker.textContent = textarea.value.slice(index) || ".";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const top = marker.offsetTop - textarea.scrollTop;
  const left = marker.offsetLeft - textarea.scrollLeft;
  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.5;
  document.body.removeChild(mirror);
  return { top, left, lineHeight };
}

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

type ToolDef = { action: MarkdownAction; label: string; icon: LucideIcon; shortcut?: string };

const TOOLS: ToolDef[][] = [
  [
    { action: "bold", label: "Bold", icon: Bold, shortcut: "B" },
    { action: "italic", label: "Italic", icon: Italic, shortcut: "I" },
    { action: "strike", label: "Strikethrough", icon: Strikethrough, shortcut: "Shift+X" },
    { action: "code", label: "Code", icon: Code, shortcut: "E" },
    { action: "link", label: "Link", icon: Link, shortcut: "K" },
  ],
  [
    { action: "heading", label: "Heading", icon: Heading2 },
    { action: "quote", label: "Quote", icon: Quote },
  ],
  [
    { action: "bullet", label: "Bulleted list", icon: List, shortcut: "Shift+8" },
    { action: "numbered", label: "Numbered list", icon: ListOrdered, shortcut: "Shift+7" },
    { action: "checklist", label: "Checklist", icon: ListTodo },
  ],
];

const FLOATING_TOOLS: MarkdownAction[] = ["bold", "italic", "strike", "code", "link"];
const FLOATING_WIDTH = 168; // 5 × 28px buttons + gaps/padding; fixed so clamping is exact.
const FLOATING_HEIGHT = 36;

const MODES: { value: MarkdownEditorMode; label: string; icon: LucideIcon }[] = [
  { value: "write", label: "Write", icon: PenLine },
  { value: "preview", label: "Preview", icon: Eye },
  { value: "split", label: "Split", icon: Columns2 },
];

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function MarkdownEditor({
  value,
  defaultValue = "",
  onChange,
  mode,
  defaultMode = "write",
  onModeChange,
  placeholder = "Write in Markdown…",
  minHeight = 160,
  maxHeight = 360,
  selectionToolbar = true,
  showFooter = true,
  disabled = false,
  readOnly = false,
  name,
  id,
  label = "Markdown editor",
  className,
  textareaClassName,
  previewClassName,
}: MarkdownEditorProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const textareaId = id ?? `${uid}-input`;
  const previewId = `${uid}-preview`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const source = controlled ? value : internal;

  const [internalMode, setInternalMode] = useState<MarkdownEditorMode>(defaultMode);
  const currentMode = mode ?? internalMode;
  const setMode = useCallback(
    (next: MarkdownEditorMode) => {
      if (mode === undefined) setInternalMode(next);
      onModeChange?.(next);
    },
    [mode, onModeChange],
  );

  const [modKey, setModKey] = useState("Ctrl");
  useEffect(() => {
    // Read the platform after mount so server and client markup match.
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setModKey("⌘");
  }, []);

  const [floating, setFloating] = useState<{ x: number; y: number } | null>(null);

  const editable = !disabled && !readOnly;
  const showWrite = currentMode !== "preview";
  const showPreview = currentMode !== "write";
  const deferredSource = useDeferredValue(source);

  const commit = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );

  // Auto-grow: height is the purpose here, so this writes layout directly
  // (no animation) and only once per value change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure whenever the text or view changes.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const full = textarea.scrollHeight;
    const next = Math.min(Math.max(full, minHeight), maxHeight);
    textarea.style.height = `${next}px`;
    textarea.style.overflowY = full > maxHeight ? "auto" : "hidden";
  }, [source, minHeight, maxHeight, currentMode]);

  const updateFloating = useCallback(() => {
    const textarea = textareaRef.current;
    const surface = surfaceRef.current;
    if (!selectionToolbar || !textarea || !surface || !editable) return setFloating(null);
    const { selectionStart, selectionEnd } = textarea;
    if (
      document.activeElement !== textarea ||
      selectionStart === selectionEnd ||
      !textarea.value.slice(selectionStart, selectionEnd).trim()
    ) {
      return setFloating(null);
    }
    const a = caretCoordinates(textarea, selectionStart);
    const b = caretCoordinates(textarea, selectionEnd);
    const sameLine = Math.abs(a.top - b.top) < 2;
    const anchorX = sameLine ? (a.left + b.left) / 2 : a.left;
    const offsetX = textarea.offsetLeft;
    const offsetY = textarea.offsetTop;
    const width = surface.clientWidth;
    const x = Math.min(
      Math.max(offsetX + anchorX - FLOATING_WIDTH / 2, 8),
      Math.max(width - FLOATING_WIDTH - 8, 8),
    );
    let y = offsetY + a.top - FLOATING_HEIGHT - 6;
    if (y < 4) y = offsetY + b.top + b.lineHeight + 6;
    y = Math.min(Math.max(y, 4), offsetY + textarea.clientHeight - 4);
    setFloating({ x, y });
  }, [editable, selectionToolbar]);

  useEffect(() => {
    if (!selectionToolbar) return;
    const onSelectionChange = () => {
      if (document.activeElement === textareaRef.current) updateFloating();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [selectionToolbar, updateFloating]);

  const apply = useCallback(
    (action: MarkdownAction) => {
      const textarea = textareaRef.current;
      if (!textarea || !editable) return;
      const edit = computeEdit(
        textarea.value,
        textarea.selectionStart,
        textarea.selectionEnd,
        action,
      );
      replaceRange(textarea, edit, commit);
      updateFloating();
    },
    [commit, editable, updateFloating],
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!editable || event.nativeEvent.isComposing) return;
    const textarea = event.currentTarget;
    const mod = event.metaKey || event.ctrlKey;
    const { selectionStart: start, selectionEnd: end } = textarea;

    if (mod && !event.altKey) {
      const key = event.key.toLowerCase();
      let action: MarkdownAction | null = null;
      if (!event.shiftKey && key === "b") action = "bold";
      else if (!event.shiftKey && key === "i") action = "italic";
      else if (!event.shiftKey && key === "k") action = "link";
      else if (!event.shiftKey && key === "e") action = "code";
      else if (event.shiftKey && key === "x") action = "strike";
      // `code` keeps Shift+7/8 layout-independent of what Shift produces.
      else if (event.shiftKey && event.code === "Digit7") action = "numbered";
      else if (event.shiftKey && event.code === "Digit8") action = "bullet";
      if (action) {
        event.preventDefault();
        apply(action);
      }
      return;
    }

    if (event.key === "Tab" && !mod && !event.altKey) {
      // Only list lines capture Tab; elsewhere Tab keeps moving focus.
      const edit = indentEdit(textarea.value, start, end, event.shiftKey);
      if (edit) {
        event.preventDefault();
        replaceRange(textarea, edit, commit);
      }
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && !mod && !event.altKey && start === end) {
      const edit = continuationEdit(textarea.value, start);
      if (edit) {
        event.preventDefault();
        replaceRange(textarea, edit, commit);
      }
      return;
    }

    if (event.key === "Escape" && floating) {
      setFloating(null);
    }
  };

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % MODES.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + MODES.length) % MODES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = MODES.length - 1;
    else return;
    event.preventDefault();
    setMode(MODES[next].value);
    const buttons = event.currentTarget.parentElement?.parentElement?.querySelectorAll<HTMLButtonElement>(
      "[role=tab]",
    );
    buttons?.[next]?.focus();
  };

  const words = useMemo(() => countWords(source), [source]);
  const shortcutLabel = (tool: ToolDef) =>
    tool.shortcut ? `${tool.label} (${modKey}+${tool.shortcut})` : tool.label;
  const tapScale = reduce ? undefined : { scale: 0.88 };

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-sm",
        disabled && "opacity-60",
        className,
      )}
    >
      {/* Header: view tabs + formatting toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-2 py-1.5">
        <motion.div layoutRoot role="tablist" aria-label="Editor view" className="flex items-center gap-0.5">
          {MODES.map((item, index) => {
            const active = currentMode === item.value;
            const Icon = item.icon;
            return (
              <div key={item.value} className="relative">
                {active ? (
                  <motion.span
                    layoutId={`${uid}-mode-indicator`}
                    transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                    className="absolute inset-0 rounded-lg bg-muted"
                  />
                ) : null}
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={item.value === "preview" ? previewId : textareaId}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setMode(item.value)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                  className={cn(
                    "relative z-10 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {item.label}
                </button>
              </div>
            );
          })}
        </motion.div>

        <div
          role="toolbar"
          aria-label="Formatting"
          aria-controls={textareaId}
          className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TOOLS.map((group, groupIndex) => (
            <div key={group[0].action} className="flex items-center gap-0.5">
              {groupIndex > 0 ? <span aria-hidden className="mx-1 h-4 w-px bg-border" /> : null}
              {group.map((tool) => {
                const Icon = tool.icon;
                return (
                  <motion.button
                    key={tool.action}
                    type="button"
                    aria-label={tool.label}
                    title={shortcutLabel(tool)}
                    disabled={!editable || !showWrite}
                    // Keep the textarea selection: don't let the button take focus on press.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => apply(tool.action)}
                    whileTap={tapScale}
                    transition={SPRING_PRESS}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div
        className={cn(
          "grid min-w-0",
          currentMode === "split" && "sm:grid-cols-2 sm:divide-x sm:divide-border",
        )}
      >
        <div ref={surfaceRef} className={cn("relative min-w-0", !showWrite && "hidden")}>
          <textarea
            ref={textareaRef}
            id={textareaId}
            name={name}
            aria-label={label}
            value={source}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            spellCheck
            onChange={(event) => commit(event.target.value)}
            onKeyDown={onKeyDown}
            onMouseUp={updateFloating}
            onBlur={() => setFloating(null)}
            onScroll={() => setFloating(null)}
            style={{ minHeight, maxHeight }}
            className={cn(
              "block w-full resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/70",
              "[scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]",
              textareaClassName,
            )}
          />

          <AnimatePresence>
            {floating && showWrite ? (
              <motion.div
                key="selection-toolbar"
                role="toolbar"
                aria-label="Selection formatting"
                initial={
                  reduce
                    ? { opacity: 0, x: floating.x, y: floating.y }
                    : { opacity: 0, x: floating.x, y: floating.y + 6, scale: 0.92, filter: "blur(4px)" }
                }
                animate={
                  reduce
                    ? { opacity: 1, x: floating.x, y: floating.y }
                    : { opacity: 1, x: floating.x, y: floating.y, scale: 1, filter: "blur(0px)" }
                }
                exit={
                  reduce
                    ? { opacity: 0, transition: { duration: 0.12 } }
                    : {
                        opacity: 0,
                        scale: 0.94,
                        filter: "blur(4px)",
                        transition: { duration: 0.12, ease: EASE_OUT },
                      }
                }
                transition={reduce ? { duration: 0.15 } : SPRING_LAYOUT}
                style={{ width: FLOATING_WIDTH, height: FLOATING_HEIGHT }}
                className="absolute left-0 top-0 z-20 flex items-center justify-center gap-0.5 rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-md"
              >
                {FLOATING_TOOLS.map((action) => {
                  const tool = TOOLS[0].find((item) => item.action === action);
                  if (!tool) return null;
                  const Icon = tool.icon;
                  return (
                    <motion.button
                      key={action}
                      type="button"
                      // Mirrors the main toolbar, which stays the keyboard path.
                      tabIndex={-1}
                      aria-label={tool.label}
                      title={shortcutLabel(tool)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => apply(action)}
                      whileTap={tapScale}
                      transition={SPRING_PRESS}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {showPreview ? (
          <motion.div
            key={currentMode}
            id={previewId}
            role="tabpanel"
            aria-label="Preview"
            tabIndex={0}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            style={{ minHeight, maxHeight }}
            className={cn(
              "min-w-0 overflow-y-auto px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              "[scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]",
              currentMode === "split" && "border-t border-border sm:border-t-0",
              previewClassName,
            )}
          >
            <MarkdownPreview source={currentMode === "split" ? deferredSource : source} />
          </motion.div>
        ) : null}
      </div>

      {showFooter ? (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>Markdown supported</span>
          <span className="tabular-nums">
            {words} {words === 1 ? "word" : "words"} · {source.length}{" "}
            {source.length === 1 ? "character" : "characters"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
