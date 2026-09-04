import type { PlotRecord, Point } from '../../types/map';
import { formatFeetInches, UI_CONFIG } from '../../utils/canvas';
import { getReadableRotation } from '../../utils/component-helpers';
import { GROUP_ANGLE_THRESHOLD_DEG, getVisualCenter, groupPolygonSegments, isPointInPolygon } from '../../utils/geometry';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function getPathMidpoint(segments: ReturnType<typeof groupPolygonSegments>[number]) {
  const totalDistPx = segments.reduce((sum, segment) => sum + segment.distPx, 0);
  const halfDist = totalDistPx / 2;
  let walked = 0;
  let midX = segments[0]?.point.x ?? 0;
  let midY = segments[0]?.point.y ?? 0;
  let midDx = segments[0]?.dx ?? 1;
  let midDy = segments[0]?.dy ?? 0;

  for (const segment of segments) {
    const segmentDistance = segment.distPx || 1e-5;
    if (walked + segmentDistance >= halfDist) {
      const ratio = (halfDist - walked) / segmentDistance;
      midX = segment.point.x + ratio * segment.dx;
      midY = segment.point.y + ratio * segment.dy;
      midDx = segment.dx;
      midDy = segment.dy;
      break;
    }
    walked += segmentDistance;
  }
  return { midX, midY, midDx, midDy, totalDistPx };
}

function getInwardNormal(midpoint: Point, dx: number, dy: number, points: Point[], testDistance: number) {
  const segmentDistance = Math.hypot(dx, dy) || 1;
  const normalA = { x: -dy / segmentDistance, y: dx / segmentDistance };
  const normalB = { x: dy / segmentDistance, y: -dx / segmentDistance };
  if (isPointInPolygon({ x: midpoint.x + normalA.x * testDistance, y: midpoint.y + normalA.y * testDistance }, points)) return normalA;
  if (isPointInPolygon({ x: midpoint.x + normalB.x * testDistance, y: midpoint.y + normalB.y * testDistance }, points)) return normalB;
  const center = getVisualCenter(points);
  const centerDistance = Math.hypot(center.x - midpoint.x, center.y - midpoint.y) || 1;
  return { x: (center.x - midpoint.x) / centerDistance, y: (center.y - midpoint.y) / centerDistance };
}

export type NativeEdgeLabel = {
  id: string;
  x: number;
  y: number;
  text: string;
  rotation: number;
  fontPx: number;
  layoutScale: number;
  color: string;
};

export type NativeActiveDot = { point: Point; index: number; isCorner: boolean };

/** Exact native equivalent of web StageActivePlot/PlotDots corner filtering. */
export function getActivePlotDots(points: Point[], isPlotFinished = false): NativeActiveDot[] {
  const getAngle = (from: Point, to: Point) => Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
  const isCornerAt = (previous: Point, current: Point, next: Point) => {
    let deflection = Math.abs(getAngle(previous, current) - getAngle(current, next));
    if (deflection > 180) deflection = 360 - deflection;
    return deflection > GROUP_ANGLE_THRESHOLD_DEG;
  };

  return points.map((point, index) => {
    let isCorner = true;
    if (index > 0 && index < points.length - 1) {
      isCorner = isCornerAt(points[index - 1], point, points[index + 1]);
    }
    if (isPlotFinished && points.length > 3) {
      if (index === 0) isCorner = isCornerAt(points[points.length - 1], point, points[1]);
      if (index === points.length - 1) isCorner = isCornerAt(points[index - 1], point, points[0]);
    }
    return { point, index, isCorner };
  });
}

