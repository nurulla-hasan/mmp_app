import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ChevronUp, Printer, Ruler, X } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { DECIMALS } from '../../utils/calculations';
import { formatFeetInches } from '../../utils/canvas';
import { Fonts } from '../../../../constants/typography';
import { useThemeStore } from '../../../../stores/theme-store';
import { getLandMeasurementToolColors } from '../../utils/tool-theme';
import { buildWebPrintHtml } from '../print/buildWebPrintHtml';

const PDF_DIRECTORY_KEY = 'mmp_pdf_download_directory';

const formatMeasurement = (value: number) => value.toFixed(DECIMALS);

export function MobileResultsBar() {
  const mode = useMapStore((state) => state.mode);
  const plots = useMapStore((state) => state.plots);
  const { theme } = useThemeStore();
  const colors = getLandMeasurementToolColors(theme);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const totals = useMemo(
    () => plots.reduce(
      (sum, plot) => ({
        sqft: sum.sqft + plot.results.sqft,
        shotok: sum.shotok + plot.results.shotok,
        katha: sum.katha + plot.results.katha,
      }),
      { sqft: 0, shotok: 0, katha: 0 },
    ),
    [plots],
  );

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
        const pdfBase64 = await FileSystem.readAsStringAsync(result.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.writeAsStringAsync(targetUri, pdfBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        Alert.alert('PDF downloaded', `${displayFileName}\nSaved in your Download folder.`);
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Land Measurement Report',
        });
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
        <View style={styles.unit}>
          <Text style={[styles.unitLabel, { color: colors.textSoft }]}>Katha</Text>
          <Text style={[styles.unitValue, { color: colors.textStrong }]}>{formatMeasurement(totals.katha)}</Text>
        </View>
        <View style={styles.unit}>
          <Text style={[styles.unitLabel, { color: colors.textSoft }]}>Sq ft</Text>
          <Text style={[styles.unitValue, { color: colors.textStrong }]}>{formatMeasurement(totals.sqft)}</Text>
        </View>
        <ChevronUp size={17} color={colors.textSoft} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType='slide' onRequestClose={() => setOpen(false)}>
        <View style={[styles.backdrop, { backgroundColor: colors.overlayStrong }]}>
          <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.panel, borderColor: colors.panelBorder }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.textStrong }]}>Measurement Results</Text>
                <Text style={[styles.sheetSub, { color: colors.textSoft }]}>Complete calculation for all plots</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity disabled={exporting} style={[styles.print, exporting && styles.disabled]} onPress={exportPdf}>
                  {exporting ? <ActivityIndicator size='small' color={colors.success} /> : <Printer size={17} color={colors.success} />}
                  <Text style={[styles.printText, { color: colors.success }]}>{exporting ? 'Creating…' : 'Download A4 PDF'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.close, { backgroundColor: colors.panelRaised }]} onPress={() => setOpen(false)}>
                  <X size={18} color={colors.textSoft} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.summary}>
              <View style={[styles.summaryItem, { backgroundColor: colors.panelAlt }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSoft }]}>Total shotok</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>{formatMeasurement(totals.shotok)}</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: colors.panelAlt }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSoft }]}>Total katha</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>{formatMeasurement(totals.katha)}</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: colors.panelAlt }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSoft }]}>Sq ft</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>{formatMeasurement(totals.sqft)}</Text>
              </View>
            </View>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {plots.map((plot) => (
                <View key={plot.id} style={[styles.plotCard, { backgroundColor: colors.panelAlt, borderColor: colors.panelBorder }]}>
                  <View style={styles.plotHeader}>
                    <View style={[styles.colorDot, { backgroundColor: plot.color ?? '#0f766e' }]} />
                    <Text style={[styles.plotName, { color: colors.textStrong }]}>{plot.name}</Text>
                    <Text style={[styles.plotArea, { color: colors.success }]}>{formatMeasurement(plot.results.shotok)} shotok</Text>
                  </View>
                  <View style={styles.metrics}>
                    <Text style={[styles.metric, { color: colors.textSoft }]}>Katha: {formatMeasurement(plot.results.katha)}</Text>
                    <Text style={[styles.metric, { color: colors.textSoft }]}>Sq ft: {formatMeasurement(plot.results.sqft)}</Text>
                    <Text style={[styles.metric, { color: colors.textSoft }]}>Perimeter: {formatFeetInches(plot.results.perimeter)}</Text>
                  </View>
                  <Text style={[styles.sideTitle, { color: colors.textSoft }]}>Side lengths</Text>
                  <View style={styles.chips}>
                    {plot.results.lengths.map((length, index) => (
                      <View key={`${plot.id}-length-${index}`} style={[styles.chip, { backgroundColor: colors.panelRaised }]}>
                        <Text style={[styles.chipText, { color: colors.textStrong }]}>{index + 1}. {formatFeetInches(length)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
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
