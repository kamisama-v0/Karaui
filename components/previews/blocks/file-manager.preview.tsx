"use client";

import { FileManager, type FileNode } from "@/components/motion/file-manager";

const ROOT: FileNode = {
  id: "root",
  name: "My Drive",
  kind: "folder",
  children: [
    {
      id: "design",
      name: "Design",
      kind: "folder",
      modified: "2026-10-12T10:00:00Z",
      children: [
        { id: "logo", name: "logo-final.svg", kind: "image", size: 18_400, modified: "2026-10-12T10:00:00Z" },
        { id: "hero", name: "hero-shot.png", kind: "image", size: 2_480_000, modified: "2026-10-11T15:20:00Z" },
        {
          id: "icons",
          name: "Icons",
          kind: "folder",
          modified: "2026-10-09T09:00:00Z",
          children: [
            { id: "icon-set", name: "icon-set.zip", kind: "archive", size: 5_200_000, modified: "2026-10-09T09:00:00Z" },
          ],
        },
        { id: "brand", name: "brand-guide.pdf", kind: "document", size: 8_900_000, modified: "2026-10-02T12:00:00Z" },
      ],
    },
    {
      id: "projects",
      name: "Projects",
      kind: "folder",
      modified: "2026-10-13T08:30:00Z",
      children: [
        { id: "app", name: "app.tsx", kind: "code", size: 12_300, modified: "2026-10-13T08:30:00Z" },
        { id: "data", name: "metrics.csv", kind: "spreadsheet", size: 640_000, modified: "2026-10-10T17:45:00Z" },
      ],
    },
    {
      id: "media",
      name: "Media",
      kind: "folder",
      modified: "2026-10-08T19:00:00Z",
      children: [
        { id: "demo", name: "product-demo.mp4", kind: "video", size: 148_000_000, modified: "2026-10-08T19:00:00Z" },
        { id: "jingle", name: "jingle.mp3", kind: "audio", size: 3_100_000, modified: "2026-10-07T11:10:00Z" },
      ],
    },
    { id: "notes", name: "meeting-notes.md", kind: "document", size: 4_200, modified: "2026-10-14T09:15:00Z" },
    { id: "budget", name: "q4-budget.xlsx", kind: "spreadsheet", size: 96_000, modified: "2026-10-06T14:00:00Z" },
    { id: "backup", name: "backup-oct.zip", kind: "archive", size: 820_000_000, modified: "2026-10-01T02:00:00Z" },
    { id: "cover", name: "cover-art.jpg", kind: "image", size: 1_240_000, modified: "2026-09-29T16:40:00Z" },
  ],
};

export function FileManagerPreview() {
  return (
    <div className="w-full max-w-[40rem]">
      <FileManager root={ROOT} storage={{ used: 11_400_000_000, total: 15_000_000_000 }} />
    </div>
  );
}
