import React from 'react';
import { Modal, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FileUp, RotateCcw, Trash2, X } from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/typography';
import { useThemeStore } from '../../../stores/theme-store';
import { useModalSafeBottomPadding } from '../../../components/common/keyboard-safe-layout';
import { useMouzaGeoStore } from '../store/useMouzaGeoStore';
import { calculateResidualMeters } from '../utils/geo-math';

const SLIDER_DEBOUNCE_MS = 250;

type Props = { visible: boolean; onClose: () => void; onOpenImport: () => void };

function useDebouncedCommit(
  value: number,
  committedValue: number,
  onCommit: (value: number) => void,
) {
  React.useEffect(() => {
    if (Math.abs(value - committedValue) < 0.0001) return undefined;
    const timer = setTimeout(() => onCommit(value), SLIDER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [committedValue, onCommit, value]);
}

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
  const backgroundRemoved = useMouzaGeoStore((state) => state.backgroundRemoved);
  const backgroundSensitivity = useMouzaGeoStore((state) => state.backgroundSensitivity);
  const exportQuality = useMouzaGeoStore((state) => state.exportQuality);
  const setAlignmentMode = useMouzaGeoStore((state) => state.setAlignmentMode);
  const setMapStyle = useMouzaGeoStore((state) => state.setMapStyle);
  const setOpacity = useMouzaGeoStore((state) => state.setOpacity);
  const setBackgroundRemoved = useMouzaGeoStore((state) => state.setBackgroundRemoved);
  const setBackgroundSensitivity = useMouzaGeoStore((state) => state.setBackgroundSensitivity);
  const setExportQuality = useMouzaGeoStore((state) => state.setExportQuality);
  const removePair = useMouzaGeoStore((state) => state.removePair);
  const resetAlignment = useMouzaGeoStore((state) => state.resetAlignment);
  const residual = transform ? calculateResidualMeters(transform, pairs) : null;

  const [opacityDraft, setOpacityDraft] = React.useState(opacity);
  const [sensitivityDraft, setSensitivityDraft] = React.useState(backgroundSensitivity);

  React.useEffect(() => setOpacityDraft(opacity), [opacity]);
  React.useEffect(() => setSensitivityDraft(backgroundSensitivity), [backgroundSensitivity]);
  useDebouncedCommit(opacityDraft, opacity, setOpacity);
  useDebouncedCommit(sensitivityDraft, backgroundSensitivity, setBackgroundSensitivity);

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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'>
            <TouchableOpacity style={[styles.importBtn, { borderColor: colors.border }]} onPress={() => { onClose(); onOpenImport(); }}>
              <FileUp size={16} color='#2563eb' /><Text style={[styles.importText, { color: colors.text }]} numberOfLines={1}>{image?.name ?? 'Choose mouza map'}</Text>
            </TouchableOpacity>

            <Section title='World map' color={colors.textMuted}>
              <View style={styles.row}>
                <Chip label='Satellite' active={mapStyle === 'satellite'} onPress={() => setMapStyle('satellite')} colors={colors} />
                <Chip label='Street' active={mapStyle === 'standard'} onPress={() => setMapStyle('standard')} colors={colors} />
              </View>
            </Section>

            <Section title='Map background' color={colors.textMuted}>
              <View style={styles.settingHeader}>
                <View style={styles.settingHeaderText}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Remove PDF background</Text>
                  <Text style={[styles.settingHint, { color: colors.textMuted }]}>Keep dark survey lines over the world map</Text>
                </View>
                <TouchableOpacity
                  accessibilityRole='switch'
                  accessibilityState={{ checked: backgroundRemoved }}
                  activeOpacity={0.85}
                  onPress={() => setBackgroundRemoved(!backgroundRemoved)}
                  style={[styles.switchTrack, { backgroundColor: backgroundRemoved ? '#2563eb' : colors.border }]}
                >
                  <View style={[styles.switchThumb, backgroundRemoved && styles.switchThumbOn]} />
                </TouchableOpacity>
              </View>

              {backgroundRemoved ? (
                <View style={[styles.sliderSection, { borderTopColor: colors.border }]}>
                  <View style={styles.sliderHeader}>
                    <Text style={[styles.sliderLabel, { color: colors.textMuted }]}>Line detection sensitivity</Text>
                    <Text style={styles.sliderValue}>{Math.round(sensitivityDraft)}%</Text>
                  </View>
                  <ControlSlider
                    value={sensitivityDraft}
                    min={0}
                    max={100}
                    step={1}
                    onChange={setSensitivityDraft}
                    trackColor={colors.border}
                  />
                  <Text style={[styles.help, { color: colors.textMuted }]}>Same 0–100 sensitivity model as web. Higher values retain lighter survey ink. Changes are applied after a {SLIDER_DEBOUNCE_MS} ms pause.</Text>
                </View>
              ) : null}
            </Section>

            <Section title='Overlay opacity' color={colors.textMuted}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: colors.textMuted }]}>PDF opacity</Text>
                <Text style={styles.sliderValue}>{Math.round(opacityDraft * 100)}%</Text>
              </View>
              <ControlSlider
                value={opacityDraft * 100}
                min={10}
                max={100}
                step={1}
                onChange={(value) => setOpacityDraft(value / 100)}
                trackColor={colors.border}
              />
            </Section>

            <Section title='Export quality' color={colors.textMuted}>
              <View style={styles.row}>
                <Chip label='High · Small File' active={exportQuality === 'optimized'} onPress={() => setExportQuality('optimized')} colors={colors} />
                <Chip label='Original Quality' active={exportQuality === 'original'} onPress={() => setExportQuality('original')} colors={colors} />
              </View>
              <View style={[styles.qualityCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.qualityTitle, { color: colors.text }]}>
                  {exportQuality === 'optimized' ? 'Web-matched optimized export' : 'Original quality • Lossless PNG'}
                </Text>
                <Text style={[styles.help, { color: colors.textMuted }]}>
                  {backgroundRemoved
                    ? 'Background removal needs transparency, so PNG is kept just like the web exporter.'
                    : exportQuality === 'optimized'
                      ? 'Uses the full source pixel grid in 2048 px tiles, encoded as JPEG at the same 0.94 quality as the web High · Small File option.'
                      : 'Uses the full source pixel grid in 2048 px lossless PNG tiles. This can be much larger.'}
                </Text>
              </View>
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

