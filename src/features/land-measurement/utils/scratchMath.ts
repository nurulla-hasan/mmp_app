import type { Point, SavedPlotRecord } from '../types/map';
import {
  boundsOfPoints,
  clampNumber,
  getClosestPointOnSegment,
  isPointInPolygon,
} from './geometry';
import { getReadableRotation } from './component-helpers';
import type { LabelBox, PlacedScratchLabel, PlotSheetLayout } from '../types/scratch';

/** A4 page width in SVG units (px @ 96 DPI). */
export const PAGE_WIDTH = 794;
/** A4 page height in SVG units (px @ 96 DPI). */
export const PAGE_HEIGHT = 1123;
/** Margin from page edges for scratch print layout. */
export const MARGIN = 64;
/** Default width of a scratch label box. */
export const LABEL_WIDTH = 92;
/** Default height of a scratch label box. */
export const LABEL_HEIGHT = 20;
/** Gap between labels / elements in scratch layout. */
export const LABEL_GAP = 8;
/** Distance threshold for snap-to-point in scratch (page coords). */
export const SNAP_DISTANCE = 5;
/** Screen-space distance threshold for snap indicator rendering. */
export const SNAP_SCREEN_DISTANCE = 14;
/** Y-offset from top margin for the writing area start. */
export const WRITING_AREA_HEIGHT = MARGIN / 2;

/**
 * Divide the printable A4 area into slots for each plot.
 *
 * - 1 plot → full writing area
 * - 2 plots → stacked vertically
 * - 3+ plots → 2-column grid
 */
export const createPlotSlots = (count: number): LabelBox[] => {
  const top = WRITING_AREA_HEIGHT;
  const bottom = PAGE_HEIGHT - MARGIN / 2;
  const availableWidth = PAGE_WIDTH - MARGIN;
  const availableHeight = bottom - top;
  const gap = 28;

  if (count <= 1) {
    return [{ x: MARGIN / 2, y: top, width: availableWidth, height: availableHeight }];
  }

  if (count === 2) {
    const height = (availableHeight - gap) / 2;
    return [
      { x: MARGIN / 2, y: top, width: availableWidth, height },
      { x: MARGIN / 2, y: top + height + gap, width: availableWidth, height },
    ];
  }

  const columns = 2;
  const rows = Math.ceil(count / columns);
  const cellWidth = (availableWidth - gap) / columns;
  const cellHeight = (availableHeight - gap * (rows - 1)) / rows;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: MARGIN / 2 + column * (cellWidth + gap),
      y: top + row * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    };
  });
};

/**
 * Compute scale and offset for each plot to fit into its slot on the
 * scratch print page. Plots are scaled uniformly and centred within the slot.
 */
export const createPlotLayouts = (plots: SavedPlotRecord[]): PlotSheetLayout[] => {
  const slots = createPlotSlots(plots.length);
  return plots.map((plot, index) => {
    const bounds = boundsOfPoints(plot.points);
    const slot = slots[index];
    const padding = plots.length === 1 ? 34 : 28;
    const scale = Math.min(
      (slot.width - padding * 2) / bounds.width,
      (slot.height - padding * 2) / bounds.height,
    );
    const drawnWidth = bounds.width * scale;
    const drawnHeight = bounds.height * scale;
    return {
      plot,
      bounds,
      scale,
      offsetX: slot.x + (slot.width - drawnWidth) / 2,
      offsetY: slot.y + (slot.height - drawnHeight) / 2,
      slot,
    };
  });
};

/** Backward-compatible scratch wrapper around the shared polygon test. */
export const pointInPolygon = (point: Point, polygon: Point[]) =>
  isPointInPolygon(point, polygon);

/**
 * Backward-compatible scratch wrapper around the shared closest-point helper.
 * Scratch callers also need the computed distance, so this adapter adds it.
 */
export const closestPointOnSegment = (point: Point, start: Point, end: Point) => {
  const projected = getClosestPointOnSegment(point, start, end);
  return {
    point: projected,
    distance: Math.hypot(point.x - projected.x, point.y - projected.y),
  };
};

/** Return the closest point on an open or closed polyline. */
export const closestPointOnPolyline = (point: Point, polyline: Point[], closed = false) => {
  let closest = { point, distance: Number.POSITIVE_INFINITY };
  const segmentCount = closed ? polyline.length : polyline.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const start = polyline[index];
    const end = polyline[(index + 1) % polyline.length];
    const candidate = closestPointOnSegment(point, start, end);
    if (candidate.distance < closest.distance) closest = candidate;
  }
  return closest;
};

/** Check whether two label boxes overlap (accounting for `LABEL_GAP`). */
export const overlaps = (a: LabelBox, b: LabelBox) => (
  a.x < b.x + b.width + LABEL_GAP
  && a.x + a.width + LABEL_GAP > b.x
  && a.y < b.y + b.height + LABEL_GAP
  && a.y + a.height + LABEL_GAP > b.y
);

/**
 * Place a label near a segment midpoint, avoiding overlaps with already
 * used boxes. Tries multiple anchor positions on both sides of the segment
 * and falls back to the first candidate if nothing fits.
 */
export const placeScratchLabel = (start: Point, end: Point, text: string, usedBoxes: LabelBox[], index = 0): PlacedScratchLabel => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  const tangent = { x: dx / length, y: dy / length };
  const side = index % 2 === 0 ? 1 : -1;
  const readableAngle = getReadableRotation(Math.atan2(dy, dx) * 180 / Math.PI);
  const anchorPositions = index % 2 === 0
    ? [0.32, 0.68, 0.22, 0.78, 0.5]
    : [0.68, 0.32, 0.78, 0.22, 0.5];
  const normalOffsets = [16 * side, -16 * side, 30 * side, -30 * side, 46 * side, -46 * side];
  const tangentOffsets = [0, 36, -36, 72, -72];

  for (const position of anchorPositions) {
    const anchor = { x: start.x + dx * position, y: start.y + dy * position };
    for (const normalOffset of normalOffsets) {
      for (const tangentOffset of tangentOffsets) {
        const x = clampNumber(
          anchor.x + normal.x * normalOffset + tangent.x * tangentOffset - LABEL_WIDTH / 2,
          MARGIN / 2,
          PAGE_WIDTH - LABEL_WIDTH - MARGIN / 2,
        );
        const y = clampNumber(
          anchor.y + normal.y * normalOffset + tangent.y * tangentOffset - LABEL_HEIGHT / 2,
          166,
          PAGE_HEIGHT - LABEL_HEIGHT - MARGIN / 2,
        );
        const box = { x, y, width: LABEL_WIDTH, height: LABEL_HEIGHT };
        if (!usedBoxes.some((used) => overlaps(box, used))) {
          usedBoxes.push(box);
          return { box, anchor, angle: readableAngle, text };
        }
      }
    }
  }

  const fallback = {
    x: clampNumber(MARGIN / 2, MARGIN / 2, PAGE_WIDTH - LABEL_WIDTH - MARGIN / 2),
    y: clampNumber(PAGE_HEIGHT - MARGIN - LABEL_HEIGHT - usedBoxes.length * (LABEL_HEIGHT + LABEL_GAP), 166, PAGE_HEIGHT - LABEL_HEIGHT - MARGIN / 2),
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT,
  };
  usedBoxes.push(fallback);
  return { box: fallback, anchor: { x: start.x + dx / 2, y: start.y + dy / 2 }, angle: readableAngle, text };
};
