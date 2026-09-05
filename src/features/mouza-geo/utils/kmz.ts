import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { strToU8, zipSync } from 'fflate';
import type { GeoImage, GeoTransform, KmzExportQuality } from '../types';
import { applyGeoTransform, fromMercator } from './geo-math';
import { getGeoExportTileBase64 } from './overlay-image';

const TILE_SIZE = 2048;

type OverlayTile = {
  column: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  path: string;
};

function sanitizeName(name: string) {
  return (name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*]+/g, '-').trim() || 'mouza-map').slice(0, 80);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function coordinateText(points: { lat: number; lng: number }[]) {
  return points.map((point) => `${point.lng},${point.lat}`).join(' ');
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return globalThis.btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function createTileDescriptors(
  width: number,
  height: number,
  extension: 'jpg' | 'png',
) {
  const columns = Math.ceil(width / TILE_SIZE);
  const rows = Math.ceil(height / TILE_SIZE);
  const tiles: OverlayTile[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = column * TILE_SIZE;
      const y = row * TILE_SIZE;
      tiles.push({
        column,
        row,
        x,
        y,
        width: Math.min(TILE_SIZE, width - x),
        height: Math.min(TILE_SIZE, height - y),
        path: `files/tile-${row}-${column}.${extension}`,
      });
    }
  }

  return tiles;
}

function getTileCorners(transform: GeoTransform, tile: OverlayTile) {
  return [
    { x: tile.x, y: tile.y + tile.height },
    { x: tile.x + tile.width, y: tile.y + tile.height },
    { x: tile.x + tile.width, y: tile.y },
    { x: tile.x, y: tile.y },
  ].map((point) => fromMercator(applyGeoTransform(transform, point)));
}

export async function exportMouzaKmz({
  image,
  transform,
  opacity,
  backgroundRemoved,
  backgroundSensitivity,
  quality,
}: {
  image: GeoImage;
  transform: GeoTransform;
  opacity: number;
  backgroundRemoved: boolean;
  backgroundSensitivity: number;
  quality: KmzExportQuality;
}) {
  const name = sanitizeName(image.name);
  const kmlName = escapeXml(name);

  // Match the web exporter exactly: optimized opaque exports use 0.94 JPEG;
  // original quality and transparent/background-removed exports use PNG.
  const extension: 'jpg' | 'png' =
    backgroundRemoved || quality === 'original' ? 'png' : 'jpg';
  const tiles = createTileDescriptors(image.width, image.height, extension);
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  const overlays = tiles
    .map((tile) => `
    <GroundOverlay>
      <name>${kmlName} ${tile.row + 1}-${tile.column + 1}</name>
      <drawOrder>1</drawOrder>
      <color>${alpha}ffffff</color>
      <Icon><href>${tile.path}</href></Icon>
      <altitudeMode>clampToGround</altitudeMode>
      <gx:LatLonQuad><coordinates>${coordinateText(getTileCorners(transform, tile))}</coordinates></gx:LatLonQuad>
    </GroundOverlay>`)
    .join('');
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>${kmlName}</name>
    <Folder>
      <name>${kmlName} high-resolution tiles</name>${overlays}
    </Folder>
  </Document>
</kml>`;

  const files: Record<string, Uint8Array> = {
    'doc.kml': strToU8(kml),
  };

  for (const tile of tiles) {
    const base64 = await getGeoExportTileBase64(
      image,
      tile,
      backgroundRemoved ? backgroundSensitivity : null,
      extension === 'jpg'
        ? { format: 'jpeg', quality: 0.94 }
        : { format: 'png' },
    );
    files[tile.path] = base64ToBytes(base64);
  }

  // Web uses stored ZIP entries too; the size win comes from JPEG tile encoding,
  // not recompressing already-compressed PNG/JPEG bytes inside the KMZ archive.
  const archive = zipSync(files, { level: 0 });
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error('App cache is unavailable');
  const uri = `${cacheDirectory}${name}.kmz`;
  await FileSystem.writeAsStringAsync(uri, bytesToBase64(archive), {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.google-earth.kmz',
    dialogTitle: 'Save or open Mouza KMZ',
    UTI: 'com.google.earth.kmz',
  });
  return uri;
}
