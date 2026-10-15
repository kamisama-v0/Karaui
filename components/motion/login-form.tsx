"use client";

import {
  ArrowLeft,
  Building2,
  Fingerprint,
  type LucideIcon,
  Mail,
  MailCheck,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button, StatefulButton } from "@/components/motion/button";
import { Checkbox } from "@/components/motion/checkbox";
import { Input } from "@/components/motion/input";
import { OTPInput } from "@/components/motion/otp-input";
import { PasswordInput } from "@/components/motion/password-input";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

/** The card's screens, in the order the recovery flow walks them. */
export type LoginView = "sign-in" | "forgot" | "sent" | "reset" | "done";

export type LoginValues = {
  email: string;
  password: string;
  remember: boolean;
};

export type LoginResetValues = {
  email: string;
  code: string;
  password: string;
};

export type LoginSocialProvider = {
  id: string;
  label: string;
  /** Any icon component. Generic glyphs by default — bring your own brand marks. */
  icon?: LucideIcon;
};

export interface LoginFormProps {
  /** Controlled screen. Omit to let the card manage its own flow. */
  view?: LoginView;
  defaultView?: LoginView;
  onViewChange?: (view: LoginView) => void;
  defaultValues?: Partial<LoginValues>;
  /** Called with valid values. Reject (or throw) with a message to show it and shake the card. */
  onSubmit?: (values: LoginValues) => void | Promise<void>;
  /** Social / SSO buttons. Pass `[]` to hide the row. */
  providers?: LoginSocialProvider[];
  onProviderClick?: (id: string) => void | Promise<void>;
  /** Sends the reset code. Reject to show an error on the request screen. */
  onRequestReset?: (email: string) => void | Promise<void>;
  /** Verifies the code and stores the new password. Reject to shake the code. */
  onResetPassword?: (values: LoginResetValues) => void | Promise<void>;
  /** Length of the emailed code. Default 6. */
  codeLength?: number;
  /** Seconds before "Resend code" unlocks again. Default 30. */
  resendCooldown?: number;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

type Status = "idle" | "loading" | "success" | "error";

const DEFAULT_PROVIDERS: LoginSocialProvider[] = [
  { id: "sso", label: "SSO", icon: Building2 },
  { id: "passkey", label: "Passkey", icon: Fingerprint },
];

// Same deliberately permissive check as SignUpForm.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHAKE = { x: [0, -8, 8, -5, 5, -2, 0] };
const ORDER: LoginView[] = ["sign-in", "forgot", "sent", "reset", "done"];

function messageOf(reason: unknown, fallback: string) {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason) return reason;
  return fallback;
}

function emailError(email: string) {
  if (!email.trim()) return "Enter your email.";
  if (!EMAIL_PATTERN.test(email)) return "That doesn't look like an email address.";
  return undefined;
}

/**
 * Sign-in card, sibling of `SignUpForm`: email + password with remember-me and
 * generic social buttons, plus a password-recovery flow that morphs inside the
 * same card — request a code, "check your inbox", OTP + new password, success.
 * Every handler may return a promise; rejections surface their message and
 * shake the active screen.
 */
