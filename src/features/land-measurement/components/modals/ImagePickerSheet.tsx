import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useMapStore } from '../../store/useMapStore';
import { Fonts } from '../../../../constants/typography';
import { Colors } from '../../../../constants/colors';
import { useThemeStore } from '../../../../stores/theme-store';
import { X, Image as ImageIcon, Sparkles } from 'lucide-react-native';

interface ImagePickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ImagePickerSheet: React.FC<ImagePickerSheetProps> = ({
  visible,
  onClose,
}) => {
  const { setImageUri } = useMapStore();
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const handleLoadSampleMap = () => {
    setImageUri('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80', 1200, 900);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>মৌজা ম্যাপ আপলোড / নির্বাচন</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={handleLoadSampleMap}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(22, 163, 74, 0.12)' }]}>
                <Sparkles size={20} color='#16a34a' />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>ডেমো মৌজা ম্যাপ লোড করুন</Text>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  সরাসরি টেস্ট করার জন্য একটি আদর্শ মৌজা ম্যাপ খুলুন
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => {
                onClose();
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
                <ImageIcon size={20} color='#2563eb' />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>গ্যালারি থেকে ফটো নির্বাচন</Text>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  আপনার ফোনে সেভ থাকা মৌজা ম্যাপের ছবি ব্যবহার করুন
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Fonts.headingBold,
  },
  optionsList: {
    padding: 16,
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.headingBold,
  },
  optionDesc: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    marginTop: 1,
  },
});