/** Exact native equivalent of web PlotEdgeLabels geometry and visibility rules. */
export function getPlotEdgeLabels(plot: PlotRecord, scale: number | null, stageScale: number): NativeEdgeLabel[] {
  if (!scale) return [];
  const layoutScale = Math.exp(Math.round(Math.log(Math.max(stageScale, 0.01)) * 32) / 32);
  const labels: NativeEdgeLabel[] = [];

  groupPolygonSegments(plot.points).forEach((segments, groupIndex) => {
    if (!segments.length) return;
    const { midX, midY, midDx, midDy, totalDistPx } = getPathMidpoint(segments);
    const edgeScreenPx = totalDistPx * layoutScale;
    if (totalDistPx <= 0 || edgeScreenPx < 34) return;
    const totalLengthFt = segments.reduce(
      (sum, segment) => sum + (plot.results.lengths[segment.i] ?? segment.distPx / scale),
      0,
    );
    const text = formatFeetInches(totalLengthFt);
    let fontPx = clamp(edgeScreenPx * 0.13, 7.5, UI_CONFIG.fontSize.small);
    let widthPx = text.length * fontPx * 0.58;
    const maxWidthPx = edgeScreenPx * 0.74;
    if (widthPx > maxWidthPx) fontPx = Math.max(6.75, fontPx * (maxWidthPx / widthPx));

    // Test far enough inside the polygon to avoid a boundary/rounding hit on
    // shallow or traced edges. This makes the chosen normal deterministic.
    const normalTestDistance = Math.max(
      2 / layoutScale,
      Math.min(totalDistPx * 0.08, 12 / layoutScale),
    );
    const inward = getInwardNormal(
      { x: midX, y: midY },
      midDx,
      midDy,
      plot.points,
      normalTestDistance,
    );

    // Keep the glyph + white outline visibly clear of the polygon edge. The
    // old 7px minimum could put the text itself directly on the stroke.
    const inset = Math.max(11, fontPx * 1.35 + 1.5) / layoutScale;
    labels.push({
      id: `${plot.id}-${groupIndex}`,
      x: midX + inward.x * inset,
      y: midY + inward.y * inset,
      text,
      rotation: getReadableRotation(Math.atan2(midDy, midDx) * 180 / Math.PI),
      fontPx,
      layoutScale,
      color: plot.color || '#0F766E',
    });
  });
  return labels;
}

/** Exact native equivalent of web ActivePlotSegments. */
export function getActiveSegmentLabels(points: Point[], scale: number | null, stageScale: number): NativeEdgeLabel[] {
  if (points.length < 2) return [];
  const segments = points.slice(0, -1).map((point, index) => {
    const nextPoint = points[index + 1];
    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;
    return { i: index, point, nextPoint, dx, dy, distPx: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) * 180 / Math.PI };
  });
  const groups: typeof segments[] = [];
  let current: typeof segments = [];
  segments.forEach((segment) => {
    const previous = current[current.length - 1];
    let deflection = previous ? Math.abs(segment.angle - previous.angle) : 0;
    if (deflection > 180) deflection = 360 - deflection;
    if (!previous || deflection <= GROUP_ANGLE_THRESHOLD_DEG) current.push(segment);
    else { groups.push(current); current = [segment]; }
  });
  if (current.length) groups.push(current);
  const center = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  center.x /= points.length;
  center.y /= points.length;

  return groups.flatMap((segments, groupIndex) => {
    const { midX, midY, midDx, midDy, totalDistPx } = getPathMidpoint(segments);
    const edgeScreenPx = totalDistPx * stageScale;
    if (edgeScreenPx < 34) return [];
    const totalLengthFt = segments.reduce((sum, segment) => sum + (scale ? segment.distPx / scale : 0), 0);
    const text = formatFeetInches(totalLengthFt);
    let fontPx = clamp(edgeScreenPx * 0.13, 7.5, UI_CONFIG.fontSize.small);
    let widthPx = text.length * fontPx * 0.58;
    const maxWidthPx = edgeScreenPx * 0.74;
    if (widthPx > maxWidthPx) fontPx = Math.max(6.75, fontPx * (maxWidthPx / widthPx));
    const segmentDistance = Math.hypot(midDx, midDy) || 1;
    const normalA = { x: -midDy / segmentDistance, y: midDx / segmentDistance };
    const towardCenter = { x: center.x - midX, y: center.y - midY };
    const facesCenter = normalA.x * towardCenter.x + normalA.y * towardCenter.y >= 0;
    const inward = facesCenter ? normalA : { x: -normalA.x, y: -normalA.y };
    const inset = Math.max(11, fontPx * 1.35 + 1.5) / stageScale;
    return [{
      id: `active-${groupIndex}`,
      x: midX + inward.x * inset,
      y: midY + inward.y * inset,
      text,
      rotation: getReadableRotation(Math.atan2(midDy, midDx) * 180 / Math.PI),
      fontPx,
      layoutScale: stageScale,
      color: UI_CONFIG.colors.drawPrimary,
    }];
  });
}
