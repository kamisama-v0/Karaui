"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/motion/button";
import {
  Skeleton,
  SkeletonSwap,
  SkeletonText,
} from "@/components/motion/skeleton";

const LOAD_MS = 1500;

const PEOPLE = [
  { name: "Mira Okafor", role: "Design lead", initials: "MO", color: "var(--chart-1)" },
  { name: "Jonas Lind", role: "Frontend", initials: "JL", color: "var(--chart-2)" },
  { name: "Ana Ruiz", role: "Research", initials: "AR", color: "var(--chart-4)" },
];

function Avatar({ initials, color, size }: { initials: string; color: string; size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ width: size, height: size, background: color }}
    >
      {initials}
    </span>
  );
}

function PostSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" width={40} />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton shape="text" width="45%" />
          <Skeleton shape="text" width="30%" className="h-3" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <Skeleton height={96} className="rounded-xl" />
    </div>
  );
}

function Post() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar initials="MO" color="var(--chart-1)" size={40} />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium leading-[1.25rem] text-foreground">Mira Okafor</span>
          <span className="text-xs text-muted-foreground">2h · Design lead</span>
        </div>
      </div>
      <p className="text-sm leading-[1.375rem] text-muted-foreground">
        Shipped the new onboarding flow today. Skeletons now mirror the real
        layout, so nothing jumps when the data lands.
      </p>
      <div className="h-24 rounded-xl bg-[linear-gradient(135deg,var(--chart-1),var(--chart-3))] opacity-80" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-4">
      {PEOPLE.map((p) => (
        <li key={p.name} className="flex items-center gap-3">
          <Skeleton shape="circle" width={32} />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton shape="text" width="60%" className="h-3" />
            <Skeleton shape="text" width="35%" className="h-2.5" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function List() {
  return (
    <ul className="flex flex-col gap-4">
      {PEOPLE.map((p) => (
        <li key={p.name} className="flex items-center gap-3">
          <Avatar initials={p.initials} color={p.color} size={32} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm leading-4 text-foreground">{p.name}</span>
            <span className="text-xs leading-4 text-muted-foreground">{p.role}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SkeletonPreview() {
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  const load = () => {
    window.clearTimeout(timer.current);
    setLoading(true);
    timer.current = window.setTimeout(() => setLoading(false), LOAD_MS);
  };

  // First visit plays one load so the cross-fade is visible without a click.
  useEffect(() => {
    timer.current = window.setTimeout(() => setLoading(false), LOAD_MS);
    return () => window.clearTimeout(timer.current);
  }, []);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 p-4">
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <SkeletonSwap loading={loading} skeleton={<PostSkeleton />} loadingLabel="Loading post">
            <Post />
          </SkeletonSwap>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Team
          </p>
          <SkeletonSwap loading={loading} skeleton={<ListSkeleton />} loadingLabel="Loading team">
            <List />
          </SkeletonSwap>
        </div>
      </div>
      <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
        {loading ? "Loading…" : "Reload"}
      </Button>
    </div>
  );
}
