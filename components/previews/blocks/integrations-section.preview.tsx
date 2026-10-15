"use client";

import {
  Bell,
  BookOpen,
  Calendar,
  Cloud,
  CreditCard,
  Database,
  GitBranch,
  Hexagon,
  Mail,
  MessageSquare,
  Phone,
  Table,
  Webhook,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  type Integration,
  IntegrationsSection,
} from "@/components/motion/integrations-section";

// Fictional integrations; icons tinted with theme chart tokens.
function Tinted({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="grid place-items-center" style={{ color: `var(${color})` }}>
      {children}
    </span>
  );
}

const INTEGRATIONS: Integration[] = [
  { id: "chatter", name: "Chatter", category: "Messaging", description: "Post digests and alerts to any channel.", icon: <Tinted color="--chart-1"><MessageSquare aria-hidden /></Tinted> },
  { id: "forkly", name: "Forkly", category: "Developer", description: "Sync branches, reviews and releases.", icon: <Tinted color="--chart-2"><GitBranch aria-hidden /></Tinted>, badge: "New" },
  { id: "ledgerly", name: "Ledgerly", category: "Payments", description: "Track invoices and failed charges.", icon: <Tinted color="--chart-3"><CreditCard aria-hidden /></Tinted> },
  { id: "inkwell", name: "Inkwell", category: "Docs", description: "Turn meeting notes into tasks.", icon: <Tinted color="--chart-4"><BookOpen aria-hidden /></Tinted> },
  { id: "postbird", name: "Postbird", category: "Messaging", description: "Send briefs by email on a schedule.", icon: <Tinted color="--chart-5"><Mail aria-hidden /></Tinted> },
  { id: "tablet", name: "Tablet", category: "Data", description: "Two-way sync with shared spreadsheets.", icon: <Tinted color="--chart-1"><Table aria-hidden /></Tinted> },
  { id: "stratus", name: "Stratus", category: "Data", description: "Stream events from your cloud warehouse.", icon: <Tinted color="--chart-2"><Cloud aria-hidden /></Tinted> },
  { id: "hookline", name: "Hookline", category: "Developer", description: "Fire webhooks on any workflow step.", icon: <Tinted color="--chart-3"><Webhook aria-hidden /></Tinted>, badge: "Beta" },
  { id: "datebook", name: "Datebook", category: "Docs", description: "Attach agendas to calendar events.", icon: <Tinted color="--chart-4"><Calendar aria-hidden /></Tinted> },
  { id: "pingly", name: "Pingly", category: "Messaging", description: "Push alerts to phones and watches.", icon: <Tinted color="--chart-5"><Bell aria-hidden /></Tinted> },
  { id: "vaultdb", name: "VaultDB", category: "Data", description: "Query live tables without exports.", icon: <Tinted color="--chart-1"><Database aria-hidden /></Tinted> },
  { id: "dialtone", name: "Dialtone", category: "Messaging", description: "Log calls and voicemail summaries.", icon: <Tinted color="--chart-2"><Phone aria-hidden /></Tinted> },
];

export function IntegrationsSectionPreview() {
  return (
    <div className="w-full max-w-[40rem] px-1">
      <IntegrationsSection
        heading="Plugs into the tools you already use"
        centerLogo={<Hexagon aria-hidden />}
        centerLabel="Fieldnote"
        integrations={INTEGRATIONS}
        innerCount={4}
        orbitIds={["chatter", "forkly", "ledgerly", "inkwell", "postbird", "tablet", "stratus", "hookline", "pingly", "vaultdb"]}
        listClassName="max-h-[15rem]"
      />
    </div>
  );
}
