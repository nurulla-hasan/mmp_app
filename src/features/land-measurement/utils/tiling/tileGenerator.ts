import {
  TILE_SIZE,
  type TilePyramidInfo,
  type PyramidLevelInfo,
  type TileProgressCallback,
} from './types';
import { putTile } from './tileStore';

function assertGenerationActive(shouldCancel?: () => boolean): void {
  if (!shouldCancel?.()) return;

  const error = new Error('Tile generation cancelled');
  error.name = 'AbortError';
  throw error;
}

/**
 * Generate a complete tile pyramid from a source image.
 * Stores tiles into IndexedDB via tileStore.
 *
 * Progress: lower levels (fewer tiles) generate first,
 * so the map becomes visible quickly.
 */
export async function generateTilePyramid(
  image: HTMLImageElement,
  imageHash: string,
  onProgress?: TileProgressCallback,
  shouldCancel?: () => boolean,
): Promise<TilePyramidInfo> {
  const srcW = image.width;
  const srcH = image.height;

  // maxLevel: smallest level where one tile covers the image
  const maxDimension = Math.max(srcW, srcH);
  const maxLevel = Math.ceil(Math.log2(maxDimension / TILE_SIZE));

  const levels: PyramidLevelInfo[] = [];
  let totalTiles = 0;

  // Pre-compute level info and count total tiles
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const { w, h, cols, rows } = levelDimensions(srcW, srcH, lvl, maxLevel);
    levels.push({ width: w, height: h, cols, rows });
    totalTiles += cols * rows;
  }

  let tilesGenerated = 0;

  // Generate level 0 → maxLevel (lowest res first)
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const info = levels[lvl];
    const scaleToSrc = srcW / info.width; // how many source px per level px

    for (let row = 0; row < info.rows; row++) {
      for (let col = 0; col < info.cols; col++) {
        assertGenerationActive(shouldCancel);
        const canvas = createTileCanvas();
        const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (!ctx) continue;

        // Source region in original image coordinates
        const srcX = col * TILE_SIZE * scaleToSrc;
        const srcY = row * TILE_SIZE * scaleToSrc;
        const srcRegionW = TILE_SIZE * scaleToSrc;
        const srcRegionH = TILE_SIZE * scaleToSrc;

        ctx.drawImage(
          image,
          srcX, srcY, srcRegionW, srcRegionH,
          0, 0, TILE_SIZE, TILE_SIZE,
        );

        // Convert to blob
        const blob = await canvasToBlob(canvas);

        if (blob) {
          await putTile(imageHash, lvl, row, col, blob);
        }

        tilesGenerated++;
        if (onProgress && totalTiles > 0) {
          onProgress(Math.round((tilesGenerated / totalTiles) * 100));
        }
      }
    }
  }

  return { imageHash, tileSize: TILE_SIZE, maxLevel, levels };
}

/**
 * Generate tiles in chunks to avoid blocking the main thread.
 * Processes `chunkSize` tiles per requestAnimationFrame.
 */
export async function generateTilePyramidChunked(
  image: HTMLImageElement,
  imageHash: string,
  onProgress?: TileProgressCallback,
  chunkSize: number = 20,
  shouldCancel?: () => boolean,
): Promise<TilePyramidInfo> {
  const srcW = image.width;
  const srcH = image.height;

  const maxDimension = Math.max(srcW, srcH);
  const maxLevel = Math.ceil(Math.log2(maxDimension / TILE_SIZE));

  const levels: PyramidLevelInfo[] = [];
  const tileCoords: Array<{ level: number; row: number; col: number; info: PyramidLevelInfo }> = [];

  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const dims = levelDimensions(srcW, srcH, lvl, maxLevel);
    const info: PyramidLevelInfo = { width: dims.w, height: dims.h, cols: dims.cols, rows: dims.rows };
    levels.push(info);
    for (let row = 0; row < info.rows; row++) {
      for (let col = 0; col < info.cols; col++) {
        tileCoords.push({ level: lvl, row, col, info });
      }
    }
  }

  const totalTiles = tileCoords.length;
  let generated = 0;
  let index = 0;

  // While inside the worker is better, but as a fallback we use rAF chunking.
  // Since OffscreenCanvas is synchronous, we batch process.
  // Actually let's just do it synchronously — OffscreenCanvas is fast enough.
  // Chunking with rAF adds complexity without much benefit for <500 tiles.
  // If image is extremely large (>200 tiles), we'll chunk via setTimeout.

  if (totalTiles < 200) {
    // Small pyramid — generate synchronously
    return generateTilePyramid(image, imageHash, onProgress, shouldCancel);
  }

  // Large pyramid — chunked
  return new Promise((resolve, reject) => {
    const processChunk = async () => {
      try {
        assertGenerationActive(shouldCancel);
        const end = Math.min(index + chunkSize, totalTiles);
        for (; index < end; index++) {
          assertGenerationActive(shouldCancel);
          const { level, row, col, info } = tileCoords[index];
          const scaleToSrc = srcW / info.width;

          const canvas = createTileCanvas();
          const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
          if (!ctx) continue;

          const srcX = col * TILE_SIZE * scaleToSrc;
          const srcY = row * TILE_SIZE * scaleToSrc;
          const srcRegionW = TILE_SIZE * scaleToSrc;
          const srcRegionH = TILE_SIZE * scaleToSrc;

          ctx.drawImage(image, srcX, srcY, srcRegionW, srcRegionH, 0, 0, TILE_SIZE, TILE_SIZE);

          const blob = await canvasToBlob(canvas);
          if (blob) {
            await putTile(imageHash, level, row, col, blob);
          }

          generated++;
          onProgress?.(Math.round((generated / totalTiles) * 100));
        }

        if (index < totalTiles) {
          requestAnimationFrame(processChunk);
        } else {
          resolve({ imageHash, tileSize: TILE_SIZE, maxLevel, levels });
        }
      } catch (err) {
        reject(err);
      }
    };

    requestAnimationFrame(processChunk);
  });
}

// ── Helpers ──

function levelDimensions(
  srcW: number,
  srcH: number,
  level: number,
  maxLevel: number,
): { w: number; h: number; cols: number; rows: number } {
  // At maxLevel, image is full size
  // At level 0, image is scaled down to fit in TILE_SIZE
  const scale = Math.pow(2, level - maxLevel);
  const w = Math.ceil(srcW * scale);
  const h = Math.ceil(srcH * scale);
  const cols = Math.ceil(w / TILE_SIZE);
  const rows = Math.ceil(h / TILE_SIZE);
  return { w, h, cols, rows };
}

/**
 * Select the pyramid level whose source pixels most closely match screen pixels.
 * Zoomed-out views use lower-resolution tiles; zoom >= 100% uses full resolution.
 */
export function getLevelForScale(stageScale: number, maxLevel: number): number {
  if (!Number.isFinite(stageScale) || stageScale <= 0) return 0;

  const level = Math.floor(maxLevel + Math.log2(stageScale));
  return Math.max(0, Math.min(level, maxLevel));
}

// ── Canvas Utilities (OffscreenCanvas with fallback) ──

/** Create a canvas of TILE_SIZE × TILE_SIZE (OffscreenCanvas or regular canvas). */
function createTileCanvas(): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
  }
  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  return canvas;
}

/** Convert a canvas to a Blob (WebP, quality 0.7). Works with OffscreenCanvas and regular canvas. */
async function canvasToBlob(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/webp', quality: 0.7 });
  }
  return new Promise((resolve) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => resolve(blob),
      'image/webp',
      0.7,
    );
  });
}
