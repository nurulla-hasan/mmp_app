import React, {
  memo,
  useCallback,
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
import { calculatePolygonAreaSummary, calculatePolygonData } from '../../utils/calculations';
import {
  clipLineToPolygon,
  getLogicalCorners,
  getSnappedPoint,
  getVisualCenter,
} from '../../utils/geometry';
import { getDirectionalContainingPlot } from '../../utils/directionalPlot';
import { splitPolygonByPolyline } from '../../utils/polygonDivision';
import {
  AREA_LABEL_FONT_SCALE,
  AREA_LABEL_PADDING_FACTOR,
  AREA_LABEL_RADIUS_FACTOR,
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
import { useThemeStore } from '../../../../stores/theme-store';
import { getLandMeasurementToolColors } from '../../utils/tool-theme';
import { getActivePlotDots, getActiveSegmentLabels, getPlotEdgeLabels } from './nativeStageGeometry';
import { SkiaTiledMap } from './SkiaTiledMap';
import {
  canvasPointActionGesture,
  canvasRuntimeScale,
  canvasRuntimeX,
  canvasRuntimeY,
  commitCenterPointFromRuntime,
  setCanvasRuntimeTransform,
} from './canvas-runtime';

type Size = { width: number; height: number };
type Transform = { scale: number; pos: Point };
type LiveOverlayData = {
  /** Canvas-space anchors. They are transformed on the UI thread at render time. */
  start: Point | null;
  end: Point;
  label: { point: Point; text: string; rotation: number; fontPx: number } | null;
  color: string;
  snapped: boolean;
};
type ManualDrag = { index: number; x: number; y: number };

type SharedNumber = ReturnType<typeof useSharedValue<number>>;

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

const getClosestPointOnSegmentWorklet = (px: number, py: number, p1: Point, p2: Point) => {
  'worklet';
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-12) return { x: p1.x, y: p1.y };
  const rawT = ((px - p1.x) * dx + (py - p1.y) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, rawT));
  return { x: p1.x + t * dx, y: p1.y + t * dy };
};

/** UI-thread equivalent of web getSnappedPoint for one polygon. */
const getSnappedPointWorklet = (
  px: number,
  py: number,
  polygon: Point[],
  threshold: number,
) => {
  'worklet';
  let minDistance = threshold;
  let resultX = px;
  let resultY = py;

  for (let index = 0; index < polygon.length; index += 1) {
    const closest = getClosestPointOnSegmentWorklet(
      px,
      py,
      polygon[index],
      polygon[(index + 1) % polygon.length],
    );
    const dx = closest.x - px;
    const dy = closest.y - py;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);
    if (currentDistance < minDistance) {
      minDistance = currentDistance;
      resultX = closest.x;
      resultY = closest.y;
    }
  }

  return { x: resultX, y: resultY };
};

const isPointTouchTargetWorklet = (
  x: number,
  y: number,
  width: number,
  height: number,
  currentMode: string,
) => {
  'worklet';
  if (width <= 0 || height <= 0 || y < height - 125) return false;
  const xRatio = x / width;
  if (currentMode === 'drawing_plot') return xRatio >= 0.54 && xRatio <= 0.84;
  if (currentMode === 'calibrating') return xRatio >= 0.78;
  return false;
};

const getTwoTouchGeometryWorklet = (touches: any[]) => {
  'worklet';
  if (!touches || touches.length < 2) return null;
  const first = touches[0];
  const second = touches[1];
  const centerX = (first.x + second.x) / 2;
  const centerY = (first.y + second.y) / 2;
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  return {
    centerX,
    centerY,
    distance: Math.sqrt(dx * dx + dy * dy),
  };
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
      locale: 'en-US',
      heightMultiplier: 1.05,
    })
    .addText(text)
    .pop()
    .build();
  paragraph.layout(Math.max(width, 1));
  return paragraph;
}

function makeMeasuredParagraph(text: string, color: string, fontSize: number) {
  const paragraph = Skia.ParagraphBuilder.Make({ textAlign: TextAlign.Center })
    .pushStyle({
      color: Skia.Color(color),
      fontSize,
      fontStyle: { weight: 700 },
      locale: 'en-US',
      heightMultiplier: 1.05,
    })
    .addText(text)
    .pop()
    .build();

  paragraph.layout(4096);
  const runtimeParagraph = paragraph as any;
  const intrinsicWidth = Number(runtimeParagraph.getLongestLine?.())
    || Number(runtimeParagraph.getMaxIntrinsicWidth?.())
    || text.length * fontSize * 0.66;
  const textWidth = Math.max(fontSize * 2.5, intrinsicWidth);
  paragraph.layout(textWidth + 1);
  const textHeight = Number(runtimeParagraph.getHeight?.()) || fontSize * 1.08;
  return { paragraph, textWidth, textHeight };
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
      <Paragraph paragraph={fillParagraph} x={-width / 2} y={-height * 0.52} width={width} />
    </Group>
  );
});

