import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import MapView, { Marker, Overlay, Polygon } from 'react-native-maps';
import * as Location from 'expo-location';
import { Alert, StyleSheet, View } from 'react-native';
import type { ControlPair, GeoImage, GeoMapStyle, GeoPoint, GeoTransform } from '../types';
import { getNativeOverlayPreview, getOverlayCorners } from '../utils/geo-math';

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
};

const INITIAL_REGION = {
  latitude: 25.6217,
  longitude: 88.6354,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export const GeoWorldMap = forwardRef<GeoWorldMapHandle, Props>(function GeoWorldMap(
  { image, transform, controlPairs, opacity, mapStyle },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const [showsUserLocation, setShowsUserLocation] = useState(false);
  const corners = useMemo(() => transform ? getOverlayCorners(transform, image) : [], [image, transform]);
  const preview = useMemo(() => transform ? getNativeOverlayPreview(transform, image) : null, [image, transform]);

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
            image={{ uri: image.uri }}
            bounds={preview.bounds}
            bearing={preview.bearing}
            opacity={opacity}
          />
        )}
        {corners.length === 4 && (
          <Polygon
            coordinates={corners.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
            strokeColor='#2563eb'
            fillColor='rgba(37,99,235,0.05)'
            strokeWidth={2}
          />
        )}
        {controlPairs.map((pair, index) => (
          <Marker
            key={pair.id}
            coordinate={{ latitude: pair.world.lat, longitude: pair.world.lng }}
            title={`Point ${index + 1}`}
            pinColor='#dc2626'
          />
        ))}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#dbeafe' } });
