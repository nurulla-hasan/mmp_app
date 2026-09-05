import type {
  AlignmentMode,
  ControlPair,
  GeoPoint,
  GeoTransform,
  MercatorPoint,
  Point2D,
} from '../types';

const GEO_SCALE = 1_000_000;
const MAX_LATITUDE = 85.05112878;
const EARTH_CIRCUMFERENCE = 40_075_016.686;

export function toMercator(point: GeoPoint): MercatorPoint {
  const latitude = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, point.lat));
  const sinLatitude = Math.sin((latitude * Math.PI) / 180);
  return {
    u: (point.lng + 180) / 360,
    v: 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI),
  };
}

export function fromMercator(point: MercatorPoint): GeoPoint {
  return {
    lng: point.u * 360 - 180,
    lat: (Math.atan(Math.sinh(Math.PI * (1 - 2 * point.v))) * 180) / Math.PI,
  };
}

export function applyGeoTransform(transform: GeoTransform, point: Point2D): MercatorPoint {
  return {
    u: transform.a * point.x + transform.b * point.y + transform.tx,
    v: transform.c * point.x + transform.d * point.y + transform.ty,
  };
}

function solveLinearSystem(matrix: number[][], values: number[]) {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) {
        pivotRow = row;
      }
    }
    if (Math.abs(augmented[pivotRow][column]) < 1e-10) {
      throw new Error('Control points are collinear or too close together');
    }
    [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];
    const pivot = augmented[column][column];
    for (let cell = column; cell <= size; cell += 1) augmented[column][cell] /= pivot;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let cell = column; cell <= size; cell += 1) {
        augmented[row][cell] -= factor * augmented[column][cell];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function leastSquares(rows: number[][], values: number[], size: number) {
  const normal = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  const target = Array.from({ length: size }, () => 0);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let i = 0; i < size; i += 1) {
      target[i] += row[i] * values[rowIndex];
      for (let j = 0; j < size; j += 1) normal[i][j] += row[i] * row[j];
    }
  }
  return solveLinearSystem(normal, target);
}

export function solveGeoTransform(
  pairs: ControlPair[],
  imageSize: { width: number; height: number },
  mode: AlignmentMode,
): GeoTransform {
  const requiredPairs = mode === 'affine' ? 3 : 2;
  if (pairs.length < requiredPairs) {
    throw new Error(mode === 'affine' ? 'Affine alignment needs at least 3 point pairs' : 'Alignment needs at least 2 point pairs');
  }

  const sourceCenter = { x: imageSize.width / 2, y: imageSize.height / 2 };
  const sourceScale = Math.max(imageSize.width, imageSize.height, 1);
  const worldPoints = pairs.map((pair) => toMercator(pair.world));
  const worldCenter = worldPoints.reduce(
    (sum, point) => ({ u: sum.u + point.u, v: sum.v + point.v }),
    { u: 0, v: 0 },
  );
  worldCenter.u /= worldPoints.length;
  worldCenter.v /= worldPoints.length;

  const rows: number[][] = [];
  const values: number[] = [];
  pairs.forEach((pair, index) => {
    const x = (pair.source.x - sourceCenter.x) / sourceScale;
    const y = (pair.source.y - sourceCenter.y) / sourceScale;
    const u = (worldPoints[index].u - worldCenter.u) * GEO_SCALE;
    const v = (worldPoints[index].v - worldCenter.v) * GEO_SCALE;
    if (mode === 'similarity') rows.push([x, -y, 1, 0], [y, x, 0, 1]);
    else rows.push([x, y, 1, 0, 0, 0], [0, 0, 0, x, y, 1]);
    values.push(u, v);
  });

  if (mode === 'similarity') {
    const [alpha, beta, offsetU, offsetV] = leastSquares(rows, values, 4);
    const divisor = sourceScale * GEO_SCALE;
    return {
      mode,
      a: alpha / divisor,
      b: -beta / divisor,
      c: beta / divisor,
      d: alpha / divisor,
      tx: worldCenter.u + offsetU / GEO_SCALE - (alpha * sourceCenter.x) / divisor + (beta * sourceCenter.y) / divisor,
      ty: worldCenter.v + offsetV / GEO_SCALE - (beta * sourceCenter.x) / divisor - (alpha * sourceCenter.y) / divisor,
    };
  }

  const [a, b, offsetU, c, d, offsetV] = leastSquares(rows, values, 6);
  const divisor = sourceScale * GEO_SCALE;
  return {
    mode,
    a: a / divisor,
    b: b / divisor,
    c: c / divisor,
    d: d / divisor,
    tx: worldCenter.u + offsetU / GEO_SCALE - (a * sourceCenter.x) / divisor - (b * sourceCenter.y) / divisor,
    ty: worldCenter.v + offsetV / GEO_SCALE - (c * sourceCenter.x) / divisor - (d * sourceCenter.y) / divisor,
  };
}

export function calculateResidualMeters(transform: GeoTransform, pairs: ControlPair[]) {
  if (!pairs.length) return 0;
  const squared = pairs.reduce((sum, pair) => {
    const predicted = applyGeoTransform(transform, pair.source);
    const expected = toMercator(pair.world);
    const dx = (predicted.u - expected.u) * EARTH_CIRCUMFERENCE;
    const dy = (predicted.v - expected.v) * EARTH_CIRCUMFERENCE;
    return sum + dx * dx + dy * dy;
  }, 0);
  return Math.sqrt(squared / pairs.length);
}

export function getOverlayCorners(
  transform: GeoTransform,
  imageSize: { width: number; height: number },
) {
  const source = [
    { x: 0, y: 0 },
    { x: imageSize.width, y: 0 },
    { x: imageSize.width, y: imageSize.height },
    { x: 0, y: imageSize.height },
  ];
  return source.map((point) => fromMercator(applyGeoTransform(transform, point)));
}

export function getKmzCorners(
  transform: GeoTransform,
  imageSize: { width: number; height: number },
) {
  const source = [
    { x: 0, y: imageSize.height },
    { x: imageSize.width, y: imageSize.height },
    { x: imageSize.width, y: 0 },
    { x: 0, y: 0 },
  ];
  return source.map((point) => fromMercator(applyGeoTransform(transform, point)));
}

export function getNativeOverlayPreview(
  transform: GeoTransform,
  imageSize: { width: number; height: number },
) {
  const centerSource = { x: imageSize.width / 2, y: imageSize.height / 2 };
  const center = applyGeoTransform(transform, centerSource);
  const halfWidth = (Math.hypot(transform.a, transform.c) * imageSize.width) / 2;
  const halfHeight = (Math.hypot(transform.b, transform.d) * imageSize.height) / 2;
  const northWest = fromMercator({ u: center.u - halfWidth, v: center.v - halfHeight });
  const southEast = fromMercator({ u: center.u + halfWidth, v: center.v + halfHeight });
  const bearing = ((Math.atan2(-transform.b, transform.d) * 180) / Math.PI + 360) % 360;
  return {
    bounds: [
      [northWest.lat, northWest.lng],
      [southEast.lat, southEast.lng],
    ] as [[number, number], [number, number]],
    bearing,
  };
}
