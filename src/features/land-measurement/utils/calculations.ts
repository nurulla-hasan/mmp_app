import type { Point, PolygonResults } from '../types/map';
import { normalizePolygonPoints, getLogicalCorners, triangulatePolygon } from './geometry';

// ============================================================================
// 1. LAND MEASUREMENT & CALCULATION CONSTANTS
// ============================================================================

/**
 * 16 Inch = 1 Mile Scale Calculation Constants
 * Mouza maps in Bangladesh are traditionally drawn at a scale of 16 inches = 1 mile.
 * These constants form the basis of all pixel-to-real-world distance calculations.
 */
export const MILE_IN_FEET = 5280;
export const MAP_INCHES_PER_MILE = 16;
export const FEET_PER_MAP_INCH = MILE_IN_FEET / MAP_INCHES_PER_MILE; // Exact: 330 feet per map inch

/**
 * Land Area Conversion Constants (Square Feet)
 */
export const SHOTOK_SQ_FT = 435.6; // 1 Shotok / Decimal = 435.6 sq ft
export const KATHA_SQ_FT = 720;    // 1 Katha = 720 sq ft
export const DECIMALS = 2;         // Standard decimal precision for all measurement outputs

/**
 * Minimum Thresholds for Calculations
 * Used to avoid dividing by zero or processing microscopic artifacts.
 */
const MIN_POLYGON_AREA_PX = 1e-6;

// ============================================================================
// 2. DYNAMIC PPI (Pixel Per Inch) CALCULATION
// ============================================================================

/**
 * If user draws a line of `pixelDistance` and says it is `actualDistanceFeet` feet,
 * we dynamically calculate the Map's PPI.
 */
/**
 * Calculate PPI (Pixels Per inch) from a known calibration distance.
 *
 * If the user draws a line of `pixelDistance` pixels and says it
 * represents `actualDistanceFeet` feet, this computes the effective
 * PPI for the current image.
 *
 * Formula: PPI = (pixelDistance × 330) / actualDistanceFeet
 * (since 1 map inch = 330 feet)
 */
export const calculateDynamicPPI = (pixelDistance: number, actualDistanceFeet: number) => {
  if (!pixelDistance || !actualDistanceFeet) return 0;
  return (pixelDistance * FEET_PER_MAP_INCH) / actualDistanceFeet;
};

// ============================================================================
// 3. HIGH PRECISION UNIT CONVERSIONS (px to ft, px to mile, px to inch)
// ============================================================================

/** Convert pixels to feet at the given PPI. */
export const pxToFt = (px: number, ppi: number) => {
  if (!ppi) return 0;
  return px * (FEET_PER_MAP_INCH / ppi);
};

/** Convert feet to pixels at the given PPI. */
export const ftToPx = (ft: number, ppi: number) => {
  if (!ppi) return 0;
  return ft * (ppi / FEET_PER_MAP_INCH);
};

/** Convert pixels to miles (ground distance) at the given PPI. */
export const pxToMile = (px: number, ppi: number) => {
  return pxToFt(px, ppi) / MILE_IN_FEET;
};

/** Convert pixels to map inches (physical map distance) at the given PPI. */
export const pxToMapInch = (px: number, ppi: number) => {
  if (!ppi) return 0;
  return px / ppi;
};

// ============================================================================
// 4. POLYGON DATA CALCULATION
// ============================================================================

export type PolygonAreaSummary = {
  sqft: number;
  shotok: number;
  katha: number;
};

/**
 * Lightweight area-only calculation for live previews.
 * It deliberately uses the exact same normalization, shoelace area and unit
 * conversion as calculatePolygonData, but skips edge lengths and diagonal
 * triangulation. Final saved/divided plots still use calculatePolygonData.
 */
export const calculatePolygonAreaSummary = (
  points: Point[],
  scale: number | null,
): PolygonAreaSummary | null => {
  if (!Number.isFinite(scale) || !scale || scale <= 0) return null;

  const normalizedPoints = normalizePolygonPoints(points);
  if (normalizedPoints.length < 3) return null;

  let area = 0;
  for (let i = 0; i < normalizedPoints.length; i++) {
    const p1 = normalizedPoints[i];
    const p2 = normalizedPoints[(i + 1) % normalizedPoints.length];
    area += (p1.x * p2.y - p2.x * p1.y);
  }

  const pixelArea = Math.abs(area / 2);
  if (pixelArea <= MIN_POLYGON_AREA_PX) return null;

  const sqft = pixelArea / (scale * scale);
  return {
    sqft,
    shotok: sqft / SHOTOK_SQ_FT,
    katha: sqft / KATHA_SQ_FT,
  };
};

/**
 * Calculate Polygon Data using High Precision
 * No rounding in intermediate steps. Rounding is only applied to output values.
 */
export const calculatePolygonData = (points: Point[], scale: number | null): PolygonResults | null => {
  if (!Number.isFinite(scale) || !scale || scale <= 0) return null;

  const normalizedPoints = normalizePolygonPoints(points);
  if (normalizedPoints.length < 3) return null;

  // scale here is traditionally (pixels / feet).
  // It is exactly equivalent to (PPI / 330).
  // 1 foot = `scale` pixels. So 1 pixel = `1 / scale` feet.

  const individualLengths: number[] = [];
  for (let i = 0; i < normalizedPoints.length; i++) {
    const p1 = normalizedPoints[i];
    const p2 = normalizedPoints[(i + 1) % normalizedPoints.length];
    const pixelDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    individualLengths.push(pixelDist / scale);
  }

  // Calculate pixel area using Shoelace formula
  let area = 0;
  for (let i = 0; i < normalizedPoints.length; i++) {
    const p1 = normalizedPoints[i];
    const p2 = normalizedPoints[(i + 1) % normalizedPoints.length];
    area += (p1.x * p2.y - p2.x * p1.y);
  }
  const pixelArea = Math.abs(area / 2);
  if (pixelArea <= MIN_POLYGON_AREA_PX) return null;

  // Convert pixel area to square feet (since scale = px/ft, scale^2 = px^2 / ft^2)
  // sqft = px^2 / (px^2 / ft^2)
  const sqft = pixelArea / (scale * scale);

  // Calculate diagonals using Ear Clipping triangulation to ensure they stay inside concave polygons
  const diagonals: { p1Index: number; p2Index: number; lengthFt: number; }[] = [];
  const logicalCorners = getLogicalCorners(normalizedPoints);

  if (logicalCorners.length >= 4 && logicalCorners.length <= 8) {
    const triangulatedDiagonals = triangulatePolygon(logicalCorners);
    for (const diag of triangulatedDiagonals) {
      const p1 = logicalCorners[diag.p1Index];
      const p2 = logicalCorners[diag.p2Index];
      const pixelDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const distFt = pixelDist / scale;

      const origP1Index = normalizedPoints.indexOf(p1);
      const origP2Index = normalizedPoints.indexOf(p2);
      diagonals.push({
        p1Index: origP1Index !== -1 ? origP1Index : diag.p1Index,
        p2Index: origP2Index !== -1 ? origP2Index : diag.p2Index,
        lengthFt: distFt
      });
    }
  }

  return {
    sqft: sqft,
    shotok: sqft / SHOTOK_SQ_FT,
    katha: sqft / KATHA_SQ_FT,
    lengths: individualLengths, // exact individual segment lengths in feet
    perimeter: individualLengths.reduce((total, length) => total + length, 0),
    diagonals: diagonals
  };
};
