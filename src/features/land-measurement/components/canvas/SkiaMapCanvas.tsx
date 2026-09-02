import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Canvas,
  Circle,
  DashPathEffect,
  Fill,
  Group,
  Image as SkiaImage,
  Path,
  RoundedRect,
  Skia,
  Text as SkiaText,
  matchFont,
  useImage,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { LocateFixed, Minus, Plus } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { calculatePolygonData } from '../../utils/calculations';
import { clipLineToPolygon, getSnappedPoint } from '../../utils/geometry';
import { getDirectionalContainingPlot } from '../../utils/directionalPlot';
import { splitPolygonByPolyline } from '../../utils/polygonDivision';
import { formatFeetInches, MIN_DIAGONAL_DRAW_PX, MIN_EDGE_LABEL_FT, STAGE_MAX_ZOOM, STAGE_MIN_ZOOM, UI_CONFIG } from '../../utils/canvas';
import { getPolygonAreaLabelLayout } from '../../utils/polygon-label';
import { getReadableRotation } from '../../utils/component-helpers';
import type { PlotRecord, Point } from '../../types/map';
import { toBengaliDigits } from '../../../../lib/utils';
import { Fonts } from '../../../../constants/typography';
import { getActivePlotDots, getActiveSegmentLabels, getPlotEdgeLabels } from './nativeStageGeometry';
import { SkiaTiledMap } from './SkiaTiledMap';
import { setCanvasRuntimeTransform } from './canvas-runtime';

type Size = { width: number; height: number };
type Transform = { scale: number; pos: Point };
type LiveOverlayData = {
  start: Point | null;
  end: Point;
  label: { point: Point; text: string; rotation: number; fontPx: number } | null;
  color: string;
  snapped: boolean;
};

const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

const pathFromPoints = (points: Point[], close = false) => {
  if (points.length === 0) return '';
  const path = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 1; index < points.length; index += 1) path.push(`L ${points[index].x} ${points[index].y}`);
  if (close && points.length >= 3) path.push('Z');
  return path.join(' ');
};

const linePath = (a: Point, b: Point) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`;

const rgba = (hex: string, alpha: number) => {
  const value = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(15,118,110,${alpha})`;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const fontCache = new Map<string, ReturnType<typeof matchFont>>();
const systemFontFamily = Platform.select({
  android: 'Noto Sans Bengali',
  ios: 'Bangla Sangam MN',
  default: 'sans-serif',
})!;

function getFont(size: number, weight: 'normal' | 'bold' = 'bold') {
  const rounded = Math.max(6, Math.round(size * 10) / 10);
  const key = `${rounded}:${weight}`;
  const cached = fontCache.get(key);
  if (cached) return cached;
  let font: ReturnType<typeof matchFont>;
  try {
    font = matchFont({ fontFamily: systemFontFamily, fontSize: rounded, fontWeight: weight });
  } catch {
    font = matchFont({ fontFamily: 'sans-serif', fontSize: rounded, fontWeight: weight });
  }
  fontCache.set(key, font);
  return font;
}

type LabelProps = {
  x: number;
  y: number;
  text: string;
  stageScale: number;
  color: string;
  rotation?: number;
  fontPx?: number;
};

const SkiaOutlinedText = memo(function SkiaOutlinedText({
  x,
  y,
  text,
  stageScale,
  color,
  rotation = 0,
  fontPx = UI_CONFIG.fontSize.small,
}: LabelProps) {
  const safeScale = Math.max(stageScale, 0.01);
  const fontSize = fontPx / safeScale;
  const font = getFont(fontSize);
  const width = text.length * fontSize * 0.58;
  const baseline = fontSize * 0.34;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { rotate: getReadableRotation(rotation) * Math.PI / 180 }]}>
      <SkiaText
        x={-width / 2}
        y={baseline}
        text={text}
        font={font}
        color='rgba(255,255,255,0.96)'
        style='stroke'
        strokeWidth={2.2 / safeScale}
        strokeJoin='round'
      />
      <SkiaText x={-width / 2} y={baseline} text={text} font={font} color={color} />
    </Group>
  );
});

const SkiaBadge = memo(function SkiaBadge({
  x,
  y,
  text,
  stageScale,
  color,
  rotation = 0,
  compact = false,
}: LabelProps & { compact?: boolean }) {
  const safeScale = Math.max(stageScale, 0.01);
  const fontSize = (compact ? 8.5 : 11.5) / safeScale;
  const height = (compact ? 15 : 23) / safeScale;
  const screenWidth = Math.max(compact ? 34 : 58, text.length * (compact ? 4.9 : 6.6) + (compact ? 10 : 14));
  const width = screenWidth / safeScale;
  const radius = (compact ? 3.5 : 5) / safeScale;
  const font = getFont(fontSize);
  const textWidth = text.length * fontSize * 0.58;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { rotate: getReadableRotation(rotation) * Math.PI / 180 }]}>
      <RoundedRect x={-width / 2} y={-height / 2} width={width} height={height} r={radius} color={color} opacity={0.94} />
      <RoundedRect x={-width / 2} y={-height / 2} width={width} height={height} r={radius} color='rgba(255,255,255,0.22)' style='stroke' strokeWidth={(compact ? 0.6 : 0.8) / safeScale} />
      <SkiaText x={-textWidth / 2} y={fontSize * 0.34} text={text} font={font} color='#ffffff' />
    </Group>
  );
});

