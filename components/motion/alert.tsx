"use client";

import {
  CircleCheck,
  Info,
  type LucideIcon,
  OctagonAlert,
  TriangleAlert,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  createContext,
  useContext,
  useState,
} from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "destructive";

// Each tone is mixed toward --foreground: darker in light mode, lighter in
// dark mode, so icon and title tint keep contrast on either background while
// still coming from the theme tokens.
const VARIANT_CLASS: Record<AlertVariant, { root: string; icon: string }> = {
  info: {
    root: "border-[color-mix(in_oklab,var(--chart-1)_30%,transparent)] bg-[color-mix(in_oklab,var(--chart-1)_8%,var(--background))]",
    icon: "text-[color-mix(in_oklab,var(--chart-1)_75%,var(--foreground))]",
  },
  success: {
    root: "border-[color-mix(in_oklab,var(--success)_32%,transparent)] bg-[color-mix(in_oklab,var(--success)_9%,var(--background))]",
    icon: "text-[color-mix(in_oklab,var(--success)_62%,var(--foreground))]",
  },
  warning: {
    root: "border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[color-mix(in_oklab,var(--warning)_10%,var(--background))]",
    icon: "text-[color-mix(in_oklab,var(--warning)_55%,var(--foreground))]",
  },
  destructive: {
    root: "border-[color-mix(in_oklab,var(--destructive)_35%,transparent)] bg-[color-mix(in_oklab,var(--destructive)_8%,var(--background))]",
    icon: "text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]",
  },
};

const VARIANT_ICON: Record<AlertVariant, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  destructive: OctagonAlert,
};

const StackContext = createContext(false);

export interface AlertProps
  extends Omit<ComponentPropsWithoutRef<"div">, "title" | "role"> {
  variant?: AlertVariant;
  title?: ReactNode;
  description?: ReactNode;
  /** Replace the variant icon; `null` hides it. */
  icon?: ReactNode | null;
  /** Buttons rendered under the text (e.g. library `Button size="sm"`). */
  actions?: ReactNode;
  /** Show a dismiss (X) button. */
  dismissible?: boolean;
  dismissLabel?: string;
  /** Controlled visibility. Leave undefined to let the Alert hide itself on dismiss. */
  open?: boolean;
  /** Called when the dismiss button is pressed. */
  onDismiss?: () => void;
}

/**
 * Inline banner for info / success / warning / destructive messages.
 * Info and success announce politely (`role="status"`); warning and
 * destructive interrupt (`role="alert"`). Dismissing fades the banner and
 * collapses its height so content below closes the gap.
 */
export function Alert({
  variant = "info",
  title,
  description,
  icon,
  actions,
  dismissible = false,
  dismissLabel = "Dismiss",
  open: openProp,
  onDismiss,
  className,
  children,
  ...rest
}: AlertProps) {
  const reduce = useReducedMotion() ?? false;
  const inStack = useContext(StackContext);
  const [internalOpen, setInternalOpen] = useState(true);
  const open = openProp ?? internalOpen;
  const Icon = VARIANT_ICON[variant];
  const tone = VARIANT_CLASS[variant];
  const urgent = variant === "warning" || variant === "destructive";

  const dismiss = () => {
    if (openProp === undefined) setInternalOpen(false);
    onDismiss?.();
  };

  // Height is animated on purpose: the collapse is the component's job, so the
  // content below slides up instead of jumping. Under reduced motion the
  // banner only fades, then the height snaps once it is invisible.
  const collapsed = reduce
    ? {
        opacity: 0,
        height: 0,
        transition: { opacity: { duration: 0.15 }, height: { delay: 0.15, duration: 0 } },
      }
    : {
        opacity: 0,
        height: 0,
        transition: {
          opacity: { duration: 0.14, ease: EASE_OUT },
          height: { duration: 0.24, ease: EASE_OUT },
        },
      };

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: 1,
            height: "auto",
            transition: reduce
              ? { opacity: { duration: 0.2 }, height: { duration: 0 } }
              : {
                  height: { duration: 0.26, ease: EASE_OUT },
                  opacity: { duration: 0.22, delay: 0.06, ease: EASE_OUT },
                },
          }}
          exit={collapsed}
          className={cn("overflow-hidden", inStack && "pb-3")}
        >
          <div
            role={urgent ? "alert" : "status"}
            data-variant={variant}
            className={cn(
              "relative flex gap-3 rounded-2xl border p-4 text-sm text-foreground",
              tone.root,
              className,
            )}
            {...rest}
          >
            {icon === null ? null : (
              <span
                aria-hidden="true"
                className={cn("mt-px shrink-0 [&_svg]:size-[18px]", tone.icon)}
              >
                {icon ?? <Icon strokeWidth={2.2} />}
              </span>
            )}
            <div className={cn("flex min-w-0 flex-1 flex-col gap-1", dismissible && "pr-7")}>
              {title ? (
                <p className="font-semibold leading-5 tracking-tight">
                  {title}
                </p>
              ) : null}
              {description ? (
                <div className="leading-relaxed text-foreground/75">{description}</div>
              ) : null}
              {children}
              {actions ? <div className="mt-2 flex flex-wrap gap-2">{actions}</div> : null}
            </div>
            {dismissible ? (
              <button
                type="button"
                aria-label={dismissLabel}
                onClick={dismiss}
                className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/[0.07] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export interface AlertStackProps extends ComponentPropsWithoutRef<"div"> {}

/**
 * Vertical list of Alerts whose spacing collapses together with a dismissed
 * alert (the gap lives inside each alert's collapsing wrapper, not in `gap`).
 */
export function AlertStack({ className, children, ...rest }: AlertStackProps) {
  return (
    <StackContext.Provider value>
      <div className={cn("-mb-3 flex flex-col", className)} {...rest}>
        {children}
      </div>
    </StackContext.Provider>
  );
}
