"use client";

import {
  CartesianChart,
  type CartesianChartProps,
} from "@/components/motion/chart/cartesian";

export interface AreaChartProps extends CartesianChartProps {
  /** Gradient fades toward the baseline; solid keeps one translucent tone. */
  fill?: "gradient" | "solid";
}

/**
 * Volume over time: filled areas (overlapping or stacked) that rise from the
 * baseline as their lines draw in, on scroll and whenever the range changes,
 * with a snapping cursor and one tooltip for every series.
 */
export function AreaChart(props: AreaChartProps) {
  return <CartesianChart type="area" {...props} />;
}
