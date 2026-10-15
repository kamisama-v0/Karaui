"use client";

import { useRef } from "react";
import { SettingsPage } from "@/components/motion/settings-page";

export function SettingsPagePreview() {
  const attempts = useRef(0);
  return (
    <div className="flex w-full justify-center">
      <SettingsPage
        className="h-[27rem] max-w-[38rem]"
        onSave={async () => {
          await new Promise((resolve) => setTimeout(resolve, 900));
          // Every third save fails so the error shake is easy to see.
          attempts.current += 1;
          if (attempts.current % 3 === 0) throw new Error("Network error");
        }}
      />
    </div>
  );
}
