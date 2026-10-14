"use client";

import { PricingTable, type PricingPlan } from "@/components/motion/pricing-table";

const PLANS: PricingPlan[] = [
  {
    id: "hobby",
    name: "Hobby",
    description: "For side projects.",
    price: { monthly: 0, yearly: 0 },
    cta: "Start free",
    features: [
      { label: "3 projects" },
      { label: "Community support" },
      { label: "Custom domains", included: false },
      { label: "Team roles", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams.",
    price: { monthly: 29, yearly: 23 },
    popular: true,
    cta: "Upgrade to Pro",
    features: [
      { label: "Unlimited projects" },
      { label: "Priority support" },
      { label: "Custom domains" },
      { label: "Team roles", included: false },
    ],
  },
  {
    id: "scale",
    name: "Scale",
    description: "For larger orgs.",
    price: { monthly: 99, yearly: 79 },
    cta: "Contact sales",
    features: [
      { label: "Unlimited projects" },
      { label: "Dedicated support" },
      { label: "Custom domains" },
      { label: "SSO and team roles" },
    ],
  },
];

export function PricingTablePreview() {
  return (
    <div className="w-full max-w-[38rem] px-1 pt-1">
      <PricingTable plans={PLANS} compact />
    </div>
  );
}
