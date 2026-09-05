import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { UrlTile, type Region } from 'react-native-maps';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ArrowLeft,
  FileUp,
  Layers,
  LocateFixed,
  Minus,
  Navigation,
  Plus,
  Satellite,
} from 'lucide-react-native';
import { Badge } from '../../components/ui/badge';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { KmzMapOverlayLayer } from '../../features/kmz-viewer/components/KmzMapOverlayLayer';
import type { KmzDocument } from '../../features/kmz-viewer/types';
import {
  cleanupKmzDocument,
  loadKmzDocument,
} from '../../features/kmz-viewer/utils/kmz-parser';
import { useThemeStore } from '../../stores/theme-store';

// Google Maps canvas background — replaces the default WHITE canvas with dark navy.
// Without this, every zoom in/out shows a blinding white flash while new tiles load.
// customMapStyle works even with mapType="none" on Android.
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0a0f1d' }] },
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050a14' }] },
];

// Tile cache directory — once a tile is downloaded it lives here.
// On subsequent zooms / revisits those tiles load from disk (instant),
// so there is no white flash for any area that has been viewed before.
const MAP_TILE_CACHE_DIR = (FileSystem.cacheDirectory ?? '')
  .replace(/^file:\/\//, '')          // strip file:// scheme
  .replace(/\/$/, '')                 // strip trailing slash
  + '/mmp-map-tiles';

const INITIAL_REGION: Region = {
  latitude: 25.6217,
  longitude: 88.6354,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function KmzViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const mapRef = useRef<MapView>(null);
  const documentRef = useRef<KmzDocument | null>(null);

  const [document, setDocument] = useState<KmzDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [mapStyle, setMapStyle] = useState<'hybrid' | 'standard'>('hybrid');
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [isOpacityOpen, setIsOpacityOpen] = useState(false);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (active) setLocationGranted(permission.granted);
      } catch {
        if (active) setLocationGranted(false);
      }
    })();

    return () => {
      active = false;
      void cleanupKmzDocument(documentRef.current);
    };
  }, []);

  const fitDocument = useCallback((nextDocument?: KmzDocument | null) => {
    const target = nextDocument ?? documentRef.current;
    if (!target?.allCoordinates.length || !mapRef.current) return;

    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let minLng = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;
    target.allCoordinates.forEach((point) => {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    });

    if (![minLat, maxLat, minLng, maxLng].every(Number.isFinite)) return;
    mapRef.current.fitToCoordinates(
      [
        { latitude: minLat, longitude: minLng },
        { latitude: maxLat, longitude: maxLng },
      ],
      {
        edgePadding: { top: 70, right: 36, bottom: 120, left: 36 },
        animated: true,
      },
    );
  }, []);

  const goToMyLocation = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (!permission.granted) {
        setLocationGranted(false);
        Alert.alert('Location permission দরকার', 'আপনি কোন প্লটের উপর আছেন দেখাতে Location permission Allow করুন।');
        return;
      }

      setLocationGranted(true);
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 15_000,
        requiredAccuracy: 80,
      });
      const position = lastKnown ?? await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      mapRef.current?.animateToRegion(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.0025,
          longitudeDelta: 0.0025,
        },
        450,
      );
    } catch {
      Alert.alert('Location পাওয়া যায়নি', 'GPS চালু আছে কিনা দেখে আবার চেষ্টা করুন।');
    } finally {
      setLocating(false);
    }
  }, [locating]);

  const openKmz = useCallback(async () => {
    if (loading) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const sourceName = asset.name || 'map.kmz';
      if (!/\.(kmz|kml)$/i.test(sourceName)) {
        Alert.alert('KMZ file required', 'Please choose a .kmz or .kml file.');
        return;
      }

      setLoading(true);
      const nextDocument = await loadKmzDocument(asset.uri, sourceName);
      await cleanupKmzDocument(documentRef.current);
      setDocument(nextDocument);
      documentRef.current = nextDocument;
      setOverlayOpacity(1);
      setTimeout(() => fitDocument(nextDocument), 180);
    } catch (error) {
      Alert.alert(
        'Could not open KMZ',
        error instanceof Error ? error.message : 'The selected KMZ could not be read.',
      );
    } finally {
      setLoading(false);
    }
  }, [fitDocument, loading]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.iconBtnBg }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={19} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>KMZ Viewer</Text>
              <Badge label='PRO' variant='pro' />
            </View>
            <Text numberOfLines={1} style={[styles.subtitle, { color: colors.textMuted }]}>
              {document ? document.name : 'Google Earth KMZ / KML viewer'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.openButton, { borderColor: 'rgba(22,163,74,0.35)' }]}
          onPress={openKmz}
          disabled={loading}
        >
          {loading ? <ActivityIndicator size='small' color='#16a34a' /> : <FileUp size={15} color='#16a34a' />}
          <Text numberOfLines={1} style={styles.openButtonText}>
            {document ? document.sourceName : 'Import'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={[StyleSheet.absoluteFill, { backgroundColor: '#0a0f1d' }]}
          initialRegion={INITIAL_REGION}
          mapType="none"
          customMapStyle={DARK_MAP_STYLE}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          showsCompass
          showsUserLocation={locationGranted}
          showsMyLocationButton={false}
          loadingBackgroundColor="#0a0f1d"
          onPress={() => setIsOpacityOpen(false)}
        >
          <UrlTile
            key={mapStyle}
            urlTemplate={
              mapStyle === 'hybrid'
                ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&scale=2'
                : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&scale=2'
            }
            tileSize={256}
            maximumZ={22}
            flipY={false}
            zIndex={-1}
            tileCachePath={MAP_TILE_CACHE_DIR}
            tileCacheMaxAge={60 * 60 * 24 * 30}
          />
          {document ? (
            <KmzMapOverlayLayer document={document} overlayOpacity={overlayOpacity} />
          ) : null}
        </MapView>

        {isOpacityOpen && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsOpacityOpen(false)}
          />
        )}

        {document ? (
          <View pointerEvents='box-none' style={[styles.bottomWrap, { bottom: insets.bottom + 12 }]}>
            {/* ─── Opacity Popover Panel ─── */}
            {isOpacityOpen && (
              <View
                style={[
                  styles.opacityPanel,
                  {
                    backgroundColor:
                      theme === 'dark' ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.98)',
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.opacityHeader}>
                  <View style={styles.opacityTitleRow}>
                    <View
                      style={[
                        styles.opacityIconBadge,
                        {
                          backgroundColor:
                            theme === 'dark'
                              ? 'rgba(34,197,94,0.18)'
                              : 'rgba(22,163,74,0.12)',
                        },
                      ]}
                    >
                      <Layers size={14} color={colors.primary} />
                    </View>
                    <Text style={[styles.opacityTitle, { color: colors.text }]}>
                      Overlay Opacity
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.opacityValuePill,
                      {
                        backgroundColor:
                          theme === 'dark'
                            ? 'rgba(34,197,94,0.16)'
                            : 'rgba(22,163,74,0.12)',
                        borderColor:
                          theme === 'dark'
                            ? 'rgba(34,197,94,0.3)'
                            : 'rgba(22,163,74,0.25)',
                      },
                    ]}
                  >
                    <Text style={[styles.opacityValueText, { color: colors.primary }]}>
                      {Math.round(overlayOpacity * 100)}%
                    </Text>
                  </View>
                </View>

                {/* Quick Presets */}
                <View style={styles.presetRow}>
                  {[0.25, 0.5, 0.75, 1.0].map((preset) => {
                    const isSelected = Math.abs(overlayOpacity - preset) < 0.05;
                    return (
                      <TouchableOpacity
                        key={preset}
                        activeOpacity={0.7}
                        onPress={() => setOverlayOpacity(preset)}
                        style={[
                          styles.presetChip,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected
                              ? colors.primary
                              : theme === 'dark'
                              ? 'rgba(30,41,59,0.7)'
                              : 'rgba(241,245,249,0.9)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetText,
                            {
                              color: isSelected ? '#ffffff' : colors.textMuted,
                              fontFamily: isSelected ? Fonts.headingBold : Fonts.sansMedium,
                            },
                          ]}
                        >
                          {Math.round(preset * 100)}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Fine Adjustment Stepper */}
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      setOverlayOpacity((v) =>
                        Math.max(0.1, Math.round((v - 0.1) * 10) / 10)
                      )
                    }
                    disabled={overlayOpacity <= 0.1}
                    style={[
                      styles.stepperButton,
                      {
                        borderColor: colors.border,
                        backgroundColor:
                          theme === 'dark'
                            ? 'rgba(30,41,59,0.7)'
                            : 'rgba(241,245,249,0.9)',
                        opacity: overlayOpacity <= 0.1 ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Minus size={15} color={colors.text} />
                  </TouchableOpacity>

                  <View style={styles.stepperCenter}>
                    <Text style={[styles.stepperHint, { color: colors.textMuted }]}>
                      -10% অথবা +10% সমন্বয়
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      setOverlayOpacity((v) =>
                        Math.min(1.0, Math.round((v + 0.1) * 10) / 10)
                      )
                    }
                    disabled={overlayOpacity >= 1.0}
                    style={[
                      styles.stepperButton,
                      {
                        borderColor: colors.border,
                        backgroundColor:
                          theme === 'dark'
                            ? 'rgba(30,41,59,0.7)'
                            : 'rgba(241,245,249,0.9)',
                        opacity: overlayOpacity >= 1.0 ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Plus size={15} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ─── Floating Dock Toolbar ─── */}
            <View
              style={[
                styles.toolbar,
                {
                  backgroundColor:
                    theme === 'dark' ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.98)',
                  borderColor: colors.border,
                },
              ]}
            >
              <Tool
                icon={
                  <Satellite
                    size={18}
                    color={mapStyle === 'hybrid' ? colors.primary : colors.textMuted}
                  />
                }
                label={mapStyle === 'hybrid' ? 'Satellite' : 'Map'}
                active={mapStyle === 'hybrid'}
                onPress={() =>
                  setMapStyle((value) => (value === 'hybrid' ? 'standard' : 'hybrid'))
                }
                colors={colors}
                theme={theme}
              />

              <Tool
                icon={
                  locating ? (
                    <ActivityIndicator size='small' color={colors.primary} />
                  ) : (
                    <Navigation
                      size={18}
                      color={locationGranted ? colors.primary : colors.textMuted}
                    />
                  )
                }
                label='Location'
                active={locationGranted || locating}
                onPress={goToMyLocation}
                colors={colors}
                theme={theme}
              />

              <Tool
                icon={<LocateFixed size={18} color={colors.textMuted} />}
                label='Fit KMZ'
                onPress={() => fitDocument()}
                colors={colors}
                theme={theme}
              />

              <Tool
                icon={
                  <Layers
                    size={18}
                    color={isOpacityOpen ? colors.primary : colors.textMuted}
                  />
                }
                label={`${Math.round(overlayOpacity * 100)}%`}
                active={isOpacityOpen}
                onPress={() => setIsOpacityOpen((prev) => !prev)}
                colors={colors}
                theme={theme}
              />
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Tool({
  icon,
  label,
  active,
  onPress,
  colors,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress: () => void;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  theme: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.tool,
        {
          backgroundColor: active
            ? isDark
              ? 'rgba(34,197,94,0.18)'
              : 'rgba(22,163,74,0.12)'
            : isDark
            ? 'rgba(30,41,59,0.55)'
            : 'rgba(241,245,249,0.85)',
          borderColor: active
            ? isDark
              ? 'rgba(34,197,94,0.45)'
              : 'rgba(22,163,74,0.4)'
            : colors.border,
        },
      ]}
    >
      <View style={styles.iconBox}>{icon}</View>
      <Text
        style={[
          styles.toolLabel,
          {
            color: active ? colors.primary : colors.textMuted,
            fontFamily: active ? Fonts.headingBold : Fonts.sansMedium,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { height: 60, borderBottomWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  headerText: { flex: 1, minWidth: 0 },
  iconButton: { width: 35, height: 35, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: Fonts.headingBold, fontSize: 16 },
  subtitle: { fontFamily: Fonts.sansRegular, fontSize: 10, marginTop: -1 },
  openButton: { minWidth: 82, maxWidth: 142, height: 35, borderRadius: 9, borderWidth: 1, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginLeft: 8 },
  openButtonText: { flexShrink: 1, color: '#16a34a', fontFamily: Fonts.headingSemiBold, fontSize: 9.5 },
  mapWrap: { flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#0a0f1d' },
  bottomWrap: { position: 'absolute', left: 12, right: 12, zIndex: 50 },
  toolbar: {
    minHeight: 64,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  tool: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconBox: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 9.5,
    marginTop: 2,
    textAlign: 'center',
  },
  opacityPanel: {
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 12,
  },
  opacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  opacityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  opacityIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opacityTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 12,
  },
  opacityValuePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
  },
  opacityValueText: {
    fontFamily: Fonts.headingBold,
    fontSize: 11,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 11,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCenter: {
    flex: 1,
    alignItems: 'center',
  },
  stepperHint: {
    fontFamily: Fonts.sansRegular,
    fontSize: 10,
    textAlign: 'center',
  },
});