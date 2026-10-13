"use client";

import {
  CartesianChart,
  type CartesianChartProps,
} from "@/components/motion/chart/cartesian";

export type LineChartProps = CartesianChartProps;

/**
 * Trend over time: 2px lines (smooth, straight or stepped) revealed left to
 * right when scrolled into view, a cursor that snaps to the nearest point and
 * one tooltip listing every series. Arrow keys step through points.
 */
export function LineChart(props: LineChartProps) {
  return <CartesianChart type="line" {...props} />;
}
