"use client";

import {
  BookOpen,
  ClipboardPaste,
  Copy,
  FilePlus2,
  FolderOpen,
  Info,
  Keyboard,
  Redo2,
  Save,
  Scissors,
  Search,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/motion/menubar";
import { cn } from "@/lib/utils";

const LINES = [
  "import { Menubar } from \"@/components/motion/menubar\";",
  "",
  "export function Editor() {",
  "  // Click a title, then hover across — the panel glides.",
  "  return <Menubar aria-label=\"Editor\">{menus}</Menubar>;",
  "}",
].map((text, i) => ({ id: `line-${i + 1}`, n: i + 1, text }));

const FONT_SIZE: Record<string, string> = {
  small: "text-[11px]",
  medium: "text-xs",
  large: "text-[13.5px]",
};

export function MenubarPreview() {
  const [lineNumbers, setLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  const [minimap, setMinimap] = useState(true);
  const [fontSize, setFontSize] = useState("medium");
  const [last, setLast] = useState("Ready");

  const run = (label: string) => () => setLast(label);

  return (
    <div className="flex w-full justify-center px-4 py-6">
      <div className="w-full max-w-[34rem] rounded-2xl border border-border bg-card shadow-md">
        {/* Window chrome */}
        <div className="flex items-center gap-3 border-b border-border px-3 py-2">
          <div aria-hidden="true" className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
          </div>
          <Menubar aria-label="Editor" className="border-transparent bg-transparent p-0">
            <MenubarMenu value="file">
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem icon={<FilePlus2 />} shortcut={["mod", "n"]} onSelect={run("New file")}>
                  New File
                </MenubarItem>
                <MenubarItem icon={<FolderOpen />} shortcut={["mod", "o"]} onSelect={run("Open…")}>
                  Open…
                </MenubarItem>
                <MenubarSub>
                  <MenubarSubTrigger inset>Open Recent</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarItem onSelect={run("Opened editor.tsx")}>editor.tsx</MenubarItem>
                    <MenubarItem onSelect={run("Opened menubar.tsx")}>menubar.tsx</MenubarItem>
                    <MenubarItem onSelect={run("Opened globals.css")}>globals.css</MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem onSelect={run("Cleared recent")}>Clear Recent</MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSeparator />
                <MenubarItem icon={<Save />} shortcut={["mod", "s"]} onSelect={run("Saved")}>
                  Save
                </MenubarItem>
                <MenubarItem inset shortcut={["mod", "shift", "s"]} onSelect={run("Save as…")}>
                  Save As…
                </MenubarItem>
                <MenubarItem inset disabled>
                  Revert File
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem inset variant="destructive" shortcut={["mod", "w"]} onSelect={run("Closed window")}>
                  Close Window
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu value="edit">
              <MenubarTrigger>Edit</MenubarTrigger>
              <MenubarContent>
                <MenubarItem icon={<Undo2 />} shortcut={["mod", "z"]} onSelect={run("Undo")}>
                  Undo
                </MenubarItem>
                <MenubarItem icon={<Redo2 />} shortcut={["mod", "shift", "z"]} disabled>
                  Redo
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem icon={<Scissors />} shortcut={["mod", "x"]} onSelect={run("Cut")}>
                  Cut
                </MenubarItem>
                <MenubarItem icon={<Copy />} shortcut={["mod", "c"]} onSelect={run("Copied")}>
                  Copy
                </MenubarItem>
                <MenubarItem icon={<ClipboardPaste />} shortcut={["mod", "v"]} onSelect={run("Pasted")}>
                  Paste
                </MenubarItem>
                <MenubarSeparator />
                <MenubarSub>
                  <MenubarSubTrigger icon={<Search />}>Find</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarItem shortcut={["mod", "f"]} onSelect={run("Find…")}>
                      Find…
                    </MenubarItem>
                    <MenubarItem shortcut={["mod", "alt", "f"]} onSelect={run("Replace…")}>
                      Replace…
                    </MenubarItem>
                    <MenubarItem shortcut={["mod", "g"]} onSelect={run("Find next")}>
                      Find Next
                    </MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu value="view">
              <MenubarTrigger>View</MenubarTrigger>
              <MenubarContent>
                <MenubarCheckboxItem checked={lineNumbers} onCheckedChange={setLineNumbers}>
                  Line Numbers
                </MenubarCheckboxItem>
                <MenubarCheckboxItem
                  checked={wordWrap}
                  onCheckedChange={setWordWrap}
                  shortcut={["alt", "z"]}
                >
                  Word Wrap
                </MenubarCheckboxItem>
                <MenubarCheckboxItem checked={minimap} onCheckedChange={setMinimap}>
                  Minimap
                </MenubarCheckboxItem>
                <MenubarSeparator />
                <MenubarLabel inset>Font size</MenubarLabel>
                <MenubarRadioGroup ariaLabel="Font size" value={fontSize} onValueChange={setFontSize}>
                  <MenubarRadioItem value="small">Small</MenubarRadioItem>
                  <MenubarRadioItem value="medium">Medium</MenubarRadioItem>
                  <MenubarRadioItem value="large">Large</MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu value="help">
              <MenubarTrigger>Help</MenubarTrigger>
              <MenubarContent>
                <MenubarItem icon={<BookOpen />} onSelect={run("Opened docs")}>
                  Documentation
                </MenubarItem>
                <MenubarItem icon={<Keyboard />} shortcut={["mod", "/"]} onSelect={run("Shortcuts")}>
                  Keyboard Shortcuts
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem icon={<Info />} onSelect={run("About karaUI")}>
                  About
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>

        {/* Document */}
        <div className="flex min-h-44">
          <div
            className={cn(
              "min-w-0 flex-1 py-3 font-mono leading-relaxed text-foreground/85",
              FONT_SIZE[fontSize],
            )}
          >
            {LINES.map((line) => (
              <div key={line.id} className="flex px-3">
                {lineNumbers ? (
                  <span aria-hidden="true" className="w-6 shrink-0 select-none text-muted-foreground/60">
                    {line.n}
                  </span>
                ) : null}
                <span className={cn("min-w-0", wordWrap ? "whitespace-pre-wrap break-all" : "truncate whitespace-pre")}>
                  {line.text || " "}
                </span>
              </div>
            ))}
          </div>
          {minimap ? (
            <div aria-hidden="true" className="flex w-14 shrink-0 flex-col gap-1 border-l border-border px-2 py-3">
              {LINES.map((line) => (
                <span
                  key={`m-${line.id}`}
                  className="h-1 rounded-full bg-foreground/15"
                  style={{ width: `${Math.min(100, line.text.length * 2)}%` }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          <span aria-live="polite" className="truncate">
            {last}
          </span>
          <span className="shrink-0 tabular-nums">
            {wordWrap ? "Wrap" : "No wrap"} · UTF-8
          </span>
        </div>
      </div>
    </div>
  );
}
