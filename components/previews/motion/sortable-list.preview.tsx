"use client";

import { useState } from "react";
import { SortableList } from "@/components/motion/sortable-list";

type Task = {
  id: string;
  title: string;
  detail: string;
  estimate: string;
};

const INITIAL_TASKS: Task[] = [
  {
    id: "checkout",
    title: "Fix checkout tax rounding",
    detail: "Totals drift by a cent on EU orders",
    estimate: "2h",
  },
  {
    id: "onboarding",
    title: "Ship onboarding checklist",
    detail: "Three steps, dismissible after setup",
    estimate: "1d",
  },
  {
    id: "search",
    title: "Debounce workspace search",
    detail: "Cut requests on every keystroke",
    estimate: "3h",
  },
  {
    id: "export",
    title: "CSV export for invoices",
    detail: "Requested by 14 accounts this month",
    estimate: "1d",
  },
  {
    id: "darkmode",
    title: "Audit dark mode contrast",
    detail: "Charts and badges on muted surfaces",
    estimate: "4h",
  },
];

export function SortableListPreview() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-sm font-medium text-foreground">Sprint priorities</p>
        <p className="text-xs text-muted-foreground">Drag the grip to reorder</p>
      </div>
      <SortableList
        items={tasks}
        onChange={setTasks}
        getLabel={(task) => task.title}
        renderItem={(task, { index }) => (
          <div className="flex items-center gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {task.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {task.detail}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {task.estimate}
            </span>
          </div>
        )}
      />
    </div>
  );
}
