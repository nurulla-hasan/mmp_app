import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View, StyleSheet, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Ruler } from 'lucide-react-native';
import { SkiaMapCanvas } from '../../features/land-measurement/components/canvas/SkiaMapCanvas';
import { commitCenterPointFromRuntime } from '../../features/land-measurement/components/canvas/canvas-runtime';
import { MobileCanvasToolbar } from '../../features/land-measurement/components/toolbar/MobileCanvasToolbar';
import { MobileResultsBar } from '../../features/land-measurement/components/results/MobileResultsBar';
import { ScaleCalibrationModal } from '../../features/land-measurement/components/modals/ScaleCalibrationModal';
import { ImagePickerSheet } from '../../features/land-measurement/components/modals/ImagePickerSheet';
import { CalculationLibrarySheet, applyServerCalculation, type ServerCalculation } from '../../features/land-measurement/components/modals/CalculationLibrarySheet';
import { useMapStore } from '../../features/land-measurement/store/useMapStore';
import { Fonts } from '../../constants/typography';
import { Badge } from '../../components/ui/badge';
import { toBengaliDigits } from '../../lib/utils';

export default function LandMeasurementScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const pointTouchLatchedRef = useRef(false);
  const scale = useMapStore((state) => state.scale);
  const mapImage = useMapStore((state) => state.mapImage);
  const plots = useMapStore((state) => state.plots);
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
    if (plots.length === 0) {
      startCalibration();
      return;
    }
    Alert.alert('স্কেল আবার সেট করবেন?', 'স্কেল বদলালে বর্তমান সব প্লট মুছে যাবে।', [
      { text: 'বাতিল', style: 'cancel' },
      { text: 'চালিয়ে যান', style: 'destructive', onPress: startCalibration },
    ]);
  };

  /**
   * Android gives an already-active canvas gesture ownership of finger #1.
   * A second finger landing on an overlapping toolbar can therefore bypass the
   * normal React responder chain completely. Observe touches from one native
   * RNGH Manual gesture attached to the whole workspace. We never activate the
   * observer, so child pan/pinch/tap gestures remain free to run; it only sees
   * finger #2 and commits Point immediately when that touch lands in the Point
   * action zone. The Point button itself has its own native recognizer too, and
   * canvas-runtime dedupes both paths.
   */
  const workspaceTouchObserver = useMemo(() => Gesture.Manual()
    .runOnJS(true)
    .shouldCancelWhenOutside(false)
    .onTouchesDown((event: any) => {
      const touches = Array.from(event.allTouches ?? []) as any[];
      if (touches.length < 2 || pointTouchLatchedRef.current) return;

      const current = useMapStore.getState();
      if (current.mode !== 'drawing_plot' && current.mode !== 'calibrating') return;

      const changedTouches = Array.from(event.changedTouches ?? []) as any[];
      const candidates = changedTouches.length > 0 ? changedTouches : touches.slice(-1);
      const pointTouch = candidates.find((touch) => {
        const x = Number(touch.absoluteX ?? touch.x ?? 0);
        const y = Number(touch.absoluteY ?? touch.y ?? 0);
        const xRatio = x / Math.max(windowWidth, 1);
        const isToolbarBand = y >= windowHeight - 132;
        const isPointButton = current.mode === 'drawing_plot'
          ? xRatio >= 0.54 && xRatio <= 0.84
          : xRatio >= 0.76;
        return isToolbarBand && isPointButton;
      });

      if (!pointTouch) return;
      pointTouchLatchedRef.current = true;
      commitCenterPointFromRuntime();
    })
    .onTouchesUp((event: any) => {
      if ((event.allTouches ?? []).length <= 1) pointTouchLatchedRef.current = false;
    })
    .onTouchesCancelled(() => {
      pointTouchLatchedRef.current = false;
    }), [windowHeight, windowWidth]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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

      <GestureDetector gesture={workspaceTouchObserver}>
        <View style={styles.canvasContainer}>
          <SkiaMapCanvas />

          <MobileResultsBar />

          <MobileCanvasToolbar
            onOpenManualScale={() => setIsManualScaleOpen(true)}
            onOpenImagePicker={() => setIsImagePickerOpen(true)}
            onOpenSave={() => setCalculationSheetMode('save')}
            onOpenLoad={() => setCalculationSheetMode('load')}
          />
        </View>
      </GestureDetector>

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
      <CalculationLibrarySheet
        visible={calculationSheetMode !== null}
        mode={calculationSheetMode ?? 'load'}
        onClose={() => setCalculationSheetMode(null)}
        onRequireMap={(calculation) => {
          setPendingCalculation(calculation);
          Alert.alert('ম্যাপ ইমেজ প্রয়োজন', `“${calculation.mapName || 'ম্যাপ ফাইল'}” নির্বাচন করলে পরিমাপটি স্বয়ংক্রিয়ভাবে লোড হবে।`);
          setIsImagePickerOpen(true);
        }}
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