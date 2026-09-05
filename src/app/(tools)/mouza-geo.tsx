import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Crosshair, Download, FileText, Globe2, LocateFixed, Redo2, Settings2, Undo2 } from 'lucide-react-native';
import { Badge } from '../../components/ui/badge';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import { GeoImportSheet } from '../../features/mouza-geo/components/GeoImportSheet';
import { GeoSettingsSheet } from '../../features/mouza-geo/components/GeoSettingsSheet';
import { GeoSourceCanvas, type GeoSourceCanvasHandle } from '../../features/mouza-geo/components/GeoSourceCanvas';
import { GeoTargetCrosshair } from '../../features/mouza-geo/components/GeoTargetCrosshair';
import { GeoWorldMap, type GeoWorldMapHandle } from '../../features/mouza-geo/components/GeoWorldMap';
import { useGeoOverlayPreview } from '../../features/mouza-geo/hooks/useGeoOverlayPreview';
import { useMouzaGeoStore } from '../../features/mouza-geo/store/useMouzaGeoStore';
import { exportMouzaKmz } from '../../features/mouza-geo/utils/kmz';

const TARGET_OFFSET_Y = -64;

export default function MouzaGeoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const sourceRef = useRef<GeoSourceCanvasHandle>(null);
  const worldRef = useRef<GeoWorldMapHandle>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const image = useMouzaGeoStore((state) => state.image);
  const activeView = useMouzaGeoStore((state) => state.activeView);
  const controlPairs = useMouzaGeoStore((state) => state.controlPairs);
  const redoPairs = useMouzaGeoStore((state) => state.redoPairs);
  const pendingSource = useMouzaGeoStore((state) => state.pendingSource);
  const transform = useMouzaGeoStore((state) => state.transform);
  const mapStyle = useMouzaGeoStore((state) => state.mapStyle);
  const opacity = useMouzaGeoStore((state) => state.opacity);
  const backgroundRemoved = useMouzaGeoStore((state) => state.backgroundRemoved);
  const backgroundSensitivity = useMouzaGeoStore((state) => state.backgroundSensitivity);
  const exportQuality = useMouzaGeoStore((state) => state.exportQuality);
  const setActiveView = useMouzaGeoStore((state) => state.setActiveView);
  const captureSource = useMouzaGeoStore((state) => state.captureSource);
  const captureWorld = useMouzaGeoStore((state) => state.captureWorld);
  const undo = useMouzaGeoStore((state) => state.undo);
  const redo = useMouzaGeoStore((state) => state.redo);
  const { displayImage, processing: processingOverlay } = useGeoOverlayPreview(
    image,
    backgroundRemoved,
    backgroundSensitivity,
  );

  const worldReady =
    activeView === 'world' ||
    Boolean(pendingSource) ||
    controlPairs.length > 0 ||
    Boolean(transform);

  const pointNumber = controlPairs.length + 1;
  const instruction = useMemo(() => {
    if (!image) return 'Import a mouza map to start';
    if (activeView === 'source') return `Move the mouza map until Point ${pointNumber} is exactly under the + target.`;
    if (!pendingSource) return 'Set a source point first, then choose the same real-world location.';
    return `Move the world map until the matching location for Point ${pointNumber} is under the + target.`;
  }, [activeView, image, pendingSource, pointNumber]);

  const confirmPoint = async () => {
    if (!image) return;
    if (activeView === 'source') {
      const point = sourceRef.current?.getCenterSourcePoint();
      if (!point) {
        Alert.alert('Target outside map', 'Move the mouza map so the + target is on the sheet.');
        return;
      }
      captureSource(point);
      return;
    }
    if (!pendingSource) {
      Alert.alert('Source point required', 'Open Mouza view and set the source point first.');
      setActiveView('source');
      return;
    }
    const world = await worldRef.current?.getCenterCoordinate();
    if (!world) return;
    captureWorld(world);
  };

  const locate = async () => {
    if (!image) return;
    setActiveView('world');
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      await worldRef.current?.focusUserLocation();
    } catch {
      Alert.alert('Location unavailable', 'Could not get your current GPS location.');
    }
  };

  const exportKmz = async () => {
    if (!image || !transform || exporting) {
      if (!transform) Alert.alert('Alignment required', 'Complete at least 2 matching point pairs before exporting KMZ.');
      return;
    }
    setExporting(true);
    try {
      await exportMouzaKmz({
        image,
        transform,
        opacity,
        backgroundRemoved,
        backgroundSensitivity,
        quality: exportQuality,
      });
    } catch (error) {
      Alert.alert('KMZ export failed', error instanceof Error ? error.message : 'Could not create the KMZ file.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.iconBtnBg }]} onPress={() => router.back()}><ArrowLeft size={19} color={colors.text} /></TouchableOpacity>
          <View>
            <View style={styles.titleRow}><Text style={[styles.title, { color: colors.text }]}>Mouza Geo</Text><Badge label='PRO' variant='pro' /></View>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{controlPairs.length} pair{controlPairs.length === 1 ? '' : 's'} • mobile precision mode</Text>
          </View>
        </View>
        <TouchableOpacity disabled={exporting || !transform} style={[styles.exportButton, { borderColor: transform ? 'rgba(37,99,235,0.4)' : colors.border }, !transform && { opacity: 0.45 }]} onPress={exportKmz}>
          {exporting ? <ActivityIndicator size='small' color='#2563eb' /> : <Download size={16} color='#2563eb' />}
          <Text style={styles.exportText}>KMZ</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.workspace, { backgroundColor: theme === 'dark' ? '#080d16' : '#e5e7eb' }]}>
        {!image || !displayImage ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Globe2 size={28} color='#2563eb' /></View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Georeference your mouza map</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Place matching control points using a fixed center target—no finger-tap guessing.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setImportOpen(true)}><Text style={styles.primaryButtonText}>Import PDF / Image</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <View pointerEvents={activeView === 'source' ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, activeView !== 'source' && styles.hiddenCanvas]}>
              <GeoSourceCanvas
                ref={sourceRef}
                image={displayImage}
                controlPairs={controlPairs}
                pendingSource={pendingSource}
                targetOffsetY={TARGET_OFFSET_Y}
              />
            </View>
            {worldReady ? (
              <View pointerEvents={activeView === 'world' ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, activeView !== 'world' && styles.hiddenCanvas]}>
                <GeoWorldMap
                  ref={worldRef}
                  sourceImage={image}
                  previewImage={displayImage}
                  transform={transform}
                  controlPairs={controlPairs}
                  opacity={opacity}
                  mapStyle={mapStyle}
                  backgroundRemoved={backgroundRemoved}
                  backgroundSensitivity={backgroundSensitivity}
                  targetOffsetY={TARGET_OFFSET_Y}
                />
              </View>
            ) : null}
            <GeoTargetCrosshair offsetY={TARGET_OFFSET_Y} />

            {processingOverlay ? (
              <View pointerEvents='none' style={styles.processingBadge}>
                <ActivityIndicator size='small' color='#2563eb' />
                <Text style={styles.processingText}>
                  {backgroundRemoved ? 'Updating background preview…' : 'Optimizing map preview…'}
                </Text>
              </View>
            ) : null}

            <View pointerEvents='box-none' style={[styles.bottomWrap, { bottom: insets.bottom + 10 }]}>
              <View style={[styles.instructionCard, { backgroundColor: theme === 'dark' ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.96)', borderColor: colors.border }]}>
                <View style={styles.instructionTop}>
                  <View style={styles.targetBadge}><Crosshair size={13} color='#2563eb' /><Text style={styles.targetBadgeText}>Point {pointNumber}</Text></View>
                  <Text numberOfLines={2} style={[styles.instructionText, { color: colors.textMuted }]}>{instruction}</Text>
                </View>
                <TouchableOpacity style={[styles.confirmButton, activeView === 'world' && !pendingSource && styles.confirmDisabled]} onPress={confirmPoint} disabled={activeView === 'world' && !pendingSource}>
                  <Crosshair size={17} color='#fff' />
                  <Text style={styles.confirmText}>{activeView === 'source' ? `Set Mouza Point ${pointNumber}` : `Set World Location ${pointNumber}`}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.toolbar, { backgroundColor: theme === 'dark' ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.98)', borderColor: colors.border }]}>
                <Tool icon={<FileText size={18} color={activeView === 'source' ? '#2563eb' : colors.textMuted} />} label='Mouza' active={activeView === 'source'} onPress={() => setActiveView('source')} colors={colors} />
                <Tool icon={<Globe2 size={18} color={activeView === 'world' ? '#2563eb' : colors.textMuted} />} label='World' active={activeView === 'world'} onPress={() => setActiveView('world')} colors={colors} />
                <Tool icon={<LocateFixed size={18} color={colors.textMuted} />} label='GPS' onPress={locate} colors={colors} />
                <Tool icon={<Undo2 size={18} color={controlPairs.length || pendingSource ? colors.text : colors.textMuted} />} label='Undo' disabled={!controlPairs.length && !pendingSource} onPress={undo} colors={colors} />
                <Tool icon={<Redo2 size={18} color={redoPairs.length ? colors.text : colors.textMuted} />} label='Redo' disabled={!redoPairs.length} onPress={redo} colors={colors} />
                <Tool icon={<Settings2 size={18} color={colors.textMuted} />} label='More' onPress={() => setSettingsOpen(true)} colors={colors} />
              </View>
            </View>
          </>
        )}
      </View>

      <GeoImportSheet visible={importOpen} onClose={() => setImportOpen(false)} />
      <GeoSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} onOpenImport={() => setImportOpen(true)} />
    </SafeAreaView>
  );
}

