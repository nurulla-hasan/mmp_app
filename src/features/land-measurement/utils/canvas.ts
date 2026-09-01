// ============================================================================
// 1. LABEL & DRAWING CONSTANTS
// ============================================================================

/**
 * Label Offset/Distance Constants (in unscaled pixels)
 * These determine how far text labels appear from the lines they are measuring.
 * Note: These values are divided by `stageScale` inside components to keep them visually consistent during zoom.
 */
export const LABEL_OFFSET_DRAWING_LIVE = 28;    // Distance from the actively moving "rubber-band" dashed line
export const LABEL_OFFSET_DRAWING_SEGMENT = 12; // Distance from fixed, finalized segments while a plot is being drawn
export const LABEL_OFFSET_DRAWN_PLOT = 14;      // Distance from the borders of fully completed/saved plots
export const LABEL_OFFSET_MEASUREMENT = 22;     // Distance from the temporary measurement tool lines

export const AREA_LABEL_FONT_SCALE = 0.86;
export const AREA_LABEL_WIDTH_FACTOR = 0.52;
export const AREA_LABEL_HEIGHT_FACTOR = 0.92;
export const AREA_LABEL_PADDING_FACTOR = 0.55;
export const AREA_LABEL_RADIUS_FACTOR = 0.75;

/**
 * Minimum diagonal length (in pixels) required to render a diagonal line inside a plot.
 * Prevents drawing diagonals for tiny plots where it would clutter the UI.
 */
export const MIN_DIAGONAL_DRAW_PX = 30;

/**
 * Minimum real-world length (in feet) required to show edge/diagonal labels.
 * This hides tiny snap/intersection artifacts such as 0'-00" labels.
 */
export const MIN_EDGE_LABEL_FT = 1;

/**
 * Minimum on-canvas edge length (in source image pixels) required to show edge labels.
 * This prevents visually tiny corner artifacts from getting large-looking real-world labels in print.
 */
export const MIN_EDGE_LABEL_DRAW_PX = 20;

/**
 * When manual division ends extremely close to an existing plot corner, treat it as that corner.
 * This removes microscopic protruding edges created by floating-point intersection math.
 */
export const DIVISION_VERTEX_SNAP_PX = 1;

/**
 * Manual divide endpoint magnetic snap range around plot corners.
 * The endpoint still snaps to edges everywhere else, but corners get a stronger visible pull.
 */
export const MANUAL_DIVIDE_CORNER_SNAP_PX = 20;

// ============================================================================
// 2. STAGE & CANVAS INTERACTION CONSTANTS
// ============================================================================

/**
 * Konva Canvas Zoom constraints and speed.
 */
export const STAGE_MIN_ZOOM = 0.1;
export const STAGE_MAX_ZOOM = 20;
export const STAGE_ZOOM_SPEED_FACTOR = 1.003;

// ============================================================================
// 3. UI VISUAL & THEME CONSTANTS
// ============================================================================

/**
 * Centralized UI Style Configuration
 * Contains all colors, font sizes, paddings, and radii used in the canvas drawing tools.
 * Update these values to change the visual theme of the editor globally.
 */
export const UI_CONFIG = {
  colors: {
    drawPrimary: "#2563EB",       // Primary blue used for active drawing lines & text
    drawLight: "#3B82F6",         // Lighter blue used for active drawing backgrounds/strokes
    drawBg: "#EFF6FF",            // Very light blue used for active drawing label backgrounds
    plotPrimary: "#0F766E",       // Teal color used for completely drawn, inactive plots
    measurePrimary: "#111827",    // Dark slate/black used for measurement line tools
    textWhite: "white",           // Standard white for text on dark backgrounds
    gray: "#94A3B8",              // Subtle gray used for diagonals and inactive indicators
    snapHint: "#2563EB"           // Color of the circle that appears when snapping to a start point
  },
  fontSize: {
    small: 10,                    // Used for plot labels & measurement lines
    medium: 11,                   // Used for active drawing segment lengths
    large: 13,                    // Used for the central "Plot N" label
    xlarge: 14                    // Used for prominent tool labels
  },
  padding: {
    small: 2,                     // Standard tight padding around text
    medium: 4                     // Larger padding for central plot labels
  },
  radius: {
    small: 4,                     // Small corner radii or measurement dots
    medium: 5,                    // Medium anchor dots
    large: 6,                     // Large anchor dots
    xlarge: 8,                    // Edge snapping indicator radius
    xxlarge: 12                   // Snap-to-start hint circle radius
  },
  strokeWidth: {
    thin: 1,                      // Thin borders (tags, small lines)
    medium: 1.5,                  // Medium borders
    thick: 2,                     // Moderately thick lines
    xthick: 2.5,                  // Thick highlight lines
    xxthick: 3                    // Very thick lines (active drawing paths)
  }
};

export const PLOT_COLOR_PALETTE = [
  "#0F766E",
  "#0284C7",
  "#7C3AED",
  "#C2410C",
  "#15803D",
  "#BE123C",
  "#4338CA",
  "#B45309",
];

// ============================================================================
// 4. FORMATTING HELPERS
// ============================================================================

const DECIMALS = 2;

/**
 * Format a numeric value to a fixed number of decimal places.
 * Returns `"0"` for nullish / NaN input.  The result is a number
 * (with trailing zeros trimmed by the JS runtime).
 */
export const formatPrecision = (value: number | null | undefined, decimals = DECIMALS) => {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return Number(value.toFixed(decimals));
};

/**
 * Format a decimal foot value to a feet-inches string (e.g. `12\'-06"`).
 * Returns `0\'-00"` for non-finite input.  Handles negative values,
 * carries 12 inches → 1 foot, and zero-pads the inch part.
 */
export const formatFeetInches = (feetValue: number) => {
  if (!Number.isFinite(feetValue)) return '0\'-00"';

  const sign = feetValue < 0 ? '-' : '';
  const absoluteFeet = Math.abs(feetValue);
  let feet = Math.floor(absoluteFeet);
  let inches = Math.round((absoluteFeet - feet) * 12);

  if (inches === 12) {
    feet += 1;
    inches = 0;
  }

  return `${sign}${feet}'-${String(inches).padStart(2, '0')}"`;
};
