import { StateCreator } from 'zustand';
import { ErrorToast } from '@/lib/utils';
import { extractImageFromPDF, detectPdfDpi } from '../../utils/pdfHelper';
import type { PdfDpiInfo } from '../../utils/pdfHelper';
import { computeImageHash, generateTilePyramidChunked, clearTileUrlCache, clearTiles, TILING_MIN_PIXEL_COUNT } from '../../utils/tiling';
import type { TilePyramidInfo } from '../../utils/tiling';

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MAP_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

/**
 * Detect the maximum safe canvas/texture size for the current device.
 * Falls back to 4096 if WebGL is unavailable.
 */
function detectMaxTextureSize(): number {
  if (typeof document === 'undefined') return 4096;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const size = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      return size as number;
    }
  } catch { /* WebGL unavailable */ }
  return 4096;
}

/**
 * Returns a safe max dimension for GPU upload.
 * For low-end phones this is often 2048 or 4096.
 * We use 4096 as safe default — Konva will crash above this on many devices.
 */
function getSafeMaxDimension(): number {
  const detected = detectMaxTextureSize();
  // Use 80% of detected to leave headroom
  return Math.min(detected, 4096);
}

/**
 * Downscale an image so its longest side fits within `maxPx`.
 * Uses canvas + toBlob(webp) for GPU-memory-friendly downscaling.
 * WebP at quality 0.8 is ~5-10× smaller than PNG.
 */
function downscaleImage(img: HTMLImageElement, maxPx: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.min(maxPx / w, maxPx / h, 1);
    if (scale >= 1) { resolve(img); return; }

    const cvs = document.createElement('canvas');
    cvs.width = Math.round(w * scale);
    cvs.height = Math.round(h * scale);
    const ctx = cvs.getContext('2d')!;
    // Use high-quality downscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, cvs.width, cvs.height);

    const result = new window.Image();
    let objectUrl: string | null = null;
    result.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      cvs.width = 1;
      cvs.height = 1;
      resolve(result);
    };
    result.onerror = (error) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(error);
    };
    // WebP at 0.8 is much smaller than PNG — great for memory-constrained devices
    cvs.toBlob((blob) => {
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        result.src = objectUrl;
      } else {
        result.src = cvs.toDataURL('image/png');
      }
    }, 'image/webp', 0.8);
  });
}

export interface ImageState {
  image: any;
  /** Full-resolution original image (kept for accurate tile generation). */
  _originalImage: any;
  /** The natural dimensions of the full-resolution image. Used for coordinate system consistency. */
  originalWidth: number;
  originalHeight: number;
  selectedFile: any;
  imageName: string;
  isProcessingFile: boolean;
  /** Detected DPI info from PDF (only for PDF imports) */
  pdfDpiInfo: PdfDpiInfo | null;
  // Tiling
  tilePyramidInfo: TilePyramidInfo | null;
  isGeneratingTiles: boolean;
  tileProgress: number;
  /** Monotonic counter to discard stale tile generation completions. */
  _generationId: number;
  /** Hash currently being generated, so partial IndexedDB tiles can be cleared. */
  _activeTileHash: string | null;
}

export interface ImageActions {
  setImage: (image: any) => void;
  setImageUri: (uri: string, width?: number, height?: number) => void;
  setSelectedFile: (file: any) => void;
  setImageName: (name: string) => void;
  handleImageUpload: (e: any) => Promise<void>;
  processFile: (file: any) => Promise<boolean>;
  handleClearFile: () => Promise<void>;
  // Tiling
  buildTilePyramid: () => Promise<void>;
}

