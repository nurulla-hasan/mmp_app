import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Canvas,
  Circle,
  DashPathEffect,
  Fill,
  Group,
  Image as SkiaImage,
  Paragraph,
  Path,
  RoundedRect,
  Skia,
  TextAlign,
  useImage,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { LocateFixed, Minus, Plus } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { calculatePolygonData } from '../../utils/calculations';
import {
  getLogicalCorners,
  getSnappedPoint,
  getVisualCenter,
  clipLineToPolygon,
} from '../../utils/geometry';
import { getDirectionalContainingPlot } from '../../utils/directionalPlot';
import { splitPolygonByPolyline } from '../../utils/polygonDivision';
import {
  AREA_LABEL_FONT_SCALE,
  AREA_LABEL_HEIGHT_FACTOR,
  AREA_LABEL_PADDING_FACTOR,
  AREA_LABEL_RADIUS_FACTOR,
  AREA_LABEL_WIDTH_FACTOR,
  MANUAL_DIVIDE_CORNER_SNAP_PX,
  MIN_DIAGONAL_DRAW_PX,
  MIN_EDGE_LABEL_FT,
  STAGE_MAX_ZOOM,
  STAGE_MIN_ZOOM,
  UI_CONFIG,
  formatFeetInches,
} from '../../utils/canvas';
import { getPolygonAreaLabelLayout } from '../../utils/polygon-label';
import { getReadableRotation } from '../../utils/component-helpers';
import type { PlotRecord, Point } from '../../types/map';
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

type ManualDrag = { index: number; x: number; y: number };

const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

const pathFromPoints = (points: Point[], close = false) => {
  if (points.length === 0) return '';
  const path = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 1; index < points.length; index += 1) {
    path.push(`L ${points[index].x} ${points[index].y}`);
  }
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

const getCornerSnapPoint = (point: Point, polygon: Point[], threshold: number): Point | null => {
  let closest: Point | null = null;
  let closestDistance = threshold;

  for (const vertex of polygon) {
    const value = Math.hypot(point.x - vertex.x, point.y - vertex.y);
    if (value <= closestDistance) {
      closestDistance = value;
      closest = vertex;
    }
  }

  return closest ? { x: closest.x, y: closest.y } : null;
};

function makeParagraph(text: string, color: string, fontSize: number, width: number, bold = true) {
  const paragraph = Skia.ParagraphBuilder.Make({ textAlign: TextAlign.Center })
    .pushStyle({
      color: Skia.Color(color),
      fontSize,
      fontStyle: { weight: bold ? 700 : 500 },
      locale: 'bn-BD',
      heightMultiplier: 1.05,
    })
    .addText(text)
    .pop()
    .build();
  paragraph.layout(Math.max(width, 1));
  return paragraph;
}

type LabelProps = {
  x: number;
  y: number;
  text: string;
  stageScale: number;
  color: string;
  rotation?: number;
  fontPx?: number;
  opacity?: number;
};

/**
 * Web PlotEdgeLabels/StageActivePlot use colored text with a 2.2px white
 * outline, not a white label box. Skia Paragraph is kept for Bengali shaping;
 * the outline is reproduced by drawing the same shaped paragraph around the
 * fill at half the web stroke width.
 */
const SkiaOutlinedText = memo(function SkiaOutlinedText({
  x,
  y,
  text,
  stageScale,
  color,
  rotation = 0,
  fontPx = UI_CONFIG.fontSize.small,
  opacity = 1,
}: LabelProps) {
  const safeScale = Math.max(stageScale, 0.01);
  const fontSize = fontPx / safeScale;
  const width = Math.max(8 / safeScale, text.length * fontSize * 0.58 + 4 / safeScale);
  const height = Math.max(fontSize * 1.08, 7 / safeScale);
  const outline = 1.1 / safeScale;

  const fillParagraph = useMemo(
    () => makeParagraph(text, color, fontSize, width),
    [color, fontSize, text, width],
  );
  const outlineParagraph = useMemo(
    () => makeParagraph(text, 'rgba(255,255,255,0.95)', fontSize, width),
    [fontSize, text, width],
  );

  const offsets = useMemo(() => [
    [-outline, 0],
    [outline, 0],
    [0, -outline],
    [0, outline],
    [-outline * 0.72, -outline * 0.72],
    [outline * 0.72, -outline * 0.72],
    [-outline * 0.72, outline * 0.72],
    [outline * 0.72, outline * 0.72],
  ] as const, [outline]);

  return (
    <Group
      opacity={opacity}
      transform={[
        { translateX: x },
        { translateY: y },
        { rotate: getReadableRotation(rotation) * Math.PI / 180 },
      ]}
    >
      {offsets.map(([dx, dy], index) => (
        <Paragraph
          key={`outline-${index}`}
          paragraph={outlineParagraph}
          x={-width / 2 + dx}
          y={-height * 0.52 + dy}
          width={width}
        />
      ))}
      <Paragraph
        paragraph={fillParagraph}
        x={-width / 2}
        y={-height * 0.52}
        width={width}
      />
    </Group>
  );
});

