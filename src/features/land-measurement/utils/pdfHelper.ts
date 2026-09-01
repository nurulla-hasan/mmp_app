export interface PdfDpiInfo {
  dpi: number;
  pageWidthInches: number;
  pageHeightInches: number;
  pageWidthPoints: number;
  pageHeightPoints: number;
  imageWidthPx: number;
  imageHeightPx: number;
}

export async function detectPdfDpi(source: any): Promise<PdfDpiInfo | null> {
  return null;
}

export async function extractImageFromPDF(source: any): Promise<{ dataUrl: string; width: number; height: number; dpiInfo: PdfDpiInfo | null } | null> {
  return null;
}
