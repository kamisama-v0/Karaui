"use client";

import { ChevronRight, FileIcon, Folder, FolderOpen } from "lucide-react";
import { memo, useId, useMemo, useState } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/app/docs/copy-button";
import { CODE_HTML_CLASS } from "@/components/app/docs/code-style";
import { buildFileTree, type FileTreeNode } from "@/lib/file-tree";
import { cn } from "@/lib/utils";

export type ViewerCodeFile = {
  path: string;
  /** Raw source, for copying. */
  code: string;
  /** Shiki HTML rendered on the server at build time. */
  html: string;
};

export type ViewerDependency = { name: string; href: string };

const ROW =
  "flex w-full min-w-0 items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5 [&_svg]:shrink-0";

/**
 * Code view of the block viewer: a file tree of the install on the left,
 * the highlighted source of the selected file on the right. Below md the
 * tree becomes a native select so the code keeps the full width.
 */
export const ViewerCode = memo(function ViewerCode({
  name,
  files,
  dependencies,
  height,
}: {
  name: string;
  files: ViewerCodeFile[];
  dependencies: ViewerDependency[];
  height: number;
}) {
  const [selected, setSelected] = useState(files[0]?.path ?? "");
  const tree = useMemo(() => buildFileTree(files.map((f) => f.path)), [files]);
  const file = files.find((f) => f.path === selected) ?? files[0];
  const selectId = useId();
  const panelId = useId();

  if (!file) return null;

  return (
    <div
      className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[15rem_minmax(0,1fr)]"
      style={{ height }}
    >
      <nav
        aria-label={`${name} files`}
        className="hidden min-h-0 flex-col overflow-y-auto border-r border-border bg-background/60 p-2 md:flex"
      >
        <ul className="flex flex-col gap-px">
          {tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              selected={file.path}
              onSelect={setSelected}
              panelId={panelId}
            />
          ))}
        </ul>
        {dependencies.length ? (
          <div className="mt-auto border-t border-border px-2 pt-3 pb-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">
              Also installs
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
              {dependencies.map((dep) => (
                <li key={dep.href}>
                  <Link
                    href={dep.href}
                    className="rounded-sm text-xs text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {dep.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-background/60 px-3 py-2">
          <label htmlFor={selectId} className="sr-only">
            File
          </label>
          <select
            id={selectId}
            value={file.path}
            onChange={(event) => setSelected(event.target.value)}
            className="min-w-0 flex-1 truncate rounded-md border border-border bg-card px-2 py-1 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            {files.map((f) => (
              <option key={f.path} value={f.path}>
                {f.path}
              </option>
            ))}
          </select>
          <span className="hidden min-w-0 truncate font-mono text-xs text-muted-foreground md:block">
            {file.path}
          </span>
          <CopyButton text={file.code} eventLabel={file.path} />
        </div>
        <section
          id={panelId}
          aria-label={file.path}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-focusable to scroll it (WCAG 2.1.1).
          tabIndex={0}
          className={cn(
            CODE_HTML_CLASS,
            "min-h-0 flex-1 overflow-auto font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          )}
          dangerouslySetInnerHTML={{ __html: file.html }}
        />
      </div>
    </div>
  );
});

function TreeNode({
  node,
  depth,
  selected,
  onSelect,
  panelId,
}: {
  node: FileTreeNode;
  depth: number;
  selected: string;
  onSelect: (path: string) => void;
  panelId: string;
}) {
  const [open, setOpen] = useState(true);
  const indent = { paddingLeft: 8 + depth * 12 };

  if (node.type === "file") {
    const active = node.path === selected;
    return (
      <li>
        <button
          type="button"
          aria-current={active ? "true" : undefined}
          aria-controls={panelId}
          onClick={() => onSelect(node.path)}
          title={node.path}
          style={indent}
          className={cn(
            ROW,
            active
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <FileIcon aria-hidden="true" />
          <span className="truncate">{node.name}</span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title={node.path}
        style={indent}
        className={cn(ROW, "text-foreground hover:bg-muted/60")}
      >
        <ChevronRight
          aria-hidden="true"
          className={cn("transition-transform duration-150", open && "rotate-90")}
        />
        {open ? <FolderOpen aria-hidden="true" /> : <Folder aria-hidden="true" />}
        <span className="truncate">{node.name}</span>
      </button>
      {open ? (
        <ul className="flex flex-col gap-px">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
              panelId={panelId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
