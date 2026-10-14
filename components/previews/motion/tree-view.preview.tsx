"use client";

import {
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Palette,
} from "lucide-react";
import { useState } from "react";

import { type TreeNode, TreeView } from "@/components/motion/tree-view";

const folder = <Folder className="text-muted-foreground" />;
const folderOpen = <FolderOpen className="text-muted-foreground" />;
const tsx = <FileCode2 className="text-sky-500" />;
const ts = <FileCode2 className="text-blue-500" />;
const json = <FileJson className="text-amber-500" />;
const css = <Palette className="text-pink-500" />;
const md = <FileText className="text-muted-foreground" />;
const img = <ImageIcon className="text-emerald-500" />;

const nodes: TreeNode[] = [
  {
    id: "app",
    label: "app",
    icon: folder,
    expandedIcon: folderOpen,
    children: [
      { id: "app/layout", label: "layout.tsx", icon: tsx },
      { id: "app/page", label: "page.tsx", icon: tsx },
      { id: "app/globals", label: "globals.css", icon: css },
    ],
  },
  {
    id: "components",
    label: "components",
    icon: folder,
    expandedIcon: folderOpen,
    children: [
      {
        id: "components/motion",
        label: "motion",
        icon: folder,
        expandedIcon: folderOpen,
        children: [
          { id: "components/motion/tree-view", label: "tree-view.tsx", icon: tsx },
          { id: "components/motion/tabs", label: "tabs.tsx", icon: tsx },
          { id: "components/motion/switch", label: "switch.tsx", icon: tsx },
        ],
      },
      {
        id: "components/previews",
        label: "previews",
        icon: folder,
        expandedIcon: folderOpen,
        children: [
          { id: "components/previews/index", label: "index.tsx", icon: tsx },
        ],
      },
    ],
  },
  {
    id: "lib",
    label: "lib",
    icon: folder,
    expandedIcon: folderOpen,
    children: [
      { id: "lib/ease", label: "ease.ts", icon: ts },
      { id: "lib/utils", label: "utils.ts", icon: ts },
    ],
  },
  {
    id: "public",
    label: "public",
    icon: folder,
    expandedIcon: folderOpen,
    children: [{ id: "public/og", label: "og.png", icon: img }],
  },
  { id: "package", label: "package.json", icon: json },
  { id: "readme", label: "README.md", icon: md },
];

export function TreeViewPreview() {
  const [selected, setSelected] = useState<string | null>(
    "components/motion/tree-view",
  );

  return (
    <div className="flex h-[400px] w-full items-center justify-center">
      <div className="flex h-full max-h-[360px] w-full max-w-xs flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Explorer
          </span>
          <span className="max-w-[60%] truncate font-mono text-[11px] text-muted-foreground">
            {selected ?? "—"}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TreeView
            aria-label="Project files"
            nodes={nodes}
            value={selected}
            onValueChange={setSelected}
            defaultExpanded={["components", "components/motion"]}
          />
        </div>
      </div>
    </div>
  );
}
