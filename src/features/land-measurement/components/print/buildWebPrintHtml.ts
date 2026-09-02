import { useMapStore } from '../../store/useMapStore';
import {
  AREA_LABEL_FONT_SCALE,
  AREA_LABEL_PADDING_FACTOR,
  MIN_EDGE_LABEL_FT,
  formatFeetInches,
} from '../../utils/canvas';
import { computePrintLabels } from './PrintLabelEngine';

const BRAND_LOGO_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABCcAAAQnAEmzTo0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAP+SURBVHgB1ZrPTxNBFMff21aspJKFEAMVTXvTSCIe5WK9oRfBg8YTJdEzP/wDhD+AX2ejlCPGKDe9ES54tCYmHrsJSevBSK0NVGxnnLdYs7Q77ezuIO3n4jq73b7v+zEzzCuCAlnOzUgJRjjCPQ48iRzigGCCTjgUxDszAJgBBtuxHtxU+Rg2u2kbvg/TnPEZ7Qa3xkLENBiwPngOLdlDUgFf9/k0q/L5UzC8HosBWxiKhtNuN10F5Ep8WcR0BtoKXIlFcbZhtH4gX+JrIs9T0IYIu9IXo6Ep55jh/A95vl2NJxAwdZQdzrG/CM+nhPFr0BHw2Vg0tEJXtoD8AY/zKt8Sl3HoDAq/fmMi0YuFoxRiMAmdYzxhdoWZPcnYEciVWBY6SwBhRyGcK1bG4QSM392rwG6hYl8PD3ZBT8QAzZiRMIyEGWJS96ufvfsOzz8Uj409udkDC3f6QCdVYOOGgXgdNLLxsdRgPEFjbuNBELbfIuePgCYoZZa2CtL7i+JescxAI3ESoG2v80p4v5b3bpDxmqNgakt/MnyxifdrkACdUdAmQMV4goxXfVYFLQLI+5Q+qlAUaJrVgRYBfjw6+/Yb6CCwAK/er7FjlWEnW4agBBYw+0buyZePLsDyRL/0/pKGWggkgDxInnTj6W0Txq52w8MbUXsVdv28higEEiDL40tm2BZQg65pzI2gUfAtYKPJolW/56GNnCyVgkbBtwCZ5yhlKHXqGU1EYOxKt6d3qeBLgMz7lCZzSfnOZOV+v+u2mqLgZyYjfAmQeZzO9d6w9HNkvLM2nPhdnT0LaOb9ByJ9WkEz0mg80jDudz3xLEDm/ddTA6DKXJMoeN3oeRIg8z4VbrPUqYcK2m1toHd73W57EuDm/VaFK4Nqwa2gvW63lQXIvN+qcGXICtrrHz3KAmTeVylcGZRGwwNdDeNeoqAk4P2XfVfv02YtKPMuJxVkPH2nCiSg5QTslqtUuNcGuyAoshV6yFRKS/to0Wr1FH2JczPmt3BlLNztO+Ykej99pwIZg3G+rfLkC5EuNRGPRe76KVwZzt0rCVFdU4TtnzD/kyc52ifTLaHc/HHAtBrv5HP+EC6LdysfQyJOYHaPm2fPcDrcPe1emFesWNRIGHTGzjlfhQ5D2LxO/9qxOqwY1O3Qd1hz8lhG2EjThS2AoiA0LUCHQG3XWu/4X7VQz4l1QCqRjc6ecUObNVesiu44TkI7wvh6rCeUcg41zFf0QDtGgmyqN55wnXCHzodmRE+WGsoWnDb0IxDRViWb3G43/bEHtV9ZhaUQ8f93MYXhom+9ehg1VhKI0hkSQZFckY8zZEm7JcVFV+dkfm5j0dYmBMZmOQqZZobX+AN3xr1nX6IyBgAAAABJRU5ErkJggg==';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const toBengaliNumber = (value: unknown) => {
  const digits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  };
  return String(value ?? '').replace(/[0-9]/g, (digit) => digits[digit]);
};

