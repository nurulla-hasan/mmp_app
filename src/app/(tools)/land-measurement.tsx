import React, { useEffect, useState } from 'react';
import { Alert, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Ruler } from 'lucide-react-native';
import { SkiaMapCanvas } from '../../features/land-measurement/components/canvas/SkiaMapCanvas';
import { MobileCanvasToolbar } from '../../features/land-measurement/components/toolbar/MobileCanvasToolbar';
import { MobileResultsBar } from '../../features/land-measurement/components/results/MobileResultsBar';
import { ScaleCalibrationModal } from '../../features/land-measurement/components/modals/ScaleCalibrationModal';
import { ImagePickerSheet } from '../../features/land-measurement/components/modals/ImagePickerSheet';
import { CalculationLibrarySheet, applyServerCalculation, type ServerCalculation } from '../../features/land-measurement/components/modals/CalculationLibrarySheet';
import { useMapStore } from '../../features/land-measurement/store/useMapStore';
import { Fonts } from '../../constants/typography';
import { Badge } from '../../components/ui/badge';
import { useThemeStore } from '../../stores/theme-store';
import { getLandMeasurementToolColors } from '../../features/land-measurement/utils/tool-theme';

export default function LandMeasurementScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = getLandMeasurementToolColors(theme);
  const scale = useMapStore((state) => state.scale);
  const mapImage = useMapStore((state) => state.mapImage);
  const plotCount = useMapStore((state) => state.plots.length);
  const isDistanceModalOpen = useMapStore((state) => state.isDistanceModalOpen);
  const startCalibration = useMapStore((state) => state.startCalibration);
  const cancelCalibration = useMapStore((state) => state.cancelCalibration);

  const [isManualScaleOpen, setIsManualScaleOpen] = useState(false);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [calculationSheetMode, setCalculationSheetMode] = useState<'save' | 'load' | null>(null);
  const [pendingCalculation, setPendingCalculation] = useState<ServerCalculation | null>(null);

  useEffect(() => { void useMapStore.getState().hydratePersistence(); }, []);

  useEffect(() => {
    if (!mapImage || !pendingCalculation) return;
    applyServerCalculation(pendingCalculation);
    setPendingCalculation(null);
  }, [mapImage, pendingCalculation]);

  const beginCalibration = () => {
    if (!mapImage) {
      setIsImagePickerOpen(true);
      return;
    }
    if (plotCount === 0) {
      startCalibration();
      return;
    }
    Alert.alert('Reset scale?', 'Changing the scale will remove all current plots.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', style: 'destructive', onPress: startCalibration },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.backBtn, { backgroundColor: colors.iconBtnBg }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={19} color={colors.text} strokeWidth={2.2} />
          </TouchableOpacity>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Land Measurement</Text>
              <Badge label='PRO' variant='pro' />
            </View>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Mouza map measurement & plot drawing</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          style={[
            styles.scaleChip,
            {
              backgroundColor: theme === 'dark' ? 'rgba(34,197,94,0.12)' : 'rgba(22,163,74,0.08)',
              borderColor: theme === 'dark' ? 'rgba(34,197,94,0.30)' : 'rgba(22,163,74,0.24)',
            },
          ]}
          onPress={beginCalibration}
        >
          <Ruler size={13} color={colors.success} strokeWidth={2.2} />
          <Text style={[styles.scaleChipText, { color: colors.success }]}>
            {scale ? `1px = ${(1 / scale).toFixed(3)} ft` : 'Set scale'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.canvasContainer, { backgroundColor: colors.workspace }]}>
        <SkiaMapCanvas />

        <MobileResultsBar />

        <MobileCanvasToolbar
          onOpenManualScale={() => setIsManualScaleOpen(true)}
          onOpenImagePicker={() => setIsImagePickerOpen(true)}
          onOpenSave={() => setCalculationSheetMode('save')}
          onOpenLoad={() => setCalculationSheetMode('load')}
        />
      </View>

      <ScaleCalibrationModal
        visible={isDistanceModalOpen}
        kind='distance'
        onClose={cancelCalibration}
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
      {calculationSheetMode !== null && (
        <CalculationLibrarySheet
          visible
          mode={calculationSheetMode}
          onClose={() => setCalculationSheetMode(null)}
          onRequireMap={(calculation) => {
            setPendingCalculation(calculation);
            Alert.alert(
              'Map image required',
              `Select “${calculation.mapName || 'map file'}” and the saved measurement will load automatically.`,
            );
            setIsImagePickerOpen(true);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
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
  },
  headerSub: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    marginTop: -2,
  },
  scaleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 7,
  },
  scaleChipText: {
    fontSize: 11,
    fontFamily: Fonts.headingSemiBold,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
  },
});
