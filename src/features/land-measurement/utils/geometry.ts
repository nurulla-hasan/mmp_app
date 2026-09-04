import type { Point } from '../types/map';

// ============================================================================
// 1. POINT & POLYGON VALIDATION
// ============================================================================

const MIN_SEGMENT_LENGTH_PX = 1e-6;

/** Check whether a value is a non-null object with finite `x` and `y` coordinates. */
export const isFinitePoint = (point: unknown): point is Point => {
  if (!point || typeof point !== "object") return false;
  const candidate = point as Partial<Point>;
  return Number.isFinite(candidate.x) && Number.isFinite(candidate.y);
};

const areSamePoint = (a: Point, b: Point) => (
  Math.hypot(a.x - b.x, a.y - b.y) <= MIN_SEGMENT_LENGTH_PX
);

/**
 * Remove duplicate adjacent points, non-finite points, and the closing
 * duplicate (first === last) from a polygon vertex array.
 */
export const normalizePolygonPoints = (points: Point[]): Point[] => {
  const normalized: Point[] = [];
  for (const point of points) {
    if (!isFinitePoint(point)) continue;
    const previous = normalized[normalized.length - 1];
    if (!previous || !areSamePoint(previous, point)) {
      normalized.push({ x: point.x, y: point.y });
    }
  }

  if (normalized.length > 1 && areSamePoint(normalized[0], normalized[normalized.length - 1])) {
    normalized.pop();
  }

  return normalized;
};

// ============================================================================
// 2. GENERAL MATH & BOUNDS HELPERS
// ============================================================================

/** Clamp a number between `min` and `max` (inclusive). */
export const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Compute the bounding box of a set of points.
 * Returns `{ minX, minY, width, height }` — guarantees width/height ≥ 1.
 */
export const boundsOfPoints = (points: Point[]) => {
  if (points.length === 0) return { minX: 0, minY: 0, width: 1, height: 1 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    minX,
    minY,
    width: Math.max(1, Math.max(...xs) - minX),
    height: Math.max(1, Math.max(...ys) - minY),
  };
};

// ============================================================================
// 3. EDGE & CORNER DETECTION
// ============================================================================

/** Maximum deflection (degrees) between consecutive edges to consider them co-linear for grouping. */
export const GROUP_ANGLE_THRESHOLD_DEG = 30;

/**
 * Reduce a polygon's edges to logical corner groups by merging co-linear
 * consecutive segments.  Each group contains one or more consecutive edges
 * whose relative angle is ≤ `GROUP_ANGLE_THRESHOLD_DEG`.
 *
 * The first and last groups are also merged if they are co-linear
 * (wrap-around for closed polygons).
 *
 * Returns groups of `{ point, nextPoint, angle }` tuples.
 */
