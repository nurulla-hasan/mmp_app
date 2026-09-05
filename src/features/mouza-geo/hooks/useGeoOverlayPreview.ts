import { useEffect, useMemo, useState } from 'react';
import type { GeoImage } from '../types';
import { getGeoOverlayPreviewUri } from '../utils/overlay-image';

type PreviewState = {
  sourceUri: string;
  uri: string;
};

export function useGeoOverlayPreview(
  image: GeoImage | null,
  backgroundRemoved: boolean,
  backgroundSensitivity: number,
) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let active = true;

    if (!image) {
      setPreview(null);
      setProcessing(false);
      return () => {
        active = false;
      };
    }

    setProcessing(true);
    void getGeoOverlayPreviewUri(
      image,
      backgroundRemoved ? backgroundSensitivity : null,
    )
      .then((uri) => {
        if (active) setPreview({ sourceUri: image.uri, uri });
      })
      .catch(() => {
        if (active) setPreview(null);
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
    if (!preview || preview.sourceUri !== image.uri) return image;
    return { ...image, uri: preview.uri };
  }, [image, preview]);

  return { displayImage, processing };
}
