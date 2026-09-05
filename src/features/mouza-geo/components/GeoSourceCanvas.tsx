import React, { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { ControlPair, GeoImage, Point2D } from '../types';

export type GeoSourceCanvasHandle = {
  getCenterSourcePoint: () => Point2D | null;
  resetView: () => void;
};

type Props = {
  image: GeoImage;
  controlPairs: ControlPair[];
  pendingSource: Point2D | null;
};

type Size = { width: number; height: number };

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

const SourceMarker = memo(function SourceMarker({
  point,
  label,
  pending,
  size,
  image,
  scale,
  offsetX,
  offsetY,
}: {
  point: Point2D;
  label: number;
  pending?: boolean;
  size: Size;
  image: GeoImage;
  scale: SharedValue<number>;
  offsetX: SharedValue<number>;
  offsetY: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: size.width / 2 + offsetX.value + (point.x - image.width / 2) * scale.value - 12 },
      { translateY: size.height / 2 + offsetY.value + (point.y - image.height / 2) * scale.value - 24 },
    ],
  }));
  return (
    <Animated.View pointerEvents='none' style={[styles.marker, pending && styles.pendingMarker, animatedStyle]}>
      <Text style={styles.markerText}>{label}</Text>
      <View style={styles.markerTip} />
    </Animated.View>
  );
});

export const GeoSourceCanvas = forwardRef<GeoSourceCanvasHandle, Props>(function GeoSourceCanvas(
  { image, controlPairs, pendingSource },
  ref,
) {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const pinchStartX = useSharedValue(0);
  const pinchStartY = useSharedValue(0);
  const pinchSourceX = useSharedValue(0);
  const pinchSourceY = useSharedValue(0);

  const resetView = () => {
    if (!size.width || !size.height) return;
    scale.value = Math.max(0.03, Math.min((size.width - 30) / image.width, (size.height - 30) / image.height, 1));
    offsetX.value = 0;
    offsetY.value = 0;
  };

  useEffect(() => {
    resetView();
  }, [image.uri, image.width, image.height, size.width, size.height]);

  useImperativeHandle(ref, () => ({
    resetView,
    getCenterSourcePoint: () => {
      if (!size.width || !size.height || scale.value <= 0) return null;
      const point = {
        x: image.width / 2 - offsetX.value / scale.value,
        y: image.height / 2 - offsetY.value / scale.value,
      };
      if (point.x < 0 || point.y < 0 || point.x > image.width || point.y > image.height) return null;
      return point;
    },
  }), [image.height, image.width, size.height, size.width]);

  const pan = useMemo(() => Gesture.Pan()
    .maxPointers(1)
    .onBegin(() => {
      panStartX.value = offsetX.value;
      panStartY.value = offsetY.value;
    })
    .onUpdate((event) => {
      offsetX.value = panStartX.value + event.translationX;
      offsetY.value = panStartY.value + event.translationY;
    }), []);

  const pinch = useMemo(() => Gesture.Pinch()
    .onBegin((event) => {
      pinchStartScale.value = scale.value;
      pinchStartX.value = offsetX.value;
      pinchStartY.value = offsetY.value;
      pinchSourceX.value = (event.focalX - size.width / 2 - pinchStartX.value) / pinchStartScale.value;
      pinchSourceY.value = (event.focalY - size.height / 2 - pinchStartY.value) / pinchStartScale.value;
    })
    .onUpdate((event) => {
      const nextScale = clamp(pinchStartScale.value * event.scale, 0.03, 16);
      scale.value = nextScale;
      offsetX.value = event.focalX - size.width / 2 - pinchSourceX.value * nextScale;
      offsetY.value = event.focalY - size.height / 2 - pinchSourceY.value * nextScale;
    }), [size.height, size.width]);

  const combined = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);
  const translateStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }] }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <GestureDetector gesture={combined}>
      <View style={styles.root} onLayout={onLayout}>
        {size.width > 0 && size.height > 0 && (
          <>
            <Animated.View
              style={[
                styles.imageOuter,
                { left: size.width / 2 - image.width / 2, top: size.height / 2 - image.height / 2, width: image.width, height: image.height },
                translateStyle,
              ]}
            >
              <Animated.Image source={{ uri: image.uri }} resizeMode='stretch' style={[{ width: image.width, height: image.height }, scaleStyle]} />
            </Animated.View>
            {controlPairs.map((pair, index) => (
              <SourceMarker
                key={pair.id}
                point={pair.source}
                label={index + 1}
                size={size}
                image={image}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
              />
            ))}
            {pendingSource && (
              <SourceMarker
                point={pendingSource}
                label={controlPairs.length + 1}
                pending
                size={size}
                image={image}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
              />
            )}
          </>
        )}
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: '#111827' },
  imageOuter: { position: 'absolute' },
  marker: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  pendingMarker: { opacity: 0.72, backgroundColor: '#2563eb' },
  markerText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  markerTip: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#dc2626',
  },
});
