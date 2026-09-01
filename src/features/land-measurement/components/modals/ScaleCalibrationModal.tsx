import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useMapStore } from '../../store/useMapStore';
import { SCALE_PRESETS } from '../../utils/mouzaScale';
import { Fonts } from '../../../../constants/typography';
import { Colors } from '../../../../constants/colors';
import { useThemeStore } from '../../../../stores/theme-store';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { X, Ruler } from 'lucide-react-native';

interface ScaleCalibrationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ScaleCalibrationModal: React.FC<ScaleCalibrationModalProps> = ({
  visible,
  onClose,
}) => {
  const { setScale, setMode } = useMapStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const handleSelectPreset = (presetValueFt: number) => {
    // Standard 16" = 1 mile scale (1.0 scale ratio as baseline)
    setScale(1.0);
    onClose();
  };

  const handleStartLineCalibration = () => {
    onClose();
    setMode('calibrating');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <Ruler size={20} color='#16a34a' />
              <Text style={[styles.headerTitle, { color: colors.text }]}>মৌজা ম্যাপ স্কেল সেট</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              মৌজা নকশার আদর্শ স্কেল নির্বাচন করুন
            </Text>

            <View style={styles.presetsGrid}>
              {SCALE_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  activeOpacity={0.8}
                  style={[styles.presetCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  onPress={() => handleSelectPreset(preset.valueFt)}
                >
                  <View style={styles.presetTop}>
                    <Text style={[styles.presetLabel, { color: colors.text }]}>{preset.label}</Text>
                    {preset.recommended && <Badge label='আদর্শ' variant='pro' />}
                  </View>
                  <Text style={[styles.presetDesc, { color: colors.textMuted }]}>{preset.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Interactive 2-point Calibration Option */}
            <View style={[styles.interactiveBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.interactiveTitle, { color: colors.text }]}>
                📐 ম্যাপে রেখা টেনে সরাসরি স্কেল নির্ধারণ
              </Text>
              <Text style={[styles.interactiveDesc, { color: colors.textMuted }]}>
                ম্যাপের স্কেল বারের এক মাথা থেকে অন্য মাথায় রেখা টেনে যেকোনো কাস্টম স্কেল নিখুঁত করুন।
              </Text>
              <Button
                title='স্কেল রেখা টানুন'
                size='sm'
                variant='primary'
                onPress={handleStartLineCalibration}
                style={{ marginTop: 6 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 12.5,
    fontFamily: Fonts.headingSemiBold,
  },
  presetsGrid: {
    gap: 8,
  },
  presetCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  presetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presetLabel: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
  },
  presetDesc: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
  },
  interactiveBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginTop: 4,
  },
  interactiveTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
  },
  interactiveDesc: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    lineHeight: 15,
  },
});
