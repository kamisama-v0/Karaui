"use client";

import { Rocket, TriangleAlert } from "lucide-react";
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@/components/motion/animated-toast-stack";

type Deployment = { url: string; seconds: number };

// Fake network work so the preview can show both outcomes deterministically.
function deploy(shouldFail: boolean) {
  return new Promise<Deployment>((resolve, reject) => {
    window.setTimeout(() => {
      if (shouldFail) {
        reject(new Error("Build step `typecheck` exited with code 2."));
      } else {
        resolve({ url: "karaui-git-main.vercel.app", seconds: 42 });
      }
    }, 2000);
  });
}

export function ToastPromisePreview() {
  const { toasts, promiseToast, dismissToast } = useAnimatedToastStack({
    defaultDuration: 4000,
    limit: 4,
  });

  const run = (shouldFail: boolean) => {
    promiseToast(() => deploy(shouldFail), {
      loading: {
        title: "Deploying to production",
        description: "Building and uploading the main branch.",
      },
      success: (data) => ({
        title: "Deployment ready",
        description: `${data.url} went live in ${data.seconds}s.`,
      }),
      error: (error) => ({
        title: "Deployment failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
      }),
    });
  };

  return (
    <div className="relative flex min-h-[26rem] w-full flex-col items-center justify-start gap-6 overflow-hidden pt-12">
      <AnimatedToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        position="bottom-center"
        placement="absolute"
        portal={false}
        maxVisible={3}
      />

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium text-foreground">One toast, whole lifecycle</p>
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          A spinner while the promise is pending, then it morphs into the result and starts its
          dismiss timer.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => run(false)}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Rocket className="h-3.5 w-3.5" />
          Deploy (succeeds)
        </button>
        <button
          type="button"
          onClick={() => run(true)}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-4 text-xs font-medium text-foreground transition-colors hover:border-border-strong"
        >
          <TriangleAlert className="h-3.5 w-3.5" />
          Deploy (fails)
        </button>
      </div>
    </div>
  );
}