export const getLogicalCornersAndSegments = (points: Point[]) => {
  if (points.length <= 3) {
    return points.map((p, i) => [{ point: p, nextPoint: points[(i + 1) % points.length], angle: 0 }]);
  }

  const segments = points.map((point, i) => {
    const nextPoint = points[(i + 1) % points.length];
    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    return { point, nextPoint, angle };
  });

  const groups: { point: Point, nextPoint: Point, angle: number }[][] = [];
  let currentGroup = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const prevSeg = currentGroup[currentGroup.length - 1];
    let deflection = Math.abs(seg.angle - prevSeg.angle);
    if (deflection > 180) deflection = 360 - deflection;
    if (deflection <= GROUP_ANGLE_THRESHOLD_DEG) {
      currentGroup.push(seg);
    } else {
      groups.push(currentGroup);
      currentGroup = [seg];
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // Wrap around for the first and last group if they are co-linear
  if (groups.length > 1) {
    const firstSeg = groups[0][0];
    const lastSeg = groups[groups.length - 1][groups[groups.length - 1].length - 1];
    let deflection = Math.abs(firstSeg.angle - lastSeg.angle);
    if (deflection > 180) deflection = 360 - deflection;
    if (deflection <= GROUP_ANGLE_THRESHOLD_DEG) {
      groups[0].unshift(...groups[groups.length - 1]);
      groups.pop();
    }
  }

  return groups;
};

/**
 * Convenience wrapper around `getLogicalCornersAndSegments` that returns
 * only the first point of each logical corner group.
 */
export const getLogicalCorners = (points: Point[]): Point[] => {
  const groups = getLogicalCornersAndSegments(points);
  return groups.map(g => g[0].point);
};

// ============================================================================
// 3b. SEGMENT GROUPING (shared by map components)
// ============================================================================

/**
 * Pixel-level segment data for one edge of a polygon.
 * Consumers add domain-specific data (e.g. length in feet) after grouping.
 */
export type PolygonSegmentData = {
  i: number;
  point: Point;
  nextPoint: Point;
  dx: number;
  dy: number;
  distPx: number;
  angle: number;
};

/**
 * Build segment data for a polygon and group co-linear edges together.
 *
 * Returns groups of consecutive edges whose angle deflection is within
 * `GROUP_ANGLE_THRESHOLD_DEG`. The first and last groups are merged if
 * they are co-linear (wrap-around for closed polygons).
 *
 * This is the shared core of the grouping logic that was duplicated in
 * StagePlots, PrintLayout and ScratchPolygons.
 */
export const groupPolygonSegments = (points: Point[]): PolygonSegmentData[][] => {
  if (points.length === 0) return [];

  // Build segments with pixel-level data
  const segments: PolygonSegmentData[] = points.map((point, i) => {
    const nextPoint = points[(i + 1) % points.length];
    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;
    return {
      i,
      point,
      nextPoint,
      dx,
      dy,
      distPx: Math.hypot(dx, dy),
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
    };
  });

  // Group co-linear segments
  const groups: PolygonSegmentData[][] = [];
  let currentGroup = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const prevSeg = currentGroup[currentGroup.length - 1];
    let deflection = Math.abs(seg.angle - prevSeg.angle);
    if (deflection > 180) deflection = 360 - deflection;
    if (deflection <= GROUP_ANGLE_THRESHOLD_DEG) {
      currentGroup.push(seg);
    } else {
      groups.push(currentGroup);
      currentGroup = [seg];
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // Merge first/last group if co-linear (wrap-around)
  if (groups.length > 1) {
    const firstSeg = groups[0][0];
    const lastSeg = groups[groups.length - 1][groups[groups.length - 1].length - 1];
    let deflection = Math.abs(firstSeg.angle - lastSeg.angle);
    if (deflection > 180) deflection = 360 - deflection;
    if (deflection <= GROUP_ANGLE_THRESHOLD_DEG) {
      groups[0].unshift(...groups[groups.length - 1]);
      groups.pop();
    }
  }

  return groups;
};

// ============================================================================
// 4. POINT-IN-POLYGON
// ============================================================================

/**
 * Ray-casting algorithm to check if a point is inside a polygon,
 * including edge detection.
 */
export const isPointInPolygon = (point: Point, polygon: Point[]) => {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const p1 = polygon[i];
    const p2 = polygon[j];

    // Check if point is on the segment
    const closest = getClosestPointOnSegment(point, p1, p2);
    if (Math.hypot(closest.x - point.x, closest.y - point.y) < 1e-3) {
      return true;
    }

    const xi = p1.x, yi = p1.y;
    const xj = p2.x, yj = p2.y;

    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
};

// ============================================================================
// 5. LINE INTERSECTION & CLIPPING
// ============================================================================

/**
 * Return the intersection point of two line segments `(p1→p2)` and `(p3→p4)`,
 * or `null` if they are parallel or do not intersect.
 */
export const getLineIntersection = (
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
  epsilon = 1e-6,
): Point | null => {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-12) return null; // Parallel

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;

  if (t >= -epsilon && t <= 1 + epsilon && u >= -epsilon && u <= 1 + epsilon) {
    const clampedT = Math.max(0, Math.min(1, t));
    return {
      x: p1.x + clampedT * (p2.x - p1.x),
      y: p1.y + clampedT * (p2.y - p1.y),
    };
  }
  return null;
};

/**
 * Clip the endpoint of a line to the boundary of a polygon.
 * If the point immediately exits the polygon, returns `start`.
 * Otherwise returns the first polygon edge intersection closest to `start`.
 */
export const clipLineToPolygon = (start: Point, end: Point, polygon: Point[]): Point => {
  if (start.x === end.x && start.y === end.y) return start;

  // Check if the line goes outwards immediately
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.hypot(dx, dy);
  const eps = 1e-2;
  if (dist > eps) {
    const testPt = {
      x: start.x + (dx / dist) * eps,
      y: start.y + (dy / dist) * eps
    };
    if (!isPointInPolygon(testPt, polygon)) {
      return start; // It goes outwards immediately, clip to start
    }
  }

  let closestPoint = end;
  let minDistance = dist;

  for (let i = 0; i < polygon.length; i++) {
    const p3 = polygon[i];
    const p4 = polygon[(i + 1) % polygon.length];

    const intersection = getLineIntersection(start, end, p3, p4);
    if (intersection) {
      const dist = Math.hypot(intersection.x - start.x, intersection.y - start.y);
      if (dist > 1e-3 && dist < minDistance) {
        minDistance = dist;
        closestPoint = intersection;
      }
    }
  }
  return closestPoint;
};

// ============================================================================
// 6. CLOSEST POINT ON SEGMENT / POLYLINE
// ============================================================================

/**
 * Return the closest point on segment `(p1→p2)` to point `p`.
 * Clamps to the segment endpoints — does not extend beyond the line.
 */
export const getClosestPointOnSegment = (p: Point, p1: Point, p2: Point): Point => {
  const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
  if (l2 === 0) return p1;

  let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y)
  };
};

