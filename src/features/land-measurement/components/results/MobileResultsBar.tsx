import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronUp, Ruler, X } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { formatFeetInches } from '../../utils/canvas';
import { toBengaliDigits } from '../../../../lib/utils';
import { Fonts } from '../../../../constants/typography';

export function MobileResultsBar() {
  const mode = useMapStore((state) => state.mode);
  const plots = useMapStore((state) => state.plots);
  const [open, setOpen] = useState(false);
  const totals = useMemo(() => plots.reduce((sum, plot) => ({ sqft: sum.sqft + plot.results.sqft, shotok: sum.shotok + plot.results.shotok, katha: sum.katha + plot.results.katha }), { sqft: 0, shotok: 0, katha: 0 }), [plots]);

  if (plots.length === 0 || mode !== 'none') return null;

  return (
    <>
      <TouchableOpacity activeOpacity={0.82} style={styles.wrapper} onPress={() => setOpen(true)}>
        <View style={styles.icon}><Ruler size={17} color='#22c55e' /></View>
        <View style={styles.total}><Text style={styles.label}>মোট {toBengaliDigits(plots.length)} প্লট</Text><Text style={styles.value}>{toBengaliDigits(totals.shotok.toFixed(3))} শতক</Text></View>
        <View style={styles.unit}><Text style={styles.unitLabel}>কাঠা</Text><Text style={styles.unitValue}>{toBengaliDigits(totals.katha.toFixed(3))}</Text></View>
        <View style={styles.unit}><Text style={styles.unitLabel}>বর্গফুট</Text><Text style={styles.unitValue}>{toBengaliDigits(totals.sqft.toFixed(1))}</Text></View>
        <ChevronUp size={17} color='#94a3b8' />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType='slide' onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>জমি পরিমাপের ফলাফল</Text><Text style={styles.sheetSub}>সব প্লটের পূর্ণ হিসাব</Text></View><TouchableOpacity style={styles.close} onPress={() => setOpen(false)}><X size={18} color='#94a3b8' /></TouchableOpacity></View>
            <View style={styles.summary}>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>মোট শতক</Text><Text style={styles.summaryValue}>{toBengaliDigits(totals.shotok.toFixed(3))}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>মোট কাঠা</Text><Text style={styles.summaryValue}>{toBengaliDigits(totals.katha.toFixed(3))}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>বর্গফুট</Text><Text style={styles.summaryValue}>{toBengaliDigits(totals.sqft.toFixed(1))}</Text></View>
            </View>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {plots.map((plot) => <View key={plot.id} style={styles.plotCard}>
                <View style={styles.plotHeader}><View style={[styles.colorDot, { backgroundColor: plot.color ?? '#0f766e' }]} /><Text style={styles.plotName}>{plot.name}</Text><Text style={styles.plotArea}>{toBengaliDigits(plot.results.shotok.toFixed(3))} শতক</Text></View>
                <View style={styles.metrics}><Text style={styles.metric}>কাঠা: {toBengaliDigits(plot.results.katha.toFixed(3))}</Text><Text style={styles.metric}>বর্গফুট: {toBengaliDigits(plot.results.sqft.toFixed(1))}</Text><Text style={styles.metric}>পরিসীমা: {formatFeetInches(plot.results.perimeter)}</Text></View>
                <Text style={styles.sideTitle}>বাহুর দৈর্ঘ্য</Text>
                <View style={styles.chips}>{plot.results.lengths.map((length, index) => <View key={`${plot.id}-length-${index}`} style={styles.chip}><Text style={styles.chipText}>{toBengaliDigits(index + 1)}. {formatFeetInches(length)}</Text></View>)}</View>
                {plot.results.diagonals && plot.results.diagonals.length > 0 && <><Text style={styles.sideTitle}>কর্ণ</Text><View style={styles.chips}>{plot.results.diagonals.map((diagonal, index) => <View key={`${plot.id}-diagonal-${index}`} style={[styles.chip, styles.diagonalChip]}><Text style={styles.chipText}>{toBengaliDigits(index + 1)}. {formatFeetInches(diagonal.lengthFt)}</Text></View>)}</View></>}
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
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sheetTitle: { color: '#fff', fontFamily: Fonts.headingBold, fontSize: 17 }, sheetSub: { color: '#94a3b8', fontFamily: Fonts.sansRegular, fontSize: 10 }, close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#1e293b' },
  summary: { marginTop: 14, flexDirection: 'row', gap: 7 }, summaryItem: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#111827' }, summaryLabel: { color: '#64748b', fontFamily: Fonts.headingMedium, fontSize: 9 }, summaryValue: { marginTop: 1, color: '#86efac', fontFamily: Fonts.headingBold, fontSize: 13 },
  list: { marginTop: 12 }, listContent: { paddingBottom: 16, gap: 10 }, plotCard: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#111827' }, plotHeader: { flexDirection: 'row', alignItems: 'center' }, colorDot: { width: 9, height: 9, marginRight: 7, borderRadius: 5 }, plotName: { flex: 1, color: '#f8fafc', fontFamily: Fonts.headingBold, fontSize: 13 }, plotArea: { color: '#86efac', fontFamily: Fonts.headingBold, fontSize: 12 }, metrics: { marginTop: 8, gap: 2 }, metric: { color: '#cbd5e1', fontFamily: Fonts.sansRegular, fontSize: 10.5 }, sideTitle: { marginTop: 9, marginBottom: 5, color: '#94a3b8', fontFamily: Fonts.headingSemiBold, fontSize: 9.5 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, chip: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: '#1e293b' }, diagonalChip: { backgroundColor: '#312e81' }, chipText: { color: '#e2e8f0', fontFamily: Fonts.headingMedium, fontSize: 9.5 },
});