const SkiaDiagonalBadge = memo(function SkiaDiagonalBadge({ x, y, text, stageScale, color }: LabelProps) {
  const safeScale = Math.max(stageScale, 0.01);
  const fontSize = UI_CONFIG.fontSize.small / safeScale;
  const padding = UI_CONFIG.padding.small / safeScale;
  const width = text.length * fontSize * 0.6 + padding * 2;
  const height = fontSize + padding * 2;
  const font = getFont(fontSize);
  const textWidth = text.length * fontSize * 0.58;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }]} opacity={0.82}>
      <RoundedRect x={-width / 2} y={-height / 2} width={width} height={height} r={padding} color='#ffffff' />
      <RoundedRect x={-width / 2} y={-height / 2} width={width} height={height} r={padding} color={color} style='stroke' strokeWidth={1 / safeScale} />
      <SkiaText x={-textWidth / 2} y={fontSize * 0.34} text={text} font={font} color={color} />
    </Group>
  );
});

function SkiaSimpleImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  const image = useImage(uri);
  if (!image) return null;
  return <SkiaImage image={image} x={0} y={0} width={width} height={height} fit='fill' sampling={{ B: 0, C: 0.5 }} />;
}

function PlotShape({ plot, stageScale, opacity = 1, fillOpacity = 0.1 }: {
  plot: PlotRecord;
  stageScale: number;
  opacity?: number;
  fillOpacity?: number;
}) {
  const color = plot.color ?? '#0f766e';
  const path = pathFromPoints(plot.points, true);
  return (
    <Group opacity={opacity}>
      <Path path={path} color={rgba(color, fillOpacity)} />
      <Path path={path} color={color} style='stroke' strokeWidth={2.5 / Math.max(stageScale, 0.01)} strokeJoin='round' />
    </Group>
  );
}