/** Exact Skia equivalent of the web StagePlots/StageManualCut area tag. */
const SkiaAreaBadge = memo(function SkiaAreaBadge({
  x,
  y,
  text,
  stageScale,
  color,
  rotation = 0,
}: LabelProps) {
  const safeScale = Math.max(stageScale, 0.01);
  const fontSize = (UI_CONFIG.fontSize.small * AREA_LABEL_FONT_SCALE) / safeScale;
  const padding = (UI_CONFIG.padding.small * AREA_LABEL_PADDING_FACTOR) / safeScale;
  const width = Math.max(
    24 / safeScale,
    text.length * fontSize * AREA_LABEL_WIDTH_FACTOR + padding * 2,
  );
  const height = Math.max(
    10 / safeScale,
    fontSize * AREA_LABEL_HEIGHT_FACTOR + padding * 2,
  );
  const radius = (UI_CONFIG.radius.small * AREA_LABEL_RADIUS_FACTOR) / safeScale;
  const shadowOffset = 1 / safeScale;
  const paragraph = useMemo(
    () => makeParagraph(text, '#ffffff', fontSize, width),
    [fontSize, text, width],
  );

  return (
    <Group
      opacity={0.95}
      transform={[
        { translateX: x },
        { translateY: y },
        { rotate: getReadableRotation(rotation) * Math.PI / 180 },
      ]}
    >
      <RoundedRect
        x={-width / 2 + shadowOffset}
        y={-height / 2 + shadowOffset}
        width={width}
        height={height}
        r={radius}
        color='rgba(0,0,0,0.18)'
      />
      <RoundedRect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        r={radius}
        color={color}
      />
      <Paragraph
        paragraph={paragraph}
        x={-width / 2}
        y={-height * 0.52}
        width={width}
      />
    </Group>
  );
});

const SkiaDiagonalBadge = memo(function SkiaDiagonalBadge({
  x,
  y,
  text,
  stageScale,
  color,
}: LabelProps) {
  const safeScale = Math.max(stageScale, 0.01);
  const fontSize = UI_CONFIG.fontSize.small / safeScale;
  const padding = UI_CONFIG.padding.small / safeScale;
  const width = Math.max(24 / safeScale, text.length * fontSize * 0.6 + padding * 2);
  const height = fontSize + padding * 2;
  const paragraph = useMemo(
    () => makeParagraph(text, color, fontSize, width),
    [color, fontSize, text, width],
  );

  return (
    <Group transform={[{ translateX: x }, { translateY: y }]} opacity={0.8}>
      <RoundedRect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        r={padding}
        color='#ffffff'
      />
      <RoundedRect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        r={padding}
        color={color}
        style='stroke'
        strokeWidth={UI_CONFIG.strokeWidth.thin / safeScale}
      />
      <Paragraph
        paragraph={paragraph}
        x={-width / 2}
        y={-height * 0.48}
        width={width}
      />
    </Group>
  );
});

function SkiaSimpleImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  const image = useImage(uri);
  if (!image) return null;
  return (
    <SkiaImage
      image={image}
      x={0}
      y={0}
      width={width}
      height={height}
      fit='fill'
      sampling={{ B: 0, C: 0.5 }}
    />
  );
}

