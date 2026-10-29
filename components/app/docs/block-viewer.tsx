import { BlockViewerClient } from "@/components/app/docs/block-viewer-client";
import { highlightCode, langForPath } from "@/components/app/docs/code-block";
import type { ViewerCodeFile } from "@/components/app/docs/viewer-code";
import { previewPath, VIEWER_MAX_WIDTH, type ViewerKind } from "@/lib/preview-frame";
import { cn } from "@/lib/utils";
import { buildViewerSource } from "@/lib/registry-server";

export type BlockViewerSource = {
  categorySlug: string;
  pageSlug: string;
  /** Files the install starts from (see `entryFilesFor`). */
  entryFiles: string[];
  /** Usage composition shown first in the Code view. */
  usageFile: string;
};

// Variants on one page share most of their files. Handing every viewer the
// same object per file lets the RSC payload carry each highlighted file once
// (React outlines repeated objects), and highlights each file once per build.
const highlighted = new Map<string, Promise<ViewerCodeFile>>();

function highlightedFile(path: string, code: string) {
  const key = `${path}\n${code}`;
  let file = highlighted.get(key);
  if (!file) {
    file = highlightCode(code, langForPath(path)).then((html) => ({ path, code, html }));
    highlighted.set(key, file);
  }
  return file;
}

/**
 * Server half of the block viewer: resolves and highlights the Code view's
 * files at build time (static, no runtime fetches) and hands everything to
 * the client viewer. Without `source` the viewer has no Code view and its
 * Code toggle links to `codeHref` instead (used by the blocks gallery, where
 * inlining every block's source would make the page several megabytes).
 */
export async function BlockViewer({
  previewKey,
  name,
  kind,
  width = "default",
  installSlug,
  source,
  codeHref,
  codeAnchor,
  className,
}: {
  /** Key in components/previews/index.tsx, "category/slug". */
  previewKey: string;
  name: string;
  kind: ViewerKind;
  /** Max width cap; "wide" for page-like blocks (registry `previewWidth`). */
  width?: keyof typeof VIEWER_MAX_WIDTH;
  installSlug: string | null;
  source?: BlockViewerSource;
  codeHref?: string;
  codeAnchor?: string;
  className?: string;
}) {
  let files: ViewerCodeFile[] | undefined;
  let dependencies: { name: string; href: string }[] | undefined;
  if (source) {
    const resolved = await buildViewerSource(source);
    dependencies = resolved.dependencies;
    files = await Promise.all(
      resolved.files.map((file) => highlightedFile(file.path, file.content)),
    );
  }

  return (
    <BlockViewerClient
      name={name}
      kind={kind}
      src={previewPath(previewKey)}
      installSlug={installSlug}
      files={files}
      dependencies={dependencies}
      codeHref={codeHref}
      codeAnchor={codeAnchor}
      className={cn(VIEWER_MAX_WIDTH[width], className)}
    />
  );
}
