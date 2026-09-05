import { AlphaType, ColorType, Skia } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import type { GeoImage } from '../types';

const previewCache = new Map<string, Promise<string>>();
const sourceTileCache = new Map<string, Promise<string>>();

export type GeoImageCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clampSensitivity = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const getLuma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Same sensitivity model as the web Mouza Geo worker. Higher sensitivity keeps
 * progressively lighter survey ink. Retained native survey ink is rendered as
 * true black so it remains legible on satellite imagery.
 */
function isolateBlackInk(pixels: Uint8Array, sensitivity: number) {
  const normalized = clampSensitivity(sensitivity) / 100;
  const luminanceThreshold = Math.round(110 + normalized * 135);
  const chromaThreshold = Math.round(18 + normalized * 82);
  const softStart = Math.max(0, luminanceThreshold - 70);

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const originalAlpha = pixels[index + 3];
    if (!originalAlpha) continue;

    const luminance = getLuma(red, green, blue);
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);

    if (luminance >= luminanceThreshold || chroma > chromaThreshold) {
      pixels[index + 3] = 0;
      continue;
    }

    const darkness = clamp01(
      (luminanceThreshold - luminance) /
        Math.max(1, luminanceThreshold - softStart),
    );
    const smoothDarkness = darkness * darkness * (3 - 2 * darkness);

    pixels[index] = 0;
    pixels[index + 1] = 0;
    pixels[index + 2] = 0;
    pixels[index + 3] = Math.round(originalAlpha * smoothDarkness);
  }
}

function processPngBase64(base64: string, sensitivity: number) {
  const encoded = Skia.Data.fromBase64(base64);
  const sourceImage = Skia.Image.MakeImageFromEncoded(encoded);
  if (!sourceImage) throw new Error('Could not decode the map image for background cleanup.');

  const width = sourceImage.width();
  const height = sourceImage.height();
  const imageInfo = {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  };

  // Normalize every input into the same RGBA layout before changing alpha.
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('Could not create a map cleanup surface.');
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('transparent'));
  canvas.drawImage(sourceImage, 0, 0);
  surface.flush();

  const rasterImage = surface.makeImageSnapshot();
  const rawPixels = rasterImage.readPixels(0, 0, imageInfo);
  if (!(rawPixels instanceof Uint8Array)) {
    throw new Error('Could not access map pixels for background cleanup.');
  }

  isolateBlackInk(rawPixels, sensitivity);
  const cleanedImage = Skia.Image.MakeImage(
    imageInfo,
    Skia.Data.fromBytes(rawPixels),
    width * 4,
  );
  if (!cleanedImage) throw new Error('Could not create the cleaned map overlay.');

  // Skia encodes PNG by default here. PNG is lossless and preserves alpha.
  return cleanedImage.encodeToBase64();
}

async function preparePngBase64(
  image: GeoImage,
  actions: Parameters<typeof ImageManipulator.manipulateAsync>[1],
) {
  const prepared = await ImageManipulator.manipulateAsync(image.uri, actions, {
    compress: 1,
    format: ImageManipulator.SaveFormat.PNG,
    base64: true,
  });
  if (!prepared.base64) throw new Error('Could not read the map image.');
  return prepared.base64;
}

/**
 * Interactive overlay preview keeps the source image's original pixel
 * dimensions. Background cleanup may change alpha/color data, but no resize or
 * lossy JPEG pass is applied.
 */
export function getGeoOverlayPreviewUri(image: GeoImage, sensitivity: number) {
  const safeSensitivity = clampSensitivity(sensitivity);
  const key = `${image.uri}|${image.width}x${image.height}|full-resolution-v1|${safeSensitivity}`;
  const cached = previewCache.get(key);
  if (cached) return cached;

  const task = (async () => {
    const base64 = await preparePngBase64(image, []);
    const cleanedBase64 = processPngBase64(base64, safeSensitivity);
    const cacheDirectory = FileSystem.cacheDirectory;
    if (!cacheDirectory) throw new Error('App cache is unavailable.');
    const uri = `${cacheDirectory}mouza-geo-preview-${safeSensitivity}-${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(uri, cleanedBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return uri;
  })().catch((error) => {
    previewCache.delete(key);
    throw error;
  });

  previewCache.set(key, task);
  return task;
}

/**
 * Prepare one export tile at its original pixel dimensions. There is no resize
 * and no JPEG pass: the tile is encoded as lossless PNG. When sensitivity is
 * provided, background removal is applied to the full-resolution tile.
 */
export async function getGeoExportTileBase64(
  image: GeoImage,
  crop: GeoImageCrop,
  sensitivity: number | null,
) {
  const isWholeImage =
    crop.x === 0 &&
    crop.y === 0 &&
    crop.width === image.width &&
    crop.height === image.height;
  const actions: Parameters<typeof ImageManipulator.manipulateAsync>[1] = isWholeImage
    ? []
    : [{
        crop: {
          originX: crop.x,
          originY: crop.y,
          width: crop.width,
          height: crop.height,
        },
      }];
  const base64 = await preparePngBase64(image, actions);
  return sensitivity === null
    ? base64
    : processPngBase64(base64, sensitivity);
}

/**
 * Visible source-map tiles are generated from the untouched source image at the
 * exact source pixel grid. Android can downsample one huge SVG image texture;
 * these small lossless PNG crops avoid that decoder limit without altering the
 * stored original image or the KMZ export source.
 */
export function getGeoSourceTileUri(
  image: GeoImage,
  crop: GeoImageCrop,
  sensitivity: number | null,
) {
  const safeSensitivity = sensitivity === null ? null : clampSensitivity(sensitivity);
  const key = [
    image.uri,
    `${image.width}x${image.height}`,
    `${crop.x},${crop.y},${crop.width},${crop.height}`,
    safeSensitivity === null ? 'original' : `clean-${safeSensitivity}`,
  ].join('|');
  const cached = sourceTileCache.get(key);
  if (cached) return cached;

  const task = (async () => {
    const base64 = await getGeoExportTileBase64(image, crop, safeSensitivity);
    const cacheDirectory = FileSystem.cacheDirectory;
    if (!cacheDirectory) throw new Error('App cache is unavailable.');
    const uri = `${cacheDirectory}mouza-geo-source-${crop.x}-${crop.y}-${crop.width}-${crop.height}-${safeSensitivity ?? 'original'}-${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return uri;
  })().catch((error) => {
    sourceTileCache.delete(key);
    throw error;
  });

  sourceTileCache.set(key, task);
  return task;
}
