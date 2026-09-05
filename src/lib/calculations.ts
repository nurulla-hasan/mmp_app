export const SQ_FT_PER_SHOTOK = 435.6;
export const SQ_FT_PER_KATHA = 720.0;
export const SQ_FT_PER_BIGHA = 14400.0;
export const SQ_FT_PER_ACRE = 43560.0;
export const SQ_FT_PER_HECTARE = 107639.104;
export const SQ_FT_PER_SQ_METER = 10.7639;
export const SQ_FT_PER_SQ_YARD = 9.0;
export const SQ_FT_PER_KANI = 17280.0; // ৪০ শতক (শাহী কানি)
export const SQ_FT_PER_GONDA = 864.0;  // ২ শতক
export const SQ_FT_PER_CHHOTAK = 45.0; // ১৬ ছটাক = ১ কাঠা

export type LandUnitKey =
  | 'shotok'
  | 'katha'
  | 'bigha'
  | 'acre'
  | 'hectare'
  | 'sqFeet'
  | 'sqMeter'
  | 'sqYard'
  | 'kani'
  | 'gonda'
  | 'chhotak';

export function convertFromSqFeet(sqFeet: number) {
  return {
    sqFeet: Number(sqFeet.toFixed(2)),
    shotok: Number((sqFeet / SQ_FT_PER_SHOTOK).toFixed(4)),
    katha: Number((sqFeet / SQ_FT_PER_KATHA).toFixed(4)),
    bigha: Number((sqFeet / SQ_FT_PER_BIGHA).toFixed(4)),
    acre: Number((sqFeet / SQ_FT_PER_ACRE).toFixed(4)),
    hectare: Number((sqFeet / SQ_FT_PER_HECTARE).toFixed(5)),
    sqMeter: Number((sqFeet / SQ_FT_PER_SQ_METER).toFixed(2)),
    sqYard: Number((sqFeet / SQ_FT_PER_SQ_YARD).toFixed(2)),
    kani: Number((sqFeet / SQ_FT_PER_KANI).toFixed(4)),
    gonda: Number((sqFeet / SQ_FT_PER_GONDA).toFixed(4)),
    chhotak: Number((sqFeet / SQ_FT_PER_CHHOTAK).toFixed(3)),
  };
}

export function convertToSqFeet(value: number, unit: LandUnitKey): number {
  switch (unit) {
    case 'shotok':
      return value * SQ_FT_PER_SHOTOK;
    case 'katha':
      return value * SQ_FT_PER_KATHA;
    case 'bigha':
      return value * SQ_FT_PER_BIGHA;
    case 'acre':
      return value * SQ_FT_PER_ACRE;
    case 'hectare':
      return value * SQ_FT_PER_HECTARE;
    case 'sqMeter':
      return value * SQ_FT_PER_SQ_METER;
    case 'sqYard':
      return value * SQ_FT_PER_SQ_YARD;
    case 'kani':
      return value * SQ_FT_PER_KANI;
    case 'gonda':
      return value * SQ_FT_PER_GONDA;
    case 'chhotak':
      return value * SQ_FT_PER_CHHOTAK;
    case 'sqFeet':
    default:
      return value;
  }
}

