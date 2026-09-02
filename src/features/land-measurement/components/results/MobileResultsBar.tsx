import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ChevronUp, Printer, Ruler, X } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { DECIMALS } from '../../utils/calculations';
import { formatFeetInches } from '../../utils/canvas';
import { Fonts } from '../../../../constants/typography';
import { getPolygonAreaLabelLayout } from '../../utils/polygon-label';
import { groupPolygonSegments } from '../../utils/geometry';

const PDF_DIRECTORY_KEY = 'mmp_pdf_download_directory';
const REPORT_IMAGE_MAX_DIMENSION = 1800;

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const formatMeasurement = (value: number) => value.toFixed(DECIMALS);

async function prepareReportImageData() {
  const mapImage = useMapStore.getState().mapImage;
  if (!mapImage?.uri) return null;

  try {
    const maxSide = Math.max(mapImage.width, mapImage.height, 1);
    const ratio = Math.min(1, REPORT_IMAGE_MAX_DIMENSION / maxSide);
    const context = ImageManipulator.manipulate(mapImage.uri);
    if (ratio < 1) {
      context.resize({
        width: Math.max(1, Math.round(mapImage.width * ratio)),
        height: Math.max(1, Math.round(mapImage.height * ratio)),
      });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
    return await FileSystem.readAsStringAsync(saved.uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch {
    // PDF generation must still work even if a device cannot prepare the map preview.
    return null;
  }
}

const buildReportHtml = (state: ReturnType<typeof useMapStore.getState>, imageData: string | null) => {
  const { plots, mapImage, reportInfo, isShowDiagonals } = state;
  const totals = plots.reduce((sum, plot) => ({ sqft: sum.sqft + plot.results.sqft, shotok: sum.shotok + plot.results.shotok, katha: sum.katha + plot.results.katha }), { sqft: 0, shotok: 0, katha: 0 });
  const width = mapImage?.width ?? 1200;
  const height = mapImage?.height ?? 900;
  const overlay = plots.map((plot) => {
    const color = plot.color ?? '#0F766E';
    const shape = `<polygon points="${plot.points.map((point) => `${point.x},${point.y}`).join(' ')}" fill="${color}" fill-opacity=".10" stroke="${color}" stroke-width="${Math.max(width, height) / 500}"/>`;
    const edges = groupPolygonSegments(plot.points).map((group) => {
      const first = group[0]?.point;
      const last = group.at(-1)?.nextPoint;
      if (!first || !last) return '';
      const value = group.reduce((sum, segment) => sum + (plot.results.lengths[segment.i] ?? 0), 0);
      return `<text x="${(first.x + last.x) / 2}" y="${(first.y + last.y) / 2}" class="edge" fill="${color}">${escapeHtml(formatFeetInches(value))}</text>`;
    }).join('');
    const center = getPolygonAreaLabelLayout(plot.points).center;
    const area = `<text x="${center.x}" y="${center.y}" class="area" fill="${color}">${escapeHtml(`${formatMeasurement(plot.results.shotok)} shotok`)}</text>`;
    const diagonals = isShowDiagonals ? (plot.results.diagonals ?? []).map((diagonal) => {
      const start = plot.points[diagonal.p1Index];
      const end = plot.points[diagonal.p2Index];
      return start && end ? `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${Math.max(width, height) / 900}" stroke-dasharray="10 8" opacity=".55"/>` : '';
    }).join('') : '';
    return `${shape}${diagonals}${edges}${area}`;
  }).join('');
  const map = imageData ? `<img src="data:image/jpeg;base64,${imageData}"/>` : '';
  const rows = plots.map((plot, index) => `<tr><td>${escapeHtml(plot.name || `Plot ${index + 1}`)}</td><td>${formatMeasurement(plot.results.shotok)}</td><td>${formatMeasurement(plot.results.katha)}</td><td>${formatMeasurement(plot.results.sqft)}</td><td>${escapeHtml(formatFeetInches(plot.results.perimeter))}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>@page{margin:24px}body{font-family:Arial,sans-serif;color:#172033}h1{text-align:center;font-size:22px;margin:0 0 4px}.sub{text-align:center;color:#526175;font-size:11px}.info{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin:14px 0;font-size:11px}.map{position:relative;width:100%;max-height:510px;overflow:hidden;border:1px solid #ccd5df;background:#f4e3d2}.map img{display:block;width:100%;height:100%;object-fit:contain}.map svg{position:absolute;inset:0;width:100%;height:100%}.edge,.area{font-weight:700;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:${Math.max(width, height) / 350};stroke-linejoin:round}.edge{font-size:${Math.max(width, height) / 75}px}.area{font-size:${Math.max(width, height) / 62}px}table{width:100%;border-collapse:collapse;margin-top:14px;font-size:10px}th,td{border:1px solid #ccd5df;padding:6px;text-align:center}th{background:#e8f1ee}.totals{display:flex;gap:9px;margin-top:10px}.totals b{flex:1;padding:8px;background:#e8f5ee;text-align:center;font-size:11px}</style></head><body><h1>Land Measurement Report</h1><div class="sub">Mouza Map Pro</div><div class="info"><span>Mouza: <b>${escapeHtml(reportInfo.mouza || '—')}</b></span><span>J.L. No: <b>${escapeHtml(reportInfo.jlNo || '—')}</b></span><span>Dag No: <b>${escapeHtml(reportInfo.dagNo || '—')}</b></span><span>Khatian No: <b>${escapeHtml(reportInfo.khatianNo || '—')}</b></span><span>Date: <b>${escapeHtml(reportInfo.date || '—')}</b></span><span>Surveyor: <b>${escapeHtml(reportInfo.surveyorName || '—')}</b></span></div>${mapImage ? `<div class="map" style="aspect-ratio:${width}/${height}">${map}<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${overlay}</svg></div>` : ''}<div class="totals"><b>Total shotok: ${formatMeasurement(totals.shotok)}</b><b>Total katha: ${formatMeasurement(totals.katha)}</b><b>Sq ft: ${formatMeasurement(totals.sqft)}</b></div><table><thead><tr><th>Plot</th><th>Shotok</th><th>Katha</th><th>Sq ft</th><th>Perimeter</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
};

export function MobileResultsBar() {
  const mode = useMapStore((state) => state.mode);
  const plots = useMapStore((state) => state.plots);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const totals = useMemo(() => plots.reduce((sum, plot) => ({ sqft: sum.sqft + plot.results.sqft, shotok: sum.shotok + plot.results.shotok, katha: sum.katha + plot.results.katha }), { sqft: 0, shotok: 0, katha: 0 }), [plots]);

  if (plots.length === 0 || mode !== 'none') return null;

  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const state = useMapStore.getState();
      const imageData = await prepareReportImageData();
      const result = await Print.printToFileAsync({ html: buildReportHtml(state, imageData) });
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
      <TouchableOpacity activeOpacity={0.82} style={styles.wrapper} onPress={() => setOpen(true)}>
        <View style={styles.icon}><Ruler size={17} color='#22c55e' /></View>
        <View style={styles.total}><Text style={styles.label}>Total • {plots.length} plots</Text><Text style={styles.value}>{formatMeasurement(totals.shotok)} shotok</Text></View>
        <View style={styles.unit}><Text style={styles.unitLabel}>Katha</Text><Text style={styles.unitValue}>{formatMeasurement(totals.katha)}</Text></View>
        <View style={styles.unit}><Text style={styles.unitLabel}>Sq ft</Text><Text style={styles.unitValue}>{formatMeasurement(totals.sqft)}</Text></View>
        <ChevronUp size={17} color='#94a3b8' />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType='slide' onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View><Text style={styles.sheetTitle}>Measurement Results</Text><Text style={styles.sheetSub}>Complete calculation for all plots</Text></View>
              <View style={styles.headerActions}>
                <TouchableOpacity disabled={exporting} style={[styles.print, exporting && styles.disabled]} onPress={exportPdf}>
                  {exporting ? <ActivityIndicator size='small' color='#86efac' /> : <Printer size={17} color='#86efac' />}
                  <Text style={styles.printText}>{exporting ? 'Creating…' : 'Download PDF'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.close} onPress={() => setOpen(false)}><X size={18} color='#94a3b8' /></TouchableOpacity>
              </View>
            </View>
            <View style={styles.summary}>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total shotok</Text><Text style={styles.summaryValue}>{formatMeasurement(totals.shotok)}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total katha</Text><Text style={styles.summaryValue}>{formatMeasurement(totals.katha)}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Sq ft</Text><Text style={styles.summaryValue}>{formatMeasurement(totals.sqft)}</Text></View>
            </View>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {plots.map((plot) => <View key={plot.id} style={styles.plotCard}>
                <View style={styles.plotHeader}><View style={[styles.colorDot, { backgroundColor: plot.color ?? '#0f766e' }]} /><Text style={styles.plotName}>{plot.name}</Text><Text style={styles.plotArea}>{formatMeasurement(plot.results.shotok)} shotok</Text></View>
                <View style={styles.metrics}><Text style={styles.metric}>Katha: {formatMeasurement(plot.results.katha)}</Text><Text style={styles.metric}>Sq ft: {formatMeasurement(plot.results.sqft)}</Text><Text style={styles.metric}>Perimeter: {formatFeetInches(plot.results.perimeter)}</Text></View>
                <Text style={styles.sideTitle}>Side lengths</Text>
                <View style={styles.chips}>{plot.results.lengths.map((length, index) => <View key={`${plot.id}-length-${index}`} style={styles.chip}><Text style={styles.chipText}>{index + 1}. {formatFeetInches(length)}</Text></View>)}</View>
                {plot.results.diagonals && plot.results.diagonals.length > 0 && <><Text style={styles.sideTitle}>Diagonals</Text><View style={styles.chips}>{plot.results.diagonals.map((diagonal, index) => <View key={`${plot.id}-diagonal-${index}`} style={[styles.chip, styles.diagonalChip]}><Text style={styles.chipText}>{index + 1}. {formatFeetInches(diagonal.lengthFt)}</Text></View>)}</View></>}
              </View>)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', bottom: 82, left: 10, right: 10, zIndex: 19, minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(15,23,42,0.97)' },
  icon: { width: 34, height: 34, marginRight: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: 'rgba(34,197,94,0.12)' },
  total: { flex: 1 }, label: { color: '#94a3b8', fontFamily: Fonts.headingMedium, fontSize: 9.5 }, value: { color: '#fff', fontFamily: Fonts.headingBold, fontSize: 14 },
  unit: { minWidth: 57, marginRight: 8 }, unitLabel: { color: '#64748b', fontFamily: Fonts.headingMedium, fontSize: 8.5 }, unitValue: { color: '#cbd5e1', fontFamily: Fonts.headingSemiBold, fontSize: 10.5 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,0.68)' },
  sheet: { maxHeight: '82%', paddingTop: 16, paddingHorizontal: 15, paddingBottom: 22, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: '#fff', fontFamily: Fonts.headingBold, fontSize: 17 },
  sheetSub: { color: '#94a3b8', fontFamily: Fonts.sansRegular, fontSize: 10 },
  close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#1e293b' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  print: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 9, backgroundColor: 'rgba(34,197,94,0.12)' },
  printText: { color: '#86efac', fontFamily: Fonts.headingBold, fontSize: 10 },
  summary: { marginTop: 14, flexDirection: 'row', gap: 7 },
  summaryItem: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#111827' },
  summaryLabel: { color: '#64748b', fontFamily: Fonts.headingMedium, fontSize: 9 },
  summaryValue: { marginTop: 1, color: '#86efac', fontFamily: Fonts.headingBold, fontSize: 13 },
  list: { marginTop: 12 },
  listContent: { paddingBottom: 16, gap: 10 },
  plotCard: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#111827' },
  plotHeader: { flexDirection: 'row', alignItems: 'center' },
  colorDot: { width: 9, height: 9, marginRight: 7, borderRadius: 5 },
  plotName: { flex: 1, color: '#f8fafc', fontFamily: Fonts.headingBold, fontSize: 13 },
  plotArea: { color: '#86efac', fontFamily: Fonts.headingBold, fontSize: 12 },
  metrics: { marginTop: 8, gap: 2 },
  metric: { color: '#cbd5e1', fontFamily: Fonts.sansRegular, fontSize: 10.5 },
  sideTitle: { marginTop: 9, marginBottom: 5, color: '#94a3b8', fontFamily: Fonts.headingSemiBold, fontSize: 9.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: '#1e293b' },
  diagonalChip: { backgroundColor: '#312e81' },
  chipText: { color: '#e2e8f0', fontFamily: Fonts.headingMedium, fontSize: 9.5 },
  disabled: { opacity: 0.5 },
});
