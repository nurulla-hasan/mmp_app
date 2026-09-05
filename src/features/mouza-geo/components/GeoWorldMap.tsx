import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import MapView, { type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Alert, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import type { ControlPair, GeoImage, GeoMapStyle, GeoPoint, GeoTransform } from '../types';
import { applyGeoTransform, fromMercator, getOverlayCorners } from '../utils/geo-math';
import {
  GeoWorldAffineOverlay,
  type WorldScreenMatrix,
} from './GeoWorldAffineOverlay';

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

function sourceToCoordinate(transform: GeoTransform, x: number, y: number) {
  const point = fromMercator(applyGeoTransform(transform, { x, y }));
  return { latitude: point.lat, longitude: point.lng };
}

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
  const mountedRef = useRef(true);
  const projectionFrameRef = useRef<number | null>(null);
  const projectionBusyRef = useRef(false);
  const projectionPendingRef = useRef(false);
  const projectionTicketRef = useRef(0);
  const runProjectionRef = useRef<() => Promise<void>>(async () => undefined);
  const transformRef = useRef(transform);
  const sourceImageRef = useRef(sourceImage);
  const viewportRef = useRef({ width: 0, height: 0 });

  transformRef.current = transform;
  sourceImageRef.current = sourceImage;

  const [showsUserLocation, setShowsUserLocation] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [matrix, setMatrix] = useState<WorldScreenMatrix | null>(null);

  const corners = useMemo(
    () => transform ? getOverlayCorners(transform, sourceImage) : [],
    [sourceImage, transform],
  );

  const scheduleProjection = useCallback(() => {
    projectionPendingRef.current = true;
    if (projectionBusyRef.current || projectionFrameRef.current !== null) return;

    projectionFrameRef.current = requestAnimationFrame(() => {
      projectionFrameRef.current = null;
      void runProjectionRef.current();
    });
  }, []);

  runProjectionRef.current = async () => {
    if (projectionBusyRef.current) {
      projectionPendingRef.current = true;
      return;
    }

    projectionBusyRef.current = true;
    projectionPendingRef.current = false;
    const ticket = ++projectionTicketRef.current;

    try {
      const map = mapRef.current;
      const currentTransform = transformRef.current;
      const image = sourceImageRef.current;
      const currentViewport = viewportRef.current;

      if (
        !map ||
        !currentTransform ||
        currentViewport.width <= 0 ||
        currentViewport.height <= 0
      ) {
        if (mountedRef.current) setMatrix(null);
        return;
      }

      // This is the native equivalent of the web WorldMapCanvas' toScreenPoint
      // calls. Ask the actual Google Map renderer where three transformed source
      // anchors land on screen instead of estimating projection from Region deltas.
      const originCoordinate = sourceToCoordinate(currentTransform, 0, 0);
      const rightCoordinate = sourceToCoordinate(currentTransform, image.width, 0);
      const bottomCoordinate = sourceToCoordinate(currentTransform, 0, image.height);

      const [origin, right, bottom] = await Promise.all([
        map.pointForCoordinate(originCoordinate),
        map.pointForCoordinate(rightCoordinate),
        map.pointForCoordinate(bottomCoordinate),
      ]);

      if (!mountedRef.current || ticket !== projectionTicketRef.current) return;

      const next: WorldScreenMatrix = {
        a: (right.x - origin.x) / Math.max(1, image.width),
        b: (right.y - origin.y) / Math.max(1, image.width),
        c: (bottom.x - origin.x) / Math.max(1, image.height),
        d: (bottom.y - origin.y) / Math.max(1, image.height),
        e: origin.x,
        f: origin.y,
      };

      if (Object.values(next).every(Number.isFinite)) setMatrix(next);
    } catch {
      // Map projection may briefly be unavailable while the native map mounts or
      // changes provider state. Keep the last valid matrix and retry on the next
      // region/map event instead of flashing the overlay away.
    } finally {
      projectionBusyRef.current = false;
      if (
        mountedRef.current &&
        projectionPendingRef.current &&
        projectionFrameRef.current === null
      ) {
        projectionFrameRef.current = requestAnimationFrame(() => {
          projectionFrameRef.current = null;
          void runProjectionRef.current();
        });
      }
    }
  };

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
      mapRef.current?.animateCamera(
        { center: { latitude: point.lat, longitude: point.lng }, zoom: 18 },
        { duration: 450 },
      );
      return point;
    },
  }), [corners, targetOffsetY, viewport.height, viewport.width]);

  useEffect(() => {
    scheduleProjection();
  }, [
    scheduleProjection,
    sourceImage.height,
    sourceImage.uri,
    sourceImage.width,
    transform,
    viewport.height,
    viewport.width,
  ]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      projectionTicketRef.current += 1;
      if (projectionFrameRef.current !== null) {
        cancelAnimationFrame(projectionFrameRef.current);
      }
    },
    [],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const next = { width, height };
    viewportRef.current = next;
    setViewport(next);
    scheduleProjection();
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
        onMapReady={scheduleProjection}
        onRegionChange={scheduleProjection}
        onRegionChangeComplete={scheduleProjection}
      />

      <GeoWorldAffineOverlay
        sourceImage={sourceImage}
        previewImage={previewImage}
        matrix={matrix}
        controlPairs={controlPairs}
        opacity={opacity}
        backgroundRemoved={backgroundRemoved}
        backgroundSensitivity={backgroundSensitivity}
        viewport={viewport}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#dbeafe' },
});
