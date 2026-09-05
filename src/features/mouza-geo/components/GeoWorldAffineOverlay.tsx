import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Region } from 'react-native-maps';
import Svg, { Circle, G, Image as SvgImage, Path, Text as SvgText } from 'react-native-svg';
import type { ControlPair, GeoImage, GeoTransform, Point2D } from '../types';
import { getGeoSourceTileUri } from '../utils/overlay-image';

const TILE_SIZE = 1024;
const TILE_MARGIN = 1;
const PREVIEW_MAX_DIMENSION = 2560;
const PREVIEW_MAX_PIXELS = 4_000_000;
const MAX_LATITUDE = 85.05112878;

type Size = { width: number; height: number };
type Matrix2D = { a: number; b: number; c: number; d: number; e: number; f: number };
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
  transform: GeoTransform | null;
  controlPairs: ControlPair[];
  opacity: number;
  backgroundRemoved: boolean;
  backgroundSensitivity: number;
  region: Region;
  viewport: Size;
};

function clampLatitude(latitude: number) {
  return Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
}

function mercatorV(latitude: number) {
  const lat = clampLatitude(latitude);
  const sinLatitude = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI);
}

function longitudeU(longitude: number) {
  return (longitude + 180) / 360;
}

function getMapProjection(region: Region, viewport: Size) {
  const west = longitudeU(region.longitude - region.longitudeDelta / 2);
  const east = longitudeU(region.longitude + region.longitudeDelta / 2);
  const north = mercatorV(region.latitude + region.latitudeDelta / 2);
  const south = mercatorV(region.latitude - region.latitudeDelta / 2);
  const spanU = Math.max(1e-12, east - west);
  const spanV = Math.max(1e-12, south - north);

  return {
    west,
    north,
    scaleX: viewport.width / spanU,
    scaleY: viewport.height / spanV,
  };
}

function getSourceToScreenMatrix(
  transform: GeoTransform,
  region: Region,
  viewport: Size,
): Matrix2D {
  const projection = getMapProjection(region, viewport);
  return {
    a: transform.a * projection.scaleX,
    b: transform.c * projection.scaleY,
    c: transform.b * projection.scaleX,
    d: transform.d * projection.scaleY,
    e: (transform.tx - projection.west) * projection.scaleX,
    f: (transform.ty - projection.north) * projection.scaleY,
  };
}

function projectWorldPoint(
  point: { lat: number; lng: number },
  region: Region,
  viewport: Size,
) {
  const projection = getMapProjection(region, viewport);
  return {
    x: (longitudeU(point.lng) - projection.west) * projection.scaleX,
    y: (mercatorV(point.lat) - projection.north) * projection.scaleY,
  };
}

function invertPoint(matrix: Matrix2D, point: Point2D): Point2D | null {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < 1e-12) return null;
  const x = point.x - matrix.e;
  const y = point.y - matrix.f;
  return {
    x: (matrix.d * x - matrix.c * y) / determinant,
    y: (-matrix.b * x + matrix.a * y) / determinant,
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
  matrix: Matrix2D,
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

function PointPin({ x, y, label }: { x: number; y: number; label: number }) {
  return (
    <G transform={`translate(${x} ${y}) translate(-12 -27)`}>
      <Path
        d='M12 1C6.48 1 2 5.48 2 11c0 7.55 10 16 10 16s10-8.45 10-16C22 5.48 17.52 1 12 1Z'
        fill='#dc2626'
        stroke='#ffffff'
        strokeWidth={1.8}
      />
      <Circle cx={12} cy={11} r={5.25} fill='#ffffff' />
      <SvgText
        x={12}
        y={14.2}
        fill='#dc2626'
        fontSize={9.5}
        fontWeight='800'
        textAnchor='middle'
      >
        {label}
      </SvgText>
    </G>
  );
}

/**
 * Native equivalent of the web WorldMapCanvas overlay path.
 *
 * The web studio projects source (0,0), (w,0), and (0,h) into map-screen
 * coordinates and draws the image with that affine matrix on a viewport-sized
 * canvas. react-native-maps' GroundOverlay only supports bounds + bearing and
 * Android may additionally downsample the bitmap, which is why the old mobile
 * world view could look stretched/soft. Here the Google map remains native, but
 * the mouza sheet is rendered in a separate SVG viewport with the same full
 * affine source->screen transform. A bounded preview keeps gestures light and
 * visible source tiles progressively replace it when zoom requires native detail.
 */
export const GeoWorldAffineOverlay = memo(function GeoWorldAffineOverlay({
  sourceImage,
  previewImage,
  transform,
  controlPairs,
  opacity,
  backgroundRemoved,
  backgroundSensitivity,
  region,
  viewport,
}: Props) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const ticketRef = useRef(0);

  const matrix = useMemo(
    () => transform && viewport.width > 0 && viewport.height > 0
      ? getSourceToScreenMatrix(transform, region, viewport)
      : null,
    [region, transform, viewport],
  );

  const sensitivity = backgroundRemoved
    ? Math.max(0, Math.min(100, Math.round(backgroundSensitivity)))
    : null;
  const renderKey = `${sourceImage.uri}|${sourceImage.width}x${sourceImage.height}|${sensitivity === null ? 'original' : `clean-${sensitivity}`}`;
  const previewScale = getPreviewScale(sourceImage);
  const screenScale = matrix
    ? Math.max(Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d))
    : 0;
  const shouldTile = Boolean(
    matrix &&
    sourceImage.width * sourceImage.height >= 500_000 &&
    screenScale >= previewScale * 0.7,
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
          sensitivity,
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
    // coordKey is the stable visible tile window; matrix changes during a pan
    // should move the existing SVG tiles without re-cropping until that window changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordKey, renderKey, shouldTile, sourceImage.uri]);

  if (!matrix || !transform || viewport.width <= 0 || viewport.height <= 0) return null;

  const transformText = `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`;

  return (
    <View pointerEvents='none' style={StyleSheet.absoluteFill}>
      <Svg width={viewport.width} height={viewport.height}>
        <G opacity={opacity} transform={transformText}>
          <SvgImage
            href={{ uri: previewImage.uri }}
            x={0}
            y={0}
            width={sourceImage.width}
            height={sourceImage.height}
            preserveAspectRatio='none'
          />
          {tiles.map((tile) => (
            <SvgImage
              key={tile.key}
              href={{ uri: tile.uri }}
              x={tile.x}
              y={tile.y}
              width={tile.width}
              height={tile.height}
              preserveAspectRatio='none'
            />
          ))}
        </G>

        {controlPairs.map((pair, index) => {
          const point = projectWorldPoint(pair.world, region, viewport);
          return <PointPin key={pair.id} x={point.x} y={point.y} label={index + 1} />;
        })}
      </Svg>
    </View>
  );
});