type CanvasEdgeLabelProps = {
  midX: number;
  midY: number;
  inwardX: number;
  inwardY: number;
  screenInsetPx: number;
  text: string;
  color: string;
  rotation: number;
  fontPx: number;
  opacity?: number;
};

/**
 * Anchor edge text at the real side midpoint, then apply both the inward offset
 * and inverse text scale from the UI-thread runtime zoom. The parent plot group
 * still follows the map, while the label keeps a constant screen-pixel gap and
 * constant visual size throughout a pinch instead of waiting for Zustand to
 * receive the committed stageScale at gesture end.
 */
const SkiaCanvasEdgeLabel = memo(function SkiaCanvasEdgeLabel({
  midX,
  midY,
  inwardX,
  inwardY,
  screenInsetPx,
  text,
  color,
  rotation,
  fontPx,
  opacity = 1,
}: CanvasEdgeLabelProps) {
  const liveOffset = useDerivedValue(() => {
    const safeScale = Math.max(canvasRuntimeScale.value, 0.01);
    return [
      { translateX: inwardX * screenInsetPx / safeScale },
      { translateY: inwardY * screenInsetPx / safeScale },
    ];
  });
  const inverseRuntimeScale = useDerivedValue(() => [
    { scale: 1 / Math.max(canvasRuntimeScale.value, 0.01) },
  ]);

  return (
    <Group transform={[{ translateX: midX }, { translateY: midY }]}>
      <Group transform={liveOffset as any}>
        <Group transform={inverseRuntimeScale as any}>
          <SkiaOutlinedText
            x={0}
            y={0}
            text={text}
            stageScale={1}
            color={color}
            rotation={rotation}
            fontPx={fontPx}
            opacity={opacity}
          />
        </Group>
      </Group>
    </Group>
  );
});

/**
 * Keep the area badge in the plot's canvas position while cancelling the live
 * parent zoom for its visual size. The paragraph is therefore measured once at
 * screen-pixel size, and the background/text cannot drift apart during pinch.
 */
