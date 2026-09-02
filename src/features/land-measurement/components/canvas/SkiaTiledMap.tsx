import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import type { MapImage } from '../../store/useMapStore';
import type { Point } from '../../types/map';

const TILE_SIZE = 512;
const TILE_MARGIN = 1;
// 72 tiles covers a complete 4096px square map (64 tiles) plus a small LRU
// buffer, while preventing long pan/zoom sessions from accumulating temp files.
const MAX_TILE_CACHE = 72;

type Size = { width: number; height: number };
type Tile = { key: string; uri: string; x: number; y: number; width: number; height: number };
type Coord = Omit<Tile, 'uri'>;

type Props = {
  image: MapImage;
  viewport: Size;
  stageScale: number;
  stagePos: Point;
  fitScale: number;
};

const tileCache = new Map<string, Tile>();

function deleteTileFile(uri: string) {
  void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}

function getCachedTile(key: string): Tile | undefined {
  const tile = tileCache.get(key);
  if (!tile) return undefined;
  // Refresh insertion order so Map acts as a tiny LRU cache.
  tileCache.delete(key);
  tileCache.set(key, tile);
  return tile;
}

function cacheTile(tile: Tile) {
  const previous = tileCache.get(tile.key);
  if (previous && previous.uri !== tile.uri) deleteTileFile(previous.uri);
  tileCache.delete(tile.key);
  tileCache.set(tile.key, tile);

  while (tileCache.size > MAX_TILE_CACHE) {
    const oldestKey = tileCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    const oldest = tileCache.get(oldestKey);
    tileCache.delete(oldestKey);
    if (oldest) deleteTileFile(oldest.uri);
  }
}

function clearOtherMapTiles(activeImageUri: string) {
  const prefix = `${activeImageUri}:`;
  for (const [key, tile] of tileCache) {
    if (key.startsWith(prefix)) continue;
    tileCache.delete(key);
    deleteTileFile(tile.uri);
  }
}

function getVisibleCoords(image: MapImage, viewport: Size, stageScale: number, stagePos: Point): Coord[] {
  const safeScale = Math.max(stageScale, 0.001);
  const left = Math.max(0, -stagePos.x / safeScale);
  const top = Math.max(0, -stagePos.y / safeScale);
  const right = Math.min(image.width, left + viewport.width / safeScale);
  const bottom = Math.min(image.height, top + viewport.height / safeScale);
  const startCol = Math.max(0, Math.floor(left / TILE_SIZE) - TILE_MARGIN);
  const endCol = Math.min(Math.ceil(image.width / TILE_SIZE) - 1, Math.floor(right / TILE_SIZE) + TILE_MARGIN);
  const startRow = Math.max(0, Math.floor(top / TILE_SIZE) - TILE_MARGIN);
  const endRow = Math.min(Math.ceil(image.height / TILE_SIZE) - 1, Math.floor(bottom / TILE_SIZE) + TILE_MARGIN);
  const result: Coord[] = [];

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      result.push({
        key: `${image.uri}:${row}:${col}`,
        x,
        y,
        width: Math.min(TILE_SIZE, image.width - x),
        height: Math.min(TILE_SIZE, image.height - y),
      });
    }
  }
  return result;
}

const SkiaSourceImage = memo(function SkiaSourceImage({
  uri,
  x,
  y,
  width,
  height,
}: {
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const decoded = useImage(uri);
  if (!decoded) return null;
  return (
    <SkiaImage
      image={decoded}
      x={x}
      y={y}
      width={width}
      height={height}
      fit='fill'
      sampling={{ B: 0, C: 0.5 }}
    />
  );
});

/**
 * Skia draws the original map as a continuous GPU texture and overlays 512px
 * full-resolution crops once zoomed in. Tile selection only changes after a
 * committed gesture, so pan/pinch frames never wait for React or image crops.
 */
export const SkiaTiledMap = memo(function SkiaTiledMap({ image, viewport, stageScale, stagePos, fitScale }: Props) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const ticketRef = useRef(0);
  const shouldTile = image.width * image.height >= 500_000 && stageScale >= Math.max(0.18, fitScale * 1.25);
  const coords = useMemo(
    () => shouldTile ? getVisibleCoords(image, viewport, stageScale, stagePos) : [],
    [image, shouldTile, stagePos.x, stagePos.y, stageScale, viewport.height, viewport.width],
  );
  const coordKey = coords.map((coord) => coord.key).join('|');

  useEffect(() => {
    clearOtherMapTiles(image.uri);
  }, [image.uri]);

  useEffect(() => {
    const ticket = ++ticketRef.current;
    if (!shouldTile || coords.length === 0) {
      setTiles([]);
      return;
    }

    const cached = coords.map((coord) => getCachedTile(coord.key)).filter((tile): tile is Tile => Boolean(tile));
    setTiles(cached);

    const missing = coords.filter((coord) => !tileCache.has(coord.key));
    if (missing.length === 0) return;

    void (async () => {
      try {
        // Reuse one native image-manipulator context and crop sequentially.
        // Parallel 512px decodes are faster on desktop but create avoidable
        // memory spikes on mid-range Android devices.
        const context = ImageManipulator.manipulate(image.uri);
        for (const coord of missing) {
          if (ticket !== ticketRef.current) return;
          context.reset().crop({ originX: coord.x, originY: coord.y, width: coord.width, height: coord.height });
          const rendered = await context.renderAsync();
          const saved = await rendered.saveAsync({ compress: 0.98, format: SaveFormat.JPEG });
          cacheTile({ ...coord, uri: saved.uri });
        }
        if (ticket === ticketRef.current) {
          setTiles(coords.map((coord) => getCachedTile(coord.key)).filter((tile): tile is Tile => Boolean(tile)));
        }
      } catch {
        // The original Skia image remains visible if a device cannot create crops.
      }
    })();
  // coordKey is intentionally the compact dependency for committed viewport changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordKey, image.uri, shouldTile]);

  return (
    <>
      <SkiaSourceImage uri={image.uri} x={0} y={0} width={image.width} height={image.height} />
      {tiles.map((tile) => (
        <SkiaSourceImage
          key={tile.key}
          uri={tile.uri}
          x={tile.x}
          y={tile.y}
          width={tile.width}
          height={tile.height}
        />
      ))}
    </>
  );
});
