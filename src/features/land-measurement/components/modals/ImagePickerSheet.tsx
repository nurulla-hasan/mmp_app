import React from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FileImage, ImagePlus, Trash2, X } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { Fonts } from '../../../../constants/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ImagePickerSheet({ visible, onClose }: Props) {
  const mapImage = useMapStore((state) => state.mapImage);
  const setMapImage = useMapStore((state) => state.setMapImage);
  const clearMap = useMapStore((state) => state.clearMap);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('অনুমতি প্রয়োজন', 'গ্যালারি থেকে ম্যাপ নিতে ফটো অ্যাক্সেস অনুমতি দিন।');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setMapImage({
      uri: asset.uri,
      width: Math.max(asset.width, 1),
      height: Math.max(asset.height, 1),
      name: asset.fileName ?? 'মৌজা ম্যাপ',
    });
    onClose();
  };

  const removeMap = () => {
    if (!mapImage) return;
    Alert.alert(
      'ম্যাপ মুছে ফেলবেন?',
      'বর্তমান ম্যাপ ও এর সব আঁকা পরিমাপ মুছে যাবে।',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'চালিয়ে যান',
          style: 'destructive',
          onPress: () => {
            clearMap();
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>মৌজা ম্যাপ নির্বাচন</Text>
              <Text style={styles.subtitle}>JPG, PNG বা ফোনের তোলা ছবি ব্যবহার করুন</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={18} color='#94a3b8' />
            </TouchableOpacity>
          </View>

          {mapImage && (
            <View style={styles.currentFile}>
              <FileImage size={18} color='#22c55e' />
              <View style={styles.currentFileText}>
                <Text numberOfLines={1} style={styles.currentName}>{mapImage.name ?? 'বর্তমান ম্যাপ'}</Text>
                <Text style={styles.currentMeta}>{mapImage.width} × {mapImage.height} px</Text>
              </View>
            </View>
          )}

          <TouchableOpacity activeOpacity={0.76} style={styles.option} onPress={pickImage}>
            <View style={[styles.optionIcon, styles.greenIcon]}>
              <ImagePlus size={22} color='#22c55e' />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>গ্যালারি থেকে ম্যাপ নিন</Text>
              <Text style={styles.optionDescription}>ফোনে থাকা মৌজা ম্যাপের ছবি নির্বাচন করুন</Text>
            </View>
          </TouchableOpacity>

          {mapImage && <TouchableOpacity activeOpacity={0.76} style={styles.option} onPress={removeMap}>
            <View style={[styles.optionIcon, styles.redIcon]}><Trash2 size={21} color='#f87171' /></View>
            <View style={styles.optionText}><Text style={styles.optionTitle}>বর্তমান ম্যাপ সরান</Text><Text style={styles.optionDescription}>ম্যাপসহ সব পরিমাপ মুছে ফেলুন</Text></View>
          </TouchableOpacity>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 6, 23, 0.65)',
  },
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  handle: {
    width: 42,
    height: 4,
    alignSelf: 'center',
    marginBottom: 12,
    borderRadius: 99,
    backgroundColor: '#475569',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: '#ffffff',
    fontFamily: Fonts.headingBold,
    fontSize: 17,
  },
  subtitle: {
    marginTop: -2,
    color: '#94a3b8',
    fontFamily: Fonts.sansRegular,
    fontSize: 10,
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#1e293b',
  },
  currentFile: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  currentFileText: {
    flex: 1,
  },
  currentName: {
    color: '#e2e8f0',
    fontFamily: Fonts.headingSemiBold,
    fontSize: 12,
  },
  currentMeta: {
    color: '#64748b',
    fontSize: 9.5,
  },
  option: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
  },
  optionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  greenIcon: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  redIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: '#f8fafc',
    fontFamily: Fonts.headingBold,
    fontSize: 13,
  },
  optionDescription: {
    marginTop: -1,
    color: '#94a3b8',
    fontFamily: Fonts.sansRegular,
    fontSize: 10,
  },
});
