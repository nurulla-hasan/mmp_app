import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Circle,
  G,
  Image as SvgImage,
  Line,
  Polygon,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { LocateFixed, Minus, Plus } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { calculatePolygonData } from '../../utils/calculations';
import type { Point } from '../../types/map';
import { Fonts } from '../../../../constants/typography';

type Size = { width: number; height: number };
type ViewTransform = { scale: number; offset: Point };

const EMPTY_CANVAS: Size = { width: 1200, height: 900 };

const pointString = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ');

const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export function MobileMapCanvas() {
  const {
    mapImage,
    mode,
    scale,
    plotPoints,
    plots,
    calibrationPoints,
  } = useMapStore();

  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [transform, setTransform] = useState<ViewTransform>({
    scale: 1,
    offset: { x: 0, y: 0 },
  });

  const contentSize = useMemo<Size>(() => ({
    width: Math.max(1, mapImage?.width ?? EMPTY_CANVAS.width),
    height: Math.max(1, mapImage?.height ?? EMPTY_CANVAS.height),
  }), [mapImage?.height, mapImage?.width]);

  const viewportRef = useRef(viewport);
  const contentSizeRef = useRef(contentSize);
  const transformRef = useRef(transform);
  const fitScaleRef = useRef(1);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const touchStartRef = useRef<Point>({ x: 0, y: 0 });
  const didPinchRef = useRef(false);
  const pinchRef = useRef<null | {
    distance: number;
    scale: number;
    offset: Point;
    center: Point;
  }>(null);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    contentSizeRef.current = contentSize;
  }, [contentSize]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const resetView = useCallback(() => {
    const view = viewportRef.current;
    const content = contentSizeRef.current;
    if (!view.width || !view.height) return;

    const fitScale = Math.min(view.width / content.width, view.height / content.height);
    fitScaleRef.current = fitScale;
    const next = {
      scale: fitScale,
      offset: {
        x: (view.width - content.width * fitScale) / 2,
        y: (view.height - content.height * fitScale) / 2,
      },
    };
    transformRef.current = next;
    setTransform(next);
  }, []);

  useEffect(() => {
    resetView();
  }, [contentSize.height, contentSize.width, mapImage?.uri, resetView, viewport.height, viewport.width]);

  const screenToCanvas = useCallback((screenPoint: Point): Point => {
    const current = transformRef.current;
    return {
      x: (screenPoint.x - current.offset.x) / current.scale,
      y: (screenPoint.y - current.offset.y) / current.scale,
    };
  }, []);

  const clampToCanvas = useCallback((point: Point): Point => {
    const content = contentSizeRef.current;
    return {
      x: Math.max(0, Math.min(content.width, point.x)),
      y: Math.max(0, Math.min(content.height, point.y)),
    };
  }, []);

  const zoomAround = useCallback((factor: number, center?: Point) => {
    const current = transformRef.current;
    const view = viewportRef.current;
    const focal = center ?? { x: view.width / 2, y: view.height / 2 };
    const minScale = fitScaleRef.current * 0.5;
    const maxScale = fitScaleRef.current * 8;
    const nextScale = Math.max(minScale, Math.min(maxScale, current.scale * factor));
    const ratio = nextScale / current.scale;
    const next = {
      scale: nextScale,
      offset: {
        x: focal.x - (focal.x - current.offset.x) * ratio,
        y: focal.y - (focal.y - current.offset.y) * ratio,
      },
    };
    transformRef.current = next;
    setTransform(next);
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,

    onPanResponderGrant: (event) => {
      const touch = event.nativeEvent;
      touchStartRef.current = { x: touch.locationX, y: touch.locationY };
      panStartRef.current = { ...transformRef.current.offset };
      didPinchRef.current = false;
      pinchRef.current = null;
    },

    onPanResponderMove: (event, gesture) => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        const first = touches[0];
        const second = touches[1];
        const distance = Math.hypot(second.locationX - first.locationX, second.locationY - first.locationY);
        const center = midpoint(
          { x: first.locationX, y: first.locationY },
          { x: second.locationX, y: second.locationY },
        );

        if (!pinchRef.current) {
          pinchRef.current = {
            distance: Math.max(distance, 1),
            scale: transformRef.current.scale,
            offset: { ...transformRef.current.offset },
            center,
          };
          didPinchRef.current = true;
          return;
        }

        const initial = pinchRef.current;
        const minScale = fitScaleRef.current * 0.5;
        const maxScale = fitScaleRef.current * 8;
        const nextScale = Math.max(
          minScale,
          Math.min(maxScale, initial.scale * (distance / initial.distance)),
        );
        const ratio = nextScale / initial.scale;
        const next = {
          scale: nextScale,
          offset: {
            x: center.x - (initial.center.x - initial.offset.x) * ratio,
            y: center.y - (initial.center.y - initial.offset.y) * ratio,
          },
        };
        transformRef.current = next;
        setTransform(next);
        return;
      }

      if (didPinchRef.current) return;

      if (useMapStore.getState().mode === 'none') {
        const next = {
          ...transformRef.current,
          offset: {
            x: panStartRef.current.x + gesture.dx,
            y: panStartRef.current.y + gesture.dy,
          },
        };
        transformRef.current = next;
        setTransform(next);
      }
    },

    onPanResponderRelease: (event, gesture) => {
      pinchRef.current = null;
      if (didPinchRef.current) return;
      if (Math.hypot(gesture.dx, gesture.dy) > 9) return;

      const currentMode = useMapStore.getState().mode;
      if (currentMode !== 'drawing_plot' && currentMode !== 'calibrating') return;

      const screenPoint = {
        x: event.nativeEvent.locationX || touchStartRef.current.x,
        y: event.nativeEvent.locationY || touchStartRef.current.y,
      };
      const rawCanvasPoint = screenToCanvas(screenPoint);
      const content = contentSizeRef.current;
      if (
        rawCanvasPoint.x < 0 || rawCanvasPoint.x > content.width
        || rawCanvasPoint.y < 0 || rawCanvasPoint.y > content.height
      ) return;
      const canvasPoint = clampToCanvas(rawCanvasPoint);

      if (currentMode === 'calibrating') {
        useMapStore.getState().addCalibrationPoint(canvasPoint);
        return;
      }

      const state = useMapStore.getState();
      if (state.plotPoints.length >= 3) {
        const first = state.plotPoints[0];
        const closeDistance = 24 / transformRef.current.scale;
        if (Math.hypot(canvasPoint.x - first.x, canvasPoint.y - first.y) <= closeDistance) {
          state.finishPlot();
          return;
        }
      }
      state.addPointAt(canvasPoint);
    },

    onPanResponderTerminate: () => {
      pinchRef.current = null;
    },
  }), [clampToCanvas, screenToCanvas]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  };

  const liveResults = useMemo(
    () => (plotPoints.length >= 3 && scale ? calculatePolygonData(plotPoints, scale) : null),
    [plotPoints, scale],
  );

  const instruction = mode === 'calibrating'
    ? calibrationPoints.length === 0
      ? 'পরিচিত রেখার প্রথম পয়েন্টে ট্যাপ করুন'
      : 'এবার একই রেখার শেষ পয়েন্টে ট্যাপ করুন'
    : mode === 'drawing_plot'
      ? plotPoints.length < 3
        ? `প্লটের কোণগুলোতে ট্যাপ করুন (${plotPoints.length}/৩)`
        : 'শেষ করতে প্রথম পয়েন্টে ট্যাপ করুন'
      : 'দুই আঙুলে জুম • এক আঙুলে প্যান';

  return (
    <View style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
      {viewport.width > 0 && viewport.height > 0 && (
        <Svg width={viewport.width} height={viewport.height}>
          <Rect width={viewport.width} height={viewport.height} fill='#090d16' />

          <G transform={`translate(${transform.offset.x} ${transform.offset.y}) scale(${transform.scale})`}>
            {mapImage ? (
              <SvgImage
                href={{ uri: mapImage.uri }}
                x={0}
                y={0}
                width={contentSize.width}
                height={contentSize.height}
                preserveAspectRatio='none'
              />
            ) : (
              <G>
                <Rect
                  x={0}
                  y={0}
                  width={contentSize.width}
                  height={contentSize.height}
                  fill='#111827'
                  stroke='#334155'
                  strokeWidth={2 / transform.scale}
                />
                {Array.from({ length: 16 }, (_, index) => (
                  <Line
                    key={`vertical-${index}`}
                    x1={index * 80}
                    y1={0}
                    x2={index * 80}
                    y2={contentSize.height}
                    stroke='#1e293b'
                    strokeWidth={1 / transform.scale}
                  />
                ))}
                {Array.from({ length: 13 }, (_, index) => (
                  <Line
                    key={`horizontal-${index}`}
                    x1={0}
                    y1={index * 80}
                    x2={contentSize.width}
                    y2={index * 80}
                    stroke='#1e293b'
                    strokeWidth={1 / transform.scale}
                  />
                ))}
              </G>
            )}

            {plots.map((plot) => (
              <G key={plot.id}>
                <Polygon
                  points={pointString(plot.points)}
                  fill={plot.color ?? '#16a34a'}
                  fillOpacity={0.22}
                  stroke={plot.color ?? '#16a34a'}
                  strokeWidth={3 / transform.scale}
                  strokeLinejoin='round'
                />
                {plot.points.map((point, index) => {
                  const next = plot.points[(index + 1) % plot.points.length];
                  const labelPoint = midpoint(point, next);
                  return (
                    <SvgText
                      key={`${plot.id}-edge-${index}`}
                      x={labelPoint.x}
                      y={labelPoint.y - 7 / transform.scale}
                      fill='#ffffff'
                      stroke='#0f172a'
                      strokeWidth={1.5 / transform.scale}
                      fontSize={12 / transform.scale}
                      textAnchor='middle'
                    >
                      {plot.results.lengths[index]?.toFixed(1)}′
                    </SvgText>
                  );
                })}
              </G>
            ))}

            {plotPoints.length >= 2 && (
              <Polyline
                points={pointString(plotPoints)}
                fill={plotPoints.length >= 3 ? '#16a34a' : 'none'}
                fillOpacity={0.16}
                stroke='#22c55e'
                strokeWidth={3 / transform.scale}
                strokeDasharray={`${8 / transform.scale},${5 / transform.scale}`}
                strokeLinejoin='round'
              />
            )}

            {plotPoints.map((point, index) => (
              <Circle
                key={`active-${index}`}
                cx={point.x}
                cy={point.y}
                r={(index === 0 ? 8 : 6) / transform.scale}
                fill={index === 0 ? '#fb7185' : '#ffffff'}
                stroke='#16a34a'
                strokeWidth={2.5 / transform.scale}
              />
            ))}

            {liveResults && plotPoints.length >= 3 && (
              <SvgText
                x={plotPoints.reduce((sum, point) => sum + point.x, 0) / plotPoints.length}
                y={plotPoints.reduce((sum, point) => sum + point.y, 0) / plotPoints.length}
                fill='#ffffff'
                stroke='#0f172a'
                strokeWidth={1.5 / transform.scale}
                fontSize={13 / transform.scale}
                textAnchor='middle'
              >
                {liveResults.shotok.toFixed(3)} শতক
              </SvgText>
            )}

            {calibrationPoints.length > 0 && (
              <G>
                <Circle
                  cx={calibrationPoints[0].x}
                  cy={calibrationPoints[0].y}
                  r={7 / transform.scale}
                  fill='#f59e0b'
                  stroke='#ffffff'
                  strokeWidth={2 / transform.scale}
                />
                {calibrationPoints.length === 2 && (
                  <>
                    <Line
                      x1={calibrationPoints[0].x}
                      y1={calibrationPoints[0].y}
                      x2={calibrationPoints[1].x}
                      y2={calibrationPoints[1].y}
                      stroke='#f59e0b'
                      strokeWidth={3 / transform.scale}
                    />
                    <Circle
                      cx={calibrationPoints[1].x}
                      cy={calibrationPoints[1].y}
                      r={7 / transform.scale}
                      fill='#f59e0b'
                      stroke='#ffffff'
                      strokeWidth={2 / transform.scale}
                    />
                  </>
                )}
              </G>
            )}
          </G>
        </Svg>
      )}

      {!mapImage && (
        <View pointerEvents='none' style={styles.emptyState}>
          <Text style={styles.emptyTitle}>মৌজা ম্যাপ যোগ করুন</Text>
          <Text style={styles.emptyText}>অথবা খালি ক্যানভাসে পরিমাপ অনুশীলন করুন</Text>
        </View>
      )}

      <View pointerEvents='none' style={styles.instructionPill}>
        <Text style={styles.instructionText}>{instruction}</Text>
      </View>

      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomButton} onPress={() => zoomAround(1.25)}>
          <Plus size={18} color='#e2e8f0' />
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={() => zoomAround(0.8)}>
          <Minus size={18} color='#e2e8f0' />
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={resetView}>
          <LocateFixed size={17} color='#22c55e' />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#090d16',
  },
  emptyState: {
    position: 'absolute',
    top: '43%',
    left: 28,
    right: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#cbd5e1',
    fontFamily: Fonts.headingBold,
    fontSize: 16,
  },
  emptyText: {
    marginTop: 2,
    color: '#64748b',
    fontFamily: Fonts.sansRegular,
    fontSize: 11,
    textAlign: 'center',
  },
  instructionPill: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 58,
    alignItems: 'flex-start',
  },
  instructionText: {
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    color: '#cbd5e1',
    fontFamily: Fonts.headingMedium,
    fontSize: 11,
  },
  zoomControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    overflow: 'hidden',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
  },
  zoomButton: {
    width: 38,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
});
