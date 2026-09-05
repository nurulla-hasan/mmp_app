import * as FileSystem from 'expo-file-system/legacy';
import { strFromU8, unzipSync } from 'fflate';
import type {
  KmzCoordinate,
  KmzDocument,
  KmzGroundOverlay,
  KmzPlacemark,
  KmzStyle,
} from '../types';

const DEFAULT_STYLE: KmzStyle = {
  lineColor: '#2563eb',
  lineWidth: 2,
  polygonFillColor: 'rgba(37,99,235,0.16)',
  polygonStrokeColor: '#2563eb',
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blocks(xml: string, tag: string) {
  const safe = escapeRegex(tag);
  const pattern = new RegExp(
    `<(?:[\\w.-]+:)?${safe}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${safe}>`,
    'gi',
  );
  return Array.from(xml.matchAll(pattern), (match) => ({ full: match[0], inner: match[1] ?? '' }));
}

function firstText(xml: string, tag: string) {
  const match = blocks(xml, tag)[0];
  return match ? decodeXml(stripCdata(match.inner).trim()) : '';
}

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, '$1');
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function decodeMaybeUri(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCoordinates(value: string): KmzCoordinate[] {
  return decodeXml(value)
    .trim()
    .split(/\s+/)
    .map((token) => token.split(','))
    .map(([longitude, latitude]) => ({
      longitude: Number(longitude),
      latitude: Number(latitude),
    }))
    .filter(
      (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
    );
}

function parseKmlColor(value: string | undefined, fallback: string) {
  const color = value?.trim().replace(/^#/, '');
  if (!color || !/^[0-9a-fA-F]{8}$/.test(color)) return fallback;
  const alpha = Number.parseInt(color.slice(0, 2), 16) / 255;
  const blue = Number.parseInt(color.slice(2, 4), 16);
  const green = Number.parseInt(color.slice(4, 6), 16);
  const red = Number.parseInt(color.slice(6, 8), 16);
  return `rgba(${red},${green},${blue},${Math.round(alpha * 1000) / 1000})`;
}

function parseStyle(styleXml: string): KmzStyle {
  const lineStyle = blocks(styleXml, 'LineStyle')[0]?.inner ?? '';
  const polyStyle = blocks(styleXml, 'PolyStyle')[0]?.inner ?? '';
  const lineColor = parseKmlColor(firstText(lineStyle, 'color'), DEFAULT_STYLE.lineColor);
  const lineWidthRaw = Number(firstText(lineStyle, 'width'));
  const polygonFillColor = parseKmlColor(
    firstText(polyStyle, 'color'),
    DEFAULT_STYLE.polygonFillColor,
  );
  return {
    lineColor,
    lineWidth: Number.isFinite(lineWidthRaw) && lineWidthRaw > 0 ? lineWidthRaw : DEFAULT_STYLE.lineWidth,
    polygonFillColor,
    polygonStrokeColor: lineColor,
  };
}

function parseStyleMap(xml: string) {
  const result = new Map<string, KmzStyle>();
  const stylePattern = /<(?:[\w.-]+:)?Style\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?Style>/gi;
  for (const match of xml.matchAll(stylePattern)) {
    const attrs = match[1] ?? '';
    const id = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
    if (id) result.set(`#${id}`, parseStyle(match[2] ?? ''));
  }
  return result;
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

function safeExtension(path: string) {
  const clean = path.split('?')[0].split('#')[0];
  const ext = clean.match(/\.[a-zA-Z0-9]{1,5}$/)?.[0]?.toLowerCase();
  return ext && ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext) ? ext : '.png';
}

function normalizeArchivePath(value: string) {
  return decodeMaybeUri(value)
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\//, '');
}

function findArchiveEntry(files: Record<string, Uint8Array>, href: string) {
  const normalized = normalizeArchivePath(href);
  if (files[normalized]) return files[normalized];
  const targetBase = normalized.split('/').pop()?.toLowerCase();
  if (!targetBase) return null;
  const matchingKey = Object.keys(files).find(
    (key) => key.split('/').pop()?.toLowerCase() === targetBase,
  );
  return matchingKey ? files[matchingKey] : null;
}

function boxToQuad(
  north: number,
  south: number,
  east: number,
  west: number,
  rotationDegrees: number,
): [KmzCoordinate, KmzCoordinate, KmzCoordinate, KmzCoordinate] {
  const centerLat = (north + south) / 2;
  const centerLng = (east + west) / 2;
  const cosLat = Math.max(0.01, Math.cos((centerLat * Math.PI) / 180));
  const angle = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const rotate = (latitude: number, longitude: number): KmzCoordinate => {
    const x = (longitude - centerLng) * cosLat;
    const y = latitude - centerLat;
    return {
      longitude: centerLng + (x * cos - y * sin) / cosLat,
      latitude: centerLat + x * sin + y * cos,
    };
  };

  return [
    rotate(south, west),
    rotate(south, east),
    rotate(north, east),
    rotate(north, west),
  ];
}

async function resolveOverlayImage(
  href: string,
  archive: Record<string, Uint8Array> | null,
  token: string,
  index: number,
  cacheUris: string[],
) {
  const decodedHref = decodeXml(href.trim());
  if (/^https?:\/\//i.test(decodedHref)) return decodedHref;
  if (!archive) return null;
  const entry = findArchiveEntry(archive, decodedHref);
  if (!entry) return null;
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error('App cache is unavailable.');
  const uri = `${cacheDirectory}kmz-viewer-${token}-${index}${safeExtension(decodedHref)}`;
  await FileSystem.writeAsStringAsync(uri, bytesToBase64(entry), {
    encoding: FileSystem.EncodingType.Base64,
  });
  cacheUris.push(uri);
  return uri;
}

function parseDocumentName(kml: string, fallback: string) {
  const documentXml = blocks(kml, 'Document')[0]?.inner;
  const name = documentXml ? firstText(documentXml, 'name') : '';
  return name || fallback.replace(/\.(kmz|kml)$/i, '') || 'KMZ Layer';
}

async function parseGroundOverlays(
  kml: string,
  archive: Record<string, Uint8Array> | null,
  token: string,
  cacheUris: string[],
  warnings: string[],
) {
  const overlays: KmzGroundOverlay[] = [];
  const overlayBlocks = blocks(kml, 'GroundOverlay');

  for (let index = 0; index < overlayBlocks.length; index += 1) {
    const xml = overlayBlocks[index].inner;
    const href = firstText(blocks(xml, 'Icon')[0]?.inner ?? '', 'href');
    if (!href) {
      warnings.push(`Ground overlay ${index + 1} has no image.`);
      continue;
    }

    const imageUri = await resolveOverlayImage(href, archive, token, index, cacheUris);
    if (!imageUri) {
      warnings.push(`Could not find image for ground overlay ${index + 1}.`);
      continue;
    }

    let quad: [KmzCoordinate, KmzCoordinate, KmzCoordinate, KmzCoordinate] | null = null;
    const quadXml = blocks(xml, 'LatLonQuad')[0]?.inner;
    if (quadXml) {
      const coordinates = parseCoordinates(firstText(quadXml, 'coordinates'));
      if (coordinates.length >= 4) {
        quad = [coordinates[0], coordinates[1], coordinates[2], coordinates[3]];
      }
    }

    if (!quad) {
      const box = blocks(xml, 'LatLonBox')[0]?.inner ?? '';
      const north = Number(firstText(box, 'north'));
      const south = Number(firstText(box, 'south'));
      const east = Number(firstText(box, 'east'));
      const west = Number(firstText(box, 'west'));
      const rotation = Number(firstText(box, 'rotation')) || 0;
      if ([north, south, east, west].every(Number.isFinite)) {
        quad = boxToQuad(north, south, east, west, rotation);
      }
    }

    if (!quad) {
      warnings.push(`Ground overlay ${index + 1} has unsupported coordinates.`);
      continue;
    }

    const color = firstText(xml, 'color');
    const opacity = color && /^[0-9a-fA-F]{8}$/.test(color)
      ? Number.parseInt(color.slice(0, 2), 16) / 255
      : 1;

    overlays.push({
      id: `kmz_overlay_${index}`,
      name: firstText(xml, 'name') || `Overlay ${index + 1}`,
      imageUri,
      opacity,
      quad,
    });
  }

  return overlays;
}

function parsePlacemarks(kml: string) {
  const styleMap = parseStyleMap(kml);
  return blocks(kml, 'Placemark').map((block, index): KmzPlacemark => {
    const xml = block.inner;
    const inlineStyle = blocks(xml, 'Style')[0]?.inner;
    const styleUrl = firstText(xml, 'styleUrl');
    const style = inlineStyle
      ? parseStyle(inlineStyle)
      : styleMap.get(styleUrl) ?? DEFAULT_STYLE;

    const points = blocks(xml, 'Point')
      .flatMap((item) => parseCoordinates(firstText(item.inner, 'coordinates')))
      .slice(0, 1000);
    const lines = blocks(xml, 'LineString')
      .map((item) => parseCoordinates(firstText(item.inner, 'coordinates')))
      .filter((items) => items.length >= 2)
      .slice(0, 200);
    const polygons = blocks(xml, 'Polygon')
      .map((item) => {
        const outer = blocks(item.inner, 'outerBoundaryIs')[0]?.inner ?? item.inner;
        const ring = blocks(outer, 'LinearRing')[0]?.inner ?? outer;
        return parseCoordinates(firstText(ring, 'coordinates'));
      })
      .filter((items) => items.length >= 3)
      .slice(0, 200);

    return {
      id: `kmz_placemark_${index}`,
      name: firstText(xml, 'name') || `Placemark ${index + 1}`,
      description: firstText(xml, 'description') || undefined,
      points,
      lines,
      polygons,
      style,
    };
  });
}

function collectCoordinates(overlays: KmzGroundOverlay[], placemarks: KmzPlacemark[]) {
  const coordinates: KmzCoordinate[] = [];
  overlays.forEach((overlay) => coordinates.push(...overlay.quad));
  placemarks.forEach((placemark) => {
    coordinates.push(...placemark.points);
    placemark.lines.forEach((line) => coordinates.push(...line));
    placemark.polygons.forEach((polygon) => coordinates.push(...polygon));
  });
  return coordinates.filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
}

export async function loadKmzDocument(uri: string, sourceName: string): Promise<KmzDocument> {
  const lowerName = sourceName.toLowerCase();
  const cacheUris: string[] = [];
  const warnings: string[] = [];
  let kml = '';
  let archive: Record<string, Uint8Array> | null = null;

  if (lowerName.endsWith('.kml')) {
    kml = await FileSystem.readAsStringAsync(uri);
  } else {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    archive = unzipSync(base64ToBytes(base64));
    const kmlKey = Object.keys(archive).find((key) => key.toLowerCase() === 'doc.kml')
      ?? Object.keys(archive).find((key) => key.toLowerCase().endsWith('.kml'));
    if (!kmlKey) throw new Error('This KMZ does not contain a KML document.');
    kml = strFromU8(archive[kmlKey]);
  }

  if (!/<(?:[\w.-]+:)?kml\b/i.test(kml)) {
    throw new Error('The selected file is not a valid KML/KMZ document.');
  }

  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const overlays = await parseGroundOverlays(kml, archive, token, cacheUris, warnings);
  const placemarks = parsePlacemarks(kml);
  const allCoordinates = collectCoordinates(overlays, placemarks);

  if (!overlays.length && !placemarks.some((item) => item.points.length || item.lines.length || item.polygons.length)) {
    throw new Error('No supported map layers were found in this KMZ.');
  }

  return {
    name: parseDocumentName(kml, sourceName),
    sourceName,
    overlays,
    placemarks,
    allCoordinates,
    cacheUris,
    warnings,
  };
}

export async function cleanupKmzDocument(document: KmzDocument | null) {
  if (!document) return;
  await Promise.all(
    document.cacheUris.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)),
  );
}
