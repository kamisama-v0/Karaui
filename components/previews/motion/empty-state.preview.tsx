"use client";

import { useState } from "react";
import { Button } from "@/components/motion/button";
import {
  EmptyState,
  EmptyStateIllustration,
} from "@/components/motion/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";

type View = "projects" | "search";

export function EmptyStatePreview() {
  const [view, setView] = useState<View>("projects");

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 p-4">
      <Tabs
        value={view}
        onValueChange={(v) => setView(v as View)}
        variant="segment"
      >
        <TabsList>
          <TabsTrigger value="projects" className="px-3 text-xs">
            No projects
          </TabsTrigger>
          <TabsTrigger value="search" className="px-3 text-xs">
            No results
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Keyed so each switch replays the entrance stagger. */}
      {view === "projects" ? (
        <EmptyState
          key="projects"
          bordered
          className="bg-card"
          title="No projects yet"
          description="Projects keep your files, tasks and teammates in one place. Create your first one to get started."
          action={<Button size="sm">Create project</Button>}
          secondaryAction={
            <Button size="sm" variant="ghost">
              Import
            </Button>
          }
        />
      ) : (
        <EmptyState
          key="search"
          bordered
          className="bg-card"
          icon={<EmptyStateIllustration variant="search" />}
          title="No results for “quarterly”"
          description="Try a different keyword, or clear the filters to see everything in this workspace."
          action={
            <Button size="sm" variant="secondary">
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
}
