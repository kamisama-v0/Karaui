"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Alert, AlertStack, type AlertVariant } from "@/components/motion/alert";
import { Button } from "@/components/motion/button";

const ALERTS: {
  id: string;
  variant: AlertVariant;
  title: string;
  description: string;
  action?: string;
}[] = [
  {
    id: "info",
    variant: "info",
    title: "New version available",
    description: "karaUI 2.4 adds dialogs, alerts and a cookie banner.",
    action: "View changelog",
  },
  {
    id: "success",
    variant: "success",
    title: "Deployment complete",
    description: "Production is live on all regions.",
  },
  {
    id: "warning",
    variant: "warning",
    title: "Usage at 85%",
    description: "You're close to this month's build minutes.",
    action: "Upgrade plan",
  },
  {
    id: "destructive",
    variant: "destructive",
    title: "Payment failed",
    description: "We couldn't charge the card ending 4242.",
    action: "Update card",
  },
];

export function AlertPreview() {
  const [dismissed, setDismissed] = useState<string[]>([]);

  return (
    <div className="flex w-full justify-center py-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        <AlertStack>
          {ALERTS.map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.variant}
              title={alert.title}
              description={alert.description}
              dismissible
              open={!dismissed.includes(alert.id)}
              onDismiss={() => setDismissed((prev) => [...prev, alert.id])}
              actions={
                alert.action ? (
                  <Button size="sm" variant="secondary" className="h-7 px-3">
                    {alert.action}
                  </Button>
                ) : undefined
              }
            />
          ))}
        </AlertStack>
        <div className="flex items-center justify-center pt-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={dismissed.length === 0}
            onClick={() => setDismissed([])}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Show again
          </Button>
        </div>
      </div>
    </div>
  );
}
