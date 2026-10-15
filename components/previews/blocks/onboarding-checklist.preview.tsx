"use client";

import { useState } from "react";
import { Button } from "@/components/motion/button";
import {
  OnboardingChecklist,
  type OnboardingStep,
} from "@/components/motion/onboarding-checklist";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const STEPS: OnboardingStep[] = [
  {
    id: "account",
    title: "Create your account",
    description: "You're signed in and ready to go.",
  },
  {
    id: "profile",
    title: "Complete your profile",
    description: "Add a photo and a short bio so teammates recognise you.",
    actionLabel: "Edit profile",
    onAction: () => wait(700),
  },
  {
    id: "invite",
    title: "Invite your team",
    description: "Workspaces are better together. Invite up to five people free.",
    actionLabel: "Send invites",
    onAction: () => wait(900),
  },
  {
    id: "connect",
    title: "Connect a data source",
    description: "Pull in a repository or spreadsheet to start building.",
    actionLabel: "Connect",
    onAction: () => wait(900),
  },
  {
    id: "publish",
    title: "Publish your first page",
    description: "Ship it. You can always unpublish later.",
    actionLabel: "Publish",
    onAction: () => wait(800),
  },
];

export function OnboardingChecklistPreview() {
  const [open, setOpen] = useState(true);
  return (
    <div className="grid min-h-[26rem] w-full place-items-center">
      <OnboardingChecklist
        steps={STEPS}
        defaultCompleted={["account"]}
        open={open}
        onOpenChange={setOpen}
        className="[grid-area:1/1]"
      />
      {open ? null : (
        <Button variant="secondary" className="[grid-area:1/1]" onClick={() => setOpen(true)}>
          Show checklist
        </Button>
      )}
    </div>
  );
}
