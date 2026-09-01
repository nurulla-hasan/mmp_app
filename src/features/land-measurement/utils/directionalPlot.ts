import type { PlotRecord, Point } from '../types/map';
import { isPointInPolygon } from './geometry';

const MIN_DIRECTION_LENGTH = 1e-6;
const PROBE_DISTANCE_SCREEN_PX = 4;

/**
 * Decide which existing plot a new drawing intends to stay inside by looking
 * just ahead from the first point in the direction of the first segment.
 *
 * This matters when the first point sits on a shared corner/edge: the first
 * point alone can belong to multiple plots, so choosing the first match is
 * arbitrary. A short directional probe makes the user's intended side clear.
 */
export const getDirectionalContainingPlot = (
  plots: PlotRecord[],
  firstPoint: Point,
  directionPoint: Point,
  stageScale: number,
): PlotRecord | null => {
  const dx = directionPoint.x - firstPoint.x;
  const dy = directionPoint.y - firstPoint.y;
  const directionLength = Math.hypot(dx, dy);

  if (directionLength <= MIN_DIRECTION_LENGTH) return null;

  const candidates = plots.filter((plot) =>
    isPointInPolygon(firstPoint, plot.points),
  );
  if (candidates.length === 0) return null;

  const safeStageScale = Math.max(stageScale, MIN_DIRECTION_LENGTH);
  const probeDistance = Math.min(
    PROBE_DISTANCE_SCREEN_PX / safeStageScale,
    directionLength * 0.5,
  );
  const probePoint = {
    x: firstPoint.x + (dx / directionLength) * probeDistance,
    y: firstPoint.y + (dy / directionLength) * probeDistance,
  };

  const directionalMatches = candidates.filter((plot) =>
    isPointInPolygon(probePoint, plot.points),
  );

  // A unique directional match means the user clearly moved into that plot.
  // If the movement follows a shared boundary (still ambiguous), do not force
  // either side; leave the drawing unconstrained instead of picking randomly.
  return directionalMatches.length === 1 ? directionalMatches[0] : null;
};
