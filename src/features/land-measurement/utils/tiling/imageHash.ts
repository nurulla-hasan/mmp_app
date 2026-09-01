/**
 * Compute a deterministic hash for an image to use as cache key.
 *
 * Strategy: use a combination of image dimensions + name, which is fast
 * and avoids pixel-level hashing of potentially huge images.
 */

export async function computeImageHash(
  image: HTMLImageElement,
  imageName: string,
): Promise<string> {
  const raw = `${image.width}x${image.height}:${imageName}`;

  // Try SHA-256 via Web Crypto (available in secure contexts)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(raw);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, 16); // first 16 hex chars is enough
  }

  // Fallback for non-HTTPS: simple string hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
