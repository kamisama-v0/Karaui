"use client";

import {
  Bell,
  CreditCard,
  type LucideIcon,
  Monitor,
  Moon,
  Palette,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/motion/badge";
import { Button, StatefulButton } from "@/components/motion/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogConfirmInput,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/motion/dialog";
import { InlineEdit } from "@/components/motion/inline-edit";
import { Progress } from "@/components/motion/progress";
import { ScrollArea } from "@/components/motion/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { Switch } from "@/components/motion/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/motion/toggle-group";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type SettingsSection = "profile" | "notifications" | "appearance" | "billing";

export type SettingsValues = {
  name: string;
  username: string;
  email: string;
  bio: string;
  notifyMentions: boolean;
  notifyComments: boolean;
  notifyProduct: boolean;
  digest: "off" | "daily" | "weekly";
  theme: "system" | "light" | "dark";
  density: "comfortable" | "compact";
  reduceMotion: boolean;
};

export type SettingsBilling = {
  plan: string;
  price: string;
  renewal: string;
  seats: { used: number; total: number };
  storage: { used: number; total: number; unit: string };
  /** Display-only label such as "Card ending 4242". Never real card data. */
  paymentMethod?: string;
};

export interface SettingsPageProps {
  defaultValues?: Partial<SettingsValues>;
  /** Persist the draft. Reject to keep the bar open with an error and a shake. */
  onSave?: (values: SettingsValues) => void | Promise<void>;
  /** Fires after the type-to-confirm dialog. */
  onDeleteAccount?: () => void | Promise<void>;
  onManageBilling?: () => void;
  /** Controlled active section. */
  section?: SettingsSection;
  defaultSection?: SettingsSection;
  onSectionChange?: (section: SettingsSection) => void;
  billing?: SettingsBilling;
  className?: string;
}

const DEFAULT_VALUES: SettingsValues = {
  name: "Ada Lovelace",
  username: "ada",
  email: "ada@example.com",
  bio: "Writing the first programs for engines that don't exist yet.",
  notifyMentions: true,
  notifyComments: true,
  notifyProduct: false,
  digest: "weekly",
  theme: "system",
  density: "comfortable",
  reduceMotion: false,
};

const DEFAULT_BILLING: SettingsBilling = {
  plan: "Pro",
  price: "$12 / month",
  renewal: "Renews Nov 14, 2026",
  seats: { used: 3, total: 5 },
  storage: { used: 18, total: 50, unit: "GB" },
  paymentMethod: "Card ending 4242",
};

const SECTIONS: { id: SettingsSection; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "billing", label: "Billing", icon: CreditCard },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const SHAKE = { x: [0, -6, 6, -4, 4, -2, 0] };
const SAVED_HOLD_MS = 1100;

function SettingRow({
  title,
  description,
  children,
  stacked,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 border-b border-border py-3.5 last:border-b-0",
        stacked ? "flex-col" : "items-center justify-between",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-2 flex flex-col gap-0.5">
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * Account settings block: a side nav whose active pill glides between
 * Profile / Notifications / Appearance / Billing, sections built from
 * `InlineEdit`, `Switch`, `Select`, `ToggleGroup` and `Progress`, a draft that
 * raises a sticky "unsaved changes" bar (Save via `StatefulButton`, Reset)
 * and a danger zone behind a type-to-confirm `AlertDialog`.
 */
export function SettingsPage({
  defaultValues,
  onSave,
  onDeleteAccount,
  onManageBilling,
  section: sectionProp,
  defaultSection = "profile",
  onSectionChange,
  billing = DEFAULT_BILLING,
  className,
}: SettingsPageProps) {
  const reduce = useReducedMotion();
  const navId = useId();

  const [internalSection, setInternalSection] = useState(defaultSection);
  const section = sectionProp ?? internalSection;
  const selectSection = (next: SettingsSection) => {
    if (sectionProp === undefined) setInternalSection(next);
    onSectionChange?.(next);
  };

  const [saved, setSaved] = useState<SettingsValues>(() => ({
    ...DEFAULT_VALUES,
    ...defaultValues,
  }));
  const [draft, setDraft] = useState<SettingsValues>(saved);
  const [saveState, setSaveState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const barRef = useRef<HTMLDivElement>(null);

  const changed = useMemo(
    () => (Object.keys(draft) as (keyof SettingsValues)[]).filter((k) => draft[k] !== saved[k]),
    [draft, saved],
  );
  const dirty = changed.length > 0;
  const showBar = dirty || saveState === "success";

  useEffect(() => {
    if (saveState !== "success") return;
    const id = window.setTimeout(() => setSaveState("idle"), SAVED_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [saveState]);

  const set = <K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (saveState === "error") setSaveState("idle");
  };

  const save = async () => {
    setSaveState("loading");
    try {
      await onSave?.(draft);
      setSaved(draft);
      setSaveState("success");
    } catch {
      setSaveState("error");
      if (!reduce && barRef.current) {
        animate(barRef.current, SHAKE, { duration: 0.42, ease: EASE_OUT });
      }
    }
  };

  const reset = () => {
    setDraft(saved);
    setSaveState("idle");
  };

  const fade = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
      };

  let content: ReactNode;
  switch (section) {
    case "profile":
      content = (
        <>
          <SectionHeading title="Profile" description="How you appear to your team." />
          <div className="flex items-center gap-3 py-3">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground text-lg font-semibold text-background"
            >
              {draft.name.trim().slice(0, 1).toUpperCase() || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{draft.name}</p>
              <p className="truncate text-xs text-muted-foreground">@{draft.username}</p>
            </div>
          </div>
          <SettingRow title="Display name" stacked>
            <InlineEdit
              label="Display name"
              value={draft.name}
              maxLength={48}
              validate={(next) => (next.trim() ? null : "Name can't be empty.")}
              onSave={(next) => set("name", next.trim())}
            />
          </SettingRow>
          <SettingRow title="Username" description="Lowercase letters, numbers, underscores." stacked>
            <InlineEdit
              label="Username"
              value={draft.username}
              maxLength={20}
              validate={(next) =>
                USERNAME_PATTERN.test(next) ? null : "Use 3–20 of a–z, 0–9 or _."
              }
              onSave={(next) => set("username", next)}
            />
          </SettingRow>
          <SettingRow title="Email" stacked>
            <InlineEdit
              label="Email"
              value={draft.email}
              validate={(next) =>
                EMAIL_PATTERN.test(next) ? null : "That doesn't look like an email address."
              }
              onSave={(next) => set("email", next.trim())}
            />
          </SettingRow>
          <SettingRow title="Bio" stacked>
            <InlineEdit
              label="Bio"
              multiline
              maxLength={160}
              placeholder="Tell people a little about yourself"
              value={draft.bio}
              onSave={(next) => set("bio", next)}
            />
          </SettingRow>

          <div className="mt-5 rounded-2xl border border-destructive/30 p-4">
            <p className="text-sm font-semibold text-destructive">Danger zone</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-64 text-xs text-muted-foreground">
                Permanently delete your account and everything in it.
              </p>
              <AlertDialog confirmText={saved.username}>
                <AlertDialogTrigger
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Delete account
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes your profile, projects and billing history. It
                      can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogConfirmInput />
                  <AlertDialogFooter>
                    <AlertDialogCancel />
                    <AlertDialogAction onClick={() => void onDeleteAccount?.()}>
                      Delete account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </>
      );
      break;
    case "notifications":
      content = (
        <>
          <SectionHeading
            title="Notifications"
            description="Choose what reaches your inbox."
          />
          <SettingRow title="Mentions" description="When someone @mentions you.">
            <Switch
              ariaLabel="Mentions"
              checked={draft.notifyMentions}
              onCheckedChange={(next) => set("notifyMentions", next)}
            />
          </SettingRow>
          <SettingRow title="Comments" description="Replies on threads you follow.">
            <Switch
              ariaLabel="Comments"
              checked={draft.notifyComments}
              onCheckedChange={(next) => set("notifyComments", next)}
            />
          </SettingRow>
          <SettingRow title="Product updates" description="New features, at most monthly.">
            <Switch
              ariaLabel="Product updates"
              checked={draft.notifyProduct}
              onCheckedChange={(next) => set("notifyProduct", next)}
            />
          </SettingRow>
          <SettingRow title="Email digest" description="A summary of activity you missed.">
            <Select
              value={draft.digest}
              onValueChange={(next) => set("digest", next as SettingsValues["digest"])}
              className="w-32 shrink-0"
            >
              <SelectTrigger>
                <SelectValue placeholder="Digest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </>
      );
      break;
    case "appearance":
      content = (
        <>
          <SectionHeading title="Appearance" description="Make the workspace yours." />
          <SettingRow title="Theme" description="Follow the system or pick one." stacked>
            <ToggleGroup
              type="single"
              required
              variant="outline"
              aria-label="Theme"
              value={draft.theme}
              onValueChange={(next) => set("theme", next as SettingsValues["theme"])}
              className="w-fit"
            >
              <ToggleGroupItem value="system">
                <Monitor aria-hidden />
                System
              </ToggleGroupItem>
              <ToggleGroupItem value="light">
                <Sun aria-hidden />
                Light
              </ToggleGroupItem>
              <ToggleGroupItem value="dark">
                <Moon aria-hidden />
                Dark
              </ToggleGroupItem>
            </ToggleGroup>
          </SettingRow>
          <SettingRow title="Density" description="Row height in lists and tables." stacked>
            <ToggleGroup
              type="single"
              required
              variant="outline"
              aria-label="Density"
              value={draft.density}
              onValueChange={(next) => set("density", next as SettingsValues["density"])}
              className="w-fit"
            >
              <ToggleGroupItem value="comfortable">Comfortable</ToggleGroupItem>
              <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
            </ToggleGroup>
          </SettingRow>
          <SettingRow title="Reduce motion" description="Fade instead of slide.">
            <Switch
              ariaLabel="Reduce motion"
              checked={draft.reduceMotion}
              onCheckedChange={(next) => set("reduceMotion", next)}
            />
          </SettingRow>
        </>
      );
      break;
    case "billing":
      content = (
        <>
          <SectionHeading title="Billing" description="Your plan, usage and payment method." />
          <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{billing.plan} plan</p>
                <Badge variant="success" size="sm" dot>
                  Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {billing.price} · {billing.renewal}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={onManageBilling}>
              Manage
            </Button>
          </div>
          <div className="flex flex-col gap-4 py-4">
            <Progress
              size="sm"
              label="Seats"
              value={billing.seats.used}
              max={billing.seats.total}
              getValueText={() => `${billing.seats.used} of ${billing.seats.total}`}
              trackClassName="bg-foreground/10"
            />
            <Progress
              size="sm"
              label={`Storage · ${billing.storage.used} of ${billing.storage.total} ${billing.storage.unit}`}
              value={billing.storage.used}
              max={billing.storage.total}
              trackClassName="bg-foreground/10"
            />
          </div>
          {billing.paymentMethod ? (
            <SettingRow title="Payment method" description={billing.paymentMethod}>
              <Button size="sm" variant="ghost" onClick={onManageBilling}>
                Update
              </Button>
            </SettingRow>
          ) : null}
        </>
      );
      break;
  }

  return (
    <div className={cn("@container h-[28rem] w-full", className)}>
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card @lg:flex-row">
        <LayoutGroup id={navId}>
          <nav
            aria-label="Settings sections"
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 [scrollbar-width:none] @lg:w-44 @lg:flex-col @lg:border-r @lg:border-b-0 @lg:p-3 [&::-webkit-scrollbar]:hidden"
          >
            {SECTIONS.map((item) => {
              const active = item.id === section;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => selectSection(item.id)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="settings-nav-pill"
                      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                      className="absolute inset-0 rounded-xl bg-muted"
                      aria-hidden
                    />
                  ) : null}
                  <Icon className="relative size-4" aria-hidden />
                  <span className="relative font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </LayoutGroup>

        <div className="relative min-h-0 min-w-0 flex-1">
          <ScrollArea className="h-full" aria-label={`${section} settings`}>
            <div className="px-5 pt-5 pb-24">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={section}
                  {...fade}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                >
                  {content}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>

          <AnimatePresence>
            {showBar ? (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 72 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: 72, transition: { duration: 0.18, ease: EASE_OUT } }
                }
                transition={reduce ? { duration: 0.15 } : SPRING_PANEL}
                className="absolute inset-x-3 bottom-3 z-20"
              >
                <div
                  ref={barRef}
                  role="status"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border-strong bg-card py-2 pr-2 pl-4 shadow-lg"
                >
                  <p className="min-w-0 truncate text-sm text-foreground">
                    {saveState === "success"
                      ? "All changes saved"
                      : saveState === "error"
                        ? "Couldn't save. Try again."
                        : `${changed.length} unsaved ${changed.length === 1 ? "change" : "changes"}`}
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={reset}
                      disabled={!dirty || saveState === "loading"}
                    >
                      Reset
                    </Button>
                    <StatefulButton
                      size="sm"
                      state={saveState}
                      loadingText="Saving"
                      successText="Saved"
                      errorText="Retry"
                      onClick={() => void save()}
                      disabled={!dirty && saveState !== "success"}
                    >
                      Save
                    </StatefulButton>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
