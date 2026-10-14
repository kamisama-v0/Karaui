"use client";

import { KanbanBoard, type KanbanColumn } from "@/components/motion/kanban-board";

const COLUMNS: KanbanColumn[] = [
  {
    id: "backlog",
    title: "Backlog",
    cards: [
      {
        id: "sso",
        title: "SAML single sign-on for enterprise workspaces",
        tags: ["Auth", "Enterprise"],
        assignee: { name: "Maya Chen" },
        priority: "medium",
      },
      {
        id: "webhooks",
        title: "Retry failed webhooks with exponential backoff",
        tags: ["API"],
        assignee: { name: "Leo Park" },
        priority: "low",
      },
      {
        id: "empty-states",
        title: "Illustrated empty states for projects",
        tags: ["Design"],
        priority: "low",
      },
    ],
  },
  {
    id: "in-progress",
    title: "In progress",
    cards: [
      {
        id: "billing",
        title: "Usage-based billing meter",
        tags: ["Billing", "Backend"],
        assignee: { name: "Ava Rossi" },
        priority: "high",
      },
      {
        id: "invite",
        title: "Bulk invite teammates from CSV",
        tags: ["Growth"],
        assignee: { name: "Sam Okafor" },
        priority: "medium",
      },
    ],
  },
  {
    id: "review",
    title: "Review",
    cards: [
      {
        id: "outage",
        title: "Fix session expiry logging users out early",
        tags: ["Bug", "Auth"],
        assignee: { name: "Leo Park" },
        priority: "urgent",
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    cards: [
      {
        id: "shortcuts",
        title: "Keyboard shortcuts panel",
        tags: ["Frontend"],
        assignee: { name: "Maya Chen" },
        priority: "low",
      },
      {
        id: "audit-log",
        title: "Audit log export to S3",
        tags: ["Security"],
        assignee: { name: "Ava Rossi" },
        priority: "medium",
      },
    ],
  },
];

export function KanbanBoardPreview() {
  return (
    <div className="w-full max-w-5xl">
      <KanbanBoard defaultColumns={COLUMNS} />
    </div>
  );
}
