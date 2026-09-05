import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { type Region } from 'react-native-maps';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  FileUp,
  Globe2,
  Layers,
  LocateFixed,
  Map,
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
        edgePadding: { top: 70, right: 36, bottom: 190, left: 36 },
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

  const placemarkGeometryCount = document
    ? document.placemarks.reduce(
        (sum, item) => sum + item.points.length + item.lines.length + item.polygons.length,
        0,
      )
    : 0;

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
          {loading ? <ActivityIndicator size='small' color='#16a34a' /> : <FileUp size={16} color='#16a34a' />}
          <Text style={styles.openButtonText}>{document ? 'Open' : 'Import'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={INITIAL_REGION}
          mapType={mapStyle}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          showsCompass
          showsUserLocation={locationGranted}
          showsMyLocationButton={false}
          loadingEnabled
        >
          {document ? (
            <KmzMapOverlayLayer document={document} overlayOpacity={overlayOpacity} />
          ) : null}
        </MapView>

        {!document ? (
          <View pointerEvents='box-none' style={styles.emptyWrap}>
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.emptyIcon}>
                <Globe2 size={28} color='#16a34a' />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Google Earth KMZ এখানে দেখুন</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>KMZ বা KML import করলে overlay, point, line ও polygon সরাসরি map-এর সাথে locked থাকবে।</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={openKmz} disabled={loading}>
                {loading ? <ActivityIndicator size='small' color='#fff' /> : <FileUp size={17} color='#fff' />}
                <Text style={styles.primaryButtonText}>KMZ Import করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {document ? (
          <View pointerEvents='box-none' style={[styles.bottomWrap, { bottom: insets.bottom + 10 }]}>
            <View style={[styles.infoCard, { backgroundColor: theme === 'dark' ? 'rgba(15,23,42,0.96)' : 'rgba(255,255,255,0.96)', borderColor: colors.border }]}>
              <View style={styles.fileRow}>
                <View style={styles.fileIcon}><Layers size={16} color='#16a34a' /></View>
                <View style={styles.fileText}>
                  <Text numberOfLines={1} style={[styles.fileName, { color: colors.text }]}>{document.sourceName}</Text>
                  <Text style={[styles.fileMeta, { color: colors.textMuted }]}>
                    {document.overlays.length} overlay • {placemarkGeometryCount} placemark layer
                  </Text>
                </View>
              </View>

              <View style={styles.opacityRow}>
                <Text style={[styles.controlLabel, { color: colors.textMuted }]}>Overlay opacity</Text>
                <View style={styles.opacityControls}>
                  <TouchableOpacity
                    style={[styles.smallControl, { borderColor: colors.border }]}
                    onPress={() => setOverlayOpacity((value) => Math.max(0.1, Math.round((value - 0.1) * 10) / 10))}
                  >
                    <Minus size={15} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.opacityValue, { color: colors.text }]}>{Math.round(overlayOpacity * 100)}%</Text>
                  <TouchableOpacity
                    style={[styles.smallControl, { borderColor: colors.border }]}
                    onPress={() => setOverlayOpacity((value) => Math.min(1, Math.round((value + 0.1) * 10) / 10))}
                  >
                    <Plus size={15} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.toolbar, { backgroundColor: theme === 'dark' ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.98)', borderColor: colors.border }]}>
              <Tool
                icon={mapStyle === 'hybrid' ? <Satellite size={18} color='#16a34a' /> : <Map size={18} color={colors.textMuted} />}
                label={mapStyle === 'hybrid' ? 'Satellite' : 'Map'}
                active={mapStyle === 'hybrid'}
                onPress={() => setMapStyle((value) => value === 'hybrid' ? 'standard' : 'hybrid')}
                colors={colors}
              />
              <Tool
                icon={locating
                  ? <ActivityIndicator size='small' color='#2563eb' />
                  : <Navigation size={18} color={locationGranted ? '#2563eb' : colors.textMuted} />}
                label='My Location'
                active={locationGranted || locating}
                activeColor='#2563eb'
                onPress={goToMyLocation}
                colors={colors}
              />
              <Tool
                icon={<LocateFixed size={18} color={colors.textMuted} />}
                label='Fit KMZ'
                onPress={() => fitDocument()}
                colors={colors}
              />
              <Tool
                icon={<FileUp size={18} color={colors.textMuted} />}
                label='Open KMZ'
                onPress={openKmz}
                colors={colors}
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
  activeColor = '#16a34a',
  onPress,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  activeColor?: string;
  onPress: () => void;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.tool}>
      {icon}
      <Text style={[styles.toolLabel, { color: active ? activeColor : colors.textMuted }]} numberOfLines={1}>
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
  openButton: { minWidth: 76, height: 35, borderRadius: 9, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginLeft: 8 },
  openButtonText: { color: '#16a34a', fontFamily: Fonts.headingBold, fontSize: 10.5 },
  mapWrap: { flex: 1, position: 'relative', overflow: 'hidden' },
  emptyWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  emptyCard: { width: '100%', maxWidth: 360, borderRadius: 18, borderWidth: 1, padding: 20, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(22,163,74,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emptyTitle: { fontFamily: Fonts.headingBold, fontSize: 16, textAlign: 'center' },
  emptyText: { fontFamily: Fonts.sansRegular, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  primaryButton: { minHeight: 43, marginTop: 8, paddingHorizontal: 18, borderRadius: 11, backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  primaryButtonText: { color: '#fff', fontFamily: Fonts.headingBold, fontSize: 12 },
  bottomWrap: { position: 'absolute', left: 10, right: 10, gap: 8, zIndex: 50 },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 10, gap: 9, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 7, elevation: 5 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  fileIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(22,163,74,0.12)', alignItems: 'center', justifyContent: 'center' },
  fileText: { flex: 1, minWidth: 0 },
  fileName: { fontFamily: Fonts.headingSemiBold, fontSize: 11.5 },
  fileMeta: { fontFamily: Fonts.sansRegular, fontSize: 9.5, marginTop: 1 },
  opacityRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  controlLabel: { fontFamily: Fonts.sansMedium, fontSize: 10.5 },
  opacityControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallControl: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  opacityValue: { minWidth: 38, textAlign: 'center', fontFamily: Fonts.headingBold, fontSize: 11 },
  toolbar: { minHeight: 66, borderRadius: 14, borderWidth: 1, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'stretch', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 7, elevation: 5 },
  tool: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 2 },
  toolLabel: { fontFamily: Fonts.sansMedium, fontSize: 8.5, textAlign: 'center' },
});
