export const SQ_FT_PER_SHOTOK = 435.6;
export const SQ_FT_PER_KATHA = 720.0;
export const SQ_FT_PER_BIGHA = 14400.0;
export const SQ_FT_PER_ACRE = 43560.0;
export const SQ_FT_PER_SQ_METER = 10.7639;

export function convertFromSqFeet(sqFeet: number) {
  return {
    sqFeet: Number(sqFeet.toFixed(2)),
    shotok: Number((sqFeet / SQ_FT_PER_SHOTOK).toFixed(4)),
    katha: Number((sqFeet / SQ_FT_PER_KATHA).toFixed(4)),
    bigha: Number((sqFeet / SQ_FT_PER_BIGHA).toFixed(4)),
    acre: Number((sqFeet / SQ_FT_PER_ACRE).toFixed(4)),
    sqMeter: Number((sqFeet / SQ_FT_PER_SQ_METER).toFixed(2)),
  };
}

export function convertToSqFeet(value: number, unit: 'shotok' | 'katha' | 'bigha' | 'acre' | 'sqFeet' | 'sqMeter') {
  switch (unit) {
    case 'shotok':
      return value * SQ_FT_PER_SHOTOK;
    case 'katha':
      return value * SQ_FT_PER_KATHA;
    case 'bigha':
      return value * SQ_FT_PER_BIGHA;
    case 'acre':
      return value * SQ_FT_PER_ACRE;
    case 'sqMeter':
      return value * SQ_FT_PER_SQ_METER;
    case 'sqFeet':
    default:
      return value;
  }
}
