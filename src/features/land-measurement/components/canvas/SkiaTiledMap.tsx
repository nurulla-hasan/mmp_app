import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import type { MapImage } from '../../store/useMapStore';
import type { Point } from '../../types/map';

const TILE_SIZE = 512;
const TILE_MARGIN = 1;
const OVERVIEW_MAX_DIMENSION = 1024;
const TILING_MIN_PIXEL_COUNT = 500_000;
const MAX_TILE_CACHE = 96;
const CACHE_ROOT = FileSystem.cacheDirectory
  ? `${FileSystem.cacheDirectory}mmp-map-tiles-v3/`
  : null;

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
  const saved = await rendered.saveAsync({ compress: 0.78, format: SaveFormat.JPEG });
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
): Coord[] {
  const safeScale = Math.max(stageScale, 0.001);
  const left = Math.max(0, -stagePos.x / safeScale);
  const top = Math.max(0, -stagePos.y / safeScale);
  const right = Math.min(image.width, left + viewport.width / safeScale);
  const bottom = Math.min(image.height, top + viewport.height / safeScale);
  const startCol = Math.max(0, Math.floor(left / TILE_SIZE) - TILE_MARGIN);
  const endCol = Math.min(Math.ceil(image.width / TILE_SIZE) - 1, Math.floor(right / TILE_SIZE) + TILE_MARGIN);
  const startRow = Math.max(0, Math.floor(top / TILE_SIZE) - TILE_MARGIN);
  const endRow = Math.min(Math.ceil(image.height / TILE_SIZE) - 1, Math.floor(bottom / TILE_SIZE) + TILE_MARGIN);
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const result: Coord[] = [];

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      result.push({
        key: `${imageKey}:${row}:${col}`,
        x,
        y,
        width: Math.min(TILE_SIZE, image.width - x),
        height: Math.min(TILE_SIZE, image.height - y),
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
 * Memory-conscious native raster renderer.
 *
 * Large maps never stay mounted as one full-resolution Skia texture. Instead
 * we keep a small persisted overview underneath the canvas and overlay only
 * the committed viewport's 512px full-resolution tiles. During pan/pinch the
 * already-mounted raster is transformed on the UI thread; new crops are only
 * requested after the gesture transform is committed.
 */
export const SkiaTiledMap = memo(function SkiaTiledMap({ image, viewport, stageScale, stagePos, fitScale }: Props) {
  const imageKey = useMemo(() => getImageCacheKey(image), [image]);
  const isLargeImage = image.width * image.height >= TILING_MIN_PIXEL_COUNT;
  const overviewScale = getOverviewScale(image);
  const [overviewUri, setOverviewUri] = useState<string | null>(isLargeImage ? null : image.uri);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const ticketRef = useRef(0);

  const tileActivationScale = Math.max(fitScale * 1.12, overviewScale * 0.9);
  const shouldTile = isLargeImage && Boolean(overviewUri) && stageScale >= tileActivationScale;
  const coords = useMemo(
    () => shouldTile
      ? getVisibleCoords(image, imageKey, viewport, stageScale, stagePos)
      : [],
    [image, imageKey, shouldTile, stagePos.x, stagePos.y, stageScale, viewport.height, viewport.width],
  );
  const coordKey = coords.map((coord) => coord.key).join('|');

  useEffect(() => {
    clearOtherMapTiles(imageKey);
    const ticket = ++ticketRef.current;
    setTiles([]);

    if (!isLargeImage) {
      setOverviewUri(image.uri);
      return;
    }

    setOverviewUri(null);
    void getOverviewUri(image)
      .then((uri) => {
        if (ticket === ticketRef.current) setOverviewUri(uri);
      })
      .catch(() => {
        // Keep the workspace responsive instead of forcing a full-res GPU texture.
        if (ticket === ticketRef.current) setOverviewUri(null);
      });
  }, [image, imageKey, isLargeImage]);

  useEffect(() => {
    const ticket = ++ticketRef.current;
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
      if (ticket !== ticketRef.current) return;

      for (const coord of coords) {
        if (ticket !== ticketRef.current) return;
        if (tileCache.has(coord.key) || !directory) continue;
        const rowCol = coord.key.split(':').slice(-2).join('-');
        const persistedUri = `${directory}tile-${rowCol}.jpg`;
        if (await fileExists(persistedUri)) {
          cacheTile({ ...coord, uri: persistedUri });
        }
      }

      if (ticket !== ticketRef.current) return;
      setTiles(coords.map((coord) => getCachedTile(coord.key)).filter((tile): tile is Tile => Boolean(tile)));

      const missing = coords.filter((coord) => !tileCache.has(coord.key));
      if (missing.length === 0) return;

      // One manipulator context keeps native decoding sequential and avoids
      // the memory spikes caused by parallel full-image crops on low-end Android.
      const context = ImageManipulator.manipulate(image.uri);
      let completedSinceRender = 0;
      for (const coord of missing) {
        if (ticket !== ticketRef.current) return;
        context.reset().crop({
          originX: coord.x,
          originY: coord.y,
          width: coord.width,
          height: coord.height,
        });
        const rendered = await context.renderAsync();
        const saved = await rendered.saveAsync({ compress: 0.92, format: SaveFormat.JPEG });
        const rowCol = coord.key.split(':').slice(-2).join('-');
        const targetUri = directory ? `${directory}tile-${rowCol}.jpg` : null;
        const uri = await persistGeneratedFile(saved.uri, targetUri);
        cacheTile({ ...coord, uri });
        completedSinceRender += 1;

        if (completedSinceRender >= 3 && ticket === ticketRef.current) {
          completedSinceRender = 0;
          setTiles(coords.map((item) => getCachedTile(item.key)).filter((tile): tile is Tile => Boolean(tile)));
        }
      }

      if (ticket === ticketRef.current) {
        setTiles(coords.map((coord) => getCachedTile(coord.key)).filter((tile): tile is Tile => Boolean(tile)));
      }
    })().catch(() => {
      // Overview stays visible if a device cannot create or persist crops.
    });
  // coordKey intentionally represents committed viewport changes only.
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
