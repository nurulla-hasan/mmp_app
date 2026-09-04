import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useMapStore } from '../../store/useMapStore';
import { buildWebPrintHtml } from './buildWebPrintHtml';

const BRAND_LOGO_MODULE = require('../../../../../assets/logo.png');

const loadOriginalBrandLogoDataUri = async () => {
  const asset = Asset.fromModule(BRAND_LOGO_MODULE);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  if (!asset.localUri) return null;

  const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return `data:image/png;base64,${base64}`;
};

export const buildWebPrintHtmlWithBrandLogo = async (
  state: ReturnType<typeof useMapStore.getState>,
) => {
  const html = buildWebPrintHtml(state);
  if (!html) return html;

  try {
    const originalLogoDataUri = await loadOriginalBrandLogoDataUri();
    if (!originalLogoDataUri) return html;

    return html.replace(
      /<img src="data:image\/png;base64,[^"]+" alt="Mouza Map Pro" \/>/,
      `<img src="${originalLogoDataUri}" alt="Mouza Map Pro" />`,
    );
  } catch {
    return html;
  }
};
