"use client";

import { FileCode2, Folder, Terminal } from "lucide-react";

import {
  ResizablePanel,
  ResizablePanels,
} from "@/components/motion/resizable-panels";

const files = ["app", "components", "lib", "page.tsx", "layout.tsx"];

const code = [
  ["text-violet-500", "export function", "text-sky-500", " Hero", "", "() {"],
  ["", "  return (", "", "", "", ""],
  ["text-muted-foreground", "    <section", "text-amber-500", " className", "", "=…>"],
  ["text-muted-foreground", "      <h1>", "", "Ship motion", "text-muted-foreground", "</h1>"],
  ["text-muted-foreground", "    </section>", "", "", "", ""],
  ["", "  );", "", "", "", ""],
  ["", "}", "", "", "", ""],
].map((parts, n) => ({ parts, line: n + 1 }));

export function ResizablePanelsPreview() {
  return (
    <div className="flex h-[400px] w-full items-center justify-center p-2">
      <div className="h-[340px] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card text-sm">
        <ResizablePanels direction="horizontal">
          <ResizablePanel
            defaultSize={26}
            minSize={18}
            maxSize={45}
            collapsible
            handleLabel="Resize sidebar"
          >
            <div className="flex h-full flex-col gap-0.5 bg-muted/40 p-3">
              <span className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Explorer
              </span>
              {files.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 truncate rounded-md px-1.5 py-1 text-muted-foreground"
                >
                  {name.includes(".") ? (
                    <FileCode2 className="size-3.5 shrink-0 text-sky-500" />
                  ) : (
                    <Folder className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
          </ResizablePanel>
          <ResizablePanel minSize={40}>
            <ResizablePanels direction="vertical">
              <ResizablePanel
                defaultSize={64}
                minSize={30}
                handleLabel="Resize editor"
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
                    <FileCode2 className="size-3.5 text-sky-500" />
                    hero.tsx
                  </div>
                  <pre className="flex-1 overflow-hidden p-3 font-mono text-xs leading-6">
                    {code.map(({ parts: line, line: lineNo }) => (
                      <div key={lineNo} className="flex gap-3">
                        <span className="w-4 select-none text-right text-muted-foreground/50">
                          {lineNo}
                        </span>
                        <span className="truncate">
                          <span className={line[0]}>{line[1]}</span>
                          <span className={line[2]}>{line[3]}</span>
                          <span className={line[4]}>{line[5]}</span>
                        </span>
                      </div>
                    ))}
                  </pre>
                </div>
              </ResizablePanel>
              <ResizablePanel
                defaultSize={36}
                minSize={20}
                collapsible
              >
                <div className="flex h-full flex-col bg-muted/40">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <Terminal className="size-3.5" />
                    Terminal
                  </div>
                  <div className="flex-1 overflow-hidden px-3 font-mono text-xs leading-5">
                    <p className="text-muted-foreground">$ bun run dev</p>
                    <p className="text-emerald-500">✓ Ready in 412ms</p>
                    <p className="text-muted-foreground">○ Compiling /components …</p>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanels>
          </ResizablePanel>
        </ResizablePanels>
      </div>
    </div>
  );
}
