import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import type { MapImage } from '../../store/useMapStore';
import type { Point } from '../../types/map';

const TILE_TEXTURE_SIZE = 512;
const TILE_MARGIN = 1;
const OVERVIEW_MAX_DIMENSION = 1024;
const TILING_MIN_PIXEL_COUNT = 500_000;
const MAX_TILE_CACHE = 128;
const PYRAMID_SCALES = [0.125, 0.25, 0.5, 1] as const;
const CACHE_ROOT = FileSystem.cacheDirectory
  ? `${FileSystem.cacheDirectory}mmp-map-tiles-v4/`
  : null;

type Size = { width: number; height: number };
type Tile = {
  key: string;
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rasterScale: number;
};
type Coord = Omit<Tile, 'uri'>;

type Props = {
  image: MapImage;
  viewport: Size;
  stageScale: number;
  stagePos: Point;
  fitScale: number;
};

const tileCache = new Map<string, Tile>();
const overviewCache = new Map<string, string>();
const directoryPromises = new Map<string, Promise<string | null>>();

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function getImageCacheKey(image: MapImage) {
  return stableHash(`${image.uri}|${image.width}x${image.height}`);
}

function getOverviewScale(image: MapImage) {
  const maxDimension = Math.max(image.width, image.height);
  if (maxDimension <= OVERVIEW_MAX_DIMENSION) return 1;
  return OVERVIEW_MAX_DIMENSION / maxDimension;
}

function getRasterScale(stageScale: number) {
  const desiredScale = Math.max(stageScale, 0.001) * 0.98;
  for (const scale of PYRAMID_SCALES) {
    if (scale >= desiredScale) return scale;
  }
  return 1;
}

function getScaleKey(rasterScale: number) {
  return `s${Math.round(rasterScale * 1000)}`;
}

async function ensureMapCacheDirectory(imageKey: string) {
  if (!CACHE_ROOT) return null;
  const existing = directoryPromises.get(imageKey);
  if (existing) return existing;

  const promise = (async () => {
    const directory = `${CACHE_ROOT}${imageKey}/`;
    try {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      return directory;
    } catch {
      return null;
    }
  })();
  directoryPromises.set(imageKey, promise);
  return promise;
}

async function fileExists(uri: string) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

async function persistGeneratedFile(tempUri: string, targetUri: string | null) {
  if (!targetUri) return tempUri;
  if (await fileExists(targetUri)) return targetUri;
  try {
    await FileSystem.copyAsync({ from: tempUri, to: targetUri });
    return targetUri;
  } catch {
    return tempUri;
  }
}

function getCachedTile(key: string) {
  const tile = tileCache.get(key);
  if (!tile) return undefined;
  tileCache.delete(key);
  tileCache.set(key, tile);
  return tile;
}

function cacheTile(tile: Tile) {
  tileCache.delete(tile.key);
  tileCache.set(tile.key, tile);
  while (tileCache.size > MAX_TILE_CACHE) {
    const oldestKey = tileCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    tileCache.delete(oldestKey);
  }
}

function clearOtherMapTiles(activeImageKey: string) {
  const prefix = `${activeImageKey}:`;
  for (const key of tileCache.keys()) {
    if (!key.startsWith(prefix)) tileCache.delete(key);
  }
}

async function getOverviewUri(image: MapImage) {
  const imageKey = getImageCacheKey(image);
  const cached = overviewCache.get(imageKey);
  if (cached) return cached;

  const overviewScale = getOverviewScale(image);
  if (overviewScale >= 1) {
    overviewCache.set(imageKey, image.uri);
    return image.uri;
  }

  const directory = await ensureMapCacheDirectory(imageKey);
  const targetUri = directory ? `${directory}overview.jpg` : null;
  if (targetUri && await fileExists(targetUri)) {
    overviewCache.set(imageKey, targetUri);
    return targetUri;
  }

  const context = ImageManipulator.manipulate(image.uri);
  context.resize({
    width: Math.max(1, Math.round(image.width * overviewScale)),
    height: Math.max(1, Math.round(image.height * overviewScale)),
  });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const uri = await persistGeneratedFile(saved.uri, targetUri);
  overviewCache.set(imageKey, uri);
  return uri;
}

