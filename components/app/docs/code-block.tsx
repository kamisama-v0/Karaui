import { codeToHtml } from "shiki";
import {
  transformerNotationHighlight,
  transformerNotationDiff,
  transformerNotationFocus,
} from "@shikijs/transformers";
import { CopyButton } from "./copy-button";
import { ExpandableCode } from "./expandable-code";
import { CODE_HTML_CLASS } from "./code-style";
import { cn } from "@/lib/utils";
import { FileIcon } from "lucide-react";

type Props = {
  code: string;
  lang?: string;
  filename?: string;
  className?: string;
};

const LANG_MAP: Record<string, string> = {
  tsx: "tsx",
  ts: "typescript",
  js: "javascript",
  jsx: "jsx",
  css: "css",
  json: "json",
  bash: "bash",
  sh: "bash",
};

const LANG_LABELS: Record<string, string> = {
  tsx: "TSX",
  typescript: "TS",
  javascript: "JS",
  jsx: "JSX",
  css: "CSS",
  json: "JSON",
  bash: "Shell",
};

/** Language key for a file path, by extension (defaults to tsx). */
export function langForPath(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ext in LANG_MAP ? ext : "tsx";
}

/** Shiki HTML in the site's dual light/dark theme. Server only. */
export function highlightCode(code: string, lang = "tsx") {
  const shikiLang = LANG_MAP[lang.toLowerCase()] ?? lang;
  return codeToHtml(code, {
    lang: shikiLang,
    themes: {
      light: "github-light-high-contrast",
      dark: "github-dark-high-contrast",
    },
    defaultColor: false,
    transformers: [
      transformerNotationHighlight(),
      transformerNotationDiff(),
      transformerNotationFocus(),
    ],
  });
}

export async function CodeBlock({
  code,
  lang = "tsx",
  filename,
  className,
}: Props) {
  const shikiLang = LANG_MAP[lang.toLowerCase()] ?? lang;
  const langLabel =
    LANG_LABELS[shikiLang] ?? LANG_LABELS[lang] ?? lang.toUpperCase();

  const html = await highlightCode(code, lang);

  const fileDir = filename ? filename.split("/").slice(0, -1).join("/") : null;
  const fileName = filename ? filename.split("/").pop() : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card",
        "font-mono text-[13px]",
        className,
      )}
    >
      {filename ? (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-background/60 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <span className="inline-flex h-5 shrink-0 items-center rounded border border-border bg-card px-1.5 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              {langLabel}
            </span>

            <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-muted-foreground">
              {fileDir && <span className="text-foreground">{fileDir}/</span>}
              <span className="text-foreground font-medium">{fileName}</span>
            </span>
          </div>

          <CopyButton text={code} eventLabel={filename ?? lang} />
        </div>
      ) : (
        <div className="absolute right-3 top-3 z-10">
          <CopyButton text={code} eventLabel={filename ?? lang} />
        </div>
      )}

      <ExpandableCode>
        <div
          className={CODE_HTML_CLASS}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </ExpandableCode>
    </div>
  );
}
