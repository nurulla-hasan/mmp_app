import { AlphaType, ColorType, Skia } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import type { GeoBackgroundMode, GeoImage } from '../types';

const MAX_OVERLAY_EDGE = 1800;
const overlayCache = new Map<string, Promise<string>>();

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const getLuma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

function isolateBlackInk(
  pixels: Uint8Array,
  mode: Exclude<GeoBackgroundMode, 'original'>,
) {
  // Mouza plot lines and labels are dark ink. Background-removal mode should
  // therefore keep only dark, near-neutral pixels and make every paper/color
  // tone transparent instead of trying to key out one sampled background color.
  const cutoff = mode === 'soft' ? 165 : 125;
  const fullInk = mode === 'soft' ? 72 : 58;
  const chromaLimit = mode === 'soft' ? 92 : 64;

  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const originalAlpha = pixels[index + 3];
    if (!originalAlpha) continue;

    const luma = getLuma(r, g, b);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);

    const darkness = luma <= fullInk
      ? 1
      : clamp01((cutoff - luma) / Math.max(1, cutoff - fullInk));
    const neutrality = chroma <= chromaLimit * 0.45
      ? 1
      : clamp01((chromaLimit - chroma) / Math.max(1, chromaLimit * 0.55));
    const alphaFactor = darkness * neutrality;

    // Render the retained survey ink as true black so it stays readable over
    // satellite imagery. Everything else fades to transparent.
    pixels[index] = 0;
    pixels[index + 1] = 0;
    pixels[index + 2] = 0;
    pixels[index + 3] = Math.round(originalAlpha * alphaFactor);
  }
}

async function buildCleanOverlay(
  image: GeoImage,
  mode: Exclude<GeoBackgroundMode, 'original'>,
) {
  const maxEdge = Math.max(image.width, image.height, 1);
  const actions: Parameters<typeof ImageManipulator.manipulateAsync>[1] = [];
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

  isolateBlackInk(rawPixels, mode);
  const cleanedImage = Skia.Image.MakeImage(
    imageInfo,
    Skia.Data.fromBytes(rawPixels),
    width * 4,
  );
  if (!cleanedImage) throw new Error('Could not create the black-ink overlay.');

  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error('App cache is unavailable.');
  const uri = `${cacheDirectory}mouza-geo-black-ink-${mode}-${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(uri, cleanedImage.encodeToBase64(), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

export function getGeoOverlayImageUri(image: GeoImage, mode: GeoBackgroundMode) {
  if (mode === 'original') return Promise.resolve(image.uri);

  const key = `${image.uri}|${image.width}x${image.height}|black-ink-v2|${mode}`;
  const existing = overlayCache.get(key);
  if (existing) return existing;

  const task = buildCleanOverlay(image, mode).catch((error) => {
    overlayCache.delete(key);
    throw error;
  });
  overlayCache.set(key, task);
  return task;
}