function getVisibleCoords(
  image: MapImage,
  imageKey: string,
  viewport: Size,
  stageScale: number,
  stagePos: Point,
  rasterScale: number,
): Coord[] {
  const safeScale = Math.max(stageScale, 0.001);
  const left = Math.max(0, -stagePos.x / safeScale);
  const top = Math.max(0, -stagePos.y / safeScale);
  const right = Math.min(image.width, left + viewport.width / safeScale);
  const bottom = Math.min(image.height, top + viewport.height / safeScale);
  const logicalTileSize = TILE_TEXTURE_SIZE / rasterScale;
  const totalCols = Math.ceil(image.width / logicalTileSize);
  const totalRows = Math.ceil(image.height / logicalTileSize);
  const startCol = Math.max(0, Math.floor(left / logicalTileSize) - TILE_MARGIN);
  const endCol = Math.min(totalCols - 1, Math.floor(right / logicalTileSize) + TILE_MARGIN);
  const startRow = Math.max(0, Math.floor(top / logicalTileSize) - TILE_MARGIN);
  const endRow = Math.min(totalRows - 1, Math.floor(bottom / logicalTileSize) + TILE_MARGIN);
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const scaleKey = getScaleKey(rasterScale);
  const result: Coord[] = [];

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const x = col * logicalTileSize;
      const y = row * logicalTileSize;
      result.push({
        key: `${imageKey}:${scaleKey}:${row}:${col}`,
        x,
        y,
        width: Math.min(logicalTileSize, image.width - x),
        height: Math.min(logicalTileSize, image.height - y),
        rasterScale,
      });
    }
  }

  result.sort((a, b) => {
    const aDistance = Math.hypot(a.x + a.width / 2 - centerX, a.y + a.height / 2 - centerY);
    const bDistance = Math.hypot(b.x + b.width / 2 - centerX, b.y + b.height / 2 - centerY);
    return aDistance - bDistance;
  });
  return result;
}

