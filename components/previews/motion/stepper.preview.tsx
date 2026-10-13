"use client";

import { useState } from "react";
import { Input } from "@/components/motion/input";
import {
  Stepper,
  StepperIndicator,
  StepperNext,
  StepperPanels,
  StepperPrevious,
  type StepperStep,
} from "@/components/motion/stepper";

const STEPS: StepperStep[] = [
  { id: "account", title: "Account" },
  { id: "workspace", title: "Workspace" },
  { id: "review", title: "Review" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Values = { email: string; workspace: string };
type Errors = Partial<Record<keyof Values, string>>;

function errorsFor(step: number, v: Values): Errors {
  if (step === 0 && !EMAIL_PATTERN.test(v.email))
    return { email: "Enter a valid email" };
  if (step === 1 && v.workspace.trim().length < 3)
    return { workspace: "At least 3 characters" };
  return {};
}

export function StepperPreview() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({ email: "", workspace: "" });
  // Errors only show once a step has refused to advance.
  const [touched, setTouched] = useState<ReadonlySet<number>>(new Set());
  const [done, setDone] = useState(false);

  const errors = touched.has(step) ? errorsFor(step, values) : {};
  const set = (key: keyof Values) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  if (done) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-medium text-foreground">
          {values.workspace} is ready
        </p>
        <p className="text-sm text-muted-foreground">
          Invite sent to {values.email}
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setStep(0);
            setTouched(new Set());
            setValues({ email: "", workspace: "" });
          }}
          className="text-sm text-foreground underline underline-offset-4"
        >
          Start over
        </button>
      </div>
    );
  }

  return (
    <Stepper
      steps={STEPS}
      value={step}
      onValueChange={setStep}
      canAdvance={(i) => {
        setTouched((t) => new Set(t).add(i));
        return Object.keys(errorsFor(i, values)).length === 0;
      }}
      onComplete={async () => {
        await new Promise((r) => setTimeout(r, 900));
        setDone(true);
      }}
      className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
    >
      <StepperIndicator />

      <StepperPanels>
        <div className="space-y-1 px-px py-1">
          <Input
            label="Work email"
            type="email"
            value={values.email}
            onChange={set("email")}
            error={errors.email}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1 px-px py-1">
          <Input
            label="Workspace name"
            value={values.workspace}
            onChange={set("workspace")}
            error={errors.workspace}
          />
          <p className="text-xs text-muted-foreground">
            Shown to everyone you invite.
          </p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 py-1 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="truncate text-foreground">{values.email}</dd>
          <dt className="text-muted-foreground">Workspace</dt>
          <dd className="truncate text-foreground">{values.workspace}</dd>
        </dl>
      </StepperPanels>

      <div className="flex items-center justify-between">
        <StepperPrevious />
        <StepperNext finishLabel="Create workspace" />
      </div>
    </Stepper>
  );
}
