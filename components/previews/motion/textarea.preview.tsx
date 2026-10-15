"use client";

import { useState } from "react";
import { Textarea } from "@/components/motion/textarea";

export function TextareaPreview() {
  const [bio, setBio] = useState(
    "Design engineer. I build calm interfaces and tiny motion details.",
  );
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);
  const notesError =
    touched && notes.trim().length < 12
      ? "Add at least 12 characters so reviewers have context."
      : undefined;

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Textarea
        label="Bio"
        description="Shown on your public profile. Grows as you type."
        value={bio}
        onChange={setBio}
        maxLength={160}
        minRows={2}
        maxRows={5}
        placeholder="Tell people a little about yourself"
      />
      <Textarea
        label="Release notes"
        value={notes}
        onChange={setNotes}
        onBlur={() => setTouched(true)}
        error={notesError}
        minRows={2}
        maxRows={4}
        placeholder="What changed in this version?"
      />
    </div>
  );
}
