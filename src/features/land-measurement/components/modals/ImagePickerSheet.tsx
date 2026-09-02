import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { FileImage, FileText, ImagePlus, Trash2, X } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { Fonts } from '../../../../constants/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

function validateFileSize(size?: number | null) {
  if (!size || size <= MAX_UPLOAD_SIZE_BYTES) return true;
  Alert.alert('File is too large', 'Choose a file smaller than 25 MB.');
  return false;
}

export function ImagePickerSheet({ visible, onClose }: Props) {
  const mapImage = useMapStore((state) => state.mapImage);
  const setMapImage = useMapStore((state) => state.setMapImage);
  const clearMap = useMapStore((state) => state.clearMap);
  const [isImportingPdf, setIsImportingPdf] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo access to select a mouza map from your gallery.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateFileSize(asset.fileSize)) return;
    setMapImage({
      uri: asset.uri,
      width: Math.max(asset.width, 1),
      height: Math.max(asset.height, 1),
      name: asset.fileName ?? 'Mouza map',
    });
    onClose();
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (!validateFileSize(asset.size)) return;
      setIsImportingPdf(true);
      const { convertPage } = await import('@uzimandias/react-native-pdf-to-image');
      const page = await convertPage(asset.uri, 0, {
        format: 'jpeg',
        quality: 0.96,
        scale: 3,
        maxWidth: 4096,
        maxHeight: 4096,
        output: 'file',
      });

      if (!page.uri || !page.width || !page.height) {
        throw new Error('PDF page image was not generated');
      }

      setMapImage({
        uri: page.uri,
        width: page.width,
        height: page.height,
        name: `${asset.name || 'mouza-map.pdf'} • page 1`,
        size: asset.size,
      });
      onClose();
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';
      const message = code === 'E_PASSWORD_REQUIRED' || code === 'E_WRONG_PASSWORD'
        ? 'Password-protected PDFs are not supported yet. Use an unlocked PDF.'
        : code === 'E_INVALID_PDF'
          ? 'The selected file is not a valid PDF or it is corrupted.'
          : code === 'E_FILE_NOT_FOUND'
            ? 'The selected PDF could not be read. Please choose it again.'
            : 'The first PDF page could not be prepared. Try again in a Development/EAS build.';
      Alert.alert('PDF import failed', message);
    } finally {
      setIsImportingPdf(false);
    }
  };

  const removeMap = () => {
    if (!mapImage) return;
    Alert.alert(
      'Remove current map?',
      'The map and all measurements drawn on it will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
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
    <Modal visible={visible} transparent animationType='slide' onRequestClose={() => !isImportingPdf && onClose()}>
      <View style={styles.backdrop}>
        <TouchableOpacity disabled={isImportingPdf} activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Choose Mouza Map</Text>
              <Text style={styles.subtitle}>Use PDF, JPG, PNG, or a photo from your phone</Text>
            </View>
            <TouchableOpacity disabled={isImportingPdf} style={styles.closeButton} onPress={onClose}>
              <X size={18} color='#94a3b8' />
            </TouchableOpacity>
          </View>

          {mapImage && (
            <View style={styles.currentFile}>
              <FileImage size={18} color='#22c55e' />
              <View style={styles.currentFileText}>
                <Text numberOfLines={1} style={styles.currentName}>{mapImage.name ?? 'Current map'}</Text>
                <Text style={styles.currentMeta}>{mapImage.width} × {mapImage.height} px</Text>
              </View>
            </View>
          )}

          <TouchableOpacity disabled={isImportingPdf} activeOpacity={0.76} style={[styles.option, isImportingPdf && styles.disabledOption]} onPress={pickImage}>
            <View style={[styles.optionIcon, styles.greenIcon]}>
              <ImagePlus size={22} color='#22c55e' />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Choose from Gallery</Text>
              <Text style={styles.optionDescription}>Select a mouza map image saved on your phone</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity disabled={isImportingPdf} activeOpacity={0.76} style={[styles.option, isImportingPdf && styles.disabledOption]} onPress={pickPdf}>
            <View style={[styles.optionIcon, styles.pdfIcon]}>
              {isImportingPdf ? <ActivityIndicator color='#f87171' /> : <FileText size={22} color='#f87171' />}
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{isImportingPdf ? 'Preparing PDF…' : 'Import PDF Map'}</Text>
              <Text style={styles.optionDescription}>{isImportingPdf ? 'Converting page 1 to a high-resolution image' : 'Open the first PDF page on the measurement canvas'}</Text>
            </View>
          </TouchableOpacity>

          {mapImage && <TouchableOpacity disabled={isImportingPdf} activeOpacity={0.76} style={[styles.option, isImportingPdf && styles.disabledOption]} onPress={removeMap}>
            <View style={[styles.optionIcon, styles.redIcon]}><Trash2 size={21} color='#f87171' /></View>
            <View style={styles.optionText}><Text style={styles.optionTitle}>Remove Current Map</Text><Text style={styles.optionDescription}>Clear the map and all current measurements</Text></View>
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
  pdfIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  redIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  disabledOption: {
    opacity: 0.7,
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
