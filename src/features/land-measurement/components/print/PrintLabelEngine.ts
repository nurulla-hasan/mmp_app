import {
  getVisualCenter,
  groupPolygonSegments,
  isPointInPolygon,
} from '../../utils/geometry';
import { getReadableRotation } from '../../utils/component-helpers';
import { formatFeetInches } from '../../utils/canvas';
import {
  getPolygonAreaLabelLayout,
  type PolygonAreaLabelLayout,
} from '../../utils/polygon-label';
import type { Point, PlotRecord } from '../../types/map';

export interface LabelDatum {
  plotId: string;
  i: number;
  lx: number;
  ly: number;
  rotation: number;
  labelText: string;
  width: number;
  height: number;
  fontSize: number;
}

export interface PlotPolygonInfo {
  id: string;
  pointsStr: string;
  plot: PlotRecord;
  area: number;
  areaLabelLayout: PolygonAreaLabelLayout;
}

export interface PrintLabelConfig {
  baseScale: number;
  fontSize: number;
  labelPad: number;
  labelOffset: number;
}

const getPathMidpoint = (segments: ReturnType<typeof groupPolygonSegments>[number]) => {
  const totalDistPx = segments.reduce((sum, segment) => sum + segment.distPx, 0);
  const halfDist = totalDistPx / 2;
  let walked = 0;
  let midX = segments[0]?.point.x ?? 0;
  let midY = segments[0]?.point.y ?? 0;
  let midDx = segments[0]?.dx ?? 1;
  let midDy = segments[0]?.dy ?? 0;

  for (const segment of segments) {
    const distance = segment.distPx || 1e-5;
    if (walked + distance >= halfDist) {
      const ratio = (halfDist - walked) / distance;
      midX = segment.point.x + ratio * segment.dx;
      midY = segment.point.y + ratio * segment.dy;
      midDx = segment.dx;
      midDy = segment.dy;
      break;
    }
    walked += distance;
  }

  return { midX, midY, midDx, midDy, totalDistPx };
};

const getInwardNormal = (
  midpoint: Point,
  dx: number,
  dy: number,
  plotPoints: Point[],
  testDistance: number,
) => {
  const distance = Math.hypot(dx, dy) || 1;
  const normalA = { x: -dy / distance, y: dx / distance };
  const normalB = { x: dy / distance, y: -dx / distance };

  const testA = {
    x: midpoint.x + normalA.x * testDistance,
    y: midpoint.y + normalA.y * testDistance,
  };
  if (isPointInPolygon(testA, plotPoints)) return normalA;

  const testB = {
    x: midpoint.x + normalB.x * testDistance,
    y: midpoint.y + normalB.y * testDistance,
  };
  if (isPointInPolygon(testB, plotPoints)) return normalB;

  const center = getVisualCenter(plotPoints);
  const centerDx = center.x - midpoint.x;
  const centerDy = center.y - midpoint.y;
  const centerDistance = Math.hypot(centerDx, centerDy) || 1;
  return { x: centerDx / centerDistance, y: centerDy / centerDistance };
};

const labelFitsInside = (
  center: Point,
  rotation: number,
  width: number,
  height: number,
  plotPoints: Point[],
) => {
  const radians = rotation * (Math.PI / 180);
  const along = { x: Math.cos(radians), y: Math.sin(radians) };
  const across = { x: -Math.sin(radians), y: Math.cos(radians) };
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const corners = [
    { x: center.x + along.x * halfWidth + across.x * halfHeight, y: center.y + along.y * halfWidth + across.y * halfHeight },
    { x: center.x + along.x * halfWidth - across.x * halfHeight, y: center.y + along.y * halfWidth - across.y * halfHeight },
    { x: center.x - along.x * halfWidth + across.x * halfHeight, y: center.y - along.y * halfWidth + across.y * halfHeight },
    { x: center.x - along.x * halfWidth - across.x * halfHeight, y: center.y - along.y * halfWidth - across.y * halfHeight },
  ];

  return corners.every((corner) => isPointInPolygon(corner, plotPoints));
};

/** Exact mobile port of the web print label engine. */
export function computePrintLabels(
  plots: PlotRecord[],
  config: PrintLabelConfig,
): { allLabels: LabelDatum[]; plotPolygons: PlotPolygonInfo[] } {
  const { baseScale, fontSize, labelPad, labelOffset } = config;

  const plotPolygons = plots
    .map((plot) => ({
      id: plot.id,
      pointsStr: plot.points.map((point) => `${point.x},${point.y}`).join(' '),
      plot,
      area: plot.results?.shotok ?? 0,
      areaLabelLayout: getPolygonAreaLabelLayout(plot.points),
    }))
    .sort((a, b) => a.area - b.area);

  const allLabels: LabelDatum[] = [];

  for (const { plot } of plotPolygons) {
    const groups = groupPolygonSegments(plot.points);

    groups.forEach((segments, groupIndex) => {
      if (segments.length === 0) return;

      const { midX, midY, midDx, midDy, totalDistPx } = getPathMidpoint(segments);
      if (totalDistPx <= 0) return;

      const totalLengthFt = segments.reduce(
        (sum, segment) => sum + (plot.results.lengths[segment.i] ?? 0),
        0,
      );
      const labelText = formatFeetInches(totalLengthFt);
      const rotation = getReadableRotation(Math.atan2(midDy, midDx) * (180 / Math.PI));

      const naturalPad = labelPad * 0.65;
      const naturalWidth = labelText.length * fontSize * 0.62 + naturalPad * 2;
      const maxEdgeWidth = totalDistPx * 0.96;
      const edgeFontSize = naturalWidth <= maxEdgeWidth ? fontSize : fontSize * 0.9;
      const edgePad = naturalWidth <= maxEdgeWidth ? naturalPad : naturalPad * 0.9;
      const labelWidth = labelText.length * edgeFontSize * 0.62 + edgePad * 2;
      const labelHeight = edgeFontSize + edgePad * 2;

      const midpoint = { x: midX, y: midY };
      const inward = getInwardNormal(
        midpoint,
        midDx,
        midDy,
        plot.points,
        Math.max(baseScale * 0.006, totalDistPx * 0.03),
      );

      let chosen: LabelDatum | null = null;

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const inset = Math.max(
          labelOffset * 0.2,
          labelHeight * (0.46 + attempt * 0.13),
        );
        const center = {
          x: midX + inward.x * inset,
          y: midY + inward.y * inset,
        };

        if (!labelFitsInside(center, rotation, labelWidth, labelHeight, plot.points) && attempt < 5) {
          continue;
        }

        chosen = {
          plotId: plot.id,
          i: groupIndex,
          lx: center.x,
          ly: center.y,
          rotation,
          labelText,
          width: labelWidth,
          height: labelHeight,
          fontSize: edgeFontSize,
        };
        break;
      }

      if (chosen) allLabels.push(chosen);
    });
  }

  return { allLabels, plotPolygons };
}
