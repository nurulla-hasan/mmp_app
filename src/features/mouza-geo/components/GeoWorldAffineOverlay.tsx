import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  CubicSampling,
  Group,
  Image as SkiaImage,
  Paint,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import type { ControlPair, GeoImage, Point2D } from '../types';
import { getGeoSourceTileUri } from '../utils/overlay-image';

const TILE_SIZE = 1024;
const TILE_MARGIN = 1;
const PREVIEW_MAX_DIMENSION = 2560;
const PREVIEW_MAX_PIXELS = 4_000_000;

type Size = { width: number; height: number };

export type WorldScreenMatrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

type TileCoord = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Tile = TileCoord & { uri: string };

type Props = {
  sourceImage: GeoImage;
  previewImage: GeoImage;
  matrix: WorldScreenMatrix | null;
  controlPairs: ControlPair[];
  opacity: number;
  backgroundRemoved: boolean;
  backgroundSensitivity: number;
  viewport: Size;
};

function invertPoint(matrix: WorldScreenMatrix, point: Point2D): Point2D | null {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < 1e-12) return null;
  const x = point.x - matrix.e;
  const y = point.y - matrix.f;
  return {
    x: (matrix.d * x - matrix.c * y) / determinant,
    y: (-matrix.b * x + matrix.a * y) / determinant,
  };
}

function projectSourcePoint(matrix: WorldScreenMatrix, point: Point2D) {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

function getPreviewScale(image: GeoImage) {
  const width = Math.max(1, image.width);
  const height = Math.max(1, image.height);
  return Math.min(
    1,
    PREVIEW_MAX_DIMENSION / Math.max(width, height),
    Math.sqrt(PREVIEW_MAX_PIXELS / Math.max(1, width * height)),
  );
}

function getVisibleTileCoords(
  image: GeoImage,
  viewport: Size,
  matrix: WorldScreenMatrix,
  renderKey: string,
): TileCoord[] {
  const corners = [
    { x: 0, y: 0 },
    { x: viewport.width, y: 0 },
    { x: viewport.width, y: viewport.height },
    { x: 0, y: viewport.height },
  ]
    .map((point) => invertPoint(matrix, point))
    .filter((point): point is Point2D => Boolean(point));

  if (!corners.length) return [];

  const minX = Math.max(0, Math.min(...corners.map((point) => point.x)));
  const maxX = Math.min(image.width, Math.max(...corners.map((point) => point.x)));
  const minY = Math.max(0, Math.min(...corners.map((point) => point.y)));
  const maxY = Math.min(image.height, Math.max(...corners.map((point) => point.y)));
  if (maxX <= minX || maxY <= minY) return [];

  const maxColumn = Math.max(0, Math.ceil(image.width / TILE_SIZE) - 1);
  const maxRow = Math.max(0, Math.ceil(image.height / TILE_SIZE) - 1);
  const startColumn = Math.max(0, Math.floor(minX / TILE_SIZE) - TILE_MARGIN);
  const endColumn = Math.min(maxColumn, Math.floor(maxX / TILE_SIZE) + TILE_MARGIN);
  const startRow = Math.max(0, Math.floor(minY / TILE_SIZE) - TILE_MARGIN);
  const endRow = Math.min(maxRow, Math.floor(maxY / TILE_SIZE) + TILE_MARGIN);
  const coords: TileCoord[] = [];

  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      const x = column * TILE_SIZE;
      const y = row * TILE_SIZE;
      coords.push({
        key: `${renderKey}:${row}:${column}`,
        x,
        y,
        width: Math.min(TILE_SIZE, image.width - x),
        height: Math.min(TILE_SIZE, image.height - y),
      });
    }
  }

  return coords;
}

function SourceTile({ tile }: { tile: Tile }) {
  const image = useImage(tile.uri);
  if (!image) return null;
  return (
    <SkiaImage
      image={image}
      x={tile.x}
      y={tile.y}
      width={tile.width}
      height={tile.height}
      fit='fill'
      sampling={CubicSampling}
    />
  );
}

function PointPin({ x, y, label }: { x: number; y: number; label: number }) {
  return (
    <View
      style={[
        styles.pin,
        {
          transform: [
            { translateX: x - 12 },
            { translateY: y - 29 },
          ],
        },
      ]}
    >
      <View style={styles.pinHead}>
        <Text style={styles.pinText}>{label}</Text>
      </View>
      <View style={styles.pinTip} />
    </View>
  );
}

