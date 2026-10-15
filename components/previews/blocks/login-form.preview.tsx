"use client";

import { LoginForm } from "@/components/motion/login-form";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function LoginFormPreview() {
  return (
    <div className="flex w-full flex-col items-center gap-3 py-2">
      <LoginForm
        defaultValues={{ email: "ada@example.com" }}
        description="Sign in to your workspace."
        onSubmit={async ({ password }) => {
          await wait(1100);
          if (password === "wrong") {
            throw new Error("Incorrect email or password.");
          }
        }}
        onProviderClick={async () => {
          await wait(900);
        }}
        onRequestReset={async () => {
          await wait(900);
        }}
        onResetPassword={async ({ code }) => {
          await wait(1000);
          if (code !== "123456") throw new Error("That code is invalid or expired.");
        }}
      />
      <p className="text-xs text-muted-foreground">
        Demo: password &ldquo;wrong&rdquo; fails · reset code 123456 works.
      </p>
    </div>
  );
}
