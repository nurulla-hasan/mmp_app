// ============================================================================
// component-helpers.ts
//
// Shared helpers extracted from map components to eliminate duplication.
// These are rendering-oriented math/transform functions used by Konva/SVG
// components (StagePlots, StageActivePlot, PrintLayout, ScratchPolygons).
//
// New code should import directly from this module.
// ============================================================================

import type { Point } from '../types/map';

/**
 * Normalise an angle (in degrees) to the range (-90, 90] for readable label
 * rotation.  This ensures text is never rendered upside-down.
 */
export const getReadableRotation = (angle: number): number => {
  if (angle > 90) return angle - 180;
  if (angle < -90) return angle + 180;
  return angle;
};

/**
 * Convert a 6-digit hex colour to an rgba string with the given alpha.
 * Falls back to teal (`rgba(15, 118, 110, alpha)`) for invalid input.
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(15, 118, 110, ${alpha})`;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Compute the **unsigned** area of a polygon using the shoelace formula.
 * Returns 0 for degenerate polygons (< 3 points).
 */
export const polygonArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area / 2);
};

/**
 * Compute the **signed** area of a polygon.
 * Negative → clockwise, Positive → counter-clockwise.
 * Uses the `(p2.x - p1.x) * (p2.y + p1.y)` convention (common in StagePlots).
 */
export const signedArea = (points: Point[]): number => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += (p2.x - p1.x) * (p2.y + p1.y);
  }
  return area;
};

/**
 * Minimum distance from `point` to the line segment `start`–`end`.
 */
export const pointToSegmentDistance = (point: Point, start: Point, end: Point): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  const projected = { x: start.x + dx * t, y: start.y + dy * t };
  return Math.hypot(point.x - projected.x, point.y - projected.y);
};
