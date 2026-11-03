export type FileTreeNode =
  | { type: "folder"; name: string; path: string; children: FileTreeNode[] }
  | { type: "file"; name: string; path: string };

type MutableFolder = { folders: Map<string, MutableFolder>; files: string[] };

/**
 * Turn flat project paths into a folder tree: folders before files, each
 * sorted by name, and single-child folder chains compacted ("components/previews/blocks")
 * the way editors show them.
 */
export function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: MutableFolder = { folders: new Map(), files: [] };
  for (const path of new Set(paths)) {
    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) continue;
    let folder = root;
    for (const part of parts) {
      let next = folder.folders.get(part);
      if (!next) {
        next = { folders: new Map(), files: [] };
        folder.folders.set(part, next);
      }
      folder = next;
    }
    folder.files.push(fileName);
  }
  return toNodes(root, "");
}

function toNodes(folder: MutableFolder, prefix: string): FileTreeNode[] {
  const byName = (a: string, b: string) => a.localeCompare(b);
  const folders = [...folder.folders.keys()].sort(byName).map((name) => {
    let label = name;
    let current = folder.folders.get(name) as MutableFolder;
    // Compact chains like components/ → previews/ → blocks/ into one row.
    while (current.files.length === 0 && current.folders.size === 1) {
      const [childName, child] = [...current.folders.entries()][0] as [string, MutableFolder];
      label = `${label}/${childName}`;
      current = child;
    }
    const path = prefix ? `${prefix}/${label}` : label;
    return { type: "folder" as const, name: label, path, children: toNodes(current, path) };
  });
  const files = [...folder.files].sort(byName).map((name) => ({
    type: "file" as const,
    name,
    path: prefix ? `${prefix}/${name}` : name,
  }));
  return [...folders, ...files];
}
