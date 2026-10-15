"use client";

import {
  Clock,
  type LucideIcon,
  Mail,
  MapPin,
  MessagesSquare,
  User,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import { type FormEvent, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { Button, StatefulButton } from "@/components/motion/button";
import { Input } from "@/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { Textarea } from "@/components/motion/textarea";
import { EASE_OUT, SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type ContactValues = {
  name: string;
  email: string;
  topic: string;
  message: string;
};

export type ContactErrors = Partial<Record<keyof ContactValues, string>>;

export type ContactTopic = { value: string; label: string };

export type ContactMethod = {
  id: string;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  /** Makes the row a link (mailto:, tel:, https:). */
  href?: string;
};

export interface ContactFormProps {
  defaultValues?: Partial<ContactValues>;
  /** Called with valid values. Reject with a message to show it and shake the form. */
  onSubmit?: (values: ContactValues) => void | Promise<void>;
  validate?: (values: ContactValues) => ContactErrors;
  topics?: ContactTopic[];
  /** Side panel rows. Pass `[]` to hide the panel. */
  methods?: ContactMethod[];
  /** Character limit for the message (counter shows). Default 500. */
  maxLength?: number;
  /** Minimum message length. Default 10. */
  minLength?: number;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
}

const DEFAULT_TOPICS: ContactTopic[] = [
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Something else" },
];

const DEFAULT_METHODS: ContactMethod[] = [
  {
    id: "email",
    icon: Mail,
    label: "Email",
    value: "hello@example.com",
    href: "mailto:hello@example.com",
  },
  { id: "chat", icon: MessagesSquare, label: "Live chat", value: "Mon–Fri, 9am–6pm" },
  { id: "office", icon: MapPin, label: "Office", value: "100 Example St, Springfield" },
  { id: "reply", icon: Clock, label: "Response time", value: "Within one business day" },
];

const EMPTY: ContactValues = { name: "", email: "", topic: "", message: "" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHAKE = { x: [0, -8, 8, -5, 5, -2, 0] };

function messageOf(reason: unknown) {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason) return reason;
  return "Something went wrong. Try again.";
}

/**
 * Contact section: name / email / topic `Select` / message `Textarea` with a
 * live counter, "reward early, punish late" validation (as in `SignUpForm`),
 * an async submit through `StatefulButton` that shakes on failure, and a
 * success panel the card morphs into. A side panel lists contact methods.
 */
export function ContactForm({
  defaultValues,
  onSubmit,
  validate,
  topics = DEFAULT_TOPICS,
  methods = DEFAULT_METHODS,
  maxLength = 500,
  minLength = 10,
  title = "Get in touch",
  description = "Tell us what you need and the right person will reply.",
  className,
}: ContactFormProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [values, setValues] = useState<ContactValues>({ ...EMPTY, ...defaultValues });
  const [touched, setTouched] = useState<Partial<Record<keyof ContactValues, boolean>>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState<ContactValues | null>(null);
  const shakeRef = useRef<HTMLDivElement>(null);

  const errors = useMemo<ContactErrors>(() => {
    if (validate) return validate(values);
    const next: ContactErrors = {};
    if (!values.name.trim()) next.name = "Enter your name.";
    if (!values.email.trim()) next.email = "Enter your email.";
    else if (!EMAIL_PATTERN.test(values.email))
      next.email = "That doesn't look like an email address.";
    if (!values.topic) next.topic = "Pick a topic.";
    if (values.message.trim().length < minLength)
      next.message = `Write at least ${minLength} characters.`;
    return next;
  }, [values, validate, minLength]);

  const shown = (key: keyof ContactValues) => (touched[key] ? errors[key] : undefined);
  const ok = (key: keyof ContactValues) =>
    Boolean(touched[key]) && !errors[key] && Boolean(values[key]);

  const set = (key: keyof ContactValues, next: string) => {
    setValues((prev) => ({ ...prev, [key]: next }));
    if (status === "error") setStatus("idle");
  };
  const touch = (key: keyof ContactValues) =>
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

  const shake = () => {
    if (!reduce && shakeRef.current) {
      animate(shakeRef.current, SHAKE, { duration: 0.42, ease: EASE_OUT });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ name: true, email: true, topic: true, message: true });
    if (Object.keys(errors).length > 0) {
      shake();
      return;
    }
    setFormError(undefined);
    setStatus("loading");
    try {
      await onSubmit?.(values);
      setStatus("success");
      setSent(values);
    } catch (reason) {
      setStatus("error");
      setFormError(messageOf(reason));
      shake();
    }
  };

  const restart = () => {
    setValues({ ...EMPTY, name: values.name, email: values.email });
    setTouched({});
    setStatus("idle");
    setSent(null);
  };

  const busy = status === "loading";
  const topicErrorId = `${baseId}-topic-error`;
  const topicLabelId = `${baseId}-topic-label`;
  const offset = reduce ? 0 : 16;

  return (
    <div className={cn("@container w-full", className)}>
      <div
        className={cn(
          "grid gap-4 rounded-3xl border border-border bg-card p-4 @lg:p-5",
          // Side column only when the card is wide enough (~768px); narrower
          // containers move the methods into a compact grid under the form.
          methods.length > 0 && "@3xl:grid-cols-[minmax(0,1fr)_14rem]",
        )}
      >
        {/* The card resizes between the form and the thank-you panel; `layout`
            is a layout job here by design, with content counter-corrected. */}
        <motion.div
          layout
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="min-w-0"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {sent ? (
              <motion.div
                key="sent"
                layout="position"
                role="status"
                initial={{ opacity: 0, y: offset, filter: reduce ? "blur(0px)" : "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -offset, transition: { duration: 0.15 } }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="flex min-h-72 flex-col items-center justify-center gap-4 px-4 text-center"
              >
                <motion.span
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={reduce ? { duration: 0.2 } : { ...SPRING_SWAP, delay: 0.08 }}
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
                      transition={{ duration: 0.4, delay: 0.2, ease: EASE_OUT }}
                    />
                  </svg>
                </motion.span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    Message sent
                  </h2>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Thanks, {sent.name.split(" ")[0]}. We&apos;ll reply to{" "}
                    <span className="font-medium text-foreground">{sent.email}</span> soon.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={restart}>
                  Send another message
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                layout="position"
                noValidate
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: -offset }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  y: -offset,
                  filter: reduce ? "blur(0px)" : "blur(4px)",
                  transition: { duration: 0.16 },
                }}
                transition={{ duration: 0.26, ease: EASE_OUT }}
              >
                <div ref={shakeRef} className="flex flex-col gap-3.5">
                  {title || description ? (
                    <div className="flex flex-col gap-0.5">
                      {title ? (
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                          {title}
                        </h2>
                      ) : null}
                      {description ? (
                        <p className="text-sm text-muted-foreground">{description}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="grid gap-3.5 @lg:grid-cols-2">
                    <Input
                      label="Name"
                      autoComplete="name"
                      placeholder="Ada Lovelace"
                      leftIcon={<User />}
                      disabled={busy}
                      value={values.name}
                      onChange={(next) => set("name", next)}
                      onBlur={() => touch("name")}
                      error={shown("name")}
                      success={ok("name")}
                    />
                    <Input
                      label="Email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      leftIcon={<Mail />}
                      disabled={busy}
                      value={values.email}
                      onChange={(next) => set("email", next)}
                      onBlur={() => touch("email")}
                      error={shown("email")}
                      success={ok("email")}
                    />
                  </div>
                  <div className="relative z-20 flex flex-col gap-1.5">
                    <span id={topicLabelId} className="px-1 text-sm font-medium text-foreground">
                      Topic
                    </span>
                    <fieldset
                      aria-labelledby={topicLabelId}
                      aria-describedby={shown("topic") ? topicErrorId : undefined}
                      className="m-0 border-0 p-0"
                    >
                      <Select
                        value={values.topic || undefined}
                        disabled={busy}
                        onValueChange={(next) => {
                          set("topic", next);
                          touch("topic");
                        }}
                        onOpenChange={(open) => {
                          if (!open) touch("topic");
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-11",
                            shown("topic") && "border-destructive ring-2 ring-destructive/25",
                          )}
                        >
                          <SelectValue placeholder="What's this about?" />
                        </SelectTrigger>
                        <SelectContent>
                          {topics.map((topic) => (
                            <SelectItem key={topic.value} value={topic.value}>
                              {topic.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </fieldset>
                    <AnimatePresence initial={false}>
                      {shown("topic") ? (
                        <motion.p
                          id={topicErrorId}
                          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="px-1 text-xs text-destructive"
                        >
                          {shown("topic")}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  <Textarea
                    label="Message"
                    placeholder="How can we help?"
                    minRows={3}
                    maxRows={6}
                    maxLength={maxLength}
                    disabled={busy}
                    value={values.message}
                    onChange={(next) => set("message", next)}
                    onBlur={() => touch("message")}
                    error={shown("message")}
                  />
                  <AnimatePresence initial={false}>
                    {formError && status === "error" ? (
                      <motion.p
                        role="alert"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                      >
                        {formError}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                  <StatefulButton
                    type="submit"
                    state={status}
                    loadingText="Sending"
                    successText="Sent"
                    errorText="Try again"
                    className="w-full @lg:w-fit @lg:self-end"
                  >
                    Send message
                  </StatefulButton>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {methods.length > 0 ? (
          <aside
            aria-label="Other ways to reach us"
            className="grid content-start gap-1 rounded-2xl bg-muted/50 p-3 @md:grid-cols-2 @3xl:grid-cols-1"
          >
            <p className="col-span-full px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
              Other ways to reach us
            </p>
            {methods.map((method) => {
              const Icon = method.icon;
              const body = (
                <>
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">{method.label}</span>
                    <span className="block truncate text-sm font-medium text-foreground">
                      {method.value}
                    </span>
                  </span>
                </>
              );
              const rowClass =
                "flex items-center gap-2.5 rounded-xl px-2 py-1.5 outline-none transition-colors";
              return method.href ? (
                <a
                  key={method.id}
                  href={method.href}
                  className={cn(
                    rowClass,
                    "hover:bg-card focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  {body}
                </a>
              ) : (
                <div key={method.id} className={rowClass}>
                  {body}
                </div>
              );
            })}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
