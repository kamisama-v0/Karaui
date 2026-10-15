"use client";

import { useState } from "react";
import { InlineEdit } from "@/components/motion/inline-edit";
import { Switch } from "@/components/motion/switch";

// Simulated network round-trip for the demo.
function fakeSave(fail: boolean) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (fail) reject(new Error("Network error, change rolled back."));
      else resolve();
    }, 900);
  });
}

export function InlineEditPreview() {
  const [failSaves, setFailSaves] = useState(false);
  const [name, setName] = useState("Ada Lovelace");
  const [title, setTitle] = useState("Analytical Engine Programmer");
  const [bio, setBio] = useState(
    "Writes the first algorithms meant for a machine. Thinks the engine might compose music one day.",
  );

  const save = (apply: (next: string) => void) => async (next: string) => {
    await fakeSave(failSaves);
    apply(next);
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            {name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("") || "?"}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <InlineEdit
              label="Name"
              value={name}
              onSave={save(setName)}
              maxLength={40}
              validate={(next) =>
                next.trim().length === 0 ? "Name can't be empty." : null
              }
              className="text-lg font-semibold text-foreground"
            />
            <InlineEdit
              label="Title"
              value={title}
              onSave={save(setTitle)}
              placeholder="Add a title"
              className="text-sm text-muted-foreground"
            />
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Bio
          </p>
          <InlineEdit
            label="Bio"
            multiline
            value={bio}
            onSave={save(setBio)}
            maxLength={200}
            placeholder="Write a short bio"
            validate={(next) =>
              next.length > 0 && next.trim().length < 10
                ? "Make it at least 10 characters."
                : null
            }
            className="text-sm leading-6 text-foreground"
          />
        </div>
      </div>
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>Click, Enter or F2 to edit · Esc cancels</span>
        <Switch
          checked={failSaves}
          onCheckedChange={setFailSaves}
          label="Fail saves"
        />
      </div>
    </div>
  );
}