const SkiaAreaBadge = memo(function SkiaAreaBadge({
  x,
  y,
  text,
  color,
  rotation = 0,
}: LabelProps) {
  const fontSize = UI_CONFIG.fontSize.small * AREA_LABEL_FONT_SCALE;
  const padding = UI_CONFIG.padding.small * AREA_LABEL_PADDING_FACTOR;
  const radius = UI_CONFIG.radius.small * AREA_LABEL_RADIUS_FACTOR;
  const measured = useMemo(
    () => makeMeasuredParagraph(text, '#ffffff', fontSize),
    [fontSize, text],
  );
  const width = measured.textWidth + padding * 2;
  const height = Math.max(fontSize * 1.08, measured.textHeight) + padding * 2;
  const shadow = 1.1;
  const inverseRuntimeScale = useDerivedValue(() => [
    { scale: 1 / Math.max(canvasRuntimeScale.value, 0.01) },
  ]);

  return (
    <Group
      opacity={0.95}
      transform={[
        { translateX: x },
        { translateY: y },
        { rotate: getReadableRotation(rotation) * Math.PI / 180 },
      ]}
    >
      <Group transform={inverseRuntimeScale as any}>
        <RoundedRect
          x={-width / 2 + shadow}
          y={-height / 2 + shadow}
          width={width}
          height={height}
          r={radius}
          color='rgba(0,0,0,0.22)'
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
          paragraph={measured.paragraph}
          x={-measured.textWidth / 2}
          y={-measured.textHeight / 2}
          width={measured.textWidth + 1}
        />
      </Group>
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
      <RoundedRect x={-width / 2} y={-height / 2} width={width} height={height} r={padding} color='#ffffff' />
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
      <Paragraph paragraph={paragraph} x={-width / 2} y={-height * 0.48} width={width} />
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

type ManualAnchorProps = {
  point: Point;
  index: number;
  stageScale: number;
  dragIndex: SharedNumber;
  dragX: SharedNumber;
  dragY: SharedNumber;
};

const ManualAnchor = memo(function ManualAnchor({
  point,
  index,
  stageScale,
  dragIndex,
  dragX,
  dragY,
}: ManualAnchorProps) {
  const cx = useDerivedValue(() => dragIndex.value === index ? dragX.value : point.x);
  const cy = useDerivedValue(() => dragIndex.value === index ? dragY.value : point.y);
  const radius = UI_CONFIG.radius.xlarge / Math.max(stageScale, 0.01);
  return (
    <Group>
      <Circle cx={cx as any} cy={cy as any} r={radius} color='#DC2626' />
      <Circle
        cx={cx as any}
        cy={cy as any}
        r={radius}
        color='#ffffff'
        style='stroke'
        strokeWidth={UI_CONFIG.strokeWidth.thick / Math.max(stageScale, 0.01)}
      />
    </Group>
  );
});

export function SkiaMapCanvas() {
  const { theme } = useThemeStore();
  const colors = getLandMeasurementToolColors(theme);
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
  const manualPreviewRafRef = useRef<number | null>(null);
  const pendingManualDragRef = useRef<ManualDrag | null>(null);

  const translateX = useSharedValue(stagePos.x);
  const translateY = useSharedValue(stagePos.y);
  const zoom = useSharedValue(stageScale);
  const panStartX = useSharedValue(stagePos.x);
  const panStartY = useSharedValue(stagePos.y);
  const panTranslationBaseX = useSharedValue(0);
  const panTranslationBaseY = useSharedValue(0);
  const panLastTranslationX = useSharedValue(0);
  const panLastTranslationY = useSharedValue(0);
  const pinchStartScale = useSharedValue(stageScale);
  const pinchStartDistance = useSharedValue(0);
  const pinchCanvasX = useSharedValue(0);
  const pinchCanvasY = useSharedValue(0);
  const pinchActive = useSharedValue(0);
  // 0 = single pointer, 1 = real pinch, 2 = second-finger Point action.
  const multiTouchMode = useSharedValue(0);
  const pointTouchLatched = useSharedValue(0);
  const draggingAnchor = useSharedValue(-1);
  const dragVisualX = useSharedValue(0);
  const dragVisualY = useSharedValue(0);

  const contentTransform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: zoom.value },
  ]);

  const manualCutPath = useDerivedValue(() => {
    if (!manualCutLine?.length) return '';
    const parts: string[] = [];
    for (let index = 0; index < manualCutLine.length; index += 1) {
      const x = draggingAnchor.value === index ? dragVisualX.value : manualCutLine[index].x;
      const y = draggingAnchor.value === index ? dragVisualY.value : manualCutLine[index].y;
      parts.push(`${index === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    return parts.join(' ');
  });

  /**
   * The map/points move on the UI thread. Keep the live line endpoints on that
   * exact transform too; otherwise a JS RAF can trail one frame behind during
   * fast panning and make the dashed line look detached from its point.
   */
  const liveLinePath = useDerivedValue(() => {
    if (!liveOverlay.start) return '';
    const startX = liveOverlay.start.x * zoom.value + translateX.value;
    const startY = liveOverlay.start.y * zoom.value + translateY.value;
    const endX = liveOverlay.snapped
      ? liveOverlay.end.x * zoom.value + translateX.value
      : viewport.width / 2;
    const endY = liveOverlay.snapped
      ? liveOverlay.end.y * zoom.value + translateY.value
      : viewport.height / 2;
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  });

  const liveEndX = useDerivedValue(() => liveOverlay.snapped
    ? liveOverlay.end.x * zoom.value + translateX.value
    : viewport.width / 2);
  const liveEndY = useDerivedValue(() => liveOverlay.snapped
    ? liveOverlay.end.y * zoom.value + translateY.value
    : viewport.height / 2);

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
  const selectedPlotPoints = selectedPlot?.points ?? [];

  const splitPreview = useMemo(() => {
    if (!selectedPlot || !manualCutLine || manualCutLine.length < 2 || !scale) return null;
    const split = splitPolygonByPolyline(selectedPlot.points, manualCutLine);
    if (!split || split.poly1.length < 3 || split.poly2.length < 3) return null;
    const resultA = calculatePolygonAreaSummary(split.poly1, scale);
    const resultB = calculatePolygonAreaSummary(split.poly2, scale);
    if (!resultA || !resultB) return null;
    return {
      poly1: split.poly1,
      poly2: split.poly2,
      resultA,
      resultB,
      centerA: getVisualCenter(split.poly1),
      centerB: getVisualCenter(split.poly2),
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
      if (widthPx > maxWidthPx && maxWidthPx > 0) {
        fontPx = Math.max(6.75, fontPx * maxWidthPx / widthPx);
      }
      const mid = midpoint(startCanvas, target);
      let point = mid;
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
        const inset = Math.max(11, fontPx * 1.35 + 1.5) / transform.scale;
        point = { x: mid.x + normal.x * inset, y: mid.y + normal.y * inset };
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
      start: startCanvas,
      end: target,
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

  const updateLiveOverlayFromUi = useCallback((nextScale: number, x: number, y: number) => {
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

  /**
   * Red anchors and the dashed line are UI-thread driven. Split fill/area
   * preview is JS geometry, so coalesce the 120Hz touch stream to one update
   * per available JS animation frame. The preview calculation itself is now
   * area-only, matching the final formula while skipping lengths/diagonals.
   */
  const scheduleManualAnchorMove = useCallback((index: number, x: number, y: number) => {
    pendingManualDragRef.current = { index, x, y };
    if (manualPreviewRafRef.current !== null) return;

    manualPreviewRafRef.current = requestAnimationFrame(() => {
      manualPreviewRafRef.current = null;
      const pending = pendingManualDragRef.current;
      pendingManualDragRef.current = null;
      if (!pending) return;
      const state = useMapStore.getState();
      const currentLine = state.manualCutLine;
      if (!currentLine || pending.index < 0 || pending.index >= currentLine.length) return;
      const nextLine = [...currentLine];
      nextLine[pending.index] = { x: pending.x, y: pending.y };
      state.setManualCutLine(nextLine);
    });
  }, []);

  const finishManualAnchorMove = useCallback((index: number, x: number, y: number) => {
    if (manualPreviewRafRef.current !== null) {
      cancelAnimationFrame(manualPreviewRafRef.current);
      manualPreviewRafRef.current = null;
    }
    pendingManualDragRef.current = null;

    const state = useMapStore.getState();
    const currentLine = state.manualCutLine;
    const currentPlot = state.plots.find((item) => item.id === state.manualDividePlotId);
    if (!currentLine || !currentPlot || index < 0 || index >= currentLine.length) {
      draggingAnchor.value = -1;
      return;
    }

    const rawPoint = { x, y };
    const isBoundary = index === 0 || index === currentLine.length - 1;
    const cornerSnap = isBoundary
      ? getCornerSnapPoint(
          rawPoint,
          getLogicalCorners(currentPlot.points),
          MANUAL_DIVIDE_CORNER_SNAP_PX / Math.max(state.stageScale, 0.01),
        )
      : null;
    const finalPoint = cornerSnap ?? getSnappedPoint(
      rawPoint,
      [currentPlot.points],
      isBoundary ? Number.POSITIVE_INFINITY : 14 / Math.max(state.stageScale, 0.01),
    );
    const nextLine = [...currentLine];
    nextLine[index] = finalPoint;
    state.setManualCutLine(nextLine);
    dragVisualX.value = finalPoint.x;
    dragVisualY.value = finalPoint.y;
    requestAnimationFrame(() => {
      draggingAnchor.value = -1;
    });
  }, [dragVisualX, dragVisualY, draggingAnchor]);

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
    if (manualPreviewRafRef.current !== null) cancelAnimationFrame(manualPreviewRafRef.current);
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
    canvasRuntimeScale.value = next.scale;
    canvasRuntimeX.value = next.pos.x;
    canvasRuntimeY.value = next.pos.y;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapImage?.uri, viewport.height, viewport.width]);

  const zoomAround = useCallback((factor: number) => {
    const currentScale = zoom.value;
    const minimumZoom = Math.min(STAGE_MIN_ZOOM, fitScale || STAGE_MIN_ZOOM);
    const nextScale = clamp(currentScale * factor, minimumZoom, STAGE_MAX_ZOOM);
    const center = { x: viewport.width / 2, y: viewport.height / 2 };
    const ratio = nextScale / Math.max(currentScale, 0.001);
    const x = center.x - (center.x - translateX.value) * ratio;
    const y = center.y - (center.y - translateY.value) * ratio;
    zoom.value = nextScale;
    translateX.value = x;
    translateY.value = y;
    canvasRuntimeScale.value = nextScale;
    canvasRuntimeX.value = x;
    canvasRuntimeY.value = y;
    commitGestureTransform(nextScale, x, y);
  }, [
    commitGestureTransform,
    fitScale,
    translateX,
    translateY,
    viewport.height,
    viewport.width,
    zoom,
  ]);

  /**
   * Keep the original first-finger pan alive when finger #2 is used as the
   * Point action. For a real two-finger pinch, freeze pan immediately before
   * the pinch starts so pan and zoom never write competing transforms.
   */
  const panGesture = useMemo(() => Gesture.Pan()
    .simultaneousWithExternalGesture(canvasPointActionGesture)
    .maxPointers(2)
    .minDistance(0)
    .onTouchesDown((event: any) => {
      const touches = event.allTouches ?? [];
      if (touches.length < 2) return;
      const changed = (event.changedTouches ?? [])[0] ?? touches[touches.length - 1];
      const isPointTouch = changed
        ? isPointTouchTargetWorklet(changed.x, changed.y, viewport.width, viewport.height, mode)
        : false;

      if (isPointTouch) {
        multiTouchMode.value = 2;
        if (pointTouchLatched.value === 0) {
          pointTouchLatched.value = 1;
          runOnJS(commitCenterPointFromRuntime)();
        }
        return;
      }

      multiTouchMode.value = 1;
    })
    .onTouchesUp((event: any) => {
      const activeCount = (event.allTouches ?? []).length;
      if (activeCount > 1) return;

      if (multiTouchMode.value === 2) {
        multiTouchMode.value = 0;
        pointTouchLatched.value = 0;
        panStartX.value = translateX.value;
        panStartY.value = translateY.value;
        panTranslationBaseX.value = panLastTranslationX.value;
        panTranslationBaseY.value = panLastTranslationY.value;
        return;
      }

      if (multiTouchMode.value === 1) {
        runOnJS(commitGestureTransform)(zoom.value, translateX.value, translateY.value);
        multiTouchMode.value = 0;
        pinchActive.value = 0;
        pinchStartDistance.value = 0;
        panStartX.value = translateX.value;
        panStartY.value = translateY.value;
        panTranslationBaseX.value = panLastTranslationX.value;
        panTranslationBaseY.value = panLastTranslationY.value;
        runOnJS(setPinching)(false);
      }
    })
    .onStart((event: any) => {
      panStartX.value = translateX.value;
      panStartY.value = translateY.value;
      panTranslationBaseX.value = 0;
      panTranslationBaseY.value = 0;
      panLastTranslationX.value = 0;
      panLastTranslationY.value = 0;
      draggingAnchor.value = -1;

      if (mode === 'manual_divide_plot' && manualCutLine?.length) {
        const safeScale = Math.max(zoom.value, 0.001);
        const canvasX = (event.x - translateX.value) / safeScale;
        const canvasY = (event.y - translateY.value) / safeScale;
        const threshold = 23 / safeScale;
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
        if (draggingAnchor.value >= 0) {
          const point = manualCutLine[draggingAnchor.value];
          dragVisualX.value = point.x;
          dragVisualY.value = point.y;
        }
      }
    })
    .onUpdate((event: any) => {
      panLastTranslationX.value = event.translationX;
      panLastTranslationY.value = event.translationY;

      if (multiTouchMode.value !== 0 || pinchActive.value > 0) return;

      if (draggingAnchor.value >= 0) {
        const safeScale = Math.max(zoom.value, 0.001);
        const rawX = (event.x - translateX.value) / safeScale;
        const rawY = (event.y - translateY.value) / safeScale;
        const boundary = draggingAnchor.value === 0
          || draggingAnchor.value === (manualCutLine?.length ?? 1) - 1;
        const snapped = getSnappedPointWorklet(
          rawX,
          rawY,
          selectedPlotPoints,
          boundary ? Number.POSITIVE_INFINITY : 14 / safeScale,
        );
        dragVisualX.value = snapped.x;
        dragVisualY.value = snapped.y;
        runOnJS(scheduleManualAnchorMove)(draggingAnchor.value, snapped.x, snapped.y);
        return;
      }

      const x = panStartX.value + (event.translationX - panTranslationBaseX.value);
      const y = panStartY.value + (event.translationY - panTranslationBaseY.value);
      translateX.value = x;
      translateY.value = y;
      canvasRuntimeScale.value = zoom.value;
      canvasRuntimeX.value = x;
      canvasRuntimeY.value = y;
      if (mode === 'drawing_plot' || mode === 'calibrating') {
        runOnJS(updateLiveOverlayFromUi)(zoom.value, x, y);
      }
    })
    .onEnd((event: any) => {
      if (draggingAnchor.value >= 0) {
        const safeScale = Math.max(zoom.value, 0.001);
        runOnJS(finishManualAnchorMove)(
          draggingAnchor.value,
          (event.x - translateX.value) / safeScale,
          (event.y - translateY.value) / safeScale,
        );
      } else if (multiTouchMode.value === 0 && pinchActive.value === 0) {
        runOnJS(commitGestureTransform)(zoom.value, translateX.value, translateY.value);
      }
    })
    .onFinalize(() => {
      if (multiTouchMode.value === 0 && pinchActive.value === 0 && draggingAnchor.value < 0) {
        panStartX.value = translateX.value;
        panStartY.value = translateY.value;
        panTranslationBaseX.value = panLastTranslationX.value;
        panTranslationBaseY.value = panLastTranslationY.value;
      }
    }), [
      commitGestureTransform,
      dragVisualX,
      dragVisualY,
      draggingAnchor,
      finishManualAnchorMove,
      manualCutLine,
      mode,
      multiTouchMode,
      panLastTranslationX,
      panLastTranslationY,
      panStartX,
      panStartY,
      panTranslationBaseX,
      panTranslationBaseY,
      pinchActive,
      pinchStartDistance,
      pointTouchLatched,
      scheduleManualAnchorMove,
      selectedPlotPoints,
      setPinching,
      translateX,
      translateY,
      updateLiveOverlayFromUi,
      viewport.height,
      viewport.width,
      zoom,
    ]);

  /**
   * Web parity: derive zoom from the real distance between the two touches and
   * keep the image point under their midpoint locked to the moving midpoint.
   * This avoids Android's focalX/focalY activation jump entirely.
   */
  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onTouchesDown((event: any, stateManager: any) => {
      const touches = event.allTouches ?? [];
      if (touches.length < 2) return;

      const changed = (event.changedTouches ?? [])[0] ?? touches[touches.length - 1];
      const isPointTouch = changed
        ? isPointTouchTargetWorklet(changed.x, changed.y, viewport.width, viewport.height, mode)
        : false;

      if (isPointTouch) {
        multiTouchMode.value = 2;
        pinchActive.value = 0;
        pinchStartDistance.value = 0;
        if (pointTouchLatched.value === 0) {
          pointTouchLatched.value = 1;
          runOnJS(commitCenterPointFromRuntime)();
        }
        stateManager?.fail?.();
        return;
      }

      const geometry = getTwoTouchGeometryWorklet(touches);
      if (!geometry || geometry.distance <= 0) return;

      multiTouchMode.value = 1;
      pinchActive.value = 1;
      pinchStartScale.value = zoom.value;
      pinchStartDistance.value = geometry.distance;
      const safeScale = Math.max(zoom.value, 0.001);
      pinchCanvasX.value = (geometry.centerX - translateX.value) / safeScale;
      pinchCanvasY.value = (geometry.centerY - translateY.value) / safeScale;
      runOnJS(setPinching)(true);
    })
    .onTouchesMove((event: any) => {
      if (multiTouchMode.value !== 1 || pinchStartDistance.value <= 0) return;
      const geometry = getTwoTouchGeometryWorklet(event.allTouches ?? []);
      if (!geometry || geometry.distance <= 0) return;

      const minimumZoom = Math.min(STAGE_MIN_ZOOM, fitScale || STAGE_MIN_ZOOM);
      const nextScale = clamp(
        pinchStartScale.value * (geometry.distance / pinchStartDistance.value),
        minimumZoom,
        STAGE_MAX_ZOOM,
      );
      const x = geometry.centerX - pinchCanvasX.value * nextScale;
      const y = geometry.centerY - pinchCanvasY.value * nextScale;

      zoom.value = nextScale;
      translateX.value = x;
      translateY.value = y;
      canvasRuntimeScale.value = nextScale;
      canvasRuntimeX.value = x;
      canvasRuntimeY.value = y;
      if (mode === 'drawing_plot' || mode === 'calibrating') {
        runOnJS(updateLiveOverlayFromUi)(nextScale, x, y);
      }
    })
    // Rendering is driven by raw touches above; RNGH Pinch is only the state owner.
    .onUpdate(() => {})
    .onEnd(() => {
      if (multiTouchMode.value === 1) {
        runOnJS(commitGestureTransform)(zoom.value, translateX.value, translateY.value);
      }
    })
    .onFinalize(() => {
      if (multiTouchMode.value === 1) {
        multiTouchMode.value = 0;
        pinchActive.value = 0;
        pinchStartDistance.value = 0;
        panStartX.value = translateX.value;
        panStartY.value = translateY.value;
        panTranslationBaseX.value = panLastTranslationX.value;
        panTranslationBaseY.value = panLastTranslationY.value;
        runOnJS(setPinching)(false);
      } else if (multiTouchMode.value !== 2) {
        pinchActive.value = 0;
        pinchStartDistance.value = 0;
        runOnJS(setPinching)(false);
      }
    }), [
      commitGestureTransform,
      fitScale,
      mode,
      multiTouchMode,
      panLastTranslationX,
      panLastTranslationY,
      panStartX,
      panStartY,
      panTranslationBaseX,
      panTranslationBaseY,
      pinchActive,
      pinchCanvasX,
      pinchCanvasY,
      pinchStartDistance,
      pinchStartScale,
      pointTouchLatched,
      setPinching,
      translateX,
      translateY,
      updateLiveOverlayFromUi,
      viewport.height,
      viewport.width,
      zoom,
    ]);

  const tapGesture = useMemo(() => Gesture.Tap()
    .maxDistance(8)
    .onEnd((event: any, success: boolean) => {
      if (
        success
        && multiTouchMode.value === 0
        && pinchActive.value === 0
        && mode === 'manual_divide_plot'
        && !manualDividePlotId
      ) {
        runOnJS(selectPlotAt)(event.x, event.y);
      }
    }), [manualDividePlotId, mode, multiTouchMode, pinchActive, selectPlotAt]);

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
    ? calibrationPoints.length === 0 ? 'Move the crosshair to the start of the scale bar' : 'Move the crosshair to the end of the scale bar'
    : mode === 'drawing_plot'
      ? plotPoints.length < 3 ? `Move the crosshair to a corner and add a point (${plotPoints.length}/3)` : 'Add more points or finish the plot'
      : mode === 'manual_divide_plot'
        ? selectedPlot ? 'Drag the red points to adjust the cut line' : 'Tap the plot you want to divide'
        : mapImage ? 'One finger to pan • Two fingers to zoom' : 'Add a mouza map to begin';

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
    const clip = Skia.Path.MakeFromSVGString(
      `M ${lens.x - radius} ${lens.y} A ${radius} ${radius} 0 1 0 ${lens.x + radius} ${lens.y} A ${radius} ${radius} 0 1 0 ${lens.x - radius} ${lens.y} Z`,
    );
    if (!clip) return null;
    return { radius, lens, magnifiedScale, magnifiedPos, clip };
  }, [isMagnifierEnabled, magnifierTransform, mapImage, mode, viewport.height, viewport.width]);

  return (
    <View style={[styles.container, { backgroundColor: colors.workspace }]} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          {viewport.width > 0 && viewport.height > 0 && (
            <Canvas style={StyleSheet.absoluteFill}>
              <Fill color={colors.workspace} />
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
                  const selectedForDivide = mode === 'manual_divide_plot' && manualDividePlotId === plot.id;
                  return (
                    <Group key={plot.id}>
                      <PlotShape plot={plot} stageScale={stageScale} fillOpacity={selectedForDivide ? 0.18 : 0.1} />
                      {edgeLabels.map((edge) => (
                        <SkiaCanvasEdgeLabel
                          key={edge.id}
                          midX={edge.midX}
                          midY={edge.midY}
                          inwardX={edge.inwardX}
                          inwardY={edge.inwardY}
                          screenInsetPx={edge.screenInsetPx}
                          text={edge.text}
                          color={edge.color}
                          rotation={edge.rotation}
                          fontPx={edge.fontPx}
                        />
                      ))}
                      {isShowDiagonals && (plot.results.diagonals ?? []).map((diagonal, index) => {
                        const start = plot.points[diagonal.p1Index];
                        const end = plot.points[diagonal.p2Index];
                        if (!start || !end || distance(start, end) <= MIN_DIAGONAL_DRAW_PX / Math.max(stageScale, 0.01)) return null;
                        const mid = midpoint(start, end);
                        const text = diagonal.lengthFt >= MIN_EDGE_LABEL_FT ? formatFeetInches(diagonal.lengthFt) : '';
                        return (
                          <Group key={`${plot.id}-diag-${index}`}>
                            <Path
                              path={linePath(start, end)}
                              color={color}
                              style='stroke'
                              strokeWidth={UI_CONFIG.strokeWidth.thin / Math.max(stageScale, 0.01)}
                              opacity={0.4}
                            >
                              <DashPathEffect intervals={[6 / Math.max(stageScale, 0.01), 6 / Math.max(stageScale, 0.01)]} />
                            </Path>
                            {text ? <SkiaDiagonalBadge x={mid.x} y={mid.y} text={text} stageScale={stageScale} color={color} /> : null}
                          </Group>
                        );
                      })}
                      {mode !== 'manual_divide_plot' && (
                        <SkiaAreaBadge
                          x={label.center.x}
                          y={label.center.y}
                          text={`${plot.results.shotok.toFixed(2)} shotok`}
                          stageScale={stageScale}
                          color={color}
                          rotation={label.rotation}
                        />
                      )}
                    </Group>
                  );
                })}

                {splitPreview && selectedPlot && (
                  <Group>
                    <Path path={pathFromPoints(splitPreview.poly1, true)} color={rgba(selectedPlot.color ?? '#0F766E', 0.3)} />
                    <Path path={pathFromPoints(splitPreview.poly2, true)} color={rgba('#0284C7', 0.3)} />
                    <SkiaAreaBadge
                      x={splitPreview.centerA.x}
                      y={splitPreview.centerA.y}
                      text={`${splitPreview.resultA.shotok.toFixed(2)} shotok`}
                      stageScale={stageScale}
                      color={selectedPlot.color ?? '#0F766E'}
                    />
                    <SkiaAreaBadge
                      x={splitPreview.centerB.x}
                      y={splitPreview.centerB.y}
                      text={`${splitPreview.resultB.shotok.toFixed(2)} shotok`}
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
                    {getActivePlotDots(plotPoints).map(({ point, index, isCorner }) => isCorner ? (
                      <Group key={`point-${index}`}>
                        <Circle cx={point.x} cy={point.y} r={UI_CONFIG.radius.medium / Math.max(stageScale, 0.01)} color='#3182CE' />
                        <Circle
                          cx={point.x}
                          cy={point.y}
                          r={UI_CONFIG.radius.medium / Math.max(stageScale, 0.01)}
                          color='#ffffff'
                          style='stroke'
                          strokeWidth={UI_CONFIG.strokeWidth.medium / Math.max(stageScale, 0.01)}
                        />
                      </Group>
                    ) : null)}
                    {getActiveSegmentLabels(plotPoints, scale, stageScale).map((edge) => (
                      <SkiaCanvasEdgeLabel
                        key={edge.id}
                        midX={edge.midX}
                        midY={edge.midY}
                        inwardX={edge.inwardX}
                        inwardY={edge.inwardY}
                        screenInsetPx={edge.screenInsetPx}
                        text={edge.text}
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
                        <Circle cx={point.x} cy={point.y} r={UI_CONFIG.radius.medium / Math.max(stageScale, 0.01)} color={UI_CONFIG.colors.drawPrimary} />
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
                  const clip = Skia.Path.MakeFromSVGString(pathFromPoints(selectedPlot.points, true));
                  if (!clip) return null;
                  return (
                    <Group>
                      <Group clip={clip}>
                        <Path
                          path={manualCutPath as any}
                          color='#DC2626'
                          style='stroke'
                          strokeWidth={UI_CONFIG.strokeWidth.thick / Math.max(stageScale, 0.01)}
                        >
                          <DashPathEffect intervals={[8 / Math.max(stageScale, 0.01), 8 / Math.max(stageScale, 0.01)]} />
                        </Path>
                      </Group>
                      {manualCutLine.map((point, index) => (
                        <ManualAnchor
                          key={`cut-${index}`}
                          point={point}
                          index={index}
                          stageScale={stageScale}
                          dragIndex={draggingAnchor}
                          dragX={dragVisualX}
                          dragY={dragVisualY}
                        />
                      ))}
                    </Group>
                  );
                })()}
              </Group>

              {liveOverlay.start && (
                <Group>
                  <Path
                    path={liveLinePath as any}
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
                      cx={liveEndX as any}
                      cy={liveEndY as any}
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
                  <Circle cx={magnifier.lens.x} cy={magnifier.lens.y} r={magnifier.radius + 2} color={colors.surface} />
                  <Group clip={magnifier.clip}>
                    <Group transform={[
                      { translateX: magnifier.magnifiedPos.x },
                      { translateY: magnifier.magnifiedPos.y },
                      { scale: magnifier.magnifiedScale },
                    ]}>
                      <SkiaSimpleImage uri={mapImage.uri} width={mapImage.width} height={mapImage.height} />
                      {plots.map((plot) => <PlotShape key={`mag-${plot.id}`} plot={plot} stageScale={magnifier.magnifiedScale} />)}
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
                    color={theme === 'dark' ? 'rgba(15,23,42,0.72)' : 'rgba(15,23,42,0.42)'}
                    style='stroke'
                    strokeWidth={3}
                  />
                  <Path path={`M ${magnifier.lens.x - 10} ${magnifier.lens.y} L ${magnifier.lens.x + 10} ${magnifier.lens.y}`} color='#ef4444' style='stroke' strokeWidth={2} />
                  <Path path={`M ${magnifier.lens.x} ${magnifier.lens.y - 10} L ${magnifier.lens.x} ${magnifier.lens.y + 10}`} color='#ef4444' style='stroke' strokeWidth={2} />
                </Group>
              )}

              {(mode === 'drawing_plot' || mode === 'calibrating') && (
                <Group>
                  <Path
                    path={`M ${viewport.width / 2 - 11} ${viewport.height / 2} L ${viewport.width / 2 - 3.5} ${viewport.height / 2} M ${viewport.width / 2 + 3.5} ${viewport.height / 2} L ${viewport.width / 2 + 11} ${viewport.height / 2} M ${viewport.width / 2} ${viewport.height / 2 - 11} L ${viewport.width / 2} ${viewport.height / 2 - 3.5} M ${viewport.width / 2} ${viewport.height / 2 + 3.5} L ${viewport.width / 2} ${viewport.height / 2 + 11}`}
                    color='#ffffff'
                    style='stroke'
                    strokeWidth={2.2}
                    opacity={0.56}
                  />
                  <Path
                    path={`M ${viewport.width / 2 - 11} ${viewport.height / 2} L ${viewport.width / 2 - 3.5} ${viewport.height / 2} M ${viewport.width / 2 + 3.5} ${viewport.height / 2} L ${viewport.width / 2 + 11} ${viewport.height / 2} M ${viewport.width / 2} ${viewport.height / 2 - 11} L ${viewport.width / 2} ${viewport.height / 2 - 3.5} M ${viewport.width / 2} ${viewport.height / 2 + 3.5} L ${viewport.width / 2} ${viewport.height / 2 + 11}`}
                    color='#ef4444'
                    style='stroke'
                    strokeWidth={1.1}
                  />
                  <Circle cx={viewport.width / 2} cy={viewport.height / 2} r={2.25} color='#ffffff' opacity={0.72} />
                  <Circle cx={viewport.width / 2} cy={viewport.height / 2} r={1.15} color='#ef4444' />
                </Group>
              )}
            </Canvas>
          )}
        </View>
      </GestureDetector>

      {!mapImage && (
        <View pointerEvents='none' style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textStrong }]}>Add Mouza Map</Text>
          <Text style={[styles.emptyText, { color: colors.textSoft }]}>Add a map image to set scale and measure land boundaries</Text>
        </View>
      )}
      <View pointerEvents='none' style={styles.instructionPill}>
        <Text
          style={[
            styles.instructionText,
            {
              backgroundColor: theme === 'dark' ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.94)',
              borderColor: colors.panelBorder,
              color: colors.textStrong,
            },
          ]}
        >
          {instruction}
        </Text>
      </View>
      <View
        style={[
          styles.zoomControls,
          { backgroundColor: colors.overlay, borderColor: colors.panelBorder },
        ]}
      >
        <TouchableOpacity style={[styles.zoomButton, { borderBottomColor: colors.panelBorder }]} onPress={() => zoomAround(1.25)}>
          <Plus size={18} color={colors.textSoft} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.zoomButton, { borderBottomColor: colors.panelBorder }]} onPress={() => zoomAround(0.8)}>
          <Minus size={18} color={colors.textSoft} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.zoomButton, { borderBottomColor: colors.panelBorder }]} onPress={resetView}>
          <LocateFixed size={17} color={colors.success} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  emptyState: { position: 'absolute', top: '42%', left: 28, right: 28, alignItems: 'center' },
  emptyTitle: { fontFamily: Fonts.headingBold, fontSize: 16 },
  emptyText: { marginTop: 3, fontFamily: Fonts.sansRegular, fontSize: 11, textAlign: 'center' },
  instructionPill: { position: 'absolute', top: 10, left: 12, right: 58, alignItems: 'flex-start' },
  instructionText: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  },
  zoomButton: {
    width: 38,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
