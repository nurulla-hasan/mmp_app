// ============================================================================
// mapCalculations.ts — Re-export Hub for Backward Compatibility
//
// This file re-exports all symbols from the modularized utils. All existing
// imports of `@/utils/mapCalculations` continue to work without changes.
//
// New code should import directly from the specific module:
//   - @/utils/geometry     (pure geometry algorithms)
//   - @/utils/calculations  (unit conversion, polygon data)
//   - @/utils/canvas        (UI constants, formatting helpers)
// ============================================================================

export {
  isFinitePoint,
  normalizePolygonPoints,
  clampNumber,
  boundsOfPoints,
  GROUP_ANGLE_THRESHOLD_DEG,
  getLogicalCornersAndSegments,
  getLogicalCorners,
  triangulatePolygon,
  isPointInPolygon,
  getLineIntersection,
  clipLineToPolygon,
  getClosestPointOnSegment,
  getSnappedPoint,
  getVisualCenter,
  groupPolygonSegments,
} from './geometry';

export {
  MILE_IN_FEET,
  MAP_INCHES_PER_MILE,
  FEET_PER_MAP_INCH,
  SHOTOK_SQ_FT,
  KATHA_SQ_FT,
  DECIMALS,
  calculateDynamicPPI,
  pxToFt,
  ftToPx,
  pxToMile,
  pxToMapInch,
  calculatePolygonData,
} from './calculations';

export {
  LABEL_OFFSET_DRAWING_LIVE,
  LABEL_OFFSET_DRAWING_SEGMENT,
  LABEL_OFFSET_DRAWN_PLOT,
  LABEL_OFFSET_MEASUREMENT,
  AREA_LABEL_FONT_SCALE,
  AREA_LABEL_WIDTH_FACTOR,
  AREA_LABEL_HEIGHT_FACTOR,
  AREA_LABEL_PADDING_FACTOR,
  AREA_LABEL_RADIUS_FACTOR,
  MIN_DIAGONAL_DRAW_PX,
  MIN_EDGE_LABEL_FT,
  MIN_EDGE_LABEL_DRAW_PX,
  DIVISION_VERTEX_SNAP_PX,
  MANUAL_DIVIDE_CORNER_SNAP_PX,
  STAGE_MIN_ZOOM,
  STAGE_MAX_ZOOM,
  STAGE_ZOOM_SPEED_FACTOR,
  UI_CONFIG,
  PLOT_COLOR_PALETTE,
  formatPrecision,
  formatFeetInches,
} from './canvas';

export {
  getReadableRotation,
  hexToRgba,
  polygonArea,
  signedArea,
  pointToSegmentDistance,
} from './component-helpers';

