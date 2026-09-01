import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ruler, X } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { Fonts } from '../../../../constants/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ScaleCalibrationModal({ visible, onClose }: Props) {
  const currentScale = useMapStore((state) => state.scale);
  const savedDistance = useMapStore((state) => state.calibrationDistanceFt);
  const startCalibration = useMapStore((state) => state.startCalibration);
  const [distance, setDistance] = useState(String(savedDistance));

  useEffect(() => {
    if (visible) setDistance(String(savedDistance));
  }, [savedDistance, visible]);

  const begin = () => {
    const numericDistance = Number(distance.replace(',', '.'));
    if (startCalibration(numericDistance)) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconBox}>
                <Ruler size={20} color='#22c55e' />
              </View>
              <View>
                <Text style={styles.title}>ম্যাপ স্কেল ক্যালিব্রেশন</Text>
                <Text style={styles.subtitle}>ছবির পিক্সেলকে বাস্তব ফুটে রূপান্তর করুন</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={18} color='#94a3b8' />
            </TouchableOpacity>
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>কীভাবে করবেন?</Text>
            <Text style={styles.tipText}>
              ম্যাপে জানা দৈর্ঘ্যের একটি রেখা বাছুন। নিচে তার বাস্তব দূরত্ব লিখে “রেখা আঁকুন” চাপুন,
              তারপর রেখার শুরু ও শেষে ট্যাপ করুন।
            </Text>
          </View>

          <Text style={styles.inputLabel}>পরিচিত দূরত্ব (ফুট)</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={distance}
              onChangeText={setDistance}
              keyboardType='decimal-pad'
              placeholder='যেমন: 660'
              placeholderTextColor='#64748b'
              selectTextOnFocus
              style={styles.input}
            />
            <View style={styles.unitBox}>
              <Text style={styles.unitText}>ফুট</Text>
            </View>
          </View>
          <Text style={styles.helper}>১০ চেইন = ৬৬০ ফুট • ১ চেইন = ৬৬ ফুট</Text>

          {currentScale && (
            <View style={styles.currentScaleBox}>
              <Text style={styles.currentScaleLabel}>বর্তমান স্কেল</Text>
              <Text style={styles.currentScaleValue}>১ পিক্সেল = {(1 / currentScale).toFixed(4)} ফুট</Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>বাতিল</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={begin}>
              <Ruler size={17} color='#ffffff' />
              <Text style={styles.primaryText}>রেখা আঁকুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(2, 6, 23, 0.74)',
  },
  card: {
    width: '100%',
    maxWidth: 430,
    padding: 17,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  title: {
    color: '#ffffff',
    fontFamily: Fonts.headingBold,
    fontSize: 16,
  },
  subtitle: {
    marginTop: -2,
    color: '#94a3b8',
    fontFamily: Fonts.sansRegular,
    fontSize: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  tipBox: {
    marginTop: 17,
    padding: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.28)',
    backgroundColor: 'rgba(37, 99, 235, 0.09)',
  },
  tipTitle: {
    color: '#93c5fd',
    fontFamily: Fonts.headingBold,
    fontSize: 12,
  },
  tipText: {
    marginTop: 2,
    color: '#cbd5e1',
    fontFamily: Fonts.sansRegular,
    fontSize: 10.5,
    lineHeight: 17,
  },
  inputLabel: {
    marginTop: 16,
    marginBottom: 5,
    color: '#e2e8f0',
    fontFamily: Fonts.headingSemiBold,
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: '#475569',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    color: '#ffffff',
    backgroundColor: '#111827',
    fontSize: 15,
  },
  unitBox: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#1e293b',
  },
  unitText: {
    color: '#cbd5e1',
    fontFamily: Fonts.headingSemiBold,
    fontSize: 12,
  },
  helper: {
    marginTop: 5,
    color: '#64748b',
    fontFamily: Fonts.sansRegular,
    fontSize: 9.5,
  },
  currentScaleBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 9,
    backgroundColor: '#111827',
  },
  currentScaleLabel: {
    color: '#94a3b8',
    fontFamily: Fonts.headingMedium,
    fontSize: 10.5,
  },
  currentScaleValue: {
    color: '#22c55e',
    fontFamily: Fonts.headingSemiBold,
    fontSize: 10.5,
  },
  actions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 9,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  cancelText: {
    color: '#cbd5e1',
    fontFamily: Fonts.headingSemiBold,
    fontSize: 12,
  },
  primaryButton: {
    flex: 1.5,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: '#16a34a',
  },
  primaryText: {
    color: '#ffffff',
    fontFamily: Fonts.headingBold,
    fontSize: 12,
  },
});
