import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { FileImage, FileText, ImagePlus, X } from 'lucide-react-native';
import { Fonts } from '../../../constants/typography';
import { Colors } from '../../../constants/colors';
import { useThemeStore } from '../../../stores/theme-store';
import { useModalSafeBottomPadding } from '../../../components/common/keyboard-safe-layout';
import { useMouzaGeoStore } from '../store/useMouzaGeoStore';

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_PDF_RENDER_EDGE = 4096;

type Props = { visible: boolean; onClose: () => void };

function validateSize(size?: number | null) {
  if (!size || size <= MAX_UPLOAD_SIZE_BYTES) return true;
  Alert.alert('File is too large', 'Choose a map smaller than 25 MB for smooth mobile performance.');
  return false;
}

export function GeoImportSheet({ visible, onClose }: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const bottomPadding = useModalSafeBottomPadding();
  const setImage = useMouzaGeoStore((state) => state.setImage);
  const [busy, setBusy] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo access to select a mouza map.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateSize(asset.fileSize)) return;

    // Keep the selected image URI and its original pixel dimensions untouched.
    // Preview processing is derived separately; KMZ export starts from this source.
    setImage({
      uri: asset.uri,
      width: Math.max(asset.width, 1),
      height: Math.max(asset.height, 1),
      name: asset.fileName ?? 'mouza-map',
      size: asset.fileSize,
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
      if (!validateSize(asset.size)) return;
      setBusy(true);

      const { convertPage } = await import('@uzimandias/react-native-pdf-to-image');
      const page = await convertPage(asset.uri, 0, {
        // The web app also renders PDF page 1 up to 4096 px. PNG avoids the
        // extra JPEG generation loss that the old native path introduced.
        format: 'png',
        quality: 1,
        scale: 4,
        maxWidth: MAX_PDF_RENDER_EDGE,
        maxHeight: MAX_PDF_RENDER_EDGE,
        output: 'file',
      });
      if (!page.uri || !page.width || !page.height) throw new Error('PDF page image missing');
      setImage({
        uri: page.uri,
        width: page.width,
        height: page.height,
        name: `${asset.name || 'mouza-map.pdf'} • page 1`,
        size: asset.size,
      });
      onClose();
    } catch {
      Alert.alert('PDF import failed', 'The first PDF page could not be prepared. Try again in the development/APK build.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={() => !busy && onClose()}>
      <View style={styles.backdrop}>
        <TouchableOpacity disabled={busy} activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder, paddingBottom: bottomPadding }]}>
          <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Choose Mouza Map</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>PDF, JPG or PNG • up to 25 MB</Text>
            </View>
            <TouchableOpacity disabled={busy} style={[styles.close, { backgroundColor: colors.iconBtnBg }]} onPress={onClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity disabled={busy} style={[styles.option, { borderColor: colors.cardBorder, backgroundColor: colors.background }]} onPress={pickImage}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(37,99,235,0.12)' }]}>{busy ? <ActivityIndicator color='#2563eb' /> : <ImagePlus size={22} color='#2563eb' />}</View>
            <View style={styles.optionText}><Text style={[styles.optionTitle, { color: colors.text }]}>Gallery Image</Text><Text style={[styles.optionSub, { color: colors.textMuted }]}>Keep the selected image at original pixel quality</Text></View>
          </TouchableOpacity>

          <TouchableOpacity disabled={busy} style={[styles.option, { borderColor: colors.cardBorder, backgroundColor: colors.background }]} onPress={pickPdf}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(239,68,68,0.12)' }]}><FileText size={22} color='#ef4444' /></View>
            <View style={styles.optionText}><Text style={[styles.optionTitle, { color: colors.text }]}>Import PDF</Text><Text style={[styles.optionSub, { color: colors.textMuted }]}>Lossless PNG render of page 1, up to 4096 px</Text></View>
          </TouchableOpacity>

          <View style={[styles.performanceNote, { borderColor: colors.border }]}>
            <FileImage size={15} color={colors.textMuted} />
            <Text style={[styles.noteText, { color: colors.textMuted }]}>Interactive background preview may be optimized for speed, but the original image remains untouched and KMZ export uses full source pixels.</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,0.62)' },
  sheet: { paddingHorizontal: 16, paddingTop: 8, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1 },
  handle: { width: 42, height: 4, borderRadius: 99, alignSelf: 'center', opacity: 0.45, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontFamily: Fonts.headingBold, fontSize: 17 },
  subtitle: { fontFamily: Fonts.sansRegular, fontSize: 10.5, marginTop: -2 },
  close: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 13, borderWidth: 1, marginTop: 9 },
  iconBox: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionTitle: { fontFamily: Fonts.headingBold, fontSize: 13 },
  optionSub: { fontFamily: Fonts.sansRegular, fontSize: 10.5, marginTop: -1 },
  performanceNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderTopWidth: 1, marginTop: 14, paddingTop: 12 },
  noteText: { flex: 1, fontFamily: Fonts.sansRegular, fontSize: 10, lineHeight: 14 },
});