function getTileFileName(coord: Coord) {
  const parts = coord.key.split(':');
  const scaleKey = parts[parts.length - 3];
  const row = parts[parts.length - 2];
  const col = parts[parts.length - 1];
  return `tile-${scaleKey}-${row}-${col}.jpg`;
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
 * Memory-conscious native image pyramid.
 *
 * Large maps never stay mounted as one full-resolution Skia texture. A small
 * persisted overview covers zoomed-out views. After a committed pan/zoom, the
 * renderer selects a 1/8, 1/4, 1/2 or full-resolution level and loads only the
 * visible 512px textures plus one surrounding tile. Gesture frames simply
 * transform the already-mounted raster on the UI thread, so image cropping and
 * React state updates never sit in the pinch/pan hot path.
 */
export const SkiaTiledMap = memo(function SkiaTiledMap({ image, viewport, stageScale, stagePos, fitScale }: Props) {
  const imageKey = useMemo(
    () => getImageCacheKey(image),
    [image.height, image.uri, image.width],
  );
  const isLargeImage = image.width * image.height >= TILING_MIN_PIXEL_COUNT;
  const overviewScale = getOverviewScale(image);
  const rasterScale = getRasterScale(stageScale);
  const [overviewUri, setOverviewUri] = useState<string | null>(isLargeImage ? null : image.uri);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const overviewTicketRef = useRef(0);
  const tileTicketRef = useRef(0);

  const tileActivationScale = Math.max(fitScale * 1.15, overviewScale * 1.15);
  const shouldTile = isLargeImage && Boolean(overviewUri) && stageScale >= tileActivationScale;
  const coords = useMemo(
    () => shouldTile
      ? getVisibleCoords(image, imageKey, viewport, stageScale, stagePos, rasterScale)
      : [],
    [
      image.height,
      image.width,
      imageKey,
      rasterScale,
      shouldTile,
      stagePos.x,
      stagePos.y,
      stageScale,
      viewport.height,
      viewport.width,
    ],
  );
  const coordKey = coords.map((coord) => coord.key).join('|');

  useEffect(() => {
    clearOtherMapTiles(imageKey);
    const ticket = ++overviewTicketRef.current;
    tileTicketRef.current += 1;
    setTiles([]);

    if (!isLargeImage) {
      setOverviewUri(image.uri);
      return;
    }

    setOverviewUri(null);
    void getOverviewUri(image)
      .then((uri) => {
        if (ticket === overviewTicketRef.current) setOverviewUri(uri);
      })
      .catch(() => {
        // Functional fallback for unusual files/devices that cannot create a preview.
        if (ticket === overviewTicketRef.current) setOverviewUri(image.uri);
      });
  }, [image.height, image.uri, image.width, imageKey, isLargeImage]);

  useEffect(() => {
    const ticket = ++tileTicketRef.current;
    if (!shouldTile || coords.length === 0) {
      setTiles([]);
      return;
    }

    const memoryCached = coords
      .map((coord) => getCachedTile(coord.key))
      .filter((tile): tile is Tile => Boolean(tile));
    setTiles(memoryCached);

    void (async () => {
      const directory = await ensureMapCacheDirectory(imageKey);
      if (ticket !== tileTicketRef.current) return;

      for (const coord of coords) {
        if (ticket !== tileTicketRef.current) return;
        if (tileCache.has(coord.key) || !directory) continue;
        const persistedUri = `${directory}${getTileFileName(coord)}`;
        if (await fileExists(persistedUri)) {
          cacheTile({ ...coord, uri: persistedUri });
        }
      }

      if (ticket !== tileTicketRef.current) return;
      setTiles(coords.map((coord) => getCachedTile(coord.key)).filter((tile): tile is Tile => Boolean(tile)));

      const missing = coords.filter((coord) => !tileCache.has(coord.key));
      if (missing.length === 0) return;

      // Reuse one source context and process sequentially. Parallel crops can
      // cause large temporary native allocations on low-memory Android phones.
      const context = ImageManipulator.manipulate(image.uri);
      let completedSinceRender = 0;
      for (const coord of missing) {
        if (ticket !== tileTicketRef.current) return;
        context.reset().crop({
          originX: Math.round(coord.x),
          originY: Math.round(coord.y),
          width: Math.max(1, Math.round(coord.width)),
          height: Math.max(1, Math.round(coord.height)),
        });

        if (coord.rasterScale < 0.999) {
          context.resize({
            width: Math.max(1, Math.round(coord.width * coord.rasterScale)),
            height: Math.max(1, Math.round(coord.height * coord.rasterScale)),
          });
        }

        const rendered = await context.renderAsync();
        const saved = await rendered.saveAsync({ compress: 0.96, format: SaveFormat.JPEG });
        const targetUri = directory ? `${directory}${getTileFileName(coord)}` : null;
        const uri = await persistGeneratedFile(saved.uri, targetUri);
        cacheTile({ ...coord, uri });
        completedSinceRender += 1;

        if (completedSinceRender >= 3 && ticket === tileTicketRef.current) {
          completedSinceRender = 0;
          setTiles(coords.map((item) => getCachedTile(item.key)).filter((tile): tile is Tile => Boolean(tile)));
        }
      }

      if (ticket === tileTicketRef.current) {
        setTiles(coords.map((coord) => getCachedTile(coord.key)).filter((tile): tile is Tile => Boolean(tile)));
      }
    })().catch(() => {
      // The overview remains available if a device cannot crop/persist tiles.
    });
  // coordKey intentionally represents committed viewport/level changes only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordKey, image.uri, imageKey, shouldTile]);

  return (
    <>
      {overviewUri && (
        <SkiaSourceImage
          uri={overviewUri}
          x={0}
          y={0}
          width={image.width}
          height={image.height}
        />
      )}
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
