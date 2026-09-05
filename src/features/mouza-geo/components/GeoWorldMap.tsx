import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import MapView, { Marker, Overlay, Polygon } from 'react-native-maps';
import * as Location from 'expo-location';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import type { ControlPair, GeoBackgroundMode, GeoImage, GeoMapStyle, GeoPoint, GeoTransform } from '../types';
import { getNativeOverlayPreview, getOverlayCorners } from '../utils/geo-math';
import { getGeoOverlayImageUri } from '../utils/overlay-image';

export type GeoWorldMapHandle = {
  getCenterCoordinate: () => Promise<GeoPoint | null>;
  focusUserLocation: () => Promise<GeoPoint | null>;
  fitAlignment: () => void;
};

type Props = {
  image: GeoImage;
  transform: GeoTransform | null;
  controlPairs: ControlPair[];
  opacity: number;
  mapStyle: GeoMapStyle;
  backgroundMode: GeoBackgroundMode;
};

const INITIAL_REGION = {
  latitude: 25.6217,
  longitude: 88.6354,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export const GeoWorldMap = forwardRef<GeoWorldMapHandle, Props>(function GeoWorldMap(
  { image, transform, controlPairs, opacity, mapStyle, backgroundMode },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const [showsUserLocation, setShowsUserLocation] = useState(false);
  const [overlayUri, setOverlayUri] = useState(image.uri);
  const [preparingOverlay, setPreparingOverlay] = useState(false);
  const corners = useMemo(() => transform ? getOverlayCorners(transform, image) : [], [image, transform]);
  const preview = useMemo(() => transform ? getNativeOverlayPreview(transform, image) : null, [image, transform]);

  useEffect(() => {
    let active = true;
    setOverlayUri(image.uri);

    if (backgroundMode === 'original') {
      setPreparingOverlay(false);
      return () => { active = false; };
    }

    setPreparingOverlay(true);
    void getGeoOverlayImageUri(image, backgroundMode)
      .then((uri) => {
        if (active) setOverlayUri(uri);
      })
      .catch(() => {
        if (active) setOverlayUri(image.uri);
      })
      .finally(() => {
        if (active) setPreparingOverlay(false);
      });

    return () => { active = false; };
  }, [backgroundMode, image]);

  const fitAlignment = () => {
    if (!mapRef.current || !corners.length) return;
    mapRef.current.fitToCoordinates(
      corners.map((point) => ({ latitude: point.lat, longitude: point.lng })),
      { edgePadding: { top: 80, right: 50, bottom: 170, left: 50 }, animated: true },
    );
  };

  useImperativeHandle(ref, () => ({
    fitAlignment,
    getCenterCoordinate: async () => {
      const camera = await mapRef.current?.getCamera();
      if (!camera?.center) return null;
      return { lat: camera.center.latitude, lng: camera.center.longitude };
    },
    focusUserLocation: async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location permission required', 'Allow location access to center the satellite map on your current position.');
        return null;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const point = { lat: location.coords.latitude, lng: location.coords.longitude };
      setShowsUserLocation(true);
      mapRef.current?.animateCamera({ center: { latitude: point.lat, longitude: point.lng }, zoom: 18 }, { duration: 450 });
      return point;
    },
  }), [corners]);

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        mapType={mapStyle === 'satellite' ? 'hybrid' : 'standard'}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        showsCompass={false}
        showsUserLocation={showsUserLocation}
        loadingEnabled
      >
        {preview && (
          <Overlay
            key={`${backgroundMode}-${overlayUri}`}
            image={{ uri: overlayUri }}
            bounds={preview.bounds}
            bearing={preview.bearing}
            opacity={opacity}
          />
        )}
        {corners.length === 4 && (
          <Polygon
            coordinates={corners.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
            strokeColor='#2563eb'
            fillColor='rgba(37,99,235,0.04)'
            strokeWidth={1.5}
          />
        )}
        {controlPairs.map((pair, index) => (
          <Marker
            key={pair.id}
            coordinate={{ latitude: pair.world.lat, longitude: pair.world.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.markerWrap}>
              <View style={styles.markerHalo} />
              <View style={styles.markerCore}>
                <Text style={styles.markerText}>{index + 1}</Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {preparingOverlay ? (
        <View pointerEvents='none' style={styles.processingBadge}>
          <ActivityIndicator size='small' color='#2563eb' />
          <Text style={styles.processingText}>Cleaning paper background…</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#dbeafe' },
  markerWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
    backgroundColor: 'rgba(220,38,38,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  markerCore: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: '#dc2626',
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: { color: '#fff', fontSize: 9, fontWeight: '800', lineHeight: 11 },
  processingBadge: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  processingText: { color: '#334155', fontSize: 10, fontWeight: '600' },
});