export function SkiaMapCanvas() {
  const mapImage = useMapStore((state) => state.mapImage);
  const mode = useMapStore((state) => state.mode);
  const scale = useMapStore((state) => state.scale);
  const plotPoints = useMapStore((state) => state.plotPoints);
  const plots = useMapStore((state) => state.plots);
  const calibrationLine = useMapStore((state) => state.calibrationLine);
  const stageScale = useMapStore((state) => state.stageScale);
  const stagePos = useMapStore((state) => state.stagePos);
  const isShowDiagonals = useMapStore((state) => state.isShowDiagonals);
  const isMagnifierEnabled = useMapStore((state) => state.isMagnifierEnabled);
  const manualDividePlotId = useMapStore((state) => state.manualDividePlotId);
  const manualCutLine = useMapStore((state) => state.manualCutLine);

  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [fitScale, setFitScale] = useState(1);
  const [liveOverlay, setLiveOverlay] = useState<LiveOverlayData>({
    start: null,
    end: { x: 0, y: 0 },
    label: null,
    color: UI_CONFIG.colors.drawPrimary,
    snapped: false,
  });
  const [magnifierTransform, setMagnifierTransform] = useState<Transform>({ scale: stageScale, pos: stagePos });
  const liveRafRef = useRef<number | null>(null);
  const pendingLiveTransformRef = useRef<Transform | null>(null);

  const translateX = useSharedValue(stagePos.x);
  const translateY = useSharedValue(stagePos.y);
  const zoom = useSharedValue(stageScale);
  const panStartX = useSharedValue(stagePos.x);
  const panStartY = useSharedValue(stagePos.y);
  const pinchStartScale = useSharedValue(stageScale);
  const pinchCanvasX = useSharedValue(0);
  const pinchCanvasY = useSharedValue(0);
  const draggingAnchor = useSharedValue(-1);

  const contentTransform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: zoom.value },
  ]);

  useEffect(() => {
    translateX.value = stagePos.x;
    translateY.value = stagePos.y;
    zoom.value = stageScale;
    setCanvasRuntimeTransform(stageScale, stagePos.x, stagePos.y);
  }, [stagePos.x, stagePos.y, stageScale, translateX, translateY, zoom]);

  const contentSize = useMemo<Size>(() => ({
    width: Math.max(1, mapImage?.width ?? 1200),
    height: Math.max(1, mapImage?.height ?? 900),
  }), [mapImage?.height, mapImage?.width]);

  const calibrationPoints = useMemo(() => {
    const result: Point[] = [];
    for (let index = 0; index < calibrationLine.length; index += 2) {
      result.push({ x: calibrationLine[index], y: calibrationLine[index + 1] });
    }
    return result;
  }, [calibrationLine]);

  const selectedPlot = useMemo(
    () => plots.find((plot) => plot.id === manualDividePlotId) ?? null,
    [manualDividePlotId, plots],
  );

  const splitPreview = useMemo(() => {
    if (!selectedPlot || !manualCutLine || !scale) return null;
    const split = splitPolygonByPolyline(selectedPlot.points, manualCutLine);
    if (!split) return null;
    return {
      ...split,
      resultA: calculatePolygonData(split.poly1, scale),
      resultB: calculatePolygonData(split.poly2, scale),
    };
  }, [manualCutLine, scale, selectedPlot]);

  const getLiveOverlay = useCallback((transform: Transform): LiveOverlayData => {
    const current = useMapStore.getState();
    const safeScale = Math.max(transform.scale, 0.001);
    const raw = {
      x: (viewport.width / 2 - transform.pos.x) / safeScale,
      y: (viewport.height / 2 - transform.pos.y) / safeScale,
    };
    let target = getSnappedPoint(raw, current.plots.map((plot) => plot.points), 10 / safeScale);
    if (current.mode === 'drawing_plot' && current.plotPoints.length >= 3 && distance(target, current.plotPoints[0]) <= 20 / safeScale) {
      target = current.plotPoints[0];
    }
    if (current.mode === 'drawing_plot' && current.plotPoints.length > 0) {
      const containing = getDirectionalContainingPlot(
        current.plots,
        current.plotPoints[0],
        current.plotPoints.length >= 2 ? current.plotPoints[1] : target,
        transform.scale,
      );
      if (containing) target = clipLineToPolygon(current.plotPoints[current.plotPoints.length - 1], target, containing.points);
    }

    const calibration: Point[] = [];
    for (let index = 0; index < current.calibrationLine.length; index += 2) {
      calibration.push({ x: current.calibrationLine[index], y: current.calibrationLine[index + 1] });
    }
    const startCanvas = current.mode === 'drawing_plot'
      ? current.plotPoints[current.plotPoints.length - 1] ?? null
      : current.mode === 'calibrating'
        ? calibration[0] ?? null
        : null;
    const toScreen = (point: Point): Point => ({
      x: point.x * transform.scale + transform.pos.x,
      y: point.y * transform.scale + transform.pos.y,
    });
    const lengthFt = startCanvas && current.scale ? distance(startCanvas, target) / current.scale : 0;
    const distPx = startCanvas ? distance(startCanvas, target) : 0;
    const edgeScreenPx = distPx * transform.scale;
    let label: LiveOverlayData['label'] = null;

    if (startCanvas && current.mode === 'drawing_plot' && current.scale && edgeScreenPx >= 34) {
      const text = formatFeetInches(lengthFt);
      let fontPx = Math.min(UI_CONFIG.fontSize.small, Math.max(7.5, edgeScreenPx * 0.13));
      const widthPx = text.length * fontPx * 0.58;
      const maxWidthPx = edgeScreenPx * 0.74;
      if (widthPx > maxWidthPx && maxWidthPx > 0) fontPx = Math.max(6.75, fontPx * maxWidthPx / widthPx);
      const mid = midpoint(startCanvas, target);
      let point = mid;
      if (current.plotPoints.length > 1 && distPx >= 1) {
        const normalA = { x: -(target.y - startCanvas.y) / distPx, y: (target.x - startCanvas.x) / distPx };
        const plotCenter = current.plotPoints.reduce(
          (sum, item) => ({ x: sum.x + item.x, y: sum.y + item.y }),
          { x: 0, y: 0 },
        );
        plotCenter.x /= current.plotPoints.length;
        plotCenter.y /= current.plotPoints.length;
        const facesCenter = normalA.x * (plotCenter.x - mid.x) + normalA.y * (plotCenter.y - mid.y) >= 0;
        const normal = facesCenter ? normalA : { x: -normalA.x, y: -normalA.y };
        const inset = Math.max(7, fontPx * 0.95) / transform.scale;
        point = { x: mid.x + normal.x * inset, y: mid.y + normal.y * inset };
      }
      label = {
        point: toScreen(point),
        text,
        rotation: getReadableRotation(Math.atan2(target.y - startCanvas.y, target.x - startCanvas.x) * 180 / Math.PI),
        fontPx,
      };
    }

    return {
      start: startCanvas ? toScreen(startCanvas) : null,
      end: toScreen(target),
      label,
      color: UI_CONFIG.colors.drawPrimary,
      snapped: distance(raw, target) * transform.scale > 2,
    };
  }, [viewport.height, viewport.width]);

  const clearLiveOverlay = useCallback(() => {
    pendingLiveTransformRef.current = null;
    setLiveOverlay((previous) => previous.start === null ? previous : {
      start: null,
      end: { x: 0, y: 0 },
      label: null,
      color: UI_CONFIG.colors.drawPrimary,
      snapped: false,
    });
  }, []);

  const scheduleLiveOverlay = useCallback((transform: Transform) => {
    const current = useMapStore.getState();
    if (current.mode !== 'drawing_plot' && current.mode !== 'calibrating') return;
    pendingLiveTransformRef.current = transform;
    if (liveRafRef.current !== null) return;
    liveRafRef.current = requestAnimationFrame(() => {
      liveRafRef.current = null;
      const pending = pendingLiveTransformRef.current;
      if (!pending) return;
      const snapshot = useMapStore.getState();
      if (snapshot.mode !== 'drawing_plot' && snapshot.mode !== 'calibrating') {
        clearLiveOverlay();
        return;
      }
      setLiveOverlay(getLiveOverlay(pending));
      if (snapshot.isMagnifierEnabled) setMagnifierTransform(pending);
    });
  }, [clearLiveOverlay, getLiveOverlay]);

  const updateRuntimeTransform = useCallback((nextScale: number, x: number, y: number) => {
    setCanvasRuntimeTransform(nextScale, x, y);
    scheduleLiveOverlay({ scale: nextScale, pos: { x, y } });
  }, [scheduleLiveOverlay]);

  const commitGestureTransform = useCallback((nextScale: number, x: number, y: number) => {
    setCanvasRuntimeTransform(nextScale, x, y);
    useMapStore.getState().setStageTransform({ scale: nextScale, pos: { x, y } });
    scheduleLiveOverlay({ scale: nextScale, pos: { x, y } });
  }, [scheduleLiveOverlay]);

  const setPinching = useCallback((value: boolean) => {
    useMapStore.getState().setIsPinching(value);
  }, []);

  const moveManualAnchor = useCallback((index: number, x: number, y: number) => {
    useMapStore.getState().moveManualCutAnchor(index, { x, y });
  }, []);

  const selectPlotAt = useCallback((screenX: number, screenY: number) => {
    const current = useMapStore.getState();
    if (current.mode !== 'manual_divide_plot' || current.manualDividePlotId) return;
    const runtimeScale = Math.max(zoom.value, 0.001);
    current.setStageTransform({ scale: runtimeScale, pos: { x: translateX.value, y: translateY.value } });
    current.selectPlotForDivide({
      x: (screenX - translateX.value) / runtimeScale,
      y: (screenY - translateY.value) / runtimeScale,
    });
  }, [translateX, translateY, zoom]);

  useEffect(() => {
    if (mode !== 'drawing_plot' && mode !== 'calibrating') clearLiveOverlay();
    else scheduleLiveOverlay({ scale: stageScale, pos: stagePos });
  }, [calibrationLine, clearLiveOverlay, mode, plotPoints, plots, scale, scheduleLiveOverlay, stagePos, stageScale]);

  useEffect(() => () => {
    if (liveRafRef.current !== null) cancelAnimationFrame(liveRafRef.current);
  }, []);

  const resetView = useCallback(() => {
    if (!viewport.width || !viewport.height) return;
    const nextFit = Math.min(viewport.width / contentSize.width, viewport.height / contentSize.height);
    const next = {
      scale: nextFit,
      pos: {
        x: (viewport.width - contentSize.width * nextFit) / 2,
        y: (viewport.height - contentSize.height * nextFit) / 2,
      },
    };
    setFitScale(nextFit);
    zoom.value = next.scale;
    translateX.value = next.pos.x;
    translateY.value = next.pos.y;
    commitGestureTransform(next.scale, next.pos.x, next.pos.y);
  }, [commitGestureTransform, contentSize.height, contentSize.width, translateX, translateY, viewport.height, viewport.width, zoom]);

  useEffect(() => {
    if (mapImage?.uri && viewport.width && viewport.height) resetView();
  // Reset only when a new image or viewport is introduced.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapImage?.uri, viewport.height, viewport.width]);

  const zoomAround = useCallback((factor: number) => {
    const currentScale = zoom.value;
    const nextScale = clamp(currentScale * factor, STAGE_MIN_ZOOM, STAGE_MAX_ZOOM);
    const center = { x: viewport.width / 2, y: viewport.height / 2 };
    const ratio = nextScale / Math.max(currentScale, 0.001);
    const x = center.x - (center.x - translateX.value) * ratio;
    const y = center.y - (center.y - translateY.value) * ratio;
    zoom.value = nextScale;
    translateX.value = x;
    translateY.value = y;
    commitGestureTransform(nextScale, x, y);
  }, [commitGestureTransform, translateX, translateY, viewport.height, viewport.width, zoom]);

  const panGesture = useMemo(() => Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .onStart((event: any) => {
      panStartX.value = translateX.value;
      panStartY.value = translateY.value;
      draggingAnchor.value = -1;
      if (mode === 'manual_divide_plot' && manualCutLine?.length) {
        const canvasX = (event.x - translateX.value) / Math.max(zoom.value, 0.001);
        const canvasY = (event.y - translateY.value) / Math.max(zoom.value, 0.001);
        const threshold = 24 / Math.max(zoom.value, 0.01);
        let closest = threshold;
        for (let index = 0; index < manualCutLine.length; index += 1) {
          const dx = manualCutLine[index].x - canvasX;
          const dy = manualCutLine[index].y - canvasY;
          const value = Math.sqrt(dx * dx + dy * dy);
          if (value <= closest) {
            closest = value;
            draggingAnchor.value = index;
          }
        }
      }
    })
    .onUpdate((event: any) => {
      if (draggingAnchor.value >= 0) {
        const safeScale = Math.max(zoom.value, 0.001);
        runOnJS(moveManualAnchor)(
          draggingAnchor.value,
          (event.x - translateX.value) / safeScale,
          (event.y - translateY.value) / safeScale,
        );
        return;
      }
      const x = panStartX.value + event.translationX;
      const y = panStartY.value + event.translationY;
      translateX.value = x;
      translateY.value = y;
      runOnJS(updateRuntimeTransform)(zoom.value, x, y);
    })
    .onEnd(() => {
      if (draggingAnchor.value < 0) runOnJS(commitGestureTransform)(zoom.value, translateX.value, translateY.value);
      draggingAnchor.value = -1;
    })
    .onFinalize(() => {
      draggingAnchor.value = -1;
    }), [commitGestureTransform, draggingAnchor, manualCutLine, mode, moveManualAnchor, panStartX, panStartY, translateX, translateY, updateRuntimeTransform, zoom]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onStart((event: any) => {
      pinchStartScale.value = zoom.value;
      pinchCanvasX.value = (event.focalX - translateX.value) / Math.max(zoom.value, 0.001);
      pinchCanvasY.value = (event.focalY - translateY.value) / Math.max(zoom.value, 0.001);
      runOnJS(setPinching)(true);
    })
    .onUpdate((event: any) => {
      const nextScale = clamp(pinchStartScale.value * event.scale, STAGE_MIN_ZOOM, STAGE_MAX_ZOOM);
      const x = event.focalX - pinchCanvasX.value * nextScale;
      const y = event.focalY - pinchCanvasY.value * nextScale;
      zoom.value = nextScale;
      translateX.value = x;
      translateY.value = y;
      runOnJS(updateRuntimeTransform)(nextScale, x, y);
    })
    .onEnd(() => {
      runOnJS(commitGestureTransform)(zoom.value, translateX.value, translateY.value);
      runOnJS(setPinching)(false);
    })
    .onFinalize(() => {
      runOnJS(setPinching)(false);
    }), [commitGestureTransform, pinchCanvasX, pinchCanvasY, pinchStartScale, setPinching, translateX, translateY, updateRuntimeTransform, zoom]);

  const tapGesture = useMemo(() => Gesture.Tap()
    .maxDistance(8)
    .onEnd((event: any, success: boolean) => {
      if (success && mode === 'manual_divide_plot' && !manualDividePlotId) {
        runOnJS(selectPlotAt)(event.x, event.y);
      }
    }), [manualDividePlotId, mode, selectPlotAt]);

  const gesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture, tapGesture),
    [panGesture, pinchGesture, tapGesture],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
    useMapStore.getState().setStageSize({ width, height });
  };

  const instruction = mode === 'calibrating'
    ? calibrationPoints.length === 0 ? 'ক্রসহেয়ার স্কেল বারের শুরুতে আনুন' : 'ক্রসহেয়ার স্কেল বারের শেষে আনুন'
    : mode === 'drawing_plot'
      ? plotPoints.length < 3 ? `ক্রসহেয়ার কোণায় এনে পয়েন্ট যোগ করুন (${plotPoints.length}/৩)` : 'আরও পয়েন্ট দিন অথবা শেষ করুন'
      : mode === 'manual_divide_plot'
        ? selectedPlot ? 'লাল পয়েন্ট টেনে কাটিং লাইন ঠিক করুন' : 'যে প্লট ভাগ করবেন সেটিতে ট্যাপ করুন'
        : mapImage ? 'এক আঙুলে প্যান • দুই আঙুলে জুম' : 'শুরু করতে মৌজা ম্যাপ যোগ করুন';

  const magnifier = useMemo(() => {
    if (!mapImage || !isMagnifierEnabled || viewport.width <= 0 || (mode !== 'drawing_plot' && mode !== 'calibrating')) return null;
    const radius = 55;
    const lens = { x: viewport.width - radius - 16, y: radius + 16 };
    const centerCanvas = {
      x: (viewport.width / 2 - magnifierTransform.pos.x) / Math.max(magnifierTransform.scale, 0.001),
      y: (viewport.height / 2 - magnifierTransform.pos.y) / Math.max(magnifierTransform.scale, 0.001),
    };
    const magnifiedScale = magnifierTransform.scale * 2.5;
    const magnifiedPos = {
      x: lens.x - centerCanvas.x * magnifiedScale,
      y: lens.y - centerCanvas.y * magnifiedScale,
    };
    const clip = Skia.Path.MakeFromSVGString(`M ${lens.x - radius} ${lens.y} A ${radius} ${radius} 0 1 0 ${lens.x + radius} ${lens.y} A ${radius} ${radius} 0 1 0 ${lens.x - radius} ${lens.y} Z`);
    if (!clip) return null;
    return { radius, lens, magnifiedScale, magnifiedPos, clip };
  }, [isMagnifierEnabled, magnifierTransform, mapImage, mode, viewport.height, viewport.width]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          {viewport.width > 0 && viewport.height > 0 && (
            <Canvas style={StyleSheet.absoluteFill}>
              <Fill color='#090d16' />
              <Group transform={contentTransform as any}>
                {mapImage && (
                  <SkiaTiledMap
                    image={mapImage}
                    viewport={viewport}
                    stageScale={stageScale}
                    stagePos={stagePos}
                    fitScale={fitScale}
                  />
                )}

                {plots.map((plot) => {
                  const hiddenForPreview = Boolean(splitPreview && plot.id === selectedPlot?.id);
                  const label = getPolygonAreaLabelLayout(plot.points);
                  const edgeLabels = getPlotEdgeLabels(plot, scale, stageScale);
                  const color = plot.color ?? '#0f766e';
                  return (
                    <Group key={plot.id} opacity={hiddenForPreview ? 0.2 : 1}>
                      <PlotShape plot={plot} stageScale={stageScale} fillOpacity={manualDividePlotId === plot.id ? 0.18 : 0.1} />
                      {edgeLabels.map((edge) => (
                        <SkiaOutlinedText key={edge.id} x={edge.x} y={edge.y} text={edge.text} stageScale={stageScale} color={edge.color} rotation={edge.rotation} fontPx={edge.fontPx} />
                      ))}
                      {isShowDiagonals && (plot.results.diagonals ?? []).map((diagonal, index) => {
                        const start = plot.points[diagonal.p1Index];
                        const end = plot.points[diagonal.p2Index];
                        if (!start || !end || distance(start, end) <= MIN_DIAGONAL_DRAW_PX / Math.max(stageScale, 0.01)) return null;
                        const mid = midpoint(start, end);
                        const text = diagonal.lengthFt >= MIN_EDGE_LABEL_FT ? formatFeetInches(diagonal.lengthFt) : '';
                        return (
                          <Group key={`${plot.id}-diag-${index}`}>
                            <Path path={linePath(start, end)} color={color} style='stroke' strokeWidth={1 / Math.max(stageScale, 0.01)} opacity={0.4}>
                              <DashPathEffect intervals={[6 / Math.max(stageScale, 0.01), 6 / Math.max(stageScale, 0.01)]} />
                            </Path>
                            {text ? <SkiaDiagonalBadge x={mid.x} y={mid.y} text={text} stageScale={stageScale} color={color} /> : null}
                          </Group>
                        );
                      })}
                      {mode !== 'manual_divide_plot' && (
                        <SkiaBadge
                          x={label.center.x}
                          y={label.center.y}
                          text={`${toBengaliDigits(plot.results.shotok.toFixed(2))} শতক`}
                          stageScale={stageScale}
                          color={color}
                          rotation={label.rotation}
                          compact
                        />
                      )}
                    </Group>
                  );
                })}

                {splitPreview && selectedPlot && (
                  <Group>
                    <Path path={pathFromPoints(splitPreview.poly1, true)} color={rgba(selectedPlot.color ?? '#0F766E', 0.3)} />
                    <Path path={pathFromPoints(splitPreview.poly1, true)} color={selectedPlot.color ?? '#0F766E'} style='stroke' strokeWidth={2 / Math.max(stageScale, 0.01)} />
                    <Path path={pathFromPoints(splitPreview.poly2, true)} color={rgba('#0284C7', 0.3)} />
                    <Path path={pathFromPoints(splitPreview.poly2, true)} color='#0284C7' style='stroke' strokeWidth={2 / Math.max(stageScale, 0.01)} />
                    {[{ points: splitPreview.poly1, value: splitPreview.resultA?.shotok }, { points: splitPreview.poly2, value: splitPreview.resultB?.shotok }].map((part, index) => {
                      if (!part.value) return null;
                      const label = getPolygonAreaLabelLayout(part.points);
                      return (
                        <SkiaBadge
                          key={`split-label-${index}`}
                          x={label.center.x}
                          y={label.center.y}
                          text={`${part.value.toFixed(2)} শতক`}
                          stageScale={stageScale}
                          color={index === 0 ? selectedPlot.color ?? '#0F766E' : '#0284C7'}
                          rotation={label.rotation}
                          compact
                        />
                      );
                    })}
                  </Group>
                )}

                {plotPoints.length > 0 && mode === 'drawing_plot' && (
                  <Group>
                    {plotPoints.length >= 2 && (
                      <Path path={pathFromPoints(plotPoints)} color='#2563eb' style='stroke' strokeWidth={3 / Math.max(stageScale, 0.01)} strokeJoin='round' />
                    )}
                    {getActivePlotDots(plotPoints).map(({ point, index, isCorner }) => isCorner ? (
                      <Group key={`point-${index}`}>
                        <Circle cx={point.x} cy={point.y} r={5 / Math.max(stageScale, 0.01)} color='#3182CE' />
                        <Circle cx={point.x} cy={point.y} r={5 / Math.max(stageScale, 0.01)} color='#ffffff' style='stroke' strokeWidth={1.5 / Math.max(stageScale, 0.01)} />
                      </Group>
                    ) : null)}
                    {getActiveSegmentLabels(plotPoints, scale, stageScale).map((edge) => (
                      <SkiaOutlinedText key={edge.id} x={edge.x} y={edge.y} text={edge.text} stageScale={stageScale} color={edge.color} rotation={edge.rotation} fontPx={edge.fontPx} />
                    ))}
                  </Group>
                )}

                {mode === 'calibrating' && (
                  <Group>
                    {calibrationPoints.length === 2 && (
                      <Path path={linePath(calibrationPoints[0], calibrationPoints[1])} color={UI_CONFIG.colors.drawPrimary} style='stroke' strokeWidth={3 / Math.max(stageScale, 0.01)} />
                    )}
                    {calibrationPoints.map((point, index) => (
                      <Group key={`cal-${index}`}>
                        <Circle cx={point.x} cy={point.y} r={5 / Math.max(stageScale, 0.01)} color={UI_CONFIG.colors.drawPrimary} />
                        <Circle cx={point.x} cy={point.y} r={5 / Math.max(stageScale, 0.01)} color='#ffffff' style='stroke' strokeWidth={1 / Math.max(stageScale, 0.01)} />
                      </Group>
                    ))}
                  </Group>
                )}

                {manualCutLine && selectedPlot && (() => {
                  const clip = Skia.Path.MakeFromSVGString(pathFromPoints(selectedPlot.points, true));
                  return clip ? (
                    <Group>
                      <Group clip={clip}>
                        <Path path={pathFromPoints(manualCutLine)} color='#DC2626' style='stroke' strokeWidth={2 / Math.max(stageScale, 0.01)}>
                          <DashPathEffect intervals={[8 / Math.max(stageScale, 0.01), 8 / Math.max(stageScale, 0.01)]} />
                        </Path>
                      </Group>
                      {manualCutLine.map((point, index) => (
                        <Group key={`cut-${index}`}>
                          <Circle cx={point.x} cy={point.y} r={8 / Math.max(stageScale, 0.01)} color='#DC2626' />
                          <Circle cx={point.x} cy={point.y} r={8 / Math.max(stageScale, 0.01)} color='#ffffff' style='stroke' strokeWidth={2 / Math.max(stageScale, 0.01)} />
                        </Group>
                      ))}
                    </Group>
                  ) : null;
                })()}
              </Group>

              {liveOverlay.start && (
                <Group>
                  <Path path={linePath(liveOverlay.start, liveOverlay.end)} color={liveOverlay.color} style='stroke' strokeWidth={2.5}>
                    <DashPathEffect intervals={[8, 5]} />
                  </Path>
                  {liveOverlay.label && (
                    <SkiaOutlinedText
                      x={liveOverlay.label.point.x}
                      y={liveOverlay.label.point.y}
                      text={liveOverlay.label.text}
                      stageScale={1}
                      color={liveOverlay.color}
                      rotation={liveOverlay.label.rotation}
                      fontPx={liveOverlay.label.fontPx}
                    />
                  )}
                  {liveOverlay.snapped && (
                    <Circle cx={liveOverlay.end.x} cy={liveOverlay.end.y} r={10} color={liveOverlay.color} style='stroke' strokeWidth={2}>
                      <DashPathEffect intervals={[5, 4]} />
                    </Circle>
                  )}
                </Group>
              )}

              {magnifier && mapImage && (
                <Group>
                  <Circle cx={magnifier.lens.x} cy={magnifier.lens.y} r={magnifier.radius + 2} color='#f8fafc' />
                  <Group clip={magnifier.clip}>
                    <Group transform={[
                      { translateX: magnifier.magnifiedPos.x },
                      { translateY: magnifier.magnifiedPos.y },
                      { scale: magnifier.magnifiedScale },
                    ]}>
                      <SkiaSimpleImage uri={mapImage.uri} width={mapImage.width} height={mapImage.height} />
                      {plots.map((plot) => <PlotShape key={`mag-${plot.id}`} plot={plot} stageScale={magnifier.magnifiedScale} />)}
                      {plotPoints.length > 0 && mode === 'drawing_plot' && (
                        <Path path={pathFromPoints(plotPoints)} color={UI_CONFIG.colors.drawPrimary} style='stroke' strokeWidth={3 / Math.max(magnifier.magnifiedScale, 0.01)} />
                      )}
                    </Group>
                  </Group>
                  <Circle cx={magnifier.lens.x} cy={magnifier.lens.y} r={magnifier.radius} color='rgba(15,23,42,0.72)' style='stroke' strokeWidth={3} />
                  <Path path={`M ${magnifier.lens.x - 10} ${magnifier.lens.y} L ${magnifier.lens.x + 10} ${magnifier.lens.y}`} color='#ef4444' style='stroke' strokeWidth={2} />
                  <Path path={`M ${magnifier.lens.x} ${magnifier.lens.y - 10} L ${magnifier.lens.x} ${magnifier.lens.y + 10}`} color='#ef4444' style='stroke' strokeWidth={2} />
                </Group>
              )}

              {(mode === 'drawing_plot' || mode === 'calibrating') && (
                <Group>
                  <Path path={`M ${viewport.width / 2 - 13} ${viewport.height / 2} L ${viewport.width / 2 - 3} ${viewport.height / 2} M ${viewport.width / 2 + 3} ${viewport.height / 2} L ${viewport.width / 2 + 13} ${viewport.height / 2} M ${viewport.width / 2} ${viewport.height / 2 - 13} L ${viewport.width / 2} ${viewport.height / 2 - 3} M ${viewport.width / 2} ${viewport.height / 2 + 3} L ${viewport.width / 2} ${viewport.height / 2 + 13}`} color='#ffffff' style='stroke' strokeWidth={3.5} opacity={0.8} />
                  <Path path={`M ${viewport.width / 2 - 13} ${viewport.height / 2} L ${viewport.width / 2 - 3} ${viewport.height / 2} M ${viewport.width / 2 + 3} ${viewport.height / 2} L ${viewport.width / 2 + 13} ${viewport.height / 2} M ${viewport.width / 2} ${viewport.height / 2 - 13} L ${viewport.width / 2} ${viewport.height / 2 - 3} M ${viewport.width / 2} ${viewport.height / 2 + 3} L ${viewport.width / 2} ${viewport.height / 2 + 13}`} color='#ef4444' style='stroke' strokeWidth={1.5} />
                  <Circle cx={viewport.width / 2} cy={viewport.height / 2} r={2} color='#ef4444' />
                </Group>
              )}
            </Canvas>
          )}
        </View>
      </GestureDetector>

      {!mapImage && (
        <View pointerEvents='none' style={styles.emptyState}>
          <Text style={styles.emptyTitle}>মৌজা ম্যাপ যোগ করুন</Text>
          <Text style={styles.emptyText}>স্কেল ও জমির সীমানা মাপতে ম্যাপের ছবি প্রয়োজন</Text>
        </View>
      )}
      <View pointerEvents='none' style={styles.instructionPill}><Text style={styles.instructionText}>{instruction}</Text></View>
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomButton} onPress={() => zoomAround(1.25)}><Plus size={18} color='#e2e8f0' /></TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={() => zoomAround(0.8)}><Minus size={18} color='#e2e8f0' /></TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={resetView}><LocateFixed size={17} color='#22c55e' /></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#090d16' },
  emptyState: { position: 'absolute', top: '42%', left: 28, right: 28, alignItems: 'center' },
  emptyTitle: { color: '#cbd5e1', fontFamily: Fonts.headingBold, fontSize: 16 },
  emptyText: { marginTop: 3, color: '#64748b', fontFamily: Fonts.sansRegular, fontSize: 11, textAlign: 'center' },
  instructionPill: { position: 'absolute', top: 10, left: 12, right: 58, alignItems: 'flex-start' },
  instructionText: { overflow: 'hidden', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(15,23,42,0.92)', color: '#cbd5e1', fontFamily: Fonts.headingMedium, fontSize: 11 },
  zoomControls: { position: 'absolute', top: 10, right: 10, overflow: 'hidden', borderRadius: 9, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(15,23,42,0.94)' },
  zoomButton: { width: 38, height: 36, alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#334155' },
});
