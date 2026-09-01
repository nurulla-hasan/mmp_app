/** Tile coordinate within a pyramid level. */
export interface TileCoord {
  level: number;
  row: number;
  col: number;
}

/** Metadata about a single pyramid level. */
export interface PyramidLevelInfo {
  width: number;   // level pixel width
  height: number;  // level pixel height
  cols: number;    // number of tiles horizontally
  rows: number;    // number of tiles vertically
}

/** Complete pyramid metadata (stored in state + IndexedDB). */
export interface TilePyramidInfo {
  imageHash: string;
  tileSize: number;
  maxLevel: number;
  levels: PyramidLevelInfo[];
}

/** Progress callback during generation. */
export type TileProgressCallback = (percent: number) => void;

/** Default tile size in pixels. */
export const TILE_SIZE = 256;

/**
 * Threshold for skipping tiling entirely.
 * Images with total pixels below this use the original single <KonvaImage>.
 * Lowered for low-end device safety — tiling is GPU-friendly.
 */
export const TILING_MIN_PIXEL_COUNT = 500_000; // 0.5 MP

/** IndexedDB constants. */
export const TILE_DB_NAME = 'mouzaMapTiles';
export const TILE_STORE_NAME = 'tiles';
export const TILE_DB_VERSION = 1;
