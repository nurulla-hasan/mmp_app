import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, RotateCcw, Ruler, X } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { Fonts } from '../../../../constants/typography';

type Props = { visible: boolean; kind: 'distance' | 'manual'; onClose: () => void };

const PRESETS = [
  { label: '১০ চেইন', detail: 'প্রস্তাবিত', feet: 660 },
  { label: '৫ চেইন', detail: '৩৩০ ফুট', feet: 330 },
  { label: '২০ লিংক', detail: '১৩.২ ফুট', feet: 13.2 },
  { label: '১০০ লিংক', detail: '৬৬ ফুট', feet: 66 },
  { label: '১ মাইল', detail: '৫২৮০ ফুট', feet: 5280 },
];

export function ScaleCalibrationModal({ visible, kind, onClose }: Props) {
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

    // Distance calibration owns its visibility in the store. Its successful
    // submit already switches mode to `none` and closes the modal. Calling the
    // parent close callback here used to restart calibration immediately.
    if (kind === 'manual') onClose();
  };

  const retry = () => {
    retryCalibration();
  };

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}><View style={styles.iconBox}><Ruler size={20} color='#22c55e' /></View><View><Text style={styles.title}>{kind === 'distance' ? 'পরিচিত দূরত্ব দিন' : 'ম্যানুয়াল স্কেল'}</Text><Text style={styles.subtitle}>{kind === 'distance' ? 'নির্বাচিত রেখাটির বাস্তব দৈর্ঘ্য' : '১ পিক্সেল বাস্তবে কত ফুট'}</Text></View></View>
            <TouchableOpacity onPress={onClose} style={styles.close}><X size={18} color='#94a3b8' /></TouchableOpacity>
          </View>

          {kind === 'distance' && <View style={styles.presets}>{PRESETS.map((preset) => <TouchableOpacity key={preset.label} onPress={() => setValue(String(preset.feet))} style={[styles.preset, Number(value) === preset.feet && styles.presetActive]}><Text style={styles.presetLabel}>{preset.label}</Text><Text style={styles.presetDetail}>{preset.detail}</Text></TouchableOpacity>)}</View>}

          <Text style={styles.inputLabel}>{kind === 'distance' ? 'দূরত্ব (ফুট)' : 'ফুট / পিক্সেল'}</Text>
          <View style={styles.inputRow}>
            <TextInput value={value} onChangeText={setValue} keyboardType='decimal-pad' placeholder={kind === 'distance' ? 'যেমন: 660' : 'যেমন: 0.125'} placeholderTextColor='#64748b' selectTextOnFocus style={styles.input} />
            <View style={styles.unit}><Text style={styles.unitText}>{kind === 'distance' ? 'ফুট' : 'ft/px'}</Text></View>
          </View>
          <Text style={styles.helper}>{kind === 'distance' ? '১ চেইন = ৬৬ ফুট • ১০০ লিংক = ১ চেইন' : 'উদাহরণ: ০.১২৫ মানে ৮ পিক্সেল = ১ ফুট'}</Text>

          <View style={styles.actions}>
            {kind === 'distance' ? <TouchableOpacity style={styles.secondary} onPress={retry}><RotateCcw size={16} color='#cbd5e1' /><Text style={styles.secondaryText}>আবার পয়েন্ট দিন</Text></TouchableOpacity> : <TouchableOpacity style={styles.secondary} onPress={onClose}><Text style={styles.secondaryText}>বাতিল</Text></TouchableOpacity>}
            <TouchableOpacity style={styles.primary} onPress={submit}><Check size={17} color='#fff' /><Text style={styles.primaryText}>স্কেল সেট করুন</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(2,6,23,0.78)' },
  card: { width: '100%', maxWidth: 430, padding: 17, borderRadius: 18, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: 'rgba(34,197,94,0.12)' },
  title: { color: '#fff', fontFamily: Fonts.headingBold, fontSize: 16 },
  subtitle: { marginTop: -2, color: '#94a3b8', fontFamily: Fonts.sansRegular, fontSize: 10 },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#1e293b' },
  presets: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  preset: { minWidth: '30%', flexGrow: 1, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: '#334155', backgroundColor: '#111827' },
  presetActive: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)' },
  presetLabel: { color: '#e2e8f0', fontFamily: Fonts.headingSemiBold, fontSize: 11 },
  presetDetail: { color: '#64748b', fontFamily: Fonts.sansRegular, fontSize: 8.5 },
  inputLabel: { marginTop: 15, marginBottom: 5, color: '#e2e8f0', fontFamily: Fonts.headingSemiBold, fontSize: 12 },
  inputRow: { flexDirection: 'row' },
  input: { flex: 1, height: 46, paddingHorizontal: 13, borderWidth: 1, borderRightWidth: 0, borderColor: '#475569', borderTopLeftRadius: 10, borderBottomLeftRadius: 10, color: '#fff', backgroundColor: '#111827', fontSize: 15 },
  unit: { width: 62, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#475569', borderTopRightRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#1e293b' },
  unitText: { color: '#cbd5e1', fontFamily: Fonts.headingSemiBold, fontSize: 11 },
  helper: { marginTop: 5, color: '#64748b', fontFamily: Fonts.sansRegular, fontSize: 9.5 },
  actions: { marginTop: 18, flexDirection: 'row', gap: 9 },
  secondary: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, borderWidth: 1, borderColor: '#475569' },
  secondaryText: { color: '#cbd5e1', fontFamily: Fonts.headingSemiBold, fontSize: 11 },
  primary: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, backgroundColor: '#16a34a' },
  primaryText: { color: '#fff', fontFamily: Fonts.headingBold, fontSize: 11 },
});