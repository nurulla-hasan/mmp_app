import { useMemo } from 'react';
import { getSnappedPoint } from '@/features/land-measurement/utils/geometry';
import type { Point } from '@/features/land-measurement/types/map';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type SnapResult = {
  /** The (possibly snapped) point in stage coordinates */
  snappedPoint: Point;
  /** Whether the point was snapped to an edge / vertex */
  isEdgeSnapped: boolean;
};

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

/**
 * Snaps a raw crosshair point to the nearest polygon vertex or edge
 * within a threshold.
 *
 * @param rawPoint     The unsnapped point (stage coordinates).
 * @param polygons     Array of polygon vertex arrays to snap against.
 * @param stageScale   Current zoom scale (snap threshold = 10 / stageScale).
 */
export const useGeometrySnap = (
  rawPoint: Point,
  polygons: Point[][],
  stageScale: number,
): SnapResult => {
  const rx = rawPoint.x;
  const ry = rawPoint.y;
  return useMemo(() => {
    const snapThreshold = 10 / stageScale;
    const point: Point = { x: rx, y: ry };
    const snapped = getSnappedPoint(point, polygons, snapThreshold);
    return {
      snappedPoint: snapped,
      isEdgeSnapped: snapped.x !== rx || snapped.y !== ry,
    };
  }, [rx, ry, polygons, stageScale]);
};