function ControlSlider({ value, min, max, step, onChange, trackColor }: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  trackColor: string;
}) {
  const trackRef = React.useRef<View>(null);
  const trackXRef = React.useRef(0);
  const trackWidthRef = React.useRef(1);
  const percentage = Math.max(0, Math.min(1, (value - min) / Math.max(1, max - min)));

  const updateFromPageX = React.useCallback((pageX: number) => {
    const ratio = Math.max(0, Math.min(1, (pageX - trackXRef.current) / Math.max(1, trackWidthRef.current)));
    const raw = min + ratio * (max - min);
    const stepped = Math.round((raw - min) / step) * step + min;
    onChange(Math.max(min, Math.min(max, stepped)));
  }, [max, min, onChange, step]);

  const measureAndUpdate = React.useCallback((pageX: number) => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      trackXRef.current = x;
      trackWidthRef.current = Math.max(1, width);
      updateFromPageX(pageX);
    });
  }, [updateFromPageX]);

  const responder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => measureAndUpdate(event.nativeEvent.pageX),
    onPanResponderMove: (event) => updateFromPageX(event.nativeEvent.pageX),
  }), [measureAndUpdate, updateFromPageX]);

  return (
    <View
      ref={trackRef}
      style={styles.sliderTouchArea}
      onLayout={(event) => {
        trackWidthRef.current = Math.max(1, event.nativeEvent.layout.width);
      }}
      {...responder.panHandlers}
    >
      <View style={[styles.sliderTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.sliderFill, { width: `${percentage * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${percentage * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,0.62)' },
  sheet: { maxHeight: '84%', paddingHorizontal: 16, paddingTop: 8, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1 },
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
  settingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingHeaderText: { flex: 1, gap: 1 },
  settingLabel: { fontFamily: Fonts.headingSemiBold, fontSize: 11.5 },
  settingHint: { fontFamily: Fonts.sansRegular, fontSize: 9.5 },
  switchTrack: { width: 40, height: 23, borderRadius: 99, padding: 2.5, justifyContent: 'center' },
  switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 2, elevation: 2 },
  switchThumbOn: { transform: [{ translateX: 17 }] },
  sliderSection: { gap: 7, borderTopWidth: 1, paddingTop: 9, marginTop: 2 },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sliderLabel: { fontFamily: Fonts.sansMedium, fontSize: 10.5 },
  sliderValue: { color: '#2563eb', fontFamily: Fonts.headingBold, fontSize: 10.5, minWidth: 38, textAlign: 'right' },
  sliderTouchArea: { height: 30, justifyContent: 'center' },
  sliderTrack: { height: 5, borderRadius: 99, position: 'relative' },
  sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 99, backgroundColor: '#2563eb' },
  sliderThumb: { position: 'absolute', top: -5.5, width: 16, height: 16, marginLeft: -8, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#2563eb', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 2, elevation: 2 },
  qualityCard: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 3 },
  qualityTitle: { fontFamily: Fonts.headingSemiBold, fontSize: 11 },
  pairRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 9, marginBottom: 6 },
  pairBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
  pairBadgeText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  pairText: { flex: 1, fontFamily: Fonts.sansMedium, fontSize: 10.5 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  resetText: { color: '#ef4444', fontFamily: Fonts.headingSemiBold, fontSize: 11.5 },
});
