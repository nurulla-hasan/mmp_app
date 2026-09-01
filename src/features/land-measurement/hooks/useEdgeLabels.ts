import { useMemo } from 'react';
import { getReadableRotation } from '@/features/land-measurement/utils/component-helpers';
import { formatFeetInches, MIN_EDGE_LABEL_FT } from '@/features/land-measurement/utils/canvas';
import type { Point } from '@/features/land-measurement/types/map';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type EdgeLabelItem = {
  /** Unique identifier (e.g. `${plotId}-${groupIdx}`) */
  id: string;
  /** Midpoint of the representative segment (anchor for connectors) */
  midX: number;
  midY: number;
  /** Final label position (midpoint + outward normal × offset) */
  x: number;
  y: number;
  /** Outward unit normal components */
  perpX: number;
  perpY: number;
  /** Rotation to apply to the label (deg) */
  rotation: number;
  /** Formatted label text */
  labelText: string;
  /** Font size in px (before config is applied if null) */
  fontSize: number;
  // denormalised helpers for rendering
  dx: number;
  dy: number;
  dist: number;
};

export type UseEdgeLabelsConfig = {
  /** Perpendicular offset from segment midpoint (px) */
  labelOffset: number;
  /** Minimum segment length in ft to show a label */
  minLengthFt?: number;
  /** Minimum pixel distance between label origins to treat as duplicate */
  duplicateThresholdPx?: number;
  /** Font size (px) */
  fontSize?: number;
};

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

/**
 * Computes edge-label positions for a single polygon.
 *
 * For each segment group (co-linear merged) whose total real-world length
 * exceeds `minLengthFt`, the hook computes:
 *  - The midpoint of the middle segment
 *  - The outward-facing normal (based on winding order)
 *  - The label position offset along the normal
 *  - A readable rotation for the label text
 *
 * Labels whose origins are closer than `duplicateThresholdPx` are de‑
 * duplicated (only the first encountered is kept).
 *
 * @param points       Polygon vertices in order.
 * @param scale        Pixels-per-foot (or `null`).
 * @param isClockwise  `true` if the polygon winds clockwise.
 * @param groups       Segment groups from `usePolygonSegments`.
 * @param config       Configuration object.
 */
export const useEdgeLabels = (
  points: Point[],
  scale: number | null,
  isClockwise: boolean,
  groups: { segments: { distPx: number; point: Point; nextPoint: Point; dx: number; dy: number; angle: number }[]; totalDistPx: number; totalLengthFt: number }[],
  config: UseEdgeLabelsConfig,
): EdgeLabelItem[] => {
  const {
    labelOffset,
    minLengthFt = MIN_EDGE_LABEL_FT,
    fontSize = 11,
  } = config;

  return useMemo(() => {
    const items: EdgeLabelItem[] = [];
    const drawnOrigins: { x: number; y: number }[] = [];

    for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
      const group = groups[groupIdx];
      if (group.totalLengthFt < minLengthFt) continue;

      const labelText = formatFeetInches(group.totalLengthFt);
      // Use first→last point of the entire group for true angle & normal
      const firstPt = group.segments[0].point;
      const lastPt = group.segments[group.segments.length - 1].nextPoint;
      
      // Find the physical midpoint ALONG the boundary path (not the chord)
      const totalDistPx = group.segments.reduce((s, seg) => s + seg.distPx, 0);
      const halfDist = totalDistPx / 2;
      let walked = 0;
      let midX = firstPt.x;
      let midY = firstPt.y;
      let midDx = lastPt.x - firstPt.x;
      let midDy = lastPt.y - firstPt.y;

      for (const seg of group.segments) {
        const d = seg.distPx || 1e-5; // avoid div by 0
        if (walked + d >= halfDist) {
          const ratio = (halfDist - walked) / d;
          midX = seg.point.x + ratio * seg.dx;
          midY = seg.point.y + ratio * seg.dy;
          midDx = seg.dx;
          midDy = seg.dy;
          break;
        }
        walked += d;
      }

      const dx = midDx;
      const dy = midDy;
      const dist = Math.hypot(dx, dy) > 0.001 ? Math.hypot(dx, dy) : 1;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const rotation = getReadableRotation(angle);

      // Outward normal — always points away from polygon interior
      const perpX = isClockwise ?  dy / dist : -dy / dist;
      const perpY = isClockwise ? -dx / dist :  dx / dist;

      const lx = midX + perpX * labelOffset;
      const ly = midY + perpY * labelOffset;

      // Deduplicate by origin (midpoint)
      const isDuplicate = drawnOrigins.some(
        (c) => Math.hypot(c.x - midX, c.y - midY) < 0.01,
      );
      if (isDuplicate) continue;
      drawnOrigins.push({ x: midX, y: midY });

      items.push({
        id: `${groupIdx}`,
        midX,
        midY,
        x: lx,
        y: ly,
        perpX,
        perpY,
        rotation,
        labelText,
        fontSize,
        dx,
        dy,
        dist,
      });
    }

    return items;
  }, [groups, isClockwise, labelOffset, minLengthFt, fontSize]);
};

