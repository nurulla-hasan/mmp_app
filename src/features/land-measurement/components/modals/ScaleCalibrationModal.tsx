import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, RotateCcw, Ruler, X } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { Fonts } from '../../../../constants/typography';
import { useThemeStore } from '../../../../stores/theme-store';
import { getLandMeasurementToolColors } from '../../utils/tool-theme';

type Props = { visible: boolean; kind: 'distance' | 'manual'; onClose: () => void };

const PRESETS = [
  { label: '10 chains', detail: 'Recommended', feet: 660 },
  { label: '5 chains', detail: '330 ft', feet: 330 },
  { label: '20 links', detail: '13.2 ft', feet: 13.2 },
  { label: '100 links', detail: '66 ft', feet: 66 },
  { label: '1 mile', detail: '5280 ft', feet: 5280 },
];

export function ScaleCalibrationModal({ visible, kind, onClose }: Props) {
  const { theme } = useThemeStore();
  const colors = getLandMeasurementToolColors(theme);
  const scale = useMapStore((state) => state.scale);
  const retryCalibration = useMapStore((state) => state.retryCalibration);
  const submitCalibrationDistance = useMapStore((state) => state.submitCalibrationDistance);
  const submitManualScale = useMapStore((state) => state.submitManualScale);
  const [value, setValue] = useState(kind === 'distance' ? '660' : '');

  useEffect(() => {
    if (!visible) return;
    setValue(kind === 'distance' ? '660' : scale ? (1 / scale).toFixed(6) : '');
  }, [kind, scale, visible]);

  const submit = () => {
    const numeric = Number(value.replace(',', '.'));
    const success = kind === 'distance' ? submitCalibrationDistance(numeric) : submitManualScale(numeric);
    if (!success) return;
    if (kind === 'manual') onClose();
  };

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.backdrop, { backgroundColor: colors.overlayStrong }]}>
        <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.panelBorder }]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconBox}><Ruler size={20} color={colors.success} /></View>
              <View>
                <Text style={[styles.title, { color: colors.textStrong }]}>{kind === 'distance' ? 'Enter Known Distance' : 'Manual Scale'}</Text>
                <Text style={[styles.subtitle, { color: colors.textSoft }]}>{kind === 'distance' ? 'Real length of the selected line' : 'How many feet equal one pixel'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.close, { backgroundColor: colors.panelRaised }]}><X size={18} color={colors.textSoft} /></TouchableOpacity>
          </View>

          {kind === 'distance' && (
            <View style={styles.presets}>
              {PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  onPress={() => setValue(String(preset.feet))}
                  style={[
                    styles.preset,
                    { backgroundColor: colors.panelAlt, borderColor: colors.panelBorder },
                    Number(value) === preset.feet && styles.presetActive,
                  ]}
                >
                  <Text style={[styles.presetLabel, { color: colors.textStrong }]}>{preset.label}</Text>
                  <Text style={[styles.presetDetail, { color: colors.textSoft }]}>{preset.detail}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.inputLabel, { color: colors.textStrong }]}>{kind === 'distance' ? 'Distance (feet)' : 'Feet per pixel'}</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={value}
              onChangeText={setValue}
              keyboardType='decimal-pad'
              placeholder={kind === 'distance' ? 'e.g. 660' : 'e.g. 0.125'}
              placeholderTextColor={colors.textSoft}
              selectTextOnFocus
              style={[styles.input, { color: colors.textStrong, backgroundColor: colors.input, borderColor: colors.panelBorder }]}
            />
            <View style={[styles.unit, { backgroundColor: colors.panelRaised, borderColor: colors.panelBorder }]}><Text style={[styles.unitText, { color: colors.textStrong }]}>{kind === 'distance' ? 'ft' : 'ft/px'}</Text></View>
          </View>
          <Text style={[styles.helper, { color: colors.textSoft }]}>{kind === 'distance' ? '1 chain = 66 ft • 100 links = 1 chain' : 'Example: 0.125 means 8 pixels = 1 foot'}</Text>

          <View style={styles.actions}>
            {kind === 'distance' ? (
              <TouchableOpacity style={[styles.secondary, { borderColor: colors.panelBorder }]} onPress={retryCalibration}>
                <RotateCcw size={16} color={colors.textSoft} />
                <Text style={[styles.secondaryText, { color: colors.textStrong }]}>Pick Again</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.secondary, { borderColor: colors.panelBorder }]} onPress={onClose}><Text style={[styles.secondaryText, { color: colors.textStrong }]}>Cancel</Text></TouchableOpacity>
            )}
            <TouchableOpacity style={styles.primary} onPress={submit}>
              <Check size={17} color='#fff' />
              <Text style={styles.primaryText}>Set Scale</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 430, padding: 17, borderRadius: 18, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: 'rgba(34,197,94,0.12)' },
  title: { fontFamily: Fonts.headingBold, fontSize: 16 },
  subtitle: { marginTop: -2, fontFamily: Fonts.sansRegular, fontSize: 10 },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  presets: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  preset: { minWidth: '30%', flexGrow: 1, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 9, borderWidth: 1 },
  presetActive: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)' },
  presetLabel: { fontFamily: Fonts.headingSemiBold, fontSize: 11 },
  presetDetail: { fontFamily: Fonts.sansRegular, fontSize: 8.5 },
  inputLabel: { marginTop: 15, marginBottom: 5, fontFamily: Fonts.headingSemiBold, fontSize: 12 },
  inputRow: { flexDirection: 'row' },
  input: { flex: 1, height: 46, paddingHorizontal: 13, borderWidth: 1, borderRightWidth: 0, borderTopLeftRadius: 10, borderBottomLeftRadius: 10, fontSize: 15 },
  unit: { width: 62, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  unitText: { fontFamily: Fonts.headingSemiBold, fontSize: 11 },
  helper: { marginTop: 5, fontFamily: Fonts.sansRegular, fontSize: 9.5 },
  actions: { marginTop: 18, flexDirection: 'row', gap: 9 },
  secondary: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, borderWidth: 1 },
  secondaryText: { fontFamily: Fonts.headingSemiBold, fontSize: 11 },
  primary: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, backgroundColor: '#16a34a' },
  primaryText: { color: '#fff', fontFamily: Fonts.headingBold, fontSize: 11 },
});