function PlotShape({
  plot,
  stageScale,
  opacity = 1,
  fillOpacity = 0.1,
}: {
  plot: PlotRecord;
  stageScale: number;
  opacity?: number;
  fillOpacity?: number;
}) {
  const color = plot.color ?? '#0F766E';
  const path = pathFromPoints(plot.points, true);
  return (
    <Group opacity={opacity}>
      <Path path={path} color={rgba(color, fillOpacity)} />
      <Path
        path={path}
        color={color}
        style='stroke'
        strokeWidth={UI_CONFIG.strokeWidth.xxthick / Math.max(stageScale, 0.01)}
        strokeJoin='round'
      />
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
  const [magnifierTransform, setMagnifierTransform] = useState<Transform>({
    scale: stageScale,
    pos: stagePos,
  });

  const deferredManualCutLine = useDeferredValue(manualCutLine);
  const liveRafRef = useRef<number | null>(null);
  const pendingLiveTransformRef = useRef<Transform | null>(null);
  const manualDragRafRef = useRef<number | null>(null);
  const pendingManualDragRef = useRef<ManualDrag | null>(null);

  const translateX = useSharedValue(stagePos.x);
  const translateY = useSharedValue(stagePos.y);
  const zoom = useSharedValue(stageScale);
  const panStartX = useSharedValue(stagePos.x);
  const panStartY = useSharedValue(stagePos.y);
  const pinchStartScale = useSharedValue(stageScale);
  const pinchCanvasX = useSharedValue(0);
  const pinchCanvasY = useSharedValue(0);
  const pinchActive = useSharedValue(0);
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

  /** Web StageManualCut defers this expensive calculation while an anchor moves. */
  const splitPreview = useMemo(() => {
    if (!selectedPlot || !deferredManualCutLine || deferredManualCutLine.length < 2 || !scale) {
      return null;
    }

    const split = splitPolygonByPolyline(selectedPlot.points, deferredManualCutLine);
    if (!split || split.poly1.length < 3 || split.poly2.length < 3) return null;

    const resultA = calculatePolygonData(split.poly1, scale);
    const resultB = calculatePolygonData(split.poly2, scale);
    if (!resultA || !resultB) return null;

    return {
      poly1: split.poly1,
      poly2: split.poly2,
      resultA,
      resultB,
      centerA: getVisualCenter(split.poly1),
      centerB: getVisualCenter(split.poly2),
    };
  }, [deferredManualCutLine, scale, selectedPlot]);

  const getLiveOverlay = useCallback((transform: Transform): LiveOverlayData => {
    const current = useMapStore.getState();
    const safeScale = Math.max(transform.scale, 0.001);
    const raw = {
      x: (viewport.width / 2 - transform.pos.x) / safeScale,
      y: (viewport.height / 2 - transform.pos.y) / safeScale,
    };

    let target = getSnappedPoint(
      raw,
      current.plots.map((plot) => plot.points),
      10 / safeScale,
    );

    if (
      current.mode === 'drawing_plot'
      && current.plotPoints.length >= 3
      && distance(target, current.plotPoints[0]) <= 20 / safeScale
    ) {
      target = current.plotPoints[0];
    }

    if (current.mode === 'drawing_plot' && current.plotPoints.length > 0) {
      const containing = getDirectionalContainingPlot(
        current.plots,
        current.plotPoints[0],
        current.plotPoints.length >= 2 ? current.plotPoints[1] : target,
        transform.scale,
      );
      if (containing) {
        target = clipLineToPolygon(
          current.plotPoints[current.plotPoints.length - 1],
          target,
          containing.points,
        );
      }
    }

    const calibration: Point[] = [];
    for (let index = 0; index < current.calibrationLine.length; index += 2) {
      calibration.push({
        x: current.calibrationLine[index],
        y: current.calibrationLine[index + 1],
      });
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

    const lengthFt = startCanvas && current.scale
      ? distance(startCanvas, target) / current.scale
      : 0;
    const distPx = startCanvas ? distance(startCanvas, target) : 0;
    const edgeScreenPx = distPx * transform.scale;
    let label: LiveOverlayData['label'] = null;

    if (
      startCanvas
      && current.mode === 'drawing_plot'
      && current.scale
      && edgeScreenPx >= 34
    ) {
      const text = formatFeetInches(lengthFt);
      let fontPx = Math.min(UI_CONFIG.fontSize.small, Math.max(7.5, edgeScreenPx * 0.13));
      const widthPx = text.length * fontPx * 0.58;
      const maxWidthPx = edgeScreenPx * 0.74;
      if (widthPx > maxWidthPx && maxWidthPx > 0) {
        fontPx = Math.max(6.75, fontPx * maxWidthPx / widthPx);
      }

      const mid = midpoint(startCanvas, target);
      let point = mid;

      // Web keeps the first live segment label centered. Interior-aware offset
      // starts only after point #2 is committed.
      if (current.plotPoints.length > 1 && distPx >= 1) {
        const normalA = {
          x: -(target.y - startCanvas.y) / distPx,
          y: (target.x - startCanvas.x) / distPx,
        };
        const plotCenter = current.plotPoints.reduce(
          (sum, item) => ({ x: sum.x + item.x, y: sum.y + item.y }),
          { x: 0, y: 0 },
        );
        plotCenter.x /= current.plotPoints.length;
        plotCenter.y /= current.plotPoints.length;
        const facesCenter = normalA.x * (plotCenter.x - mid.x)
          + normalA.y * (plotCenter.y - mid.y) >= 0;
        const normal = facesCenter ? normalA : { x: -normalA.x, y: -normalA.y };
        const inset = Math.max(7, fontPx * 0.95) / transform.scale;
        point = {
          x: mid.x + normal.x * inset,
          y: mid.y + normal.y * inset,
        };
      }

      label = {
        point: toScreen(point),
        text,
        rotation: getReadableRotation(
          Math.atan2(target.y - startCanvas.y, target.x - startCanvas.x) * 180 / Math.PI,
        ),
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
    useMapStore.getState().setStageTransform({
      scale: nextScale,
      pos: { x, y },
    });
    scheduleLiveOverlay({ scale: nextScale, pos: { x, y } });
  }, [scheduleLiveOverlay]);

  const setPinching = useCallback((value: boolean) => {
    useMapStore.getState().setIsPinching(value);
  }, []);

  /** Exact StageManualCut drag-move logic, RAF-throttled like web. */
  const scheduleManualAnchorMove = useCallback((index: number, x: number, y: number) => {
    pendingManualDragRef.current = { index, x, y };
    if (manualDragRafRef.current !== null) return;

    manualDragRafRef.current = requestAnimationFrame(() => {
      manualDragRafRef.current = null;
      const pending = pendingManualDragRef.current;
      pendingManualDragRef.current = null;
      if (!pending) return;

      const state = useMapStore.getState();
      const currentLine = state.manualCutLine;
      const currentPlot = state.plots.find(
        (item) => item.id === state.manualDividePlotId,
      );
      if (!currentLine || !currentPlot) return;
      if (pending.index < 0 || pending.index >= currentLine.length) return;

      const newLine = [...currentLine];
      const isBoundary = pending.index === 0 || pending.index === currentLine.length - 1;
      const snapThreshold = isBoundary
        ? Number.POSITIVE_INFINITY
        : 14 / Math.max(state.stageScale, 0.01);

      newLine[pending.index] = getSnappedPoint(
        { x: pending.x, y: pending.y },
        [currentPlot.points],
        snapThreshold,
      );
      state.setManualCutLine(newLine);
    });
  }, []);

  /** Exact StageManualCut drag-end corner lock from web. */
  const finishManualAnchorMove = useCallback((index: number, x: number, y: number) => {
    if (manualDragRafRef.current !== null) {
      cancelAnimationFrame(manualDragRafRef.current);
      manualDragRafRef.current = null;
    }
    pendingManualDragRef.current = null;

    const state = useMapStore.getState();
    const currentLine = state.manualCutLine;
    const currentPlot = state.plots.find(
      (item) => item.id === state.manualDividePlotId,
    );
    if (!currentLine || !currentPlot) return;
    if (index < 0 || index >= currentLine.length) return;

    const rawPoint = { x, y };
    const isBoundary = index === 0 || index === currentLine.length - 1;
    const snapThreshold = isBoundary
      ? Number.POSITIVE_INFINITY
      : 14 / Math.max(state.stageScale, 0.01);
    const cornerSnap = isBoundary
      ? getCornerSnapPoint(
          rawPoint,
          getLogicalCorners(currentPlot.points),
          MANUAL_DIVIDE_CORNER_SNAP_PX / Math.max(state.stageScale, 0.01),
        )
      : null;

    const newLine = [...currentLine];
    newLine[index] = cornerSnap || getSnappedPoint(
      rawPoint,
      [currentPlot.points],
      snapThreshold,
    );
    state.setManualCutLine(newLine);
  }, []);

  const selectPlotAt = useCallback((screenX: number, screenY: number) => {
    const current = useMapStore.getState();
    if (current.mode !== 'manual_divide_plot' || current.manualDividePlotId) return;

    const runtimeScale = Math.max(zoom.value, 0.001);
    current.setStageTransform({
      scale: runtimeScale,
      pos: { x: translateX.value, y: translateY.value },
    });
    current.selectPlotForDivide({
      x: (screenX - translateX.value) / runtimeScale,
      y: (screenY - translateY.value) / runtimeScale,
    });
  }, [translateX, translateY, zoom]);

  useEffect(() => {
    if (mode !== 'drawing_plot' && mode !== 'calibrating') clearLiveOverlay();
    else scheduleLiveOverlay({ scale: stageScale, pos: stagePos });
  }, [
    calibrationLine,
    clearLiveOverlay,
    mode,
    plotPoints,
    plots,
    scale,
    scheduleLiveOverlay,
    stagePos,
    stageScale,
  ]);

  useEffect(() => () => {
    if (liveRafRef.current !== null) cancelAnimationFrame(liveRafRef.current);
    if (manualDragRafRef.current !== null) cancelAnimationFrame(manualDragRafRef.current);
  }, []);

  const resetView = useCallback(() => {
    if (!viewport.width || !viewport.height) return;

    const nextFit = Math.min(
      viewport.width / contentSize.width,
      viewport.height / contentSize.height,
    );
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
  }, [
    commitGestureTransform,
    contentSize.height,
    contentSize.width,
    translateX,
    translateY,
    viewport.height,
    viewport.width,
    zoom,
  ]);

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
  }, [
    commitGestureTransform,
    translateX,
    translateY,
    viewport.height,
    viewport.width,
    zoom,
  ]);

  const panGesture = useMemo(() => Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .onStart((event: any) => {
      panStartX.value = translateX.value;
      panStartY.value = translateY.value;
      draggingAnchor.value = -1;

      if (mode === 'manual_divide_plot' && manualCutLine?.length) {
        const safeScale = Math.max(zoom.value, 0.001);
        const canvasX = (event.x - translateX.value) / safeScale;
        const canvasY = (event.y - translateY.value) / safeScale;
        // Web: radius 8 + hitStrokeWidth 30 => ~23 screen px hit radius.
        const threshold = 23 / safeScale;
        let closest = threshold;

        for (let index = 0; index < manualCutLine.length; index += 1) {
          const dx = manualCutLine[index].x - canvasX;
          const dy = manualCutLine[index].y - canvasY;
          const value = Math.hypot(dx, dy);
          if (value <= closest) {
            closest = value;
            draggingAnchor.value = index;
          }
        }
      }
    })
    .onUpdate((event: any) => {
      if (pinchActive.value > 0) return;

      if (draggingAnchor.value >= 0) {
        const safeScale = Math.max(zoom.value, 0.001);
        runOnJS(scheduleManualAnchorMove)(
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
    .onEnd((event: any) => {
      if (draggingAnchor.value >= 0) {
        const safeScale = Math.max(zoom.value, 0.001);
        runOnJS(finishManualAnchorMove)(
          draggingAnchor.value,
          (event.x - translateX.value) / safeScale,
          (event.y - translateY.value) / safeScale,
        );
      } else if (pinchActive.value === 0) {
        runOnJS(commitGestureTransform)(zoom.value, translateX.value, translateY.value);
      }
      draggingAnchor.value = -1;
    })
    .onFinalize(() => {
      draggingAnchor.value = -1;
    }), [
      commitGestureTransform,
      draggingAnchor,
      finishManualAnchorMove,
      manualCutLine,
      mode,
      panStartX,
      panStartY,
      pinchActive,
      scheduleManualAnchorMove,
      translateX,
      translateY,
      updateRuntimeTransform,
      zoom,
    ]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onStart((event: any) => {
      pinchActive.value = 1;
      pinchStartScale.value = zoom.value;
      const safeZoom = Math.max(zoom.value, 0.001);
      pinchCanvasX.value = (event.focalX - translateX.value) / safeZoom;
      pinchCanvasY.value = (event.focalY - translateY.value) / safeZoom;
      runOnJS(setPinching)(true);
    })
    .onUpdate((event: any) => {
      const nextScale = clamp(
        pinchStartScale.value * event.scale,
        STAGE_MIN_ZOOM,
        STAGE_MAX_ZOOM,
      );
      const x = event.focalX - pinchCanvasX.value * nextScale;
      const y = event.focalY - pinchCanvasY.value * nextScale;

      zoom.value = nextScale;
      translateX.value = x;
      translateY.value = y;
      runOnJS(updateRuntimeTransform)(nextScale, x, y);
    })
    .onEnd(() => {
      runOnJS(commitGestureTransform)(zoom.value, translateX.value, translateY.value);
    })
    .onFinalize(() => {
      pinchActive.value = 0;
      runOnJS(setPinching)(false);
    }), [
      commitGestureTransform,
      pinchActive,
      pinchCanvasX,
      pinchCanvasY,
      pinchStartScale,
      setPinching,
      translateX,
      translateY,
      updateRuntimeTransform,
      zoom,
    ]);

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
    ? calibrationPoints.length === 0
      ? 'ক্রসহেয়ার স্কেল বারের শুরুতে আনুন'
      : 'ক্রসহেয়ার স্কেল বারের শেষে আনুন'
    : mode === 'drawing_plot'
      ? plotPoints.length < 3
        ? `ক্রসহেয়ার কোণায় এনে পয়েন্ট যোগ করুন (${plotPoints.length}/৩)`
        : 'আরও পয়েন্ট দিন অথবা শেষ করুন'
      : mode === 'manual_divide_plot'
        ? selectedPlot
          ? 'লাল পয়েন্ট টেনে কাটিং লাইন ঠিক করুন'
          : 'যে প্লট ভাগ করবেন সেটিতে ট্যাপ করুন'
        : mapImage
          ? 'এক আঙুলে প্যান • দুই আঙুলে জুম'
          : 'শুরু করতে মৌজা ম্যাপ যোগ করুন';

  const magnifier = useMemo(() => {
    if (
      !mapImage
      || !isMagnifierEnabled
      || viewport.width <= 0
      || (mode !== 'drawing_plot' && mode !== 'calibrating')
    ) {
      return null;
    }

    const radius = 55;
    const lens = { x: viewport.width - radius - 16, y: radius + 16 };
    const centerCanvas = {
      x: (viewport.width / 2 - magnifierTransform.pos.x)
        / Math.max(magnifierTransform.scale, 0.001),
      y: (viewport.height / 2 - magnifierTransform.pos.y)
        / Math.max(magnifierTransform.scale, 0.001),
    };
    const magnifiedScale = magnifierTransform.scale * 2.5;
    const magnifiedPos = {
      x: lens.x - centerCanvas.x * magnifiedScale,
      y: lens.y - centerCanvas.y * magnifiedScale,
    };
    const clip = Skia.Path.MakeFromSVGString(
      `M ${lens.x - radius} ${lens.y} A ${radius} ${radius} 0 1 0 ${lens.x + radius} ${lens.y} A ${radius} ${radius} 0 1 0 ${lens.x - radius} ${lens.y} Z`,
    );
    if (!clip) return null;

    return { radius, lens, magnifiedScale, magnifiedPos, clip };
  }, [
    isMagnifierEnabled,
    magnifierTransform,
    mapImage,
    mode,
    viewport.height,
    viewport.width,
  ]);

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
                  const label = getPolygonAreaLabelLayout(plot.points);
                  const edgeLabels = getPlotEdgeLabels(plot, scale, stageScale);
                  const color = plot.color ?? '#0F766E';
                  const selectedForDivide = mode === 'manual_divide_plot'
                    && manualDividePlotId === plot.id;

                  return (
                    <Group key={plot.id}>
                      <PlotShape
                        plot={plot}
                        stageScale={stageScale}
                        fillOpacity={selectedForDivide ? 0.18 : 0.1}
                      />

                      {edgeLabels.map((edge) => (
                        <SkiaOutlinedText
                          key={edge.id}
                          x={edge.x}
                          y={edge.y}
                          text={edge.text}
                          stageScale={edge.layoutScale}
                          color={edge.color}
                          rotation={edge.rotation}
                          fontPx={edge.fontPx}
                        />
                      ))}

                      {isShowDiagonals && (plot.results.diagonals ?? []).map((diagonal, index) => {
                        const start = plot.points[diagonal.p1Index];
                        const end = plot.points[diagonal.p2Index];
                        if (
                          !start
                          || !end
                          || distance(start, end) <= MIN_DIAGONAL_DRAW_PX / Math.max(stageScale, 0.01)
                        ) {
                          return null;
                        }

                        const mid = midpoint(start, end);
                        const text = diagonal.lengthFt >= MIN_EDGE_LABEL_FT
                          ? formatFeetInches(diagonal.lengthFt)
                          : '';

                        return (
                          <Group key={`${plot.id}-diag-${index}`}>
                            <Path
                              path={linePath(start, end)}
                              color={color}
                              style='stroke'
                              strokeWidth={UI_CONFIG.strokeWidth.thin / Math.max(stageScale, 0.01)}
                              opacity={0.4}
                            >
                              <DashPathEffect
                                intervals={[
                                  6 / Math.max(stageScale, 0.01),
                                  6 / Math.max(stageScale, 0.01),
                                ]}
                              />
                            </Path>
                            {text ? (
                              <SkiaDiagonalBadge
                                x={mid.x}
                                y={mid.y}
                                text={text}
                                stageScale={stageScale}
                                color={color}
                              />
                            ) : null}
                          </Group>
                        );
                      })}

                      {mode !== 'manual_divide_plot' && (
                        <SkiaAreaBadge
                          x={label.center.x}
                          y={label.center.y}
                          text={`${plot.results.shotok.toFixed(2)} শতক`}
                          stageScale={stageScale}
                          color={color}
                          rotation={label.rotation}
                        />
                      )}
                    </Group>
                  );
                })}

                {/* Web StageManualCut: fill overlays only; original plot outline stays below. */}
                {splitPreview && selectedPlot && (
                  <Group>
                    <Path
                      path={pathFromPoints(splitPreview.poly1, true)}
                      color={rgba(selectedPlot.color ?? '#0F766E', 0.3)}
                    />
                    <Path
                      path={pathFromPoints(splitPreview.poly2, true)}
                      color={rgba('#0284C7', 0.3)}
                    />

                    <SkiaAreaBadge
                      x={splitPreview.centerA.x}
                      y={splitPreview.centerA.y}
                      text={`${splitPreview.resultA.shotok.toFixed(2)} শতক`}
                      stageScale={stageScale}
                      color={selectedPlot.color ?? '#0F766E'}
                    />
                    <SkiaAreaBadge
                      x={splitPreview.centerB.x}
                      y={splitPreview.centerB.y}
                      text={`${splitPreview.resultB.shotok.toFixed(2)} শতক`}
                      stageScale={stageScale}
                      color='#0284C7'
                    />
                  </Group>
                )}

                {plotPoints.length > 0 && mode === 'drawing_plot' && (
                  <Group>
                    {plotPoints.length >= 2 && (
                      <Path
                        path={pathFromPoints(plotPoints)}
                        color={UI_CONFIG.colors.drawPrimary}
                        style='stroke'
                        strokeWidth={UI_CONFIG.strokeWidth.xxthick / Math.max(stageScale, 0.01)}
                        strokeJoin='round'
                      />
                    )}

                    {getActivePlotDots(plotPoints).map(({ point, index, isCorner }) => (
                      isCorner ? (
                        <Group key={`point-${index}`}>
                          <Circle
                            cx={point.x}
                            cy={point.y}
                            r={UI_CONFIG.radius.medium / Math.max(stageScale, 0.01)}
                            color='#3182CE'
                          />
                          <Circle
                            cx={point.x}
                            cy={point.y}
                            r={UI_CONFIG.radius.medium / Math.max(stageScale, 0.01)}
                            color='#ffffff'
                            style='stroke'
                            strokeWidth={UI_CONFIG.strokeWidth.medium / Math.max(stageScale, 0.01)}
                          />
                        </Group>
                      ) : null
                    ))}

                    {getActiveSegmentLabels(plotPoints, scale, stageScale).map((edge) => (
                      <SkiaOutlinedText
                        key={edge.id}
                        x={edge.x}
                        y={edge.y}
                        text={edge.text}
                        stageScale={edge.layoutScale}
                        color={edge.color}
                        rotation={edge.rotation}
                        fontPx={edge.fontPx}
                      />
                    ))}
                  </Group>
                )}

                {mode === 'calibrating' && (
                  <Group>
                    {calibrationPoints.length === 2 && (
                      <Path
                        path={linePath(calibrationPoints[0], calibrationPoints[1])}
                        color={UI_CONFIG.colors.drawPrimary}
                        style='stroke'
                        strokeWidth={UI_CONFIG.strokeWidth.xxthick / Math.max(stageScale, 0.01)}
                      />
                    )}

                    {calibrationPoints.map((point, index) => (
                      <Group key={`cal-${index}`}>
                        <Circle
                          cx={point.x}
                          cy={point.y}
                          r={UI_CONFIG.radius.medium / Math.max(stageScale, 0.01)}
                          color={UI_CONFIG.colors.drawPrimary}
                        />
                        <Circle
                          cx={point.x}
                          cy={point.y}
                          r={UI_CONFIG.radius.medium / Math.max(stageScale, 0.01)}
                          color='#ffffff'
                          style='stroke'
                          strokeWidth={UI_CONFIG.strokeWidth.thin / Math.max(stageScale, 0.01)}
                        />
                      </Group>
                    ))}
                  </Group>
                )}

                {manualCutLine && selectedPlot && (() => {
                  const clip = Skia.Path.MakeFromSVGString(
                    pathFromPoints(selectedPlot.points, true),
                  );
                  if (!clip) return null;

                  return (
                    <Group>
                      <Group clip={clip}>
                        <Path
                          path={pathFromPoints(manualCutLine)}
                          color='#DC2626'
                          style='stroke'
                          strokeWidth={UI_CONFIG.strokeWidth.thick / Math.max(stageScale, 0.01)}
                        >
                          <DashPathEffect
                            intervals={[
                              8 / Math.max(stageScale, 0.01),
                              8 / Math.max(stageScale, 0.01),
                            ]}
                          />
                        </Path>
                      </Group>

                      {manualCutLine.map((point, index) => (
                        <Group key={`cut-${index}`}>
                          <Circle
                            cx={point.x}
                            cy={point.y}
                            r={UI_CONFIG.radius.xlarge / Math.max(stageScale, 0.01)}
                            color='#DC2626'
                          />
                          <Circle
                            cx={point.x}
                            cy={point.y}
                            r={UI_CONFIG.radius.xlarge / Math.max(stageScale, 0.01)}
                            color='#ffffff'
                            style='stroke'
                            strokeWidth={UI_CONFIG.strokeWidth.thick / Math.max(stageScale, 0.01)}
                          />
                        </Group>
                      ))}
                    </Group>
                  );
                })()}
              </Group>

              {/* Live line is screen-space, so web's screen widths are used directly. */}
              {liveOverlay.start && (
                <Group>
                  <Path
                    path={linePath(liveOverlay.start, liveOverlay.end)}
                    color={liveOverlay.color}
                    style='stroke'
                    strokeWidth={UI_CONFIG.strokeWidth.xxthick}
                    opacity={0.8}
                  >
                    <DashPathEffect intervals={[8, 6]} />
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
                      opacity={0.95}
                    />
                  )}

                  {liveOverlay.snapped && (
                    <Circle
                      cx={liveOverlay.end.x}
                      cy={liveOverlay.end.y}
                      r={UI_CONFIG.radius.xlarge}
                      color={liveOverlay.color}
                      style='stroke'
                      strokeWidth={UI_CONFIG.strokeWidth.xthick}
                    >
                      <DashPathEffect intervals={[5, 4]} />
                    </Circle>
                  )}
                </Group>
              )}

              {magnifier && mapImage && (
                <Group>
                  <Circle
                    cx={magnifier.lens.x}
                    cy={magnifier.lens.y}
                    r={magnifier.radius + 2}
                    color='#f8fafc'
                  />
                  <Group clip={magnifier.clip}>
                    <Group
                      transform={[
                        { translateX: magnifier.magnifiedPos.x },
                        { translateY: magnifier.magnifiedPos.y },
                        { scale: magnifier.magnifiedScale },
                      ]}
                    >
                      <SkiaSimpleImage
                        uri={mapImage.uri}
                        width={mapImage.width}
                        height={mapImage.height}
                      />
                      {plots.map((plot) => (
                        <PlotShape
                          key={`mag-${plot.id}`}
                          plot={plot}
                          stageScale={magnifier.magnifiedScale}
                        />
                      ))}
                      {plotPoints.length > 0 && mode === 'drawing_plot' && (
                        <Path
                          path={pathFromPoints(plotPoints)}
                          color={UI_CONFIG.colors.drawPrimary}
                          style='stroke'
                          strokeWidth={UI_CONFIG.strokeWidth.xxthick / Math.max(magnifier.magnifiedScale, 0.01)}
                        />
                      )}
                    </Group>
                  </Group>
                  <Circle
                    cx={magnifier.lens.x}
                    cy={magnifier.lens.y}
                    r={magnifier.radius}
                    color='rgba(15,23,42,0.72)'
                    style='stroke'
                    strokeWidth={3}
                  />
                  <Path
                    path={`M ${magnifier.lens.x - 10} ${magnifier.lens.y} L ${magnifier.lens.x + 10} ${magnifier.lens.y}`}
                    color='#ef4444'
                    style='stroke'
                    strokeWidth={2}
                  />
                  <Path
                    path={`M ${magnifier.lens.x} ${magnifier.lens.y - 10} L ${magnifier.lens.x} ${magnifier.lens.y + 10}`}
                    color='#ef4444'
                    style='stroke'
                    strokeWidth={2}
                  />
                </Group>
              )}

              {(mode === 'drawing_plot' || mode === 'calibrating') && (
                <Group>
                  <Path
                    path={`M ${viewport.width / 2 - 13} ${viewport.height / 2} L ${viewport.width / 2 - 3} ${viewport.height / 2} M ${viewport.width / 2 + 3} ${viewport.height / 2} L ${viewport.width / 2 + 13} ${viewport.height / 2} M ${viewport.width / 2} ${viewport.height / 2 - 13} L ${viewport.width / 2} ${viewport.height / 2 - 3} M ${viewport.width / 2} ${viewport.height / 2 + 3} L ${viewport.width / 2} ${viewport.height / 2 + 13}`}
                    color='#ffffff'
                    style='stroke'
                    strokeWidth={3.5}
                    opacity={0.8}
                  />
                  <Path
                    path={`M ${viewport.width / 2 - 13} ${viewport.height / 2} L ${viewport.width / 2 - 3} ${viewport.height / 2} M ${viewport.width / 2 + 3} ${viewport.height / 2} L ${viewport.width / 2 + 13} ${viewport.height / 2} M ${viewport.width / 2} ${viewport.height / 2 - 13} L ${viewport.width / 2} ${viewport.height / 2 - 3} M ${viewport.width / 2} ${viewport.height / 2 + 3} L ${viewport.width / 2} ${viewport.height / 2 + 13}`}
                    color='#ef4444'
                    style='stroke'
                    strokeWidth={1.5}
                  />
                  <Circle
                    cx={viewport.width / 2}
                    cy={viewport.height / 2}
                    r={2}
                    color='#ef4444'
                  />
                </Group>
              )}
            </Canvas>
          )}
        </View>
      </GestureDetector>

      {!mapImage && (
        <View pointerEvents='none' style={styles.emptyState}>
          <Text style={styles.emptyTitle}>মৌজা ম্যাপ যোগ করুন</Text>
          <Text style={styles.emptyText}>
            স্কেল ও জমির সীমানা মাপতে ম্যাপের ছবি প্রয়োজন
          </Text>
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
    top: '42%',
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
    marginTop: 3,
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
    backgroundColor: 'rgba(15,23,42,0.92)',
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
    backgroundColor: 'rgba(15,23,42,0.94)',
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
