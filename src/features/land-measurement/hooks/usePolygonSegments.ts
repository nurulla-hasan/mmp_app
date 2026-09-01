import { useMemo } from 'react';
import { groupPolygonSegments, type PolygonSegmentData } from '@/features/land-measurement/utils/geometry';
import type { Point } from '@/features/land-measurement/types/map';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type SegmentWithLength = PolygonSegmentData & {
  lengthFt: number;
};

export type SegmentGroup = {
  segments: SegmentWithLength[];
  totalDistPx: number;
  totalLengthFt: number;
};

export type PolygonSegmentsResult = {
  /** Segment groups grouped by co-linearity */
  groups: SegmentGroup[];
  /** Whether the polygon is wound clockwise */
  isClockwise: boolean;
};

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

/**
 * Groups polygon segments by co-linearity and computes per-segment
 * real-world lengths.  Memoized so consumers (edge labels, segment
 * rendering) can depend on the result without re-computation.
 *
 * @param points  Polygon vertices in order.
 * @param scale   Pixels-per-foot scale factor.
 *                When `null` or `0`, `lengthFt` will be `0`.
 * @param lengthsFt  Optional pre-computed per-edge lengths (e.g. from
 *                   `plot.results.lengths`).  When provided these are
 *                   used instead of `distPx / scale`.
 */
export const usePolygonSegments = (
  points: Point[],
  scale: number | null,
  lengthsFt?: number[],
): PolygonSegmentsResult => {
  return useMemo(() => {
    const rawGroups = groupPolygonSegments(points);

    const groups: SegmentGroup[] = rawGroups.map((rawGroup) => {
      const segments: SegmentWithLength[] = rawGroup.map((seg) => {
        const lengthFt = lengthsFt?.[seg.i]
          ?? (scale && scale > 0 ? seg.distPx / scale : 0);
        return { ...seg, lengthFt };
      });

      return {
        segments,
        totalDistPx: segments.reduce((sum, s) => sum + s.distPx, 0),
        totalLengthFt: segments.reduce((sum, s) => sum + s.lengthFt, 0),
      };
    });

    // Winding order (signed area via shoelace)
    let signedArea = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      signedArea += (p2.x - p1.x) * (p2.y + p1.y);
    }
    const isClockwise = signedArea < 0;

    return { groups, isClockwise };
  }, [points, scale, lengthsFt]);
};

