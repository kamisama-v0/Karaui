"use client";

import { BarChart } from "@/components/motion/chart/bar-chart";

const DATA = [
  { month: "Jan", desktop: 1840, mobile: 1210 },
  { month: "Feb", desktop: 2105, mobile: 1390 },
  { month: "Mar", desktop: 1960, mobile: 1625 },
  { month: "Apr", desktop: 2410, mobile: 1880 },
  { month: "May", desktop: 2290, mobile: 2140 },
  { month: "Jun", desktop: 2675, mobile: 2380 },
];

export function ChartBarPreview() {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-medium text-foreground">Weekly installs</p>
      <p className="mb-4 text-xs text-muted-foreground">January – June 2026</p>
      <BarChart
        title="Weekly installs by platform, January to June 2026"
        data={DATA}
        index="month"
        series={[
          { key: "desktop", label: "Desktop" },
          { key: "mobile", label: "Mobile" },
        ]}
      />
    </div>
  );
}
