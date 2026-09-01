// ── Mouza Map Traditional Scale Units ──
// Standard Bangladesh mouza map scale: 16 inches = 1 mile
// Scale bar is typically at top-left of the map

/** 1 chain = 66 feet */
export const CHAIN_TO_FT = 66;

/** 1 link = 0.66 feet ≈ 7.92 inches */
export const LINK_TO_FT = 0.66;

/** 1 mile = 5280 feet */
export const MILE_TO_FT = 5280;

/** Map scale: 16 inches = 1 mile */
export const MAP_INCHES_PER_MILE = 16;

/** Feet per map inch at 16 inches/mile */
export const FEET_PER_MAP_INCH = MILE_TO_FT / MAP_INCHES_PER_MILE; // 330 ft/inch

export interface ScalePreset {
  /** Display label (e.g. "১০ চেইন") */
  label: string;
  /** Real-world distance in feet */
  valueFt: number;
  /** Short description shown as hint */
  description: string;
  /** Whether this is the recommended default */
  recommended?: boolean;
}

/**
 * Predefined scale presets for mouza maps.
 * The most common scale bar on mouza maps is 0→10 chains (= 660 ft).
 */
export const SCALE_PRESETS: ScalePreset[] = [
  { label: '১০ চেইন', valueFt: 10 * CHAIN_TO_FT, description: '১০ চেইন = ৬৬০ ফুট', recommended: true },
  { label: '৫ চেইন',  valueFt: 5 * CHAIN_TO_FT,   description: '৫ চেইন = ৩৩০ ফুট' },
  { label: '২০ লিংক', valueFt: 20 * LINK_TO_FT,   description: '২০ লিংক = ১৩.২ ফুট' },
  { label: '১০০ লিংক', valueFt: 100 * LINK_TO_FT,  description: '১০০ লিংক = ৬৬ ফুট (১ চেইন)' },
  { label: '১ মাইল',   valueFt: MILE_TO_FT,        description: '১ মাইল = ৫২৮০ ফুট' },
];

/**
 * Validate whether a calibration line's pixel distance seems reasonable
 * for the selected preset.
 * Returns a warning message if suspicious, or empty string if OK.
 */
export function validateCalibration(
  pixelDistance: number,
  presetValueFt: number,
): string {
  if (pixelDistance <= 0) return 'লাইনের দূরত্ব বৈধ নয়';

  const expectedPxPerFt = pixelDistance / presetValueFt;

  // If the resulting scale is extreme, warn the user
  if (expectedPxPerFt < 0.1) {
    return 'সতর্কতা: এই দূরত্বটি খুব ছোট মনে হচ্ছে। আপনি কি সঠিক স্কেল বার চিহ্নিত করেছেন?';
  }
  if (expectedPxPerFt > 1000) {
    return 'সতর্কতা: এই দূরত্বটি খুব বড় মনে হচ্ছে। আপনি কি সঠিক স্কেল বার চিহ্নিত করেছেন?';
  }

  return '';
}