export type ImageSlice = ImageState & ImageActions;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createImageSlice: StateCreator<ImageSlice, [], [], ImageSlice> = (set, get, _store) => ({
  // State
  image: null,
  _originalImage: null,
  originalWidth: 1200,
  originalHeight: 900,
  selectedFile: null,
  imageName: 'map.jpg',
  isProcessingFile: false,
  pdfDpiInfo: null,
  tilePyramidInfo: null,
  isGeneratingTiles: false,
  tileProgress: 0,
  _generationId: 0,
  _activeTileHash: null,

  // Actions
  setImage: (image) => set({ image }),
  setImageUri: (uri, width = 1200, height = 900) =>
    set({
      image: uri,
      _originalImage: uri,
      originalWidth: width,
      originalHeight: height,
      imageName: 'mouza_map.jpg',
    }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  setImageName: (name) => set({ imageName: name }),

  handleImageUpload: async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const input = e.target;
    await get().processFile(file);

    // Reset input value so same file can be selected again
    if (input) input.value = '';
  },

  processFile: async (file: File) => {
    if (!ALLOWED_MAP_TYPES.has(file.type)) {
      ErrorToast('শুধু পিডিএফ (PDF), পিএনজি (PNG) এবং জেপিজি (JPG) ফাইল আপলোড করা যাবে');
      return false;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      ErrorToast('ফাইলটি অনেক বড়। দয়া করে ২৫ মেগাবাইটের (25 MB) কম সাইজের ফাইল আপলোড করুন।');
      return false;
    }

    const previousState = get();
    const generationId = previousState._generationId + 1;
    const previousHash =
      previousState.tilePyramidInfo?.imageHash ??
      previousState._activeTileHash;

    if (previousHash) {
      clearTileUrlCache(previousHash);
      void clearTiles(previousHash).catch((error: unknown) => {
        console.error('Failed to clear previous map tiles:', error);
      });
    }

    set({
      _generationId: generationId,
      isProcessingFile: true,
      image: null,
      _originalImage: null,
      tilePyramidInfo: null,
      isGeneratingTiles: false,
      tileProgress: 0,
      _activeTileHash: null,
    });

    if (file.type === 'application/pdf') {
      set({ imageName: file.name || 'document.pdf' });
      try {
        // Read once, then process sequentially to avoid two full PDF parses in memory.
        const pdfBuffer = await file.arrayBuffer();
        const dpiInfo = await detectPdfDpi(pdfBuffer);
        const img: any = await extractImageFromPDF(pdfBuffer);
        if (!img) return false;
        // ── Downscale for GPU safety on low-end devices ──
        const safeMax = getSafeMaxDimension();
        let displayImg = img;
        if (img.naturalWidth && (img.naturalWidth > safeMax || img.naturalHeight > safeMax)) {
          displayImg = await downscaleImage(img, safeMax);
          console.info(`📐 PDF image downscaled for GPU safety`);
        }
        if (get()._generationId !== generationId) return false;

        set({ 
          selectedFile: file, 
          image: displayImg, 
          _originalImage: img, 
          originalWidth: img.naturalWidth || img.width || 1200,
          originalHeight: img.naturalHeight || img.height || 900,
          pdfDpiInfo: dpiInfo, 
          isProcessingFile: false 
        });
        if (dpiInfo) {
          console.info(`📐 PDF DPI detected: ${dpiInfo.dpi} DPI (page: ${dpiInfo.pageWidthInches.toFixed(1)}"×${dpiInfo.pageHeightInches.toFixed(1)}", image: ${dpiInfo.imageWidthPx}×${dpiInfo.imageHeightPx}px)`);
        }
        // Start tile building in the background
        get().buildTilePyramid();
        return true;
      } catch {
        if (get()._generationId === generationId) {
          set({ selectedFile: null, imageName: '', isProcessingFile: false });
          ErrorToast('PDF লোড করা যায়নি (ফাইলটি ক্ষতিগ্রস্ত বা অবৈধ হতে পারে)');
        }
        return false;
      }
    } else {
      // ── Use URL.createObjectURL instead of FileReader (base64 = 33%+ memory overhead) ──
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      return new Promise<boolean>((resolve) => {
        img.onload = async () => {
          URL.revokeObjectURL(objectUrl);
          try {
            // ── Downscale for GPU safety on low-end devices ──
            const safeMax = getSafeMaxDimension();
            let displayImg: HTMLImageElement = img;
            if (img.naturalWidth > safeMax || img.naturalHeight > safeMax) {
              displayImg = await downscaleImage(img, safeMax);
              console.info(`📐 Image downscaled for GPU safety: ${img.naturalWidth}×${img.naturalHeight} → ${displayImg.naturalWidth}×${displayImg.naturalHeight} (max: ${safeMax})`);
            }
            if (get()._generationId !== generationId) {
              resolve(false);
              return;
            }

            set({ 
              selectedFile: file, 
              imageName: file.name || 'image', 
              image: displayImg, 
              _originalImage: img, 
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight,
              isProcessingFile: false 
            });
            // Start tile building in the background (uses original image for accuracy)
            get().buildTilePyramid();
            resolve(true);
          } catch {
            if (get()._generationId === generationId) {
              set({ selectedFile: null, imageName: '', isProcessingFile: false });
              ErrorToast('ম্যাপের ছবি প্রস্তুত করা যায়নি');
            }
            resolve(false);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          if (get()._generationId === generationId) {
            set({ selectedFile: null, imageName: '', isProcessingFile: false });
            ErrorToast('ম্যাপের ছবি ডিকোড করা যায়নি');
          }
          resolve(false);
        };
      });
    }
  },

  handleClearFile: async () => {
    // Bump generation counter to cancel any in-flight tile build
    set((s) => ({ _generationId: s._generationId + 1 }));
    // Clear tile caches and IndexedDB tiles if we had a pyramid
    const state = get();
    const hash =
      state.tilePyramidInfo?.imageHash ??
      state._activeTileHash;
    if (hash) {
      clearTileUrlCache(hash);
      try {
        await clearTiles(hash);
      } catch (err) {
        console.error('Failed to clear tiles from IndexedDB:', err);
      }
    }
    set({ 
      image: null, 
      _originalImage: null, 
      originalWidth: 0,
      originalHeight: 0,
      selectedFile: null, 
      imageName: '', 
      pdfDpiInfo: null, 
      isProcessingFile: false, 
      tilePyramidInfo: null, 
      isGeneratingTiles: false, 
      tileProgress: 0,
      _activeTileHash: null,
    });
    const fileInput = document.getElementById('map-upload') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  },

  buildTilePyramid: async () => {
    const state = get();
    // Use original full-res image for tile generation accuracy
    const img = state._originalImage || state.image;
    if (!img) return;

    // Only tile for images above the pixel threshold
    const totalPixels = img.naturalWidth * img.naturalHeight;
    if (totalPixels < TILING_MIN_PIXEL_COUNT) return;

    const generationId = state._generationId;
    const hash = await computeImageHash(img, state.imageName);

    if (get()._generationId !== generationId) return;

    set({
      isGeneratingTiles: true,
      tileProgress: 0,
      _activeTileHash: hash,
    });
    let lastReportedProgress = -1;

    try {
      const info = await generateTilePyramidChunked(
        img,
        hash,
        (percent) => {
          // Avoid a global store update for every tile when the percentage is unchanged.
          if (
            get()._generationId === generationId &&
            percent !== lastReportedProgress
          ) {
            lastReportedProgress = percent;
            set({ tileProgress: percent });
          }
        },
        8, // Smaller chunk size = less main-thread blocking
        () => get()._generationId !== generationId,
      );
      // Only commit result if still the active generation
      if (get()._generationId === generationId) {
        set({
          tilePyramidInfo: info,
          isGeneratingTiles: false,
          tileProgress: 100,
          _originalImage: null,
          _activeTileHash: null,
        });
      }
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        console.error('Tile pyramid generation failed:', err);
      }
      // Only reset state if still the active generation
      if (get()._generationId === generationId) {
        set({
          isGeneratingTiles: false,
          tileProgress: 0,
          _activeTileHash: null,
        });
      }
    }
  },
});
