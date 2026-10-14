"use client";

import { MarkdownEditor } from "@/components/motion/markdown-editor";

const SAMPLE = `## Release notes

Ship the **markdown editor** with _live preview_ and ~~no~~ zero dependencies.

- Select text to open the floating toolbar
- Press Enter to continue a list
  - Tab nests an item

1. Write
2. Preview

- [x] Safe links only: [docs](https://karaui.kamisama-v0.my.id)
- [ ] Try \`Ctrl+B\` on a selection

> Rendered as React elements, never raw HTML.
`;

export function MarkdownEditorPreview() {
  return (
    <div className="flex w-full items-center justify-center py-4">
      <MarkdownEditor
        defaultValue={SAMPLE}
        defaultMode="split"
        minHeight={240}
        maxHeight={300}
        label="Release notes"
        className="max-w-[600px]"
      />
    </div>
  );
}
