import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Image as SvgImage } from 'react-native-svg';
import type { GeoImage, Point2D } from '../types';
import { getGeoSourceTileUri } from '../utils/overlay-image';

const TILE_SIZE = 512;
const TILE_MARGIN = 1;

type Size = { width: number; height: number };
type Tile = {
  key: string;
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
type TileCoord = Omit<Tile, 'uri'>;

type Props = {
  sourceImage: GeoImage;
  previewImage: GeoImage;
  viewport: Size;
  stageScale: number;
  stagePos: Point2D;
  fitScale: number;
  backgroundRemoved: boolean;
  backgroundSensitivity: number;
};

function getVisibleCoords(
  image: GeoImage,
  viewport: Size,
  stageScale: number,
  stagePos: Point2D,
  renderKey: string,
): TileCoord[] {
  if (stageScale <= 0) return [];

  const left = Math.max(0, -stagePos.x / stageScale);
  const top = Math.max(0, -stagePos.y / stageScale);
  const right = Math.min(image.width, left + viewport.width / stageScale);
  const bottom = Math.min(image.height, top + viewport.height / stageScale);
  const startCol = Math.max(0, Math.floor(left / TILE_SIZE) - TILE_MARGIN);
  const endCol = Math.min(
    Math.ceil(image.width / TILE_SIZE) - 1,
    Math.floor(right / TILE_SIZE) + TILE_MARGIN,
  );
  const startRow = Math.max(0, Math.floor(top / TILE_SIZE) - TILE_MARGIN);
  const endRow = Math.min(
    Math.ceil(image.height / TILE_SIZE) - 1,
    Math.floor(bottom / TILE_SIZE) + TILE_MARGIN,
  );
  const result: TileCoord[] = [];

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      result.push({
        key: `${renderKey}:${row}:${col}`,
        x,
        y,
        width: Math.min(TILE_SIZE, image.width - x),
        height: Math.min(TILE_SIZE, image.height - y),
      });
    }
  }

  return result;
}

/**
 * Android may decode one very large SVG image source at a reduced texture size.
 * Once the user zooms beyond the fitted overview, render only the visible source
 * pixels as 512px lossless PNG tiles. This mirrors the proven Land Measurement
 * strategy while avoiding its JPEG preview pass, so Mouza Geo adds no lossy
 * recompression to the zoomed source view.
 */
export const GeoSourceTiledImage = memo(function GeoSourceTiledImage({
  sourceImage,
  previewImage,
  viewport,
  stageScale,
  stagePos,
  fitScale,
  backgroundRemoved,
  backgroundSensitivity,
}: Props) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const ticketRef = useRef(0);
  const sensitivity = backgroundRemoved ? Math.max(0, Math.min(100, Math.round(backgroundSensitivity))) : null;
  const renderKey = `${sourceImage.uri}|${sourceImage.width}x${sourceImage.height}|${sensitivity === null ? 'original' : `clean-${sensitivity}`}`;
  const shouldTile =
    sourceImage.width * sourceImage.height >= 500_000 &&
    stageScale >= Math.max(0.06, fitScale * 1.15);
  const coords = useMemo(
    () => shouldTile
      ? getVisibleCoords(sourceImage, viewport, stageScale, stagePos, renderKey)
      : [],
    [renderKey, shouldTile, sourceImage, stagePos, stageScale, viewport],
  );
  const coordKey = coords.map((coord) => coord.key).join('|');
  const hasCompleteTileSet =
    shouldTile &&
    coords.length > 0 &&
    tiles.length === coords.length &&
    tiles.every((tile) => coords.some((coord) => coord.key === tile.key));

  useEffect(() => {
    const ticket = ++ticketRef.current;

    if (!shouldTile || coords.length === 0) {
      setTiles([]);
      return;
    }

    setTiles((current) => current.filter((tile) => coords.some((coord) => coord.key === tile.key)));

    void (async () => {
      const nextTiles: Tile[] = [];
      try {
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
          nextTiles.push({ ...coord, uri });
        }

        if (ticket === ticketRef.current) setTiles(nextTiles);
      } catch {
        if (ticket === ticketRef.current) setTiles([]);
      }
    })();

    return () => {
      ticketRef.current += 1;
    };
    // coordKey intentionally represents the visible tile window after a gesture commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordKey, renderKey, shouldTile, sourceImage.uri]);

  return (
    <>
      {!hasCompleteTileSet ? (
        <SvgImage
          href={{ uri: previewImage.uri }}
          x={0}
          y={0}
          width={sourceImage.width}
          height={sourceImage.height}
          preserveAspectRatio='none'
        />
      ) : null}

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
    </>
  );
});
