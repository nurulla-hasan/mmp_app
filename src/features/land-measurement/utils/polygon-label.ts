import type { Point } from '../types/map';
import { getLogicalCorners, getVisualCenter, isPointInPolygon } from './geometry';
import { getReadableRotation } from './component-helpers';

const EPSILON = 1e-8;
const MIN_AXIS_ANISOTROPY = 0.08;

export type PolygonAreaLabelLayout = {
  center: Point;
  rotation: number;
};

const getAveragePoint = (points: Point[]): Point => {
  if (points.length === 0) return { x: 0, y: 0 };

  const sum = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
};

/** Area-weighted polygon centroid (shoelace formula). */
export const getPolygonAreaCentroid = (points: Point[]): Point => {
  if (points.length < 3) return getAveragePoint(points);

  let twiceArea = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }

  if (Math.abs(twiceArea) <= EPSILON) return getAveragePoint(points);

  return {
    x: centroidX / (3 * twiceArea),
    y: centroidY / (3 * twiceArea),
  };
};

/**
 * Prefer the true area centroid. Concave polygons can place that point outside
 * the visible shape, so only those uncommon cases use the more expensive safe
 * visual-center fallback.
 */
export const getPolygonAreaLabelCenter = (points: Point[]): Point => {
  const centroid = getPolygonAreaCentroid(points);
  if (points.length < 3 || isPointInPolygon(centroid, points)) return centroid;
  return getVisualCenter(points);
};

const getLongestEdgeAngle = (points: Point[]): number => {
  if (points.length < 2) return 0;

  let longestLengthSq = -1;
  let longestAngle = 0;

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq > longestLengthSq) {
      longestLengthSq = lengthSq;
      longestAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    }
  }

  return longestAngle;
};

/**
 * Return a stable, readable rotation for a polygon's area label.
 *
 * The label's x-axis follows the plot's dominant/long direction. PCA over
 * logical corners gives the major axis in O(n) without letting dense tracing
 * points bias the result. Nearly square/ambiguous shapes fall back to the
 * longest logical edge so tiny coordinate noise cannot make the label spin.
 */
export const getPolygonAreaLabelRotation = (points: Point[]): number => {
  if (points.length < 2) return 0;

  const logicalCorners = getLogicalCorners(points);
  const axisPoints = logicalCorners.length >= 2 ? logicalCorners : points;

  const mean = getAveragePoint(axisPoints);

  let covXX = 0;
  let covYY = 0;
  let covXY = 0;

  for (const point of axisPoints) {
    const dx = point.x - mean.x;
    const dy = point.y - mean.y;
    covXX += dx * dx;
    covYY += dy * dy;
    covXY += dx * dy;
  }

  const trace = covXX + covYY;
  if (trace <= EPSILON) return 0;

  const delta = Math.hypot(covXX - covYY, 2 * covXY);
  const anisotropy = delta / trace;

  const rawAngle = anisotropy >= MIN_AXIS_ANISOTROPY
    ? 0.5 * Math.atan2(2 * covXY, covXX - covYY) * (180 / Math.PI)
    : getLongestEdgeAngle(axisPoints);

  return getReadableRotation(rawAngle);
};

/** Shared map/print area-label geometry. */
export const getPolygonAreaLabelLayout = (points: Point[]): PolygonAreaLabelLayout => ({
  center: getPolygonAreaLabelCenter(points),
  rotation: getPolygonAreaLabelRotation(points),
});
