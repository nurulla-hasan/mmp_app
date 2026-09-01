import { TILE_SIZE, type TileCoord, type TilePyramidInfo } from './types';
import { getTile } from './tileStore';
import { getLevelForScale } from './tileGenerator';

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Tile Coordinate Helpers ──

function tileKey(hash: string, level: number, row: number, col: number): string {
  return `${hash}:${level}:${row}:${col}`;
}

/**
 * Calculate the position and scale factor for a tile in image-pixel space.
 * Returns the top-left (x,y) where the tile should be placed, and the
 * scaleFactor to multiply TILE_SIZE by to get the coverage in image pixels.
 */
export function getTilePosition(
  tile: TileCoord,
  pyramid: TilePyramidInfo,
): { x: number; y: number; scaleFactor: number } {
  const levelInfo = pyramid.levels[tile.level];
  if (!levelInfo) return { x: 0, y: 0, scaleFactor: 1 };

  const lastLevel = pyramid.levels[pyramid.maxLevel];
  const scaleFactor = lastLevel.width / levelInfo.width;

  return {
    x: tile.col * TILE_SIZE * scaleFactor,
    y: tile.row * TILE_SIZE * scaleFactor,
    scaleFactor,
  };
}

// ── Tile URL Cache ──

const tileUrlCache = new Map<string, string>();
const imageElementCache = new Map<string, HTMLImageElement>();
const pendingImageUrls = new Set<string>();
const MAX_TILE_CACHE_ENTRIES = 128;

function trimTileCache(): void {
  while (tileUrlCache.size > MAX_TILE_CACHE_ENTRIES) {
    let removed = false;

    for (const [key, url] of tileUrlCache) {
      if (pendingImageUrls.has(url)) continue;

      URL.revokeObjectURL(url);
      tileUrlCache.delete(key);
      imageElementCache.delete(url);
      pendingImageUrls.delete(url);
      removed = true;
      break;
    }

    // All excess entries are still decoding; trim them after loading finishes.
    if (!removed) return;
  }
}

/**
 * Get or create an object URL for a tile. Caches URLs to avoid duplicates.
 */
export async function getOrCreateTileUrl(
  hash: string,
  level: number,
  row: number,
  col: number,
): Promise<string> {
  const key = tileKey(hash, level, row, col);
  const existing = tileUrlCache.get(key);
  if (existing) {
    // Refresh insertion order so the Map also acts as a small LRU cache.
    tileUrlCache.delete(key);
    tileUrlCache.set(key, existing);
    return existing;
  }

  const blob = await getTile(hash, level, row, col);
  if (!blob) throw new Error(`Tile not cached: ${key}`);

  const url = URL.createObjectURL(blob);
  tileUrlCache.set(key, url);
  return url;
}

/**
 * Revoke object URLs for tiles no longer in the visible set.
 * Call this when the visible tile set changes.
 */
export function cleanupTileUrls(hash: string, keepKeys: Set<string>): void {
  const prefix = `${hash}:`;
  for (const [key, url] of tileUrlCache) {
    if (key.startsWith(prefix) && !keepKeys.has(key)) {
      URL.revokeObjectURL(url);
      tileUrlCache.delete(key);
      imageElementCache.delete(url);
    }
  }
}

/** Clear ALL cached tile URLs and image elements for a given image hash. */
export function clearTileUrlCache(hash: string): void {
  const prefix = `${hash}:`;
  for (const [key, url] of tileUrlCache) {
    if (key.startsWith(prefix)) {
      URL.revokeObjectURL(url);
      tileUrlCache.delete(key);
      imageElementCache.delete(url);
      pendingImageUrls.delete(url);
    }
  }
}

/** Clear ALL tile URL and image caches (e.g. on full reset). */
export function clearAllTileCaches(): void {
  for (const url of tileUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  tileUrlCache.clear();
  imageElementCache.clear();
  pendingImageUrls.clear();
}

/**
 * Load a tile blob URL into an HTMLImageElement.
 * Results are cached so repeated calls for the same URL resolve instantly.
 */
export async function loadTileImage(url: string): Promise<HTMLImageElement> {
  const cached = imageElementCache.get(url);
  if (cached) return cached;

  pendingImageUrls.add(url);

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      pendingImageUrls.delete(url);
      const isStillCached = Array.from(tileUrlCache.values()).includes(url);
      if (isStillCached) imageElementCache.set(url, img);
      trimTileCache();
      resolve(img);
    };
    img.onerror = () => {
      pendingImageUrls.delete(url);
      trimTileCache();
      reject(new Error(`Failed to load tile image: ${url}`));
    };
    img.src = url;
  });
}

// ── Visible Tile Calculation ──

/**
 * Calculate which tiles are visible for the given viewport at the appropriate
 * pyramid level. Adds a 1-tile margin for smooth panning.
 */
export function getVisibleTiles(
  viewport: Viewport,
  stageScale: number,
  pyramid: TilePyramidInfo,
  margin: number = 1,
): TileCoord[] {
  // Determine level from zoom
  const level = getLevelForScale(stageScale, pyramid.maxLevel);
  const levelInfo = pyramid.levels[level];
  if (!levelInfo) return [];

  // Scale factor: level pixels → image pixels
  const lastLevel = pyramid.levels[pyramid.maxLevel];
  const scaleFactor = lastLevel.width / levelInfo.width;

  // Convert viewport (in image-pixel space) to level-pixel space
  const vpX = viewport.x / scaleFactor;
  const vpY = viewport.y / scaleFactor;
  const vpW = viewport.width / scaleFactor;
  const vpH = viewport.height / scaleFactor;

  // Calculate tile range
  const colStart = Math.max(0, Math.floor(vpX / TILE_SIZE) - margin);
  const colEnd = Math.min(levelInfo.cols - 1, Math.ceil((vpX + vpW) / TILE_SIZE) + margin);
  const rowStart = Math.max(0, Math.floor(vpY / TILE_SIZE) - margin);
  const rowEnd = Math.min(levelInfo.rows - 1, Math.ceil((vpY + vpH) / TILE_SIZE) + margin);

  const tiles: TileCoord[] = [];
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      tiles.push({ level, row, col });
    }
  }

  return tiles;
}



/**
 * Calculate the scaleFactor for positioning tiles in image-pixel space.
 * At maxLevel, scaleFactor ≈ 1 (full resolution).
 * At level 0, scaleFactor > 1 (tiles are stretched).
 */
export function getTileScaleFactor(level: number, pyramid: TilePyramidInfo): number {
  const lastLevel = pyramid.levels[pyramid.maxLevel];
  const currentLevel = pyramid.levels[level];
  if (!currentLevel || !lastLevel) return 1;
  return lastLevel.width / currentLevel.width;
}
