import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import { strToU8, zipSync } from 'fflate';
import type { GeoImage, GeoTransform } from '../types';
import { getKmzCorners } from './geo-math';

function sanitizeName(name: string) {
  return (name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*]+/g, '-').trim() || 'mouza-map').slice(0, 80);
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

export async function exportMouzaKmz({ image, transform, opacity }: {
  image: GeoImage;
  transform: GeoTransform;
  opacity: number;
}) {
  const name = sanitizeName(image.name);
  const prepared = await ImageManipulator.manipulateAsync(
    image.uri,
    [],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.94, base64: true },
  );
  if (!prepared.base64) throw new Error('Could not prepare map image for KMZ');

  const corners = getKmzCorners(transform, image);
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">\n  <Document>\n    <name>${name}</name>\n    <GroundOverlay>\n      <name>${name}</name>\n      <drawOrder>1</drawOrder>\n      <color>${alpha}ffffff</color>\n      <Icon><href>files/map.jpg</href></Icon>\n      <altitudeMode>clampToGround</altitudeMode>\n      <gx:LatLonQuad><coordinates>${coordinateText(corners)}</coordinates></gx:LatLonQuad>\n    </GroundOverlay>\n  </Document>\n</kml>`;

  const archive = zipSync(
    {
      'doc.kml': strToU8(kml),
      'files/map.jpg': base64ToBytes(prepared.base64),
    },
    { level: 0 },
  );

  const uri = `${FileSystem.cacheDirectory}${name}.kmz`;
  await FileSystem.writeAsStringAsync(uri, bytesToBase64(archive), { encoding: FileSystem.EncodingType.Base64 });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.google-earth.kmz',
    dialogTitle: 'Save or open Mouza KMZ',
    UTI: 'com.google.earth.kmz',
  });
  return uri;
}
