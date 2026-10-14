import type { PortalLayout } from "@/components/motion/popover-position";

export type PlacementSide = "top" | "right" | "bottom" | "left";
export type PlacementAlign = "start" | "center" | "end";

export interface PlacementOptions {
  side: PlacementSide;
  align: PlacementAlign;
  /** Gap between trigger and panel along the side axis, in px. */
  sideOffset?: number;
  /** Shift along the align axis, in px. */
  alignOffset?: number;
  /** Minimum distance kept from the viewport edges, in px. */
  padding?: number;
}

export interface Placement {
  left: number;
  top: number;
  /** The side actually used — differs from the requested one after a flip. */
  side: PlacementSide;
  /** Trigger-facing point of the panel, as a CSS transform-origin (px). */
  origin: string;
}

const OPPOSITE: Record<PlacementSide, PlacementSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Places a portalled panel against its trigger in viewport coordinates
 * (pair with `usePopoverPortalPosition`). Flips to the opposite side when the
 * requested one lacks room and the other has more, then clamps the panel into
 * the viewport on both axes. The returned origin is the trigger's center
 * projected onto the panel's facing edge, so a scale entrance grows out of the
 * trigger even after a flip or a clamp.
 */
export function resolvePlacement(
  layout: PortalLayout,
  {
    side: requested,
    align,
    sideOffset = 6,
    alignOffset = 0,
    padding = 8,
  }: PlacementOptions,
): Placement {
  const { trigger, content } = layout;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const space: Record<PlacementSide, number> = {
    top: trigger.top - sideOffset - padding,
    bottom: vh - (trigger.top + trigger.height) - sideOffset - padding,
    left: trigger.left - sideOffset - padding,
    right: vw - (trigger.left + trigger.width) - sideOffset - padding,
  };
  const vertical = requested === "top" || requested === "bottom";
  const need = vertical ? content.height : content.width;
  const opposite = OPPOSITE[requested];
  const side =
    space[requested] < need && space[opposite] > space[requested]
      ? opposite
      : requested;

  let left: number;
  let top: number;
  if (vertical) {
    top =
      side === "bottom"
        ? trigger.top + trigger.height + sideOffset
        : trigger.top - content.height - sideOffset;
    left =
      align === "start"
        ? trigger.left
        : align === "end"
          ? trigger.left + trigger.width - content.width
          : trigger.left + trigger.width / 2 - content.width / 2;
    left = clamp(left + alignOffset, padding, vw - content.width - padding);
    top = clamp(top, padding, vh - content.height - padding);
  } else {
    left =
      side === "right"
        ? trigger.left + trigger.width + sideOffset
        : trigger.left - content.width - sideOffset;
    top =
      align === "start"
        ? trigger.top
        : align === "end"
          ? trigger.top + trigger.height - content.height
          : trigger.top + trigger.height / 2 - content.height / 2;
    top = clamp(top + alignOffset, padding, vh - content.height - padding);
    left = clamp(left, padding, vw - content.width - padding);
  }

  const cx = clamp(trigger.left + trigger.width / 2 - left, 0, content.width);
  const cy = clamp(trigger.top + trigger.height / 2 - top, 0, content.height);
  const origin =
    side === "bottom"
      ? `${cx}px 0px`
      : side === "top"
        ? `${cx}px ${content.height}px`
        : side === "right"
          ? `0px ${cy}px`
          : `${content.width}px ${cy}px`;

  return { left, top, side, origin };
}
