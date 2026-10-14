"use client";

import { useState } from "react";
import { PhoneInput, type PhoneValueMeta } from "@/components/motion/phone-input";

export function PhoneInputPreview() {
  const [e164, setE164] = useState("+6281234567890");
  const [meta, setMeta] = useState<PhoneValueMeta | null>(null);
  const valid = meta ? meta.valid : true;

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <PhoneInput
        label="Phone number"
        value={e164}
        onChange={(next, details) => {
          setE164(next);
          setMeta(details);
        }}
        hint="Paste a full +number to switch country"
      />
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            E.164
          </span>
          <code className="truncate font-mono text-sm text-foreground">
            {e164 || "—"}
          </code>
        </div>
        <span
          className={
            valid && e164
              ? "rounded-full bg-(--color-success)/15 px-2.5 py-1 text-xs font-medium text-(--color-success)"
              : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
          }
        >
          {e164 ? (valid ? "Valid" : "Incomplete") : "Empty"}
        </span>
      </div>
    </div>
  );
}
