"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/motion/password-input";

export function PasswordInputPreview() {
  const [password, setPassword] = useState("");

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <PasswordInput
        label="New password"
        value={password}
        onChange={setPassword}
        requirements
        placeholder="Try “correct horse battery”"
      />
      <PasswordInput
        label="Current password"
        strengthMeter={false}
        autoComplete="current-password"
        defaultValue="hunter2"
      />
    </div>
  );
}
