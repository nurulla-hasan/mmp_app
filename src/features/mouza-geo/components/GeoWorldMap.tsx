import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import MapView, { type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Alert, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import type { ControlPair, GeoImage, GeoMapStyle, GeoPoint, GeoTransform } from '../types';
import { getOverlayCorners } from '../utils/geo-math';
import { GeoWorldAffineOverlay } from './GeoWorldAffineOverlay';

export type GeoWorldMapHandle = {
  getCenterCoordinate: () => Promise<GeoPoint | null>;
  focusUserLocation: () => Promise<GeoPoint | null>;
  fitAlignment: () => void;
};

type Props = {
  sourceImage: GeoImage;
  previewImage: GeoImage;
  transform: GeoTransform | null;
  controlPairs: ControlPair[];
  opacity: number;
  mapStyle: GeoMapStyle;
  backgroundRemoved: boolean;
  backgroundSensitivity: number;
  targetOffsetY?: number;
};

const INITIAL_REGION: Region = {
  latitude: 25.6217,
  longitude: 88.6354,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export const GeoWorldMap = forwardRef<GeoWorldMapHandle, Props>(function GeoWorldMap(
  {
    sourceImage,
    previewImage,
    transform,
    controlPairs,
    opacity,
    mapStyle,
    backgroundRemoved,
    backgroundSensitivity,
    targetOffsetY = 0,
  },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const regionFrameRef = useRef<number | null>(null);
  const pendingRegionRef = useRef<Region>(INITIAL_REGION);
  const [showsUserLocation, setShowsUserLocation] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const corners = useMemo(
    () => transform ? getOverlayCorners(transform, sourceImage) : [],
    [sourceImage, transform],
  );

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
      if (mapRef.current && viewport.width > 0 && viewport.height > 0) {
        try {
          const coordinate = await mapRef.current.coordinateForPoint({
            x: viewport.width / 2,
            y: viewport.height / 2 + targetOffsetY,
          });
          if (coordinate) {
            return { lat: coordinate.latitude, lng: coordinate.longitude };
          }
        } catch {
          // Fall back to the camera center if point conversion is unavailable.
        }
      }

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
  }), [corners, targetOffsetY, viewport.height, viewport.width]);

  useEffect(
    () => () => {
      if (regionFrameRef.current !== null) cancelAnimationFrame(regionFrameRef.current);
    },
    [],
  );

  const scheduleRegionUpdate = (nextRegion: Region) => {
    pendingRegionRef.current = nextRegion;
    if (regionFrameRef.current !== null) return;
    regionFrameRef.current = requestAnimationFrame(() => {
      regionFrameRef.current = null;
      setRegion(pendingRegionRef.current);
    });
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
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
        onRegionChange={scheduleRegionUpdate}
        onRegionChangeComplete={(nextRegion) => {
          pendingRegionRef.current = nextRegion;
          setRegion(nextRegion);
        }}
      />

      <GeoWorldAffineOverlay
        sourceImage={sourceImage}
        previewImage={previewImage}
        transform={transform}
        controlPairs={controlPairs}
        opacity={opacity}
        backgroundRemoved={backgroundRemoved}
        backgroundSensitivity={backgroundSensitivity}
        region={region}
        viewport={viewport}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#dbeafe' },
});
