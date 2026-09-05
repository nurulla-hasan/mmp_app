import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Image as SvgImage, Path, Text as SvgText } from 'react-native-svg';
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
type Transform = { scale: number; pos: Point2D };

type PinProps = {
  point: Point2D;
  label: number;
  pending?: boolean;
  stageScale: number;
};

const MIN_ZOOM = 0.03;
const MAX_ZOOM = 16;

const midpoint = (a: Point2D, b: Point2D): Point2D => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

function SourcePin({ point, label, pending, stageScale }: PinProps) {
  const safeScale = Math.max(stageScale, 0.01);
  const color = pending ? '#2563eb' : '#dc2626';

  return (
    <G
      transform={`translate(${point.x} ${point.y}) scale(${1 / safeScale}) translate(-12 -27)`}
      opacity={pending ? 0.82 : 1}
    >
      <Path
        d='M12 1C6.48 1 2 5.48 2 11c0 7.55 10 16 10 16s10-8.45 10-16C22 5.48 17.52 1 12 1Z'
        fill={color}
        stroke='#ffffff'
        strokeWidth={1.8}
      />
      <Circle cx={12} cy={11} r={5.25} fill='#ffffff' />
      <SvgText
        x={12}
        y={14.2}
        fill={color}
        fontSize={9.5}
        fontWeight='800'
        textAnchor='middle'
      >
        {label}
      </SvgText>
    </G>
  );
}

export const GeoSourceCanvas = forwardRef<GeoSourceCanvasHandle, Props>(function GeoSourceCanvas(
  { image, controlPairs, pendingSource },
  ref,
) {
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [renderTransform, setRenderTransform] = useState<Transform>({
    scale: 1,
    pos: { x: 0, y: 0 },
  });

  const contentGroupRef = useRef<React.ElementRef<typeof G> | null>(null);
  const transformRef = useRef<Transform>(renderTransform);
  const panStartRef = useRef<Point2D>({ x: 0, y: 0 });
  const didPinchRef = useRef(false);
  const pinchRef = useRef<null | {
    distance: number;
    scale: number;
    pos: Point2D;
    center: Point2D;
  }>(null);

  const applyNativeTransform = useCallback((next: Transform) => {
    transformRef.current = next;
    contentGroupRef.current?.setNativeProps({
      matrix: [next.scale, 0, 0, next.scale, next.pos.x, next.pos.y],
    });
  }, []);

  const commitTransform = useCallback((next: Transform) => {
    applyNativeTransform(next);
    setRenderTransform(next);
  }, [applyNativeTransform]);

  const resetView = useCallback(() => {
    if (!viewport.width || !viewport.height) return;
    const fitScale = Math.max(
      MIN_ZOOM,
      Math.min(
        (viewport.width - 30) / Math.max(image.width, 1),
        (viewport.height - 30) / Math.max(image.height, 1),
        1,
      ),
    );

    commitTransform({
      scale: fitScale,
      pos: {
        x: (viewport.width - image.width * fitScale) / 2,
        y: (viewport.height - image.height * fitScale) / 2,
      },
    });
  }, [commitTransform, image.height, image.width, viewport.height, viewport.width]);

  useEffect(() => {
    resetView();
  }, [image.uri, resetView]);

  useImperativeHandle(ref, () => ({
    resetView,
    getCenterSourcePoint: () => {
      const current = transformRef.current;
      if (!viewport.width || !viewport.height || current.scale <= 0) return null;
      const point = {
        x: (viewport.width / 2 - current.pos.x) / current.scale,
        y: (viewport.height / 2 - current.pos.y) / current.scale,
      };
      if (point.x < 0 || point.y < 0 || point.x > image.width || point.y > image.height) return null;
      return point;
    },
  }), [image.height, image.width, resetView, viewport.height, viewport.width]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      panStartRef.current = { ...transformRef.current.pos };
      didPinchRef.current = false;
      pinchRef.current = null;
    },
    onPanResponderMove: (event, gesture) => {
      const touches = event.nativeEvent.touches;

      if (touches.length >= 2) {
        const first = touches[0];
        const second = touches[1];
        const nextDistance = Math.max(
          Math.hypot(second.locationX - first.locationX, second.locationY - first.locationY),
          1,
        );
        const center = midpoint(
          { x: first.locationX, y: first.locationY },
          { x: second.locationX, y: second.locationY },
        );

        if (!pinchRef.current) {
          pinchRef.current = {
            distance: nextDistance,
            scale: transformRef.current.scale,
            pos: { ...transformRef.current.pos },
            center,
          };
          didPinchRef.current = true;
          return;
        }

        const initial = pinchRef.current;
        const nextScale = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, initial.scale * nextDistance / initial.distance),
        );
        const ratio = nextScale / initial.scale;

        applyNativeTransform({
          scale: nextScale,
          pos: {
            x: center.x - (initial.center.x - initial.pos.x) * ratio,
            y: center.y - (initial.center.y - initial.pos.y) * ratio,
          },
        });
        return;
      }

      if (didPinchRef.current) return;

      applyNativeTransform({
        scale: transformRef.current.scale,
        pos: {
          x: panStartRef.current.x + gesture.dx,
          y: panStartRef.current.y + gesture.dy,
        },
      });
    },
    onPanResponderRelease: () => {
      pinchRef.current = null;
      commitTransform(transformRef.current);
    },
    onPanResponderTerminate: () => {
      pinchRef.current = null;
      commitTransform(transformRef.current);
    },
    onShouldBlockNativeResponder: () => false,
  }), [applyNativeTransform, commitTransform]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  };

  return (
    <View style={styles.root} onLayout={onLayout} {...panResponder.panHandlers}>
      {viewport.width > 0 && viewport.height > 0 ? (
        <Svg width={viewport.width} height={viewport.height}>
          <G
            ref={contentGroupRef}
            transform={`translate(${renderTransform.pos.x} ${renderTransform.pos.y}) scale(${renderTransform.scale})`}
          >
            <SvgImage
              href={{ uri: image.uri }}
              x={0}
              y={0}
              width={image.width}
              height={image.height}
              preserveAspectRatio='none'
            />

            {controlPairs.map((pair, index) => (
              <SourcePin
                key={pair.id}
                point={pair.source}
                label={index + 1}
                stageScale={renderTransform.scale}
              />
            ))}

            {pendingSource ? (
              <SourcePin
                point={pendingSource}
                label={controlPairs.length + 1}
                pending
                stageScale={renderTransform.scale}
              />
            ) : null}
          </G>
        </Svg>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
});
