"use client";

import {
  type ComparisonGroup,
  type ComparisonPlan,
  ComparisonTable,
} from "@/components/motion/comparison-table";

const PLANS: ComparisonPlan[] = [
  { id: "free", name: "Free", price: { monthly: 0, yearly: 0 }, cta: "Start" },
  { id: "pro", name: "Pro", price: { monthly: 24, yearly: 19 }, cta: "Upgrade", recommended: true },
  { id: "team", name: "Team", price: { monthly: 59, yearly: 47 }, cta: "Upgrade" },
];

const GROUPS: ComparisonGroup[] = [
  {
    id: "core",
    label: "Core",
    features: [
      { id: "projects", label: "Projects", values: { free: "3", pro: "Unlimited", team: "Unlimited" } },
      { id: "storage", label: "Storage", values: { free: "1 GB", pro: "100 GB", team: "1 TB" } },
      { id: "history", label: "Version history", hint: "Restore any earlier save", values: { free: "partial", pro: true, team: true } },
      { id: "domains", label: "Custom domains", values: { free: false, pro: true, team: true } },
    ],
  },
  {
    id: "collab",
    label: "Collaboration",
    features: [
      { id: "guests", label: "Guest access", values: { free: false, pro: "partial", team: true } },
      { id: "roles", label: "Roles & permissions", values: { free: false, pro: false, team: true } },
      { id: "comments", label: "Comments", values: { free: true, pro: true, team: true } },
    ],
  },
  {
    id: "security",
    label: "Security",
    features: [
      { id: "sso", label: "SAML SSO", values: { free: false, pro: false, team: true } },
      { id: "audit", label: "Audit log", values: { free: false, pro: "30 days", team: "1 year" } },
      { id: "2fa", label: "Enforced 2FA", values: { free: false, pro: true, team: true } },
    ],
  },
];

export function ComparisonTablePreview() {
  return (
    <div className="w-full max-w-[38rem]">
      <ComparisonTable plans={PLANS} groups={GROUPS} bodyClassName="max-h-[21rem]" />
    </div>
  );
}