export const buildWebPrintHtml = (state: ReturnType<typeof useMapStore.getState>) => {
  const { plots, results, isShowDiagonals, reportInfo } = state;
  if (plots.length === 0) return '';

  const sumShotok = plots.reduce((sum, plot) => sum + (plot.results?.shotok || 0), 0) || (results?.shotok || 0);
  const sumKatha = plots.reduce((sum, plot) => sum + (plot.results?.katha || 0), 0) || (results?.katha || 0);
  const sumSqft = plots.reduce((sum, plot) => sum + (plot.results?.sqft || 0), 0) || (results?.sqft || 0);
  const totalShotok = sumShotok.toFixed(3);
  const totalKatha = sumKatha.toFixed(3);
  const totalSqft = Math.round(sumSqft).toLocaleString('en-US');

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const plot of plots) {
    for (const point of plot.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  if (!Number.isFinite(minX)) return '';

  const boundsWidth = Math.max(1, maxX - minX);
  const boundsHeight = Math.max(1, maxY - minY);
  const maxDim = Math.max(boundsWidth, boundsHeight);
  const paddingX = maxDim * 0.1;
  const paddingY = maxDim * 0.1;
  const viewBoxMinX = minX - paddingX;
  const viewBoxMinY = minY - paddingY;
  const viewBoxWidth = boundsWidth + paddingX * 2;
  const viewBoxHeight = boundsHeight + paddingY * 2;
  const baseScale = Math.max(viewBoxWidth, viewBoxHeight);
  const strokeW = baseScale * 0.005;
  const fontSize = baseScale * 0.018;
  const labelPad = baseScale * 0.005;
  const labelOffset = baseScale * 0.02;
  const areaFontSize = fontSize * Math.max(0.78, AREA_LABEL_FONT_SCALE * 0.85);
  const reportLabelFontSize = areaFontSize * 1.1;

  const { allLabels, plotPolygons } = computePrintLabels(plots, {
    baseScale,
    fontSize: reportLabelFontSize,
    labelPad,
    labelOffset,
  });

  const polygonsSvg = plotPolygons.map(({ plot, pointsStr }) => {
    const color = plot.color || '#0F766E';
    return `<polygon points="${pointsStr}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="${strokeW}" stroke-linejoin="round" />`;
  }).join('');

  const diagonalsSvg = isShowDiagonals
    ? plots.flatMap((plot) => (plot.results.diagonals ?? []).map((diagonal, index) => {
        const p1 = plot.points[diagonal.p1Index];
        const p2 = plot.points[diagonal.p2Index];
        if (!p1 || !p2) return '';
        const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (distPx < baseScale * 0.05) return '';
        const color = plot.color || '#0F766E';
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const labelText = diagonal.lengthFt >= MIN_EDGE_LABEL_FT
          ? toBengaliNumber(formatFeetInches(diagonal.lengthFt))
          : '';
        const label = labelText
          ? `<text x="${midX}" y="${midY}" font-size="${reportLabelFontSize * 0.85}" font-weight="700" fill="#0F766E" text-anchor="middle" dominant-baseline="central">${escapeHtml(labelText)}</text>`
          : '';
        return `<g data-diagonal="${plot.id}-${index}"><line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${color}" stroke-width="${strokeW * 0.4}" stroke-dasharray="${baseScale * 0.005}, ${baseScale * 0.005}" opacity="0.5" />${label}</g>`;
      })).join('')
    : '';

  const edgeLabelsSvg = allLabels.map((label) => (
    `<g transform="translate(${label.lx}, ${label.ly}) rotate(${label.rotation})"><text x="0" y="0" font-size="${label.fontSize}" font-weight="700" fill="#0F766E" stroke="rgba(255,255,255,0.96)" stroke-width="${baseScale * 0.0022}" stroke-linejoin="round" paint-order="stroke" text-anchor="middle" dominant-baseline="central">${escapeHtml(toBengaliNumber(label.labelText))}</text></g>`
  )).join('');

  const areaLabelsSvg = plotPolygons.map(({ plot, areaLabelLayout }) => {
    if (!plot.results) return '';
    const color = plot.color || '#0F766E';
    const areaText = `${toBengaliNumber(plot.results.shotok.toFixed(2))} শতক`;
    return `<g transform="translate(${areaLabelLayout.center.x}, ${areaLabelLayout.center.y}) rotate(${areaLabelLayout.rotation})"><text x="0" y="0" font-size="${reportLabelFontSize}" font-weight="700" fill="${color}" stroke="rgba(255,255,255,0.96)" stroke-width="${baseScale * 0.003}" stroke-linejoin="round" paint-order="stroke" text-anchor="middle" dominant-baseline="central">${escapeHtml(areaText)}</text></g>`;
  }).join('');

  const breakdownRows = plots.length > 1
    ? plots.map((plot, index) => {
        const rowBackground = index % 2 === 0 ? '#ffffff' : 'rgba(240,253,250,0.55)';
        const name = plot.name ? toBengaliNumber(plot.name) : `প্লট ${toBengaliNumber(index + 1)}`;
        return `<tr style="background:${rowBackground}">
          <td class="plot-name">${escapeHtml(name)}</td>
          <td class="plot-shotok">${toBengaliNumber(plot.results.shotok.toFixed(2))}</td>
          <td>${toBengaliNumber(plot.results.katha.toFixed(2))}</td>
          <td>${toBengaliNumber(Math.round(plot.results.sqft).toLocaleString('en-US'))}</td>
          <td class="plot-perimeter">${toBengaliNumber(Math.round(plot.results.perimeter))} ফুট</td>
        </tr>`;
      }).join('')
    : '';

  const displayDate = reportInfo?.date
    ? toBengaliNumber(reportInfo.date)
    : toBengaliNumber(new Date().toLocaleDateString('bn-BD'));
  const displayMouza = reportInfo?.mouza || '—';
  const displayJl = reportInfo?.jlNo ? toBengaliNumber(reportInfo.jlNo) : '—';
  const displayKhatian = reportInfo?.khatianNo ? toBengaliNumber(reportInfo.khatianNo) : '—';
  const displayDag = reportInfo?.dagNo ? toBengaliNumber(reportInfo.dagNo) : '—';
  const surveyorName = reportInfo?.surveyorName || '—';

  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 210mm; height: 297mm; background: #fff; }
  body { font-family: "Noto Sans Bengali", "Hind Siliguri", Arial, sans-serif; color: #111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; height: 297mm; padding: 6mm; overflow: hidden; background: #fff; }
  .outer-frame { width: 100%; height: 100%; border: 2px solid #115e59; border-radius: 2px; padding: 2mm; }
  .inner-frame { width: 100%; height: 100%; border: 1px solid rgba(13,148,136,0.30); border-radius: 1px; padding: 3mm; display: flex; flex-direction: column; overflow: hidden; }
  .header { display: flex; flex-direction: column; gap: 2mm; padding-bottom: 2mm; border-bottom: 2px solid rgba(17,94,89,0.80); }
  .header-row { display: flex; align-items: center; justify-content: space-between; min-height: 13mm; }
  .brand { width: 52mm; display: flex; align-items: center; gap: 2.5mm; }
  .brand img { width: 10.5mm; height: 10.5mm; object-fit: contain; border-radius: 2px; }
  .brand-name { margin: 0; color: #134e4a; font-size: 16px; line-height: 1; font-weight: 900; }
  .brand-sub { margin-top: 1.2mm; color: #0f766e; font-size: 8.5px; line-height: 1.2; font-weight: 700; letter-spacing: .35px; }
  .report-title { flex: 1; padding: 0 3mm; text-align: center; }
  .report-title h1 { margin: 0; color: #042f2e; font-size: 20px; line-height: 1.2; font-weight: 900; }
  .report-title p { margin: 1mm 0 0; color: #6b7280; font-family: Arial, sans-serif; font-size: 8.5px; font-weight: 600; letter-spacing: .45px; }
  .ref-meta { width: 39mm; text-align: right; color: #6b7280; font-size: 8.5px; line-height: 1.55; }
  .ref-meta strong { color: #1f2937; font-weight: 700; }
  .ref-meta .plot-count { color: #115e59; }
  .meta-box { border: 1px solid #99f6e4; border-radius: 3px; background: rgba(240,253,250,0.36); padding: 2.5mm; font-size: 9.5px; line-height: 1.35; }
  .meta-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 4mm; row-gap: 1.5mm; }
  .meta-item { display: flex; align-items: baseline; gap: 1.5mm; min-width: 0; }
  .meta-label { color: #4b5563; font-weight: 700; white-space: nowrap; }
  .meta-value { min-width: 0; color: #111827; font-weight: 800; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .meta-wide { grid-column: span 2; }
  .meta-total-label { color: #134e4a; font-weight: 900; }
  .meta-total { color: #0f766e; font-size: 10.5px; font-weight: 900; }
  .meta-total-sub { color: #4b5563; font-size: 8.5px; }
  .map-area { position: relative; flex: 1; min-height: 0; width: 100%; margin: 2mm 0; border: 1px solid #e5e7eb; border-radius: 3px; background: rgba(249,250,251,0.20); overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .map-area > svg.map-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .compass { position: absolute; top: 2.5mm; right: 2.5mm; z-index: 2; padding: 1mm 1.5mm; border: 1px solid #d1d5db; border-radius: 3px; background: rgba(255,255,255,0.94); }
  .scale-badge { position: absolute; top: 2.5mm; left: 2.5mm; z-index: 2; padding: .6mm 2mm; border: 1px solid #e5e7eb; border-radius: 3px; background: rgba(255,255,255,0.94); color: rgba(17,94,89,0.82); font-size: 8px; font-weight: 700; }
  .breakdown { margin-bottom: 2mm; }
  .breakdown table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; text-align: center; font-size: 8.5px; }
  .breakdown th { padding: 1mm 2mm; border: 1px solid #0f766e; background: #115e59; color: #fff; font-weight: 700; }
  .breakdown td { padding: .65mm 2mm; border: 1px solid #e5e7eb; }
  .plot-name { color: #1f2937; font-weight: 800; }
  .plot-shotok { color: #115e59; font-weight: 800; }
  .plot-perimeter { color: #4b5563; }
  .signatures { padding: 2mm 0 1mm; border-top: 1px solid #e5e7eb; }
  .signature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; text-align: center; color: #1f2937; font-size: 9.5px; }
  .signature-space { height: 9mm; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; margin-bottom: 1mm; }
  .signature-name { width: 100%; padding-bottom: .5mm; color: #134e4a; font-size: 9.5px; font-weight: 800; }
  .signature-line { width: 44mm; border-bottom: 1px dashed #6b7280; }
  .signature-label { color: #1f2937; font-weight: 800; }
  .signature-sub { margin-top: .5mm; color: #6b7280; font-size: 7.5px; }
  .auth-footer { display: flex; align-items: center; justify-content: space-between; gap: 4mm; padding-top: 1.5mm; border-top: 1px solid rgba(229,231,235,0.85); color: #6b7280; font-size: 7.5px; }
  .auth-footer strong, .auth-url { color: #115e59; font-weight: 800; }
</style>
</head>
<body>
  <main class="page">
    <div class="outer-frame">
      <div class="inner-frame">
        <header class="header">
          <div class="header-row">
            <div class="brand">
              <img src="${BRAND_LOGO_DATA_URI}" alt="Mouza Map Pro" />
              <div>
                <div class="brand-name">মৌজা ম্যাপ প্রো</div>
                <div class="brand-sub">স্মার্ট ডিজিটাল ভূমি পরিমাপ ও জরিপ</div>
              </div>
            </div>
            <div class="report-title">
              <h1>ভূমি পরিমাপ ও নকশা প্রতিবেদন</h1>
              <p>LAND MEASUREMENT &amp; SURVEY REPORT</p>
            </div>
            <div class="ref-meta">
              <div>তারিখ: <strong>${escapeHtml(displayDate)}</strong></div>
              <div>প্লট সংখ্যা: <strong class="plot-count">${toBengaliNumber(plots.length)} টি</strong></div>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-grid">
              <div class="meta-item"><span class="meta-label">মৌজা:</span><span class="meta-value">${escapeHtml(displayMouza)}</span></div>
              <div class="meta-item"><span class="meta-label">জে. এল. নং:</span><span class="meta-value">${escapeHtml(displayJl)}</span></div>
              <div class="meta-item"><span class="meta-label">খতিয়ান নং:</span><span class="meta-value">${escapeHtml(displayKhatian)}</span></div>
              <div class="meta-item"><span class="meta-label">দাগ নং:</span><span class="meta-value">${escapeHtml(displayDag)}</span></div>
              <div class="meta-item meta-wide"><span class="meta-total-label">মোট ক্ষেত্রফল:</span><span class="meta-total">${toBengaliNumber(totalShotok)} শতক</span><span class="meta-total-sub">(${toBengaliNumber(totalKatha)} কাঠা / ${toBengaliNumber(totalSqft)} বর্গফুট)</span></div>
              <div class="meta-item meta-wide"><span class="meta-label">সার্ভেয়ার / আমিন:</span><span class="meta-value">${escapeHtml(surveyorName)}</span></div>
            </div>
          </div>
        </header>

        <section class="map-area">
          <div class="compass">
            <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="12,2 17,14 12,11" fill="#DC2626" />
              <polygon points="12,2 7,14 12,11" fill="#EF4444" />
              <polygon points="12,20 17,13 12,15" fill="#94A3B8" />
              <polygon points="12,20 7,13 12,15" fill="#CBD5E1" />
              <circle cx="12" cy="13" r="2" fill="#1E293B" />
              <text x="12" y="27" text-anchor="middle" font-size="7" font-weight="bold" fill="#0F766E">উত্তর</text>
            </svg>
          </div>
          <div class="scale-badge">📐 ডিজিটাল স্কেল নকশা</div>
          <svg class="map-svg" preserveAspectRatio="xMidYMid meet" viewBox="${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}">
            ${polygonsSvg}
            ${diagonalsSvg}
            ${edgeLabelsSvg}
            ${areaLabelsSvg}
          </svg>
        </section>

        ${plots.length > 1 ? `<section class="breakdown"><table><thead><tr><th>প্লট নং</th><th>শতক</th><th>কাঠা</th><th>বর্গফুট</th><th>পরিসীমা</th></tr></thead><tbody>${breakdownRows}</tbody></table></section>` : ''}

        <section class="signatures">
          <div class="signature-grid">
            <div><div class="signature-space"><div class="signature-line"></div></div><div class="signature-label">জমির মালিক / আবেদনকারী</div><div class="signature-sub">স্বাক্ষর ও তারিখ</div></div>
            <div><div class="signature-space"><div class="signature-line"></div></div><div class="signature-label">সাক্ষীগণের স্বাক্ষর</div><div class="signature-sub">নাম ও তারিখ সহ</div></div>
            <div><div class="signature-space"><div class="signature-name">${escapeHtml(reportInfo?.surveyorName || '')}</div><div class="signature-line"></div></div><div class="signature-label">সার্ভেয়ার / আমিনের স্বাক্ষর</div><div class="signature-sub">স্বাক্ষর ও সিল</div></div>
          </div>
        </section>

        <footer class="auth-footer">
          <span>এই প্রতিবেদনটি <strong>মৌজা ম্যাপ প্রো</strong> ডিজিটাল প্ল্যাটফর্ম দ্বারা প্রস্তুতকৃত। নির্ভুল স্কেল ও জ্যামিতিক সূত্রে গণনাকৃত।</span>
          <span class="auth-url">www.mouzamappro.com</span>
        </footer>
      </div>
    </div>
  </main>
</body>
</html>`;
};
