import { jsPDF } from 'jspdf';
import { PAGE_WIDTH, PAGE_HEIGHT } from './scratchMath';
import type { SavedPlotRecord } from '../types/map';

export const createPrintImage = (svgRef: React.RefObject<SVGSVGElement | null>) => new Promise<string>((resolve) => {
  if (!svgRef.current) {
    resolve('');
    return;
  }
  const scale = 4; // High resolution, but JPEG keeps file size manageable (~2MB)
  const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(PAGE_WIDTH * scale));
  clone.setAttribute('height', String(PAGE_HEIGHT * scale));
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'center center';
  clone.style.background = 'white';
  const serialized = new XMLSerializer().serializeToString(clone);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  const image = new window.Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_WIDTH * scale;
    canvas.height = PAGE_HEIGHT * scale;
    const context = canvas.getContext('2d');
    if (!context) {
      resolve(svgDataUrl);
      return;
    }
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL('image/jpeg', 1.0));
  };
  image.onerror = () => resolve(svgDataUrl);
  image.src = svgDataUrl;
});

export const downloadScratchPdf = async (svgRef: React.RefObject<SVGSVGElement | null>, selectedPlots: SavedPlotRecord[]) => {
  const image = await createPrintImage(svgRef);
  if (!image) return;

  // Create jsPDF instance (A4 size: 210x297 mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add the generated image to the PDF (using JPEG to save space)
  pdf.addImage(image, 'JPEG', 0, 0, 210, 297);

  // Determine filename
  let filename = 'Scratch_Sheet.pdf';
  if (selectedPlots.length === 1) {
    filename = `${selectedPlots[0].name}.pdf`;
  } else if (selectedPlots.length > 1) {
    filename = `Plots_${selectedPlots.map(p => p.name).join('_')}.pdf`;
    if (filename.length > 50) filename = 'Multiple_Plots.pdf';
  }

  // Download on web
  pdf.save(filename);
};