/**
 * Snap a point to the nearest vertex or edge of any polygon in the set.
 * Only snaps if the distance is within `thresholdPx`.  Returns the
 * original point unchanged if nothing is close enough.
 */
export const getSnappedPoint = (pt: Point, polygons: Point[][], thresholdPx: number): Point => {
  let minDistance = thresholdPx;
  let snapped = pt;

  for (const poly of polygons) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];

      const closest = getClosestPointOnSegment(pt, p1, p2);
      const dist = Math.hypot(closest.x - pt.x, closest.y - pt.y);
      if (dist < minDistance) {
        minDistance = dist;
        snapped = closest;
      }
    }
  }
  return snapped;
};

// ============================================================================
// 7. VISUAL CENTER (Pole of Inaccessibility)
// ============================================================================

/**
 * Approximate visual centre (pole of inaccessibility) of a polygon.
 * Uses a grid-based sampling approach to find the point inside the
 * polygon that is farthest from all edges.
 *
 * Falls back to `points[0]` for degenerate polygons (< 3 points).
 */
export const getVisualCenter = (points: Point[]): Point => {
  if (points.length < 3) return points[0] || { x: 0, y: 0 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  if (width === 0 || height === 0) return points[0];

  // Use a 20x20 grid to find the deepest point inside the polygon
  const steps = 20;
  const stepX = width / steps;
  const stepY = height / steps;

  let bestPoint = { x: minX + width / 2, y: minY + height / 2 };
  let maxDist = -1;

  for (let x = minX; x <= maxX; x += stepX) {
    for (let y = minY; y <= maxY; y += stepY) {
      const pt = { x, y };
      if (!isPointInPolygon(pt, points)) continue;

      let minDistToEdge = Infinity;
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const closest = getClosestPointOnSegment(pt, p1, p2);
        const dist = Math.hypot(closest.x - pt.x, closest.y - pt.y);
        if (dist < minDistToEdge) minDistToEdge = dist;
      }

      if (minDistToEdge > maxDist) {
        maxDist = minDistToEdge;
        bestPoint = pt;
      }
    }
  }

  return bestPoint;
};
