import { useEffect, useMemo, useState } from 'react';
import type { GeoImage } from '../types';
import { getGeoOverlayPreviewUri } from '../utils/overlay-image';

export function useGeoOverlayPreview(
  image: GeoImage | null,
  backgroundRemoved: boolean,
  backgroundSensitivity: number,
) {
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let active = true;

    if (!image || !backgroundRemoved) {
      setProcessedUri(null);
      setProcessing(false);
      return () => {
        active = false;
      };
    }

    setProcessing(true);
    void getGeoOverlayPreviewUri(image, backgroundSensitivity)
      .then((uri) => {
        if (active) setProcessedUri(uri);
      })
      .catch(() => {
        if (active) setProcessedUri(null);
      })
      .finally(() => {
        if (active) setProcessing(false);
      });

    return () => {
      active = false;
    };
  }, [backgroundRemoved, backgroundSensitivity, image]);

  const displayImage = useMemo<GeoImage | null>(() => {
    if (!image) return null;
    if (!backgroundRemoved || !processedUri) return image;
    return { ...image, uri: processedUri };
  }, [backgroundRemoved, image, processedUri]);

  return { displayImage, processing };
}
