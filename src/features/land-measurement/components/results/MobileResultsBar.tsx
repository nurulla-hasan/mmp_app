import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ChevronUp, Printer, Ruler, X } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { DECIMALS } from '../../utils/calculations';
import {
  AREA_LABEL_FONT_SCALE,
  MIN_EDGE_LABEL_FT,
  formatFeetInches,
} from '../../utils/canvas';
import { Fonts } from '../../../../constants/typography';
import { useThemeStore } from '../../../../stores/theme-store';
import { getLandMeasurementToolColors } from '../../utils/tool-theme';
import { computePrintLabels } from '../print/PrintLabelEngine';

const PDF_DIRECTORY_KEY = 'mmp_pdf_download_directory';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const formatMeasurement = (value: number) => value.toFixed(DECIMALS);

const toBengaliNumber = (value: unknown) => {
  const digits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  };
  return String(value ?? '').replace(/[0-9]/g, (digit) => digits[digit]);
};

const buildWebPrintHtml = (state: ReturnType<typeof useMapStore.getState>) => {
  const { plots, results, isShowDiagonals, reportInfo } = state;
  if (plots.length === 0) return '';

  const totalShotok = plots.length > 0
    ? plots.reduce((sum, plot) => sum + plot.results.shotok, 0).toFixed(3)
    : results?.shotok.toFixed(3) ?? '';

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const plot of plots) {
    for (const point of plot.points) {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
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
          ? formatFeetInches(diagonal.lengthFt)
          : '';
        const label = labelText
          ? `<text x="${midX}" y="${midY}" font-size="${reportLabelFontSize * 0.85}" font-weight="700" fill="#0F766E" text-anchor="middle" dominant-baseline="central">${escapeHtml(labelText)}</text>`
          : '';
        return `<g data-diagonal="${plot.id}-${index}"><line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${color}" stroke-width="${strokeW * 0.4}" stroke-dasharray="${baseScale * 0.005}, ${baseScale * 0.005}" opacity="0.5" />${label}</g>`;
      })).join('')
    : '';

  const edgeLabelsSvg = allLabels.map((label) => (
    `<g transform="translate(${label.lx}, ${label.ly}) rotate(${label.rotation})"><text x="0" y="0" font-size="${label.fontSize}" font-weight="700" fill="#0F766E" stroke="rgba(255,255,255,0.96)" stroke-width="${baseScale * 0.0022}" stroke-linejoin="round" paint-order="stroke" text-anchor="middle" dominant-baseline="central">${escapeHtml(label.labelText)}</text></g>`
  )).join('');

  const areaLabelsSvg = plotPolygons.map(({ plot, areaLabelLayout }) => {
    if (!plot.results) return '';
    const color = plot.color || '#0F766E';
    const areaText = `${plot.results.shotok.toFixed(2)} শতক`;
    return `<g transform="translate(${areaLabelLayout.center.x}, ${areaLabelLayout.center.y}) rotate(${areaLabelLayout.rotation})"><text x="0" y="0" font-size="${reportLabelFontSize}" font-weight="700" fill="${color}" stroke="rgba(255,255,255,0.96)" stroke-width="${baseScale * 0.003}" stroke-linejoin="round" paint-order="stroke" text-anchor="middle" dominant-baseline="central">${escapeHtml(areaText)}</text></g>`;
  }).join('');

  const value = (text?: string | null) => text ? toBengaliNumber(text) : '';

  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 210mm; height: 297mm; background: #fff; }
  body { font-family: Arial, "Noto Sans Bengali", sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; height: 297mm; padding: 7mm 8mm 3mm; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
  .header { display: flex; flex-direction: column; align-items: center; margin-bottom: 2mm; }
  .title { margin: 0 0 4mm; padding: 0 8mm 2mm; border-bottom: 3px solid #0d9488; color: #115e59; font-size: 30px; line-height: 1.15; font-weight: 900; letter-spacing: -0.4px; }
  .info-grid { width: 100%; padding: 0 4mm; display: grid; grid-template-columns: 1fr 1fr; column-gap: 16mm; row-gap: 3mm; font-size: 17.6px; }
  .field { display: flex; align-items: flex-end; min-width: 0; }
  .field-label { flex: 0 0 30mm; color: #374151; font-weight: 700; white-space: nowrap; }
  .field-label.wide { flex-basis: 34mm; }
  .field-value { min-width: 0; flex: 1; min-height: 7mm; padding: 0 1mm 0.5mm; border-bottom: 1.5px dashed #9ca3af; text-align: center; color: #111827; font-weight: 700; overflow: hidden; white-space: nowrap; }
  .field-value.total { color: #0f766e; font-size: 20px; }
  .plot-area { position: relative; flex: 1; min-height: 0; width: 100%; margin-top: 4mm; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .plot-area svg { width: 100%; height: 100%; display: block; }
  .footer { margin-top: 2mm; padding: 2mm 8mm 0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 18px; color: #000; }
  .signature { width: 56mm; text-align: center; }
  .signature.surveyor { width: 64mm; }
  .signature-line { height: 7mm; margin-bottom: 2mm; padding-bottom: 0.5mm; border-bottom: 1.5px dashed #4b5563; color: #111827; font-weight: 700; }
  .signature-label { color: #374151; font-weight: 700; }
  .generated { margin-top: 1mm; text-align: center; color: #166534; font-size: 12px; font-weight: 500; }
  .generated span { color: #2563eb; text-decoration: underline; }
</style>
</head>
<body>
  <main class="page">
    <header class="header">
      <h1 class="title">ভূমি পরিমাপ প্রতিবেদন</h1>
      <div class="info-grid">
        <div class="field"><span class="field-label">মৌজা:</span><span class="field-value">${escapeHtml(value(reportInfo?.mouza))}</span></div>
        <div class="field"><span class="field-label wide">খতিয়ান নং:</span><span class="field-value">${escapeHtml(value(reportInfo?.khatianNo))}</span></div>
        <div class="field"><span class="field-label">জে. এল. নং:</span><span class="field-value">${escapeHtml(value(reportInfo?.jlNo))}</span></div>
        <div class="field"><span class="field-label wide">দাগ নং:</span><span class="field-value">${escapeHtml(value(reportInfo?.dagNo))}</span></div>
        <div class="field"><span class="field-label">মোট পরিমাণ:</span><span class="field-value total">${totalShotok ? `${toBengaliNumber(totalShotok)} শতক` : ''}</span></div>
        <div class="field"><span class="field-label wide">তারিখ:</span><span class="field-value">${escapeHtml(value(reportInfo?.date))}</span></div>
      </div>
    </header>

    <section class="plot-area">
      <svg preserveAspectRatio="xMidYMid meet" viewBox="${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}">
        ${polygonsSvg}
        ${diagonalsSvg}
        ${edgeLabelsSvg}
        ${areaLabelsSvg}
      </svg>
    </section>

    <footer class="footer">
      <div class="signature"><div class="signature-line">&nbsp;</div><div class="signature-label">উপস্থিত সাক্ষীদের স্বাক্ষর</div></div>
      <div class="signature surveyor"><div class="signature-line">${escapeHtml(reportInfo?.surveyorName || '')}</div><div class="signature-label">সার্ভেয়ারের স্বাক্ষর</div></div>
    </footer>
    <div class="generated">Generated by <span>Mouza Map Pro</span></div>
  </main>
</body>
</html>`;
};

export function MobileResultsBar() {
  const mode = useMapStore((state) => state.mode);
  const plots = useMapStore((state) => state.plots);
  const { theme } = useThemeStore();
  const colors = getLandMeasurementToolColors(theme);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const totals = useMemo(() => plots.reduce((sum, plot) => ({ sqft: sum.sqft + plot.results.sqft, shotok: sum.shotok + plot.results.shotok, katha: sum.katha + plot.results.katha }), { sqft: 0, shotok: 0, katha: 0 }), [plots]);

  if (plots.length === 0 || mode !== 'none') return null;

  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const html = buildWebPrintHtml(useMapStore.getState());
      if (!html) throw new Error('No plots to print');
      const result = await Print.printToFileAsync({ html });
      const fileBaseName = `Mouza-Map-Pro-${Date.now()}`;
      const displayFileName = `${fileBaseName}.pdf`;

      if (Platform.OS === 'android') {
        let directoryUri = await AsyncStorage.getItem(PDF_DIRECTORY_KEY);
        if (!directoryUri) {
          const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
          const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
          if (!permission.granted) {
            Alert.alert('Download cancelled', 'Allow access to the Download folder to save PDF reports.');
            return;
          }
          directoryUri = permission.directoryUri;
          await AsyncStorage.setItem(PDF_DIRECTORY_KEY, directoryUri);
        }

        const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
          directoryUri,
          fileBaseName,
          'application/pdf',
        );
        const pdfBase64 = await FileSystem.readAsStringAsync(result.uri, { encoding: FileSystem.EncodingType.Base64 });
        await FileSystem.writeAsStringAsync(targetUri, pdfBase64, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert('PDF downloaded', `${displayFileName}\nSaved in your Download folder.`);
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Land Measurement Report' });
      } else {
        Alert.alert('Report created', result.uri);
      }
    } catch {
      if (Platform.OS === 'android') await AsyncStorage.removeItem(PDF_DIRECTORY_KEY);
      Alert.alert('Report failed', 'Could not create the PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.82}
        style={[styles.wrapper, { backgroundColor: colors.overlay, borderColor: colors.panelBorder }]}
        onPress={() => setOpen(true)}
      >
        <View style={styles.icon}><Ruler size={17} color={colors.success} /></View>
        <View style={styles.total}>
          <Text style={[styles.label, { color: colors.textSoft }]}>Total • {plots.length} plots</Text>
          <Text style={[styles.value, { color: colors.textStrong }]}>{formatMeasurement(totals.shotok)} shotok</Text>
        </View>
        <View style={styles.unit}><Text style={[styles.unitLabel, { color: colors.textSoft }]}>Katha</Text><Text style={[styles.unitValue, { color: colors.textStrong }]}>{formatMeasurement(totals.katha)}</Text></View>
        <View style={styles.unit}><Text style={[styles.unitLabel, { color: colors.textSoft }]}>Sq ft</Text><Text style={[styles.unitValue, { color: colors.textStrong }]}>{formatMeasurement(totals.sqft)}</Text></View>
        <ChevronUp size={17} color={colors.textSoft} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType='slide' onRequestClose={() => setOpen(false)}>
        <View style={[styles.backdrop, { backgroundColor: colors.overlayStrong }]}>
          <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.panel, borderColor: colors.panelBorder }]}>
            <View style={styles.sheetHeader}>
              <View><Text style={[styles.sheetTitle, { color: colors.textStrong }]}>Measurement Results</Text><Text style={[styles.sheetSub, { color: colors.textSoft }]}>Complete calculation for all plots</Text></View>
              <View style={styles.headerActions}>
                <TouchableOpacity disabled={exporting} style={[styles.print, exporting && styles.disabled]} onPress={exportPdf}>
                  {exporting ? <ActivityIndicator size='small' color={colors.success} /> : <Printer size={17} color={colors.success} />}
                  <Text style={[styles.printText, { color: colors.success }]}>{exporting ? 'Creating…' : 'Download A4 PDF'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.close, { backgroundColor: colors.panelRaised }]} onPress={() => setOpen(false)}><X size={18} color={colors.textSoft} /></TouchableOpacity>
              </View>
            </View>
            <View style={styles.summary}>
              <View style={[styles.summaryItem, { backgroundColor: colors.panelAlt }]}><Text style={[styles.summaryLabel, { color: colors.textSoft }]}>Total shotok</Text><Text style={[styles.summaryValue, { color: colors.success }]}>{formatMeasurement(totals.shotok)}</Text></View>
              <View style={[styles.summaryItem, { backgroundColor: colors.panelAlt }]}><Text style={[styles.summaryLabel, { color: colors.textSoft }]}>Total katha</Text><Text style={[styles.summaryValue, { color: colors.success }]}>{formatMeasurement(totals.katha)}</Text></View>
              <View style={[styles.summaryItem, { backgroundColor: colors.panelAlt }]}><Text style={[styles.summaryLabel, { color: colors.textSoft }]}>Sq ft</Text><Text style={[styles.summaryValue, { color: colors.success }]}>{formatMeasurement(totals.sqft)}</Text></View>
            </View>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {plots.map((plot) => <View key={plot.id} style={[styles.plotCard, { backgroundColor: colors.panelAlt, borderColor: colors.panelBorder }]}>
                <View style={styles.plotHeader}><View style={[styles.colorDot, { backgroundColor: plot.color ?? '#0f766e' }]} /><Text style={[styles.plotName, { color: colors.textStrong }]}>{plot.name}</Text><Text style={[styles.plotArea, { color: colors.success }]}>{formatMeasurement(plot.results.shotok)} shotok</Text></View>
                <View style={styles.metrics}><Text style={[styles.metric, { color: colors.textSoft }]}>Katha: {formatMeasurement(plot.results.katha)}</Text><Text style={[styles.metric, { color: colors.textSoft }]}>Sq ft: {formatMeasurement(plot.results.sqft)}</Text><Text style={[styles.metric, { color: colors.textSoft }]}>Perimeter: {formatFeetInches(plot.results.perimeter)}</Text></View>
                <Text style={[styles.sideTitle, { color: colors.textSoft }]}>Side lengths</Text>
                <View style={styles.chips}>{plot.results.lengths.map((length, index) => <View key={`${plot.id}-length-${index}`} style={[styles.chip, { backgroundColor: colors.panelRaised }]}><Text style={[styles.chipText, { color: colors.textStrong }]}>{index + 1}. {formatFeetInches(length)}</Text></View>)}</View>
                {plot.results.diagonals && plot.results.diagonals.length > 0 && <><Text style={[styles.sideTitle, { color: colors.textSoft }]}>Diagonals</Text><View style={styles.chips}>{plot.results.diagonals.map((diagonal, index) => <View key={`${plot.id}-diagonal-${index}`} style={[styles.chip, { backgroundColor: colors.blueBg }]}><Text style={[styles.chipText, { color: colors.blueText }]}>{index + 1}. {formatFeetInches(diagonal.lengthFt)}</Text></View>)}</View></>}
              </View>)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', bottom: 82, left: 10, right: 10, zIndex: 19, minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13, borderWidth: 1 },
  icon: { width: 34, height: 34, marginRight: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: 'rgba(34,197,94,0.12)' },
  total: { flex: 1 },
  label: { fontFamily: Fonts.headingMedium, fontSize: 9.5 },
  value: { fontFamily: Fonts.headingBold, fontSize: 14 },
  unit: { minWidth: 57, marginRight: 8 },
  unitLabel: { fontFamily: Fonts.headingMedium, fontSize: 8.5 },
  unitValue: { fontFamily: Fonts.headingSemiBold, fontSize: 10.5 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '82%', paddingTop: 16, paddingHorizontal: 15, paddingBottom: 22, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontFamily: Fonts.headingBold, fontSize: 17 },
  sheetSub: { fontFamily: Fonts.sansRegular, fontSize: 10 },
  close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  print: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 9, backgroundColor: 'rgba(34,197,94,0.12)' },
  printText: { fontFamily: Fonts.headingBold, fontSize: 10 },
  disabled: { opacity: 0.5 },
  summary: { marginTop: 14, flexDirection: 'row', gap: 7 },
  summaryItem: { flex: 1, padding: 10, borderRadius: 10 },
  summaryLabel: { fontFamily: Fonts.headingMedium, fontSize: 9 },
  summaryValue: { marginTop: 1, fontFamily: Fonts.headingBold, fontSize: 13 },
  list: { marginTop: 12 },
  listContent: { paddingBottom: 16, gap: 10 },
  plotCard: { padding: 12, borderRadius: 12, borderWidth: 1 },
  plotHeader: { flexDirection: 'row', alignItems: 'center' },
  colorDot: { width: 9, height: 9, marginRight: 7, borderRadius: 5 },
  plotName: { flex: 1, fontFamily: Fonts.headingBold, fontSize: 13 },
  plotArea: { fontFamily: Fonts.headingBold, fontSize: 12 },
  metrics: { marginTop: 8, gap: 2 },
  metric: { fontFamily: Fonts.sansRegular, fontSize: 10.5 },
  sideTitle: { marginTop: 9, marginBottom: 5, fontFamily: Fonts.headingSemiBold, fontSize: 9.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  chipText: { fontFamily: Fonts.headingMedium, fontSize: 9.5 },
});
