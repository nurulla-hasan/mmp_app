import { AlphaType, ColorType, Skia } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import type { GeoBackgroundMode, GeoImage } from '../types';

const MAX_OVERLAY_EDGE = 1800;
const overlayCache = new Map<string, Promise<string>>();

type Rgb = { r: number; g: number; b: number; luma: number };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const getLuma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

function forEachBorderSample(
  pixels: Uint8Array,
  width: number,
  height: number,
  callback: (r: number, g: number, b: number) => void,
) {
  const step = Math.max(2, Math.floor(Math.max(width, height) / 320));
  const bandX = Math.max(4, Math.round(width * 0.045));
  const bandY = Math.max(4, Math.round(height * 0.045));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (x > bandX && x < width - bandX && y > bandY && y < height - bandY) continue;
      const index = (y * width + x) * 4;
      callback(pixels[index], pixels[index + 1], pixels[index + 2]);
    }
  }
}

function estimatePaperColor(pixels: Uint8Array, width: number, height: number): Rgb {
  const histogram = new Uint32Array(256);
  let sampleCount = 0;

  forEachBorderSample(pixels, width, height, (r, g, b) => {
    const luma = Math.max(0, Math.min(255, Math.round(getLuma(r, g, b))));
    histogram[luma] += 1;
    sampleCount += 1;
  });

  const targetBrightSamples = Math.max(1, Math.round(sampleCount * 0.38));
  let brightCount = 0;
  let lumaCutoff = 150;
  for (let value = 255; value >= 0; value -= 1) {
    brightCount += histogram[value];
    if (brightCount >= targetBrightSamples) {
      lumaCutoff = Math.max(120, value);
      break;
    }
  }

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  forEachBorderSample(pixels, width, height, (r, g, b) => {
    const luma = getLuma(r, g, b);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (luma < lumaCutoff || chroma > 125) return;
    rSum += r;
    gSum += g;
    bSum += b;
    count += 1;
  });

  if (!count) {
    forEachBorderSample(pixels, width, height, (r, g, b) => {
      rSum += r;
      gSum += g;
      bSum += b;
      count += 1;
    });
  }

  const r = count ? rSum / count : 235;
  const g = count ? gSum / count : 230;
  const b = count ? bSum / count : 215;
  return { r, g, b, luma: getLuma(r, g, b) };
}

function removePaperBackground(
  pixels: Uint8Array,
  width: number,
  height: number,
  mode: Exclude<GeoBackgroundMode, 'original'>,
) {
  const paper = estimatePaperColor(pixels, width, height);
  const threshold = mode === 'soft' ? 38 : 68;
  const low = threshold * 0.48;
  const high = threshold * 1.28;
  const inkProtectionRange = mode === 'soft' ? 72 : 56;

  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const originalAlpha = pixels[index + 3];
    if (!originalAlpha) continue;

    const dr = r - paper.r;
    const dg = g - paper.g;
    const db = b - paper.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    const luma = getLuma(r, g, b);
    const inkContrast = paper.luma - luma;

    const similarityAlpha = clamp01((distance - low) / Math.max(1, high - low));
    const inkAlpha = clamp01((inkContrast - 18) / inkProtectionRange);
    const alphaFactor = Math.max(similarityAlpha, inkAlpha);
    pixels[index + 3] = Math.round(originalAlpha * alphaFactor);
  }
}

async function buildCleanOverlay(
  image: GeoImage,
  mode: Exclude<GeoBackgroundMode, 'original'>,
) {
  const maxEdge = Math.max(image.width, image.height, 1);
  const actions: ImageManipulator.Action[] = [];
  if (maxEdge > MAX_OVERLAY_EDGE) {
    if (image.width >= image.height) {
      actions.push({ resize: { width: MAX_OVERLAY_EDGE } });
    } else {
      actions.push({ resize: { height: MAX_OVERLAY_EDGE } });
    }
  }

  const prepared = await ImageManipulator.manipulateAsync(image.uri, actions, {
    compress: 1,
    format: ImageManipulator.SaveFormat.PNG,
    base64: true,
  });
  if (!prepared.base64) throw new Error('Could not read the map image for background cleanup.');

  const encoded = Skia.Data.fromBase64(prepared.base64);
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
  const rawPixels = sourceImage.readPixels(0, 0, imageInfo);
  if (!(rawPixels instanceof Uint8Array)) {
    throw new Error('Could not access map pixels for background cleanup.');
  }

  removePaperBackground(rawPixels, width, height, mode);
  const cleanedImage = Skia.Image.MakeImage(
    imageInfo,
    Skia.Data.fromBytes(rawPixels),
    width * 4,
  );
  if (!cleanedImage) throw new Error('Could not create the cleaned map overlay.');

  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error('App cache is unavailable.');
  const uri = `${cacheDirectory}mouza-geo-overlay-${mode}-${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(uri, cleanedImage.encodeToBase64(), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

export function getGeoOverlayImageUri(image: GeoImage, mode: GeoBackgroundMode) {
  if (mode === 'original') return Promise.resolve(image.uri);

  const key = `${image.uri}|${image.width}x${image.height}|${mode}`;
  const existing = overlayCache.get(key);
  if (existing) return existing;

  const task = buildCleanOverlay(image, mode).catch((error) => {
    overlayCache.delete(key);
    throw error;
  });
  overlayCache.set(key, task);
  return task;
}
