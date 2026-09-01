import React, { useState } from 'react';
import { Alert, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Ruler } from 'lucide-react-native';
import { MobileMapCanvas } from '../../features/land-measurement/components/canvas/MobileMapCanvas';
import { MobileCanvasToolbar } from '../../features/land-measurement/components/toolbar/MobileCanvasToolbar';
import { MobileResultsBar } from '../../features/land-measurement/components/results/MobileResultsBar';
import { ScaleCalibrationModal } from '../../features/land-measurement/components/modals/ScaleCalibrationModal';
import { ImagePickerSheet } from '../../features/land-measurement/components/modals/ImagePickerSheet';
import { useMapStore } from '../../features/land-measurement/store/useMapStore';
import { Fonts } from '../../constants/typography';
import { Badge } from '../../components/ui/badge';
import { toBengaliDigits } from '../../lib/utils';

export default function LandMeasurementScreen() {
  const router = useRouter();
  const scale = useMapStore((state) => state.scale);
  const mapImage = useMapStore((state) => state.mapImage);
  const plots = useMapStore((state) => state.plots);
  const isDistanceModalOpen = useMapStore((state) => state.isDistanceModalOpen);
  const startCalibration = useMapStore((state) => state.startCalibration);
  const retryCalibration = useMapStore((state) => state.retryCalibration);

  const [isManualScaleOpen, setIsManualScaleOpen] = useState(false);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

  const beginCalibration = () => {
    if (!mapImage) {
      setIsImagePickerOpen(true);
      return;
    }
    if (plots.length === 0) {
      startCalibration();
      return;
    }
    Alert.alert('স্কেল আবার সেট করবেন?', 'স্কেল বদলালে বর্তমান সব প্লট মুছে যাবে।', [
      { text: 'বাতিল', style: 'cancel' },
      { text: 'চালিয়ে যান', style: 'destructive', onPress: startCalibration },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ─── 1. Top Navbar Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ArrowLeft size={19} color='#ffffff' strokeWidth={2.2} />
          </TouchableOpacity>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>জমি পরিমাপ</Text>
              <Badge label='PRO' variant='pro' />
            </View>
            <Text style={styles.headerSub}>মৌজা ম্যাপ ও দাগ ড্রয়িং</Text>
          </View>
        </View>

        {/* Quick Scale Chip */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.scaleChip}
          onPress={beginCalibration}
        >
          <Ruler size={13} color='#22c55e' strokeWidth={2.2} />
          <Text style={styles.scaleChipText}>
            {scale ? `১px = ${toBengaliDigits((1 / scale).toFixed(3))}′` : 'স্কেল সেট করুন'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── 2. Interactive Drawing Canvas Layer ─── */}
      <View style={styles.canvasContainer}>
        <MobileMapCanvas />

        {/* ─── 3. Floating Live Area Results Bar ─── */}
        <MobileResultsBar />

        {/* ─── 4. Floating Bottom Toolbar ─── */}
        <MobileCanvasToolbar
          onOpenManualScale={() => setIsManualScaleOpen(true)}
          onOpenImagePicker={() => setIsImagePickerOpen(true)}
        />
      </View>

      {/* ─── 5. Modals ─── */}
      <ScaleCalibrationModal
        visible={isDistanceModalOpen}
        kind='distance'
        onClose={retryCalibration}
      />
      <ScaleCalibrationModal
        visible={isManualScaleOpen}
        kind='manual'
        onClose={() => setIsManualScaleOpen(false)}
      />
      <ImagePickerSheet
        visible={isImagePickerOpen}
        onClose={() => setIsImagePickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    zIndex: 1000,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15.5,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    color: '#94a3b8',
    marginTop: -2,
  },
  scaleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 7,
  },
  scaleChipText: {
    fontSize: 11,
    fontFamily: Fonts.headingSemiBold,
    color: '#22c55e',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#090d16',
  },
});
