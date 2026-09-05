import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FileUp, RotateCcw, Trash2, X } from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/typography';
import { useThemeStore } from '../../../stores/theme-store';
import { useModalSafeBottomPadding } from '../../../components/common/keyboard-safe-layout';
import { useMouzaGeoStore } from '../store/useMouzaGeoStore';
import { calculateResidualMeters } from '../utils/geo-math';

type Props = { visible: boolean; onClose: () => void; onOpenImport: () => void };

export function GeoSettingsSheet({ visible, onClose, onOpenImport }: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const bottomPadding = useModalSafeBottomPadding();
  const image = useMouzaGeoStore((state) => state.image);
  const pairs = useMouzaGeoStore((state) => state.controlPairs);
  const transform = useMouzaGeoStore((state) => state.transform);
  const alignmentMode = useMouzaGeoStore((state) => state.alignmentMode);
  const mapStyle = useMouzaGeoStore((state) => state.mapStyle);
  const opacity = useMouzaGeoStore((state) => state.opacity);
  const setAlignmentMode = useMouzaGeoStore((state) => state.setAlignmentMode);
  const setMapStyle = useMouzaGeoStore((state) => state.setMapStyle);
  const setOpacity = useMouzaGeoStore((state) => state.setOpacity);
  const removePair = useMouzaGeoStore((state) => state.removePair);
  const resetAlignment = useMouzaGeoStore((state) => state.resetAlignment);
  const residual = transform ? calculateResidualMeters(transform, pairs) : null;

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder, paddingBottom: bottomPadding }]}>
          <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
          <View style={styles.header}>
            <View><Text style={[styles.title, { color: colors.text }]}>Geo Settings</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>{pairs.length} control pair{pairs.length === 1 ? '' : 's'}{residual !== null ? ` • RMS ${residual.toFixed(1)} m` : ''}</Text></View>
            <TouchableOpacity style={[styles.close, { backgroundColor: colors.iconBtnBg }]} onPress={onClose}><X size={18} color={colors.textMuted} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <TouchableOpacity style={[styles.importBtn, { borderColor: colors.border }]} onPress={() => { onClose(); onOpenImport(); }}>
              <FileUp size={16} color='#2563eb' /><Text style={[styles.importText, { color: colors.text }]} numberOfLines={1}>{image?.name ?? 'Choose mouza map'}</Text>
            </TouchableOpacity>

            <Section title='World map' color={colors.textMuted}>
              <View style={styles.row}>
                <Chip label='Satellite' active={mapStyle === 'satellite'} onPress={() => setMapStyle('satellite')} colors={colors} />
                <Chip label='Street' active={mapStyle === 'standard'} onPress={() => setMapStyle('standard')} colors={colors} />
              </View>
            </Section>

            <Section title='Overlay opacity' color={colors.textMuted}>
              <View style={styles.row}>{[0.4, 0.6, 0.72, 0.9].map((value) => <Chip key={value} label={`${Math.round(value * 100)}%`} active={Math.abs(opacity - value) < 0.02} onPress={() => setOpacity(value)} colors={colors} />)}</View>
            </Section>

            <Section title='Alignment' color={colors.textMuted}>
              <View style={styles.row}>
                <Chip label='Similarity 2+' active={alignmentMode === 'similarity'} onPress={() => setAlignmentMode('similarity')} colors={colors} />
                <Chip label='Affine 3+' active={alignmentMode === 'affine'} disabled={pairs.length < 3} onPress={() => setAlignmentMode('affine')} colors={colors} />
              </View>
              <Text style={[styles.help, { color: colors.textMuted }]}>Similarity is fastest and stable. Use Affine only with 3+ well-spaced points when the scanned sheet has distortion.</Text>
            </Section>

            <Section title='Control points' color={colors.textMuted}>
              {pairs.length ? pairs.map((pair, index) => (
                <View key={pair.id} style={[styles.pairRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <View style={styles.pairBadge}><Text style={styles.pairBadgeText}>{index + 1}</Text></View>
                  <Text numberOfLines={1} style={[styles.pairText, { color: colors.textMuted }]}>{pair.world.lat.toFixed(6)}, {pair.world.lng.toFixed(6)}</Text>
                  <TouchableOpacity onPress={() => removePair(pair.id)}><Trash2 size={16} color='#ef4444' /></TouchableOpacity>
                </View>
              )) : <Text style={[styles.help, { color: colors.textMuted }]}>Move the map under the fixed crosshair and confirm each source/world point pair.</Text>}
            </Section>

            {(pairs.length > 0 || transform) && (
              <TouchableOpacity style={[styles.resetBtn, { borderColor: 'rgba(239,68,68,0.3)' }]} onPress={resetAlignment}>
                <RotateCcw size={15} color='#ef4444' /><Text style={styles.resetText}>Reset alignment</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color }]}>{title}</Text>{children}</View>;
}

function Chip({ label, active, disabled, onPress, colors }: { label: string; active: boolean; disabled?: boolean; onPress: () => void; colors: typeof Colors.light | typeof Colors.dark }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.chip, { borderColor: active ? '#2563eb' : colors.border, backgroundColor: active ? 'rgba(37,99,235,0.12)' : colors.background }, disabled && { opacity: 0.4 }]}><Text style={[styles.chipText, { color: active ? '#2563eb' : colors.textMuted }]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,0.62)' },
  sheet: { maxHeight: '82%', paddingHorizontal: 16, paddingTop: 8, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1 },
  handle: { width: 42, height: 4, borderRadius: 99, alignSelf: 'center', opacity: 0.45, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontFamily: Fonts.headingBold, fontSize: 17 },
  subtitle: { fontFamily: Fonts.sansRegular, fontSize: 10.5, marginTop: -2 },
  close: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  content: { gap: 14 },
  importBtn: { minHeight: 42, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11 },
  importText: { flex: 1, fontFamily: Fonts.headingSemiBold, fontSize: 11.5 },
  section: { gap: 8 },
  sectionTitle: { fontFamily: Fonts.headingSemiBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9 },
  chipText: { fontFamily: Fonts.headingSemiBold, fontSize: 10.5 },
  help: { fontFamily: Fonts.sansRegular, fontSize: 10, lineHeight: 14 },
  pairRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 9, marginBottom: 6 },
  pairBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
  pairBadgeText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  pairText: { flex: 1, fontFamily: Fonts.sansMedium, fontSize: 10.5 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  resetText: { color: '#ef4444', fontFamily: Fonts.headingSemiBold, fontSize: 11.5 },
});