export function LoginForm({
  view: viewProp,
  defaultView = "sign-in",
  onViewChange,
  defaultValues,
  onSubmit,
  providers = DEFAULT_PROVIDERS,
  onProviderClick,
  onRequestReset,
  onResetPassword,
  codeLength = 6,
  resendCooldown = 30,
  title = "Welcome back",
  description = "Sign in to continue to your workspace.",
  footer,
  className,
}: LoginFormProps) {
  const reduce = useReducedMotion();
  const baseId = useId();

  const [internalView, setInternalView] = useState<LoginView>(defaultView);
  const view = viewProp ?? internalView;
  const [direction, setDirection] = useState<1 | -1>(1);

  const [email, setEmail] = useState(defaultValues?.email ?? "");
  const [password, setPassword] = useState(defaultValues?.password ?? "");
  const [remember, setRemember] = useState(defaultValues?.remember ?? true);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>(
    {},
  );

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetTouched, setResetTouched] = useState(false);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>();
  const [providerPending, setProviderPending] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const shakeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownView = useRef(view);

  const go = useCallback(
    (next: LoginView) => {
      // Finishing the reset loops forward to sign-in; every other move slides
      // by its place in the flow.
      setDirection(
        view === "done" || ORDER.indexOf(next) >= ORDER.indexOf(view) ? 1 : -1,
      );
      setStatus("idle");
      setError(undefined);
      if (viewProp === undefined) setInternalView(next);
      onViewChange?.(next);
    },
    [view, viewProp, onViewChange],
  );

  // Move focus to the new screen's heading so keyboard users land on it.
  useEffect(() => {
    // Only after navigation, never on first render.
    if (shownView.current === view) return;
    shownView.current = view;
    const id = window.setTimeout(
      () => headingRef.current?.focus({ preventScroll: true }),
      60,
    );
    return () => window.clearTimeout(id);
  }, [view]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const shake = () => {
    if (reduce || !shakeRef.current) return;
    animate(shakeRef.current, SHAKE, { duration: 0.42, ease: EASE_OUT });
  };

  /** Shared async runner: pending → success | error (+ shake). */
  const run = async (
    task: (() => void | Promise<void>) | undefined,
    fallback: string,
  ) => {
    setError(undefined);
    setStatus("loading");
    try {
      await task?.();
      setStatus("success");
      return true;
    } catch (reason) {
      setStatus("error");
      setError(messageOf(reason, fallback));
      shake();
      return false;
    }
  };

  const signInErrors = {
    email: emailError(email),
    password: password ? undefined : "Enter your password.",
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (signInErrors.email || signInErrors.password) {
      shake();
      return;
    }
    await run(
      onSubmit && (() => onSubmit({ email, password, remember })),
      "Couldn't sign you in. Try again.",
    );
  };

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched((t) => ({ ...t, email: true }));
    if (emailError(email)) {
      shake();
      return;
    }
    const ok = await run(
      onRequestReset && (() => onRequestReset(email)),
      "Couldn't send the code. Try again.",
    );
    if (ok) {
      setCooldown(resendCooldown);
      go("sent");
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await onRequestReset?.(email);
      setCooldown(resendCooldown);
    } catch (reason) {
      setError(messageOf(reason, "Couldn't resend the code."));
      shake();
    }
  };

  const resetErrors = {
    code: code.length < codeLength ? `Enter the ${codeLength}-digit code.` : undefined,
    password:
      newPassword.length < MIN_PASSWORD_LENGTH
        ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
        : undefined,
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetTouched(true);
    if (resetErrors.code || resetErrors.password) {
      shake();
      return;
    }
    const ok = await run(
      onResetPassword &&
        (() => onResetPassword({ email, code, password: newPassword })),
      "That code didn't work.",
    );
    if (ok) {
      setPassword("");
      setCode("");
      setNewPassword("");
      setResetTouched(false);
      go("done");
    } else {
      setCode("");
    }
  };

  const handleProvider = async (id: string) => {
    if (providerPending) return;
    setProviderPending(id);
    setError(undefined);
    try {
      await onProviderClick?.(id);
    } catch (reason) {
      setError(messageOf(reason, "That sign-in method is unavailable."));
      shake();
    } finally {
      setProviderPending(null);
    }
  };

  const busy = status === "loading";
  const errorId = `${baseId}-error`;
  const offset = reduce ? 0 : 28;

  const heading = (text: ReactNode, sub: ReactNode) => (
    <div className="flex flex-col gap-1">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold tracking-tight text-foreground outline-none"
      >
        {text}
      </h2>
      {sub ? <p className="text-sm text-muted-foreground">{sub}</p> : null}
    </div>
  );

  const back = (to: LoginView, label = "Back to sign in") => (
    <button
      type="button"
      onClick={() => go(to)}
      disabled={busy}
      className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-full px-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      {label}
    </button>
  );

  const formError = (
    <AnimatePresence initial={false}>
      {error ? (
        <motion.p
          id={errorId}
          role="alert"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );

  let screen: ReactNode;
  switch (view) {
    case "sign-in":
      screen = (
        <form noValidate onSubmit={handleSignIn} className="flex flex-col gap-5">
          {heading(title, description)}
          <div className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              leftIcon={<Mail />}
              disabled={busy}
              value={email}
              onChange={(next) => {
                setEmail(next);
                if (status === "error") setStatus("idle");
              }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              error={touched.email ? signInErrors.email : undefined}
            />
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              placeholder="Your password"
              strengthMeter={false}
              disabled={busy}
              value={password}
              onChange={(next) => {
                setPassword(next);
                if (status === "error") setStatus("idle");
              }}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              error={touched.password ? signInErrors.password : undefined}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Checkbox
              checked={remember}
              disabled={busy}
              onCheckedChange={setRemember}
              label="Remember me"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => go("forgot")}
              className="rounded-full px-1 text-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>
          {formError}
          <StatefulButton
            type="submit"
            size="lg"
            state={status}
            loadingText="Signing in"
            successText="Signed in"
            errorText="Try again"
            aria-describedby={error ? errorId : undefined}
            className="w-full"
          >
            Sign in
          </StatefulButton>
          {providers.length > 0 ? (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" aria-hidden />
                or continue with
                <span className="h-px flex-1 bg-border" aria-hidden />
              </div>
              <div
                className={cn(
                  "grid gap-2",
                  providers.length > 1 ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                {providers.map((provider) => {
                  const Icon = provider.icon;
                  const pending = providerPending === provider.id;
                  return (
                    <Button
                      key={provider.id}
                      type="button"
                      variant="secondary"
                      disabled={busy || Boolean(providerPending)}
                      aria-busy={pending || undefined}
                      onClick={() => void handleProvider(provider.id)}
                      className="w-full"
                    >
                      {pending ? (
                        <span
                          aria-hidden
                          className="size-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground"
                        />
                      ) : Icon ? (
                        <Icon className="size-4" aria-hidden />
                      ) : null}
                      {provider.label}
                    </Button>
                  );
                })}
              </div>
            </>
          ) : null}
          {footer ? (
            <div className="text-center text-sm text-muted-foreground">{footer}</div>
          ) : null}
        </form>
      );
      break;
    case "forgot":
      screen = (
        <form noValidate onSubmit={handleRequest} className="flex flex-col gap-5">
          {back("sign-in")}
          {heading(
            "Reset your password",
            "Enter your account email and we'll send you a reset code.",
          )}
          <Input
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            leftIcon={<Mail />}
            disabled={busy}
            value={email}
            onChange={setEmail}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={touched.email ? emailError(email) : undefined}
          />
          {formError}
          <StatefulButton
            type="submit"
            size="lg"
            state={status}
            loadingText="Sending code"
            successText="Code sent"
            errorText="Try again"
            className="w-full"
          >
            Send reset code
          </StatefulButton>
        </form>
      );
      break;
    case "sent":
      screen = (
        <div className="flex flex-col items-center gap-5 text-center">
          <motion.span
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={reduce ? { duration: 0.2 } : { ...SPRING_SWAP, delay: 0.08 }}
            className="grid size-14 place-items-center rounded-2xl bg-muted text-foreground"
          >
            <MailCheck className="size-6" aria-hidden />
          </motion.span>
          {heading(
            "Check your inbox",
            <>
              We sent a {codeLength}-digit code to{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </>,
          )}
          {formError}
          <Button type="button" size="lg" className="w-full" onClick={() => go("reset")}>
            Enter code
          </Button>
          <div className="flex w-full items-center justify-between text-sm">
            {back("forgot", "Use another email")}
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={() => void handleResend()}
              className="rounded-full px-1 font-medium text-foreground tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-muted-foreground"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </div>
      );
      break;
    case "reset":
      screen = (
        <form noValidate onSubmit={handleReset} className="flex flex-col gap-5">
          {back("sent")}
          {heading("Choose a new password", `Code sent to ${email}.`)}
          <OTPInput
            length={codeLength}
            label="Reset code"
            value={code}
            onChange={(next) => {
              setCode(next);
              if (status === "error") {
                setStatus("idle");
                setError(undefined);
              }
            }}
            disabled={busy}
            status={
              status === "error"
                ? "error"
                : resetTouched && resetErrors.code
                  ? "error"
                  : "idle"
            }
            errorMessage={
              status === "error" ? undefined : resetTouched ? resetErrors.code : undefined
            }
          />
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            disabled={busy}
            value={newPassword}
            onChange={setNewPassword}
            error={resetTouched ? resetErrors.password : undefined}
          />
          {formError}
          <StatefulButton
            type="submit"
            size="lg"
            state={status}
            loadingText="Updating"
            successText="Updated"
            errorText="Try again"
            className="w-full"
          >
            Reset password
          </StatefulButton>
        </form>
      );
      break;
    case "done":
      screen = (
        <div className="flex flex-col items-center gap-5 text-center">
          <motion.span
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduce ? { duration: 0.2 } : SPRING_SWAP}
            className="grid size-14 place-items-center rounded-full bg-success/15 text-success"
          >
            <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden="true">
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: reduce ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.15, ease: EASE_OUT }}
              />
            </svg>
          </motion.span>
          {heading(
            "Password updated",
            "You can now sign in with your new password.",
          )}
          <Button type="button" size="lg" className="w-full" onClick={() => go("sign-in")}>
            Back to sign in
          </Button>
        </div>
      );
      break;
  }

  return (
    // `layout` animates the card's size between screens — a layout job by
    // design (FLIP transforms under the hood); the screens counter-correct
    // with layout="position" so their content never stretches.
    <motion.div
      layout
      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
      style={{ borderRadius: 24 }}
      className={cn(
        "w-full max-w-sm overflow-hidden border border-border bg-card p-6",
        className,
      )}
    >
      <div ref={shakeRef}>
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={view}
            layout="position"
            custom={direction}
            variants={{
              enter: (dir: number) => ({
                opacity: 0,
                x: dir * offset,
                filter: reduce ? "blur(0px)" : "blur(4px)",
              }),
              center: {
                opacity: 1,
                x: 0,
                filter: "blur(0px)",
                transition: { duration: 0.28, ease: EASE_OUT },
              },
              exit: (dir: number) => ({
                opacity: 0,
                x: dir * -offset,
                filter: reduce ? "blur(0px)" : "blur(4px)",
                transition: { duration: 0.16, ease: EASE_OUT },
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {screen}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