function Tool({ icon, label, active, disabled, onPress, colors }: { icon: React.ReactNode; label: string; active?: boolean; disabled?: boolean; onPress: () => void; colors: typeof Colors.light | typeof Colors.dark }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.tool, active && styles.toolActive, disabled && { opacity: 0.38 }]}>
      {icon}<Text style={[styles.toolLabel, { color: active ? '#2563eb' : colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { height: 58, borderBottomWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: Fonts.headingBold, fontSize: 15.5 },
  subtitle: { fontFamily: Fonts.sansRegular, fontSize: 10, marginTop: -2 },
  exportButton: { minWidth: 66, height: 34, borderRadius: 9, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  exportText: { color: '#2563eb', fontFamily: Fonts.headingBold, fontSize: 10.5 },
  workspace: { flex: 1, position: 'relative', overflow: 'hidden' },
  hiddenCanvas: { opacity: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: Fonts.headingBold, fontSize: 17, textAlign: 'center' },
  emptyText: { fontFamily: Fonts.sansRegular, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 5, maxWidth: 320 },
  primaryButton: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10 },
  primaryButtonText: { color: '#fff', fontFamily: Fonts.headingBold, fontSize: 12 },
  processingBadge: { position: 'absolute', top: 10, alignSelf: 'center', minHeight: 34, paddingHorizontal: 11, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.94)', flexDirection: 'row', alignItems: 'center', gap: 7, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 5, elevation: 4, zIndex: 45 },
  processingText: { color: '#334155', fontFamily: Fonts.sansMedium, fontSize: 10 },
  bottomWrap: { position: 'absolute', left: 10, right: 10, zIndex: 50, gap: 8 },
  instructionCard: { borderRadius: 14, borderWidth: 1, padding: 9, gap: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 5 },
  instructionTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  targetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, backgroundColor: 'rgba(37,99,235,0.11)', paddingHorizontal: 7, paddingVertical: 5 },
  targetBadgeText: { color: '#2563eb', fontFamily: Fonts.headingBold, fontSize: 10 },
  instructionText: { flex: 1, fontFamily: Fonts.sansRegular, fontSize: 9.5, lineHeight: 13 },
  confirmButton: { minHeight: 40, borderRadius: 10, backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  confirmDisabled: { opacity: 0.45 },
  confirmText: { color: '#fff', fontFamily: Fonts.headingBold, fontSize: 12 },
  toolbar: { minHeight: 58, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
  tool: { minWidth: 46, height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 2 },
  toolActive: { backgroundColor: 'rgba(37,99,235,0.10)' },
  toolLabel: { fontFamily: Fonts.sansMedium, fontSize: 8.5 },
});