/**
 * Native counterpart of the web WorldMapCanvas image pass.
 *
 * GeoWorldMap provides the exact source->screen affine matrix by asking the
 * native MapView to project source (0,0), (w,0), and (0,h). This component only
 * paints that matrix on a viewport-sized Skia canvas. Cubic sampling mirrors the
 * browser canvas' high-quality image smoothing and avoids the nearest-neighbour
 * look the previous SVG renderer produced on Android.
 */
export const GeoWorldAffineOverlay = memo(function GeoWorldAffineOverlay({
  sourceImage,
  previewImage,
  matrix,
  controlPairs,
  opacity,
  backgroundRemoved,
  backgroundSensitivity,
  viewport,
}: Props) {
  const preview = useImage(previewImage.uri);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const ticketRef = useRef(0);

  const sensitivity = backgroundRemoved
    ? Math.max(0, Math.min(100, Math.round(backgroundSensitivity)))
    : null;
  const renderKey = `${sourceImage.uri}|${sourceImage.width}x${sourceImage.height}|${sensitivity === null ? 'original' : `clean-${sensitivity}`}`;
  const previewScale = getPreviewScale(sourceImage);
  const screenScale = matrix
    ? Math.max(Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d))
    : 0;

  // The web background-removed image is itself a bounded high-quality preview.
  // Keep that exact behavior. For the normal opaque sheet, progressively replace
  // the preview with native-resolution source crops only when screen zoom needs it.
  const shouldTile = Boolean(
    matrix &&
    !backgroundRemoved &&
    sourceImage.width * sourceImage.height >= 500_000 &&
    screenScale >= previewScale * 0.85,
  );

  const coords = useMemo(
    () => matrix && shouldTile
      ? getVisibleTileCoords(sourceImage, viewport, matrix, renderKey)
      : [],
    [matrix, renderKey, shouldTile, sourceImage, viewport],
  );
  const coordKey = coords.map((coord) => coord.key).join('|');

  useEffect(() => {
    const ticket = ++ticketRef.current;
    if (!shouldTile || !coords.length) {
      setTiles([]);
      return;
    }

    setTiles((current) => current.filter((tile) => coords.some((coord) => coord.key === tile.key)));

    void (async () => {
      for (const coord of coords) {
        if (ticket !== ticketRef.current) return;
        const uri = await getGeoSourceTileUri(
          sourceImage,
          {
            x: coord.x,
            y: coord.y,
            width: coord.width,
            height: coord.height,
          },
          null,
        );
        if (ticket !== ticketRef.current) return;
        setTiles((current) => {
          if (current.some((tile) => tile.key === coord.key)) return current;
          return [...current, { ...coord, uri }];
        });
      }
    })().catch(() => {
      if (ticket === ticketRef.current) setTiles([]);
    });

    return () => {
      ticketRef.current += 1;
    };
    // coordKey is the visible source tile window; cached tiles move with the
    // affine matrix without being regenerated on every map gesture frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordKey, renderKey, shouldTile, sourceImage.uri]);

  const skiaMatrix = useMemo(() => {
    if (!matrix) return null;
    return Skia.Matrix([
      matrix.a,
      matrix.c,
      matrix.e,
      matrix.b,
      matrix.d,
      matrix.f,
      0,
      0,
      1,
    ]);
  }, [matrix]);

  if (
    !matrix ||
    !skiaMatrix ||
    !preview ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) return null;

  return (
    <View pointerEvents='none' style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group
          matrix={skiaMatrix}
          layer={<Paint opacity={opacity} />}
        >
          <SkiaImage
            image={preview}
            x={0}
            y={0}
            width={sourceImage.width}
            height={sourceImage.height}
            fit='fill'
            sampling={CubicSampling}
          />
          {tiles.map((tile) => <SourceTile key={tile.key} tile={tile} />)}
        </Group>
      </Canvas>

      <View pointerEvents='none' style={StyleSheet.absoluteFill}>
        {controlPairs.map((pair, index) => {
          const point = projectSourcePoint(matrix, pair.source);
          return <PointPin key={pair.id} x={point.x} y={point.y} label={index + 1} />;
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  pin: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 24,
    height: 31,
    alignItems: 'center',
  },
  pinHead: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pinTip: {
    width: 10,
    height: 10,
    marginTop: -6,
    backgroundColor: '#dc2626',
    transform: [{ rotate: '45deg' }],
  },
  pinText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});
