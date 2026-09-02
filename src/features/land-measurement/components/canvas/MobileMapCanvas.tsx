import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { LocateFixed, Minus, Plus } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { calculatePolygonData } from '../../utils/calculations';
import { clipLineToPolygon, getSnappedPoint } from '../../utils/geometry';
import { getDirectionalContainingPlot } from '../../utils/directionalPlot';
import { splitPolygonByPolyline } from '../../utils/polygonDivision';
import { formatFeetInches, MIN_DIAGONAL_DRAW_PX, MIN_EDGE_LABEL_FT } from '../../utils/canvas';
import { STAGE_MAX_ZOOM, STAGE_MIN_ZOOM, UI_CONFIG } from '../../utils/canvas';
import { getPolygonAreaLabelLayout } from '../../utils/polygon-label';
import { getReadableRotation } from '../../utils/component-helpers';
import type { Point } from '../../types/map';
import { toBengaliDigits } from '../../../../lib/utils';
import { Fonts } from '../../../../constants/typography';
import { NativeTiledMap } from './NativeTiledMap';
import { getActivePlotDots, getActiveSegmentLabels, getPlotEdgeLabels } from './nativeStageGeometry';

type Size = { width: number; height: number };

const pointString = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ');
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

type Transform = { scale: number; pos: Point };
type LiveOverlayData = {
  start: Point | null;
  end: Point;
  label: { point: Point; text: string; rotation: number; fontPx: number } | null;
  color: string;
  snapped: boolean;
};
type LiveOverlayHandle = { update: (value: LiveOverlayData) => void };
type MagnifierHandle = { update: (value: Transform) => void };

const LiveMeasurementOverlay = forwardRef<LiveOverlayHandle, { initial: LiveOverlayData }>(function LiveMeasurementOverlay({ initial }, ref) {
  const [data, setData] = useState(initial);
  useImperativeHandle(ref, () => ({ update: setData }), []);
  if (!data.start) return null;

  return (
    <G pointerEvents='none'>
      <Line x1={data.start.x} y1={data.start.y} x2={data.end.x} y2={data.end.y} stroke={data.color} strokeWidth={2.5} strokeDasharray='8,5' />
      {data.label && <SvgOutlinedText x={data.label.point.x} y={data.label.point.y} text={data.label.text} stageScale={1} color={data.color} rotation={data.label.rotation} fontPx={data.label.fontPx} />}
      {data.snapped && <Circle cx={data.end.x} cy={data.end.y} r={10} fill='none' stroke={data.color} strokeWidth={2} strokeDasharray='5,4' />}
    </G>
  );
});

type BadgeProps = {
  x: number;
  y: number;
  text: string;
  stageScale: number;
  color: string;
  rotation?: number;
  compact?: boolean;
  fontPx?: number;
};

function SvgBadge({ x, y, text, stageScale, color, rotation = 0, compact = false }: BadgeProps) {
  const safeScale = Math.max(stageScale, 0.01);
  const fontSize = (compact ? 8.5 : 11.5) / safeScale;
  const height = (compact ? 15 : 23) / safeScale;
  const screenWidth = Math.max(
    compact ? 34 : 58,
    text.length * (compact ? 4.9 : 6.6) + (compact ? 10 : 14),
  );
  const width = screenWidth / safeScale;

  return (
    <G transform={`translate(${x} ${y}) rotate(${getReadableRotation(rotation)})`}>
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={(compact ? 3.5 : 5) / safeScale}
        fill={color}
        fillOpacity={0.94}
        stroke='#ffffff'
        strokeOpacity={0.22}
        strokeWidth={(compact ? 0.6 : 0.8) / safeScale}
      />
      <SvgText
        x={0}
        y={fontSize * 0.34}
        fill='#ffffff'
        fontFamily={Fonts.headingBold}
        fontSize={fontSize}
        fontWeight='700'
        textAnchor='middle'
      >
        {text}
      </SvgText>
    </G>
  );
}

function SvgOutlinedText({ x, y, text, stageScale, color, rotation = 0, fontPx = UI_CONFIG.fontSize.small }: BadgeProps) {
  const safeScale = Math.max(stageScale, 0.01);
  const fontSize = fontPx / safeScale;
  const common = {
    x: 0,
    y: fontSize * 0.34,
    fontFamily: Fonts.headingBold,
    fontSize,
    fontWeight: '700' as const,
    textAnchor: 'middle' as const,
  };

  return (
    <G transform={`translate(${x} ${y}) rotate(${getReadableRotation(rotation)})`}>
      <SvgText {...common} fill={color} stroke='rgba(255,255,255,0.95)' strokeWidth={2.2 / safeScale} strokeLinejoin='round'>{text}</SvgText>
      <SvgText {...common} fill={color}>{text}</SvgText>
    </G>
  );
}

function SvgDiagonalBadge({ x, y, text, stageScale, color }: Omit<BadgeProps, 'rotation'>) {
  const safeScale = Math.max(stageScale, 0.01);
  const fontSize = UI_CONFIG.fontSize.small / safeScale;
  const padding = UI_CONFIG.padding.small / safeScale;
  const width = text.length * fontSize * 0.6 + padding * 2;
  const height = fontSize + padding * 2;
  return (
    <G transform={`translate(${x} ${y})`} opacity={0.8}>
      <Rect x={-width / 2} y={-height / 2} width={width} height={height} rx={UI_CONFIG.padding.small / safeScale} fill='#ffffff' stroke={color} strokeWidth={1 / safeScale} />
      <SvgText x={0} y={fontSize * 0.34} fill={color} fontFamily={Fonts.headingBold} fontWeight='700' fontSize={fontSize} textAnchor='middle'>{text}</SvgText>
    </G>
  );
}

type NativeMagnifierProps = {
  initial: Transform;
  image: NonNullable<ReturnType<typeof useMapStore.getState>['mapImage']>;
  viewport: Size;
  fitScale: number;
  mode: ReturnType<typeof useMapStore.getState>['mode'];
  plots: ReturnType<typeof useMapStore.getState>['plots'];
  plotPoints: Point[];
  calibrationPoints: Point[];
  scale: number | null;
  isShowDiagonals: boolean;
};

const NativeMagnifier = forwardRef<MagnifierHandle, NativeMagnifierProps>(function NativeMagnifier(
  { initial, image, viewport, fitScale, mode, plots, plotPoints, calibrationPoints, scale, isShowDiagonals },
  ref,
) {
  const [transform, setTransform] = useState(initial);
  useImperativeHandle(ref, () => ({ update: setTransform }), []);
  const radius = 55;
  const lens = { x: viewport.width - radius - 16, y: radius + 16 };
  const zoom = 2.5;
  const centerCanvas = {
    x: (viewport.width / 2 - transform.pos.x) / Math.max(transform.scale, 0.001),
    y: (viewport.height / 2 - transform.pos.y) / Math.max(transform.scale, 0.001),
  };
  const magnifiedScale = transform.scale * zoom;
  const magnifiedPos = { x: lens.x - centerCanvas.x * magnifiedScale, y: lens.y - centerCanvas.y * magnifiedScale };
  const tilePos = { x: radius - centerCanvas.x * magnifiedScale, y: radius - centerCanvas.y * magnifiedScale };
  let liveTarget = getSnappedPoint(centerCanvas, plots.map((plot) => plot.points), 10 / Math.max(transform.scale, 0.01));
  if (mode === 'drawing_plot' && plotPoints.length >= 3 && distance(liveTarget, plotPoints[0]) <= 20 / Math.max(transform.scale, 0.01)) {
    liveTarget = plotPoints[0];
  }
  if (mode === 'drawing_plot' && plotPoints.length > 0) {
    const containing = getDirectionalContainingPlot(plots, plotPoints[0], plotPoints.length >= 2 ? plotPoints[1] : liveTarget, transform.scale);
    if (containing) liveTarget = clipLineToPolygon(plotPoints[plotPoints.length - 1], liveTarget, containing.points);
  }
  const liveStart = mode === 'drawing_plot' ? plotPoints.at(-1) : undefined;
  const liveDistance = liveStart ? distance(liveStart, liveTarget) : 0;
  const liveLabel = liveStart && scale && liveDistance * transform.scale >= 34
    ? { point: midpoint(liveStart, liveTarget), text: formatFeetInches(liveDistance / scale), rotation: Math.atan2(liveTarget.y - liveStart.y, liveTarget.x - liveStart.x) * 180 / Math.PI }
    : null;

  return (
    <G pointerEvents='none'>
      <Defs><ClipPath id='map-magnifier-clip'><Circle cx={lens.x} cy={lens.y} r={radius} /></ClipPath></Defs>
      <Circle cx={lens.x} cy={lens.y} r={radius + 2} fill='#f8fafc' />
      <G clipPath='url(#map-magnifier-clip)'>
        <G transform={`translate(${magnifiedPos.x} ${magnifiedPos.y}) scale(${magnifiedScale})`}>
          <NativeTiledMap image={image} viewport={{ width: radius * 2, height: radius * 2 }} stageScale={magnifiedScale} stagePos={tilePos} fitScale={fitScale} />
          {plots.map((plot) => {
            const color = plot.color ?? '#0f766e';
            const area = getPolygonAreaLabelLayout(plot.points);
            return <G key={`mag-${plot.id}`}>
              <Polygon points={pointString(plot.points)} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={UI_CONFIG.strokeWidth.xxthick / transform.scale} />
              {getPlotEdgeLabels(plot, scale, transform.scale).map((edge) => <SvgOutlinedText key={`mag-${edge.id}`} x={edge.x} y={edge.y} text={edge.text} stageScale={transform.scale} color={edge.color} rotation={edge.rotation} fontPx={edge.fontPx} />)}
              {isShowDiagonals && (plot.results.diagonals ?? []).map((diagonal, index) => {
                const start = plot.points[diagonal.p1Index];
                const end = plot.points[diagonal.p2Index];
                if (!start || !end || distance(start, end) <= MIN_DIAGONAL_DRAW_PX / transform.scale) return null;
                return <Line key={`mag-diag-${index}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={1 / transform.scale} strokeDasharray={`${6 / transform.scale},${6 / transform.scale}`} opacity={0.4} />;
              })}
              <SvgBadge x={area.center.x} y={area.center.y} text={`${toBengaliDigits(plot.results.shotok.toFixed(2))} শতক`} stageScale={transform.scale} color={color} rotation={area.rotation} compact />
            </G>;
          })}
          {mode === 'drawing_plot' && plotPoints.length > 0 && <G>
            {plotPoints.length >= 2 && <Polyline points={pointString(plotPoints)} fill='none' stroke={UI_CONFIG.colors.drawPrimary} strokeWidth={UI_CONFIG.strokeWidth.xxthick / transform.scale} />}
            {getActivePlotDots(plotPoints).map(({ point, index, isCorner }) => isCorner ? <Circle key={`mag-point-${index}`} cx={point.x} cy={point.y} r={5 / transform.scale} fill='#3182CE' stroke='#fff' strokeWidth={1.5 / transform.scale} /> : null)}
            {getActiveSegmentLabels(plotPoints, scale, transform.scale).map((edge) => <SvgOutlinedText key={`mag-${edge.id}`} x={edge.x} y={edge.y} text={edge.text} stageScale={transform.scale} color={edge.color} rotation={edge.rotation} fontPx={edge.fontPx} />)}
            <Line x1={plotPoints.at(-1)!.x} y1={plotPoints.at(-1)!.y} x2={liveTarget.x} y2={liveTarget.y} stroke={UI_CONFIG.colors.drawPrimary} strokeWidth={UI_CONFIG.strokeWidth.xxthick / transform.scale} strokeDasharray={`${8 / transform.scale},${6 / transform.scale}`} opacity={0.8} />
            {liveLabel && <SvgOutlinedText x={liveLabel.point.x} y={liveLabel.point.y} text={liveLabel.text} stageScale={transform.scale} color={UI_CONFIG.colors.drawPrimary} rotation={liveLabel.rotation} />}
          </G>}
          {mode === 'calibrating' && <G>
            {calibrationPoints.length === 2 && <Line x1={calibrationPoints[0].x} y1={calibrationPoints[0].y} x2={calibrationPoints[1].x} y2={calibrationPoints[1].y} stroke={UI_CONFIG.colors.drawPrimary} strokeWidth={3 / transform.scale} />}
            {calibrationPoints.length === 1 && <Line x1={calibrationPoints[0].x} y1={calibrationPoints[0].y} x2={centerCanvas.x} y2={centerCanvas.y} stroke={UI_CONFIG.colors.drawPrimary} strokeWidth={2 / transform.scale} strokeDasharray={`${5 / transform.scale},${5 / transform.scale}`} opacity={0.7} />}
            {calibrationPoints.map((point, index) => <Circle key={`mag-cal-${index}`} cx={point.x} cy={point.y} r={5 / transform.scale} fill={UI_CONFIG.colors.drawPrimary} stroke='#fff' strokeWidth={1 / transform.scale} />)}
          </G>}
        </G>
      </G>
      <Circle cx={lens.x} cy={lens.y} r={radius} fill='none' stroke='rgba(15,23,42,0.72)' strokeWidth={3} />
      <Line x1={lens.x - 10} y1={lens.y} x2={lens.x + 10} y2={lens.y} stroke='#ef4444' strokeWidth={2} />
      <Line x1={lens.x} y1={lens.y - 10} x2={lens.x} y2={lens.y + 10} stroke='#ef4444' strokeWidth={2} />
    </G>
  );
});

export function MobileMapCanvas() {
  const state = useMapStore();
  const {
    mapImage, mode, scale, plotPoints, plots, calibrationLine, stageScale, stagePos,
    isShowDiagonals, isMagnifierEnabled, manualDividePlotId, manualCutLine,
  } = state;
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const contentGroupRef = useRef<React.ElementRef<typeof G> | null>(null);
  const liveOverlayRef = useRef<LiveOverlayHandle | null>(null);
  const magnifierRef = useRef<MagnifierHandle | null>(null);
  const liveRafRef = useRef<number | null>(null);
  const pendingLiveTransformRef = useRef<Transform | null>(null);
  const fitScaleRef = useRef(1);
  const transformRef = useRef({ scale: stageScale, pos: stagePos });
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const didPinchRef = useRef(false);
  const pointGestureLatchRef = useRef(false);
  const draggingAnchorRef = useRef<number | null>(null);
  const manualDragRafRef = useRef<number | null>(null);
  const pendingManualDragRef = useRef<{ index: number; point: Point } | null>(null);
  const pinchRef = useRef<null | { distance: number; scale: number; pos: Point; center: Point }>(null);

  useEffect(() => { transformRef.current = { scale: stageScale, pos: stagePos }; }, [stagePos, stageScale]);

  const contentSize = useMemo<Size>(() => ({
    width: Math.max(1, mapImage?.width ?? 1200),
    height: Math.max(1, mapImage?.height ?? 900),
  }), [mapImage?.height, mapImage?.width]);

  const getLiveOverlay = useCallback((transform: Transform): LiveOverlayData => {
    const current = useMapStore.getState();
    const raw = {
      x: (viewport.width / 2 - transform.pos.x) / Math.max(transform.scale, 0.001),
      y: (viewport.height / 2 - transform.pos.y) / Math.max(transform.scale, 0.001),
    };
    let target = getSnappedPoint(raw, current.plots.map((plot) => plot.points), 10 / Math.max(transform.scale, 0.01));
    if (current.mode === 'drawing_plot' && current.plotPoints.length >= 3 && distance(target, current.plotPoints[0]) <= 20 / Math.max(transform.scale, 0.01)) {
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

    const calibrationPoints: Point[] = [];
    for (let index = 0; index < current.calibrationLine.length; index += 2) {
      calibrationPoints.push({ x: current.calibrationLine[index], y: current.calibrationLine[index + 1] });
    }
    const startCanvas = current.mode === 'drawing_plot'
      ? current.plotPoints[current.plotPoints.length - 1] ?? null
      : current.mode === 'calibrating'
        ? calibrationPoints[0] ?? null
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
    liveOverlayRef.current?.update({
      start: null,
      end: { x: 0, y: 0 },
      label: null,
      color: UI_CONFIG.colors.drawPrimary,
      snapped: false,
    });
  }, []);

  const scheduleLiveOverlay = useCallback((transform: Transform) => {
    const snapshot = useMapStore.getState();
    const measurementActive = snapshot.mode === 'drawing_plot' || snapshot.mode === 'calibrating';
    if (!measurementActive) {
      clearLiveOverlay();
      return;
    }

    pendingLiveTransformRef.current = transform;
    if (liveRafRef.current !== null) return;
    liveRafRef.current = requestAnimationFrame(() => {
      liveRafRef.current = null;
      const pending = pendingLiveTransformRef.current;
      if (!pending) return;

      const current = useMapStore.getState();
      const active = current.mode === 'drawing_plot' || current.mode === 'calibrating';
      if (!active) {
        clearLiveOverlay();
        return;
      }
      liveOverlayRef.current?.update(getLiveOverlay(pending));
      if (current.isMagnifierEnabled) magnifierRef.current?.update(pending);
    });
  }, [clearLiveOverlay, getLiveOverlay]);

  useEffect(() => () => {
    if (liveRafRef.current !== null) cancelAnimationFrame(liveRafRef.current);
    if (manualDragRafRef.current !== null) cancelAnimationFrame(manualDragRafRef.current);
  }, []);

  const scheduleManualAnchorMove = useCallback((index: number, point: Point) => {
    pendingManualDragRef.current = { index, point };
    if (manualDragRafRef.current !== null) return;
    manualDragRafRef.current = requestAnimationFrame(() => {
      manualDragRafRef.current = null;
      const pending = pendingManualDragRef.current;
      pendingManualDragRef.current = null;
      if (pending) useMapStore.getState().moveManualCutAnchor(pending.index, pending.point);
    });
  }, []);

  const applyNativeTransform = useCallback((next: { scale: number; pos: Point }) => {
    transformRef.current = next;
    contentGroupRef.current?.setNativeProps({
      matrix: [next.scale, 0, 0, next.scale, next.pos.x, next.pos.y],
    });
    scheduleLiveOverlay(next);
  }, [scheduleLiveOverlay]);

  const commitTransform = useCallback((next: { scale: number; pos: Point }) => {
    applyNativeTransform(next);
    useMapStore.getState().setStageTransform(next);
  }, [applyNativeTransform]);

  const resetView = useCallback(() => {
    if (!viewport.width || !viewport.height) return;
    const fitScale = Math.min(viewport.width / contentSize.width, viewport.height / contentSize.height);
    fitScaleRef.current = fitScale;
    commitTransform({
      scale: fitScale,
      pos: {
        x: (viewport.width - contentSize.width * fitScale) / 2,
        y: (viewport.height - contentSize.height * fitScale) / 2,
      },
    });
  }, [commitTransform, contentSize.height, contentSize.width, viewport.height, viewport.width]);

  useEffect(() => { resetView(); }, [mapImage?.uri, resetView]);

  const screenToCanvas = useCallback((point: Point): Point => {
    const current = transformRef.current;
    return { x: (point.x - current.pos.x) / current.scale, y: (point.y - current.pos.y) / current.scale };
  }, []);

  const zoomAround = useCallback((factor: number, focal?: Point) => {
    const current = transformRef.current;
    const center = focal ?? { x: viewport.width / 2, y: viewport.height / 2 };
    const nextScale = Math.max(STAGE_MIN_ZOOM, Math.min(STAGE_MAX_ZOOM, current.scale * factor));
    const ratio = nextScale / current.scale;
    commitTransform({
      scale: nextScale,
      pos: {
        x: center.x - (center.x - current.pos.x) * ratio,
        y: center.y - (center.y - current.pos.y) * ratio,
      },
    });
  }, [commitTransform, viewport.height, viewport.width]);

  const findAnchor = useCallback((screen: Point) => {
    const current = useMapStore.getState();
    if (current.mode !== 'manual_divide_plot' || !current.manualCutLine) return null;
    const canvas = screenToCanvas(screen);
    const threshold = 24 / transformRef.current.scale;
    let found: number | null = null;
    let closest = threshold;
    current.manualCutLine.forEach((point, index) => {
      const value = distance(canvas, point);
      if (value <= closest) { closest = value; found = index; }
    });
    return found;
  }, [screenToCanvas]);

  const tryAddPointFromToolbarTouch = useCallback((touches: readonly { locationX: number; locationY: number }[]) => {
    if (touches.length < 2 || viewport.width <= 0 || viewport.height <= 0) {
      pointGestureLatchRef.current = false;
      return false;
    }

    const current = useMapStore.getState();
    if (current.mode !== 'drawing_plot' && current.mode !== 'calibrating') return false;

    const toolbarTouch = touches.find((touch) => {
      if (touch.locationY < viewport.height - 96) return false;
      const xRatio = touch.locationX / viewport.width;
      return current.mode === 'drawing_plot'
        ? xRatio >= 0.55 && xRatio <= 0.84
        : xRatio >= 0.74;
    });
    if (!toolbarTouch) return false;

    if (!pointGestureLatchRef.current) {
      pointGestureLatchRef.current = true;
      current.addPointAt(screenToCanvas({ x: viewport.width / 2, y: viewport.height / 2 }));
      scheduleLiveOverlay(transformRef.current);
    }
    return true;
  }, [scheduleLiveOverlay, screenToCanvas, viewport.height, viewport.width]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => true,
    onPanResponderGrant: (event) => {
      const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      panStartRef.current = { ...transformRef.current.pos };
      draggingAnchorRef.current = findAnchor(point);
      didPinchRef.current = false;
      pointGestureLatchRef.current = false;
      pinchRef.current = null;
    },
    onPanResponderMove: (event, gesture) => {
      const touches = event.nativeEvent.touches;
      if (touches.length < 2) pointGestureLatchRef.current = false;
      if (tryAddPointFromToolbarTouch(touches)) return;

      if (touches.length >= 2) {
        draggingAnchorRef.current = null;
        const first = touches[0];
        const second = touches[1];
        const nextDistance = Math.hypot(second.locationX - first.locationX, second.locationY - first.locationY);
        const center = midpoint({ x: first.locationX, y: first.locationY }, { x: second.locationX, y: second.locationY });
        if (!pinchRef.current) {
          pinchRef.current = { distance: Math.max(nextDistance, 1), scale: transformRef.current.scale, pos: { ...transformRef.current.pos }, center };
          didPinchRef.current = true;
          return;
        }
        const initial = pinchRef.current;
        const nextScale = Math.max(STAGE_MIN_ZOOM, Math.min(STAGE_MAX_ZOOM, initial.scale * nextDistance / initial.distance));
        const ratio = nextScale / initial.scale;
        applyNativeTransform({ scale: nextScale, pos: { x: center.x - (initial.center.x - initial.pos.x) * ratio, y: center.y - (initial.center.y - initial.pos.y) * ratio } });
        return;
      }
      if (didPinchRef.current) return;
      if (draggingAnchorRef.current !== null) {
        scheduleManualAnchorMove(draggingAnchorRef.current, screenToCanvas({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }));
        return;
      }
      applyNativeTransform({ scale: transformRef.current.scale, pos: { x: panStartRef.current.x + gesture.dx, y: panStartRef.current.y + gesture.dy } });
    },
    onPanResponderRelease: (event, gesture) => {
      pointGestureLatchRef.current = false;
      const wasDragging = draggingAnchorRef.current !== null;
      if (draggingAnchorRef.current !== null) {
        if (manualDragRafRef.current !== null) cancelAnimationFrame(manualDragRafRef.current);
        manualDragRafRef.current = null;
        pendingManualDragRef.current = null;
        useMapStore.getState().moveManualCutAnchor(
          draggingAnchorRef.current,
          screenToCanvas({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }),
        );
      }
      draggingAnchorRef.current = null;
      pinchRef.current = null;
      if (didPinchRef.current || Math.hypot(gesture.dx, gesture.dy) > 8) {
        commitTransform(transformRef.current);
        return;
      }
      if (wasDragging) return;
      const current = useMapStore.getState();
      if (current.mode === 'manual_divide_plot' && !current.manualDividePlotId) {
        current.selectPlotForDivide(screenToCanvas({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }));
      }
    },
    onPanResponderTerminate: () => {
      pointGestureLatchRef.current = false;
      draggingAnchorRef.current = null;
      pinchRef.current = null;
      commitTransform(transformRef.current);
    },
    onShouldBlockNativeResponder: () => false,
  }), [applyNativeTransform, commitTransform, findAnchor, scheduleManualAnchorMove, screenToCanvas, tryAddPointFromToolbarTouch]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
    useMapStore.getState().setStageSize({ width, height });
  };

  const selectedPlot = plots.find((plot) => plot.id === manualDividePlotId) ?? null;
  const splitPreview = useMemo(() => {
    if (!selectedPlot || !manualCutLine || !scale) return null;
    const split = splitPolygonByPolyline(selectedPlot.points, manualCutLine);
    if (!split) return null;
    return { ...split, resultA: calculatePolygonData(split.poly1, scale), resultB: calculatePolygonData(split.poly2, scale) };
  }, [manualCutLine, scale, selectedPlot]);

  const calibrationPoints = useMemo(() => {
    const points: Point[] = [];
    for (let index = 0; index < calibrationLine.length; index += 2) points.push({ x: calibrationLine[index], y: calibrationLine[index + 1] });
    return points;
  }, [calibrationLine]);

  useEffect(() => {
    scheduleLiveOverlay({ scale: stageScale, pos: stagePos });
  }, [calibrationLine, mode, plotPoints, plots, scale, scheduleLiveOverlay, stagePos, stageScale]);

  const instruction = mode === 'calibrating'
    ? calibrationPoints.length === 0 ? 'ক্রসহেয়ার স্কেল বারের শুরুতে আনুন' : 'ক্রসহেয়ার স্কেল বারের শেষে আনুন'
    : mode === 'drawing_plot'
      ? plotPoints.length < 3 ? `ক্রসহেয়ার কোণায় এনে পয়েন্ট যোগ করুন (${plotPoints.length}/৩)` : 'আরও পয়েন্ট দিন অথবা শেষ করুন'
      : mode === 'manual_divide_plot'
        ? selectedPlot ? 'লাল পয়েন্ট টেনে কাটিং লাইন ঠিক করুন' : 'যে প্লট ভাগ করবেন সেটিতে ট্যাপ করুন'
        : mapImage ? 'এক আঙুলে প্যান • দুই আঙুলে জুম' : 'শুরু করতে মৌজা ম্যাপ যোগ করুন';

  return (
    <View style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
      {viewport.width > 0 && viewport.height > 0 && (
        <Svg width={viewport.width} height={viewport.height}>
          <Rect width={viewport.width} height={viewport.height} fill='#090d16' />
          <G ref={contentGroupRef} transform={`translate(${stagePos.x} ${stagePos.y}) scale(${stageScale})`}>
            {mapImage && (
              <NativeTiledMap
                image={mapImage}
                viewport={viewport}
                stageScale={stageScale}
                stagePos={stagePos}
                fitScale={fitScaleRef.current}
              />
            )}

            {plots.map((plot) => {
              const hiddenForPreview = Boolean(splitPreview && plot.id === selectedPlot?.id);
              const label = getPolygonAreaLabelLayout(plot.points);
              const edgeLabels = getPlotEdgeLabels(plot, scale, stageScale);
              return (
                <G key={plot.id} opacity={hiddenForPreview ? 0.2 : 1}>
                  <Polygon points={pointString(plot.points)} fill={plot.color ?? '#0f766e'} fillOpacity={manualDividePlotId === plot.id ? 0.18 : 0.1} stroke={plot.color ?? '#0f766e'} strokeWidth={2.5 / stageScale} />
                  {edgeLabels.map((edge) => <SvgOutlinedText key={edge.id} x={edge.x} y={edge.y} text={edge.text} stageScale={stageScale} color={edge.color} rotation={edge.rotation} fontPx={edge.fontPx} />)}
                  {isShowDiagonals && plot.results.diagonals?.map((diagonal, index) => {
                    const start = plot.points[diagonal.p1Index];
                    const end = plot.points[diagonal.p2Index];
                    if (!start || !end) return null;
                    if (distance(start, end) <= MIN_DIAGONAL_DRAW_PX / stageScale) return null;
                    const mid = midpoint(start, end);
                    const text = diagonal.lengthFt >= MIN_EDGE_LABEL_FT ? formatFeetInches(diagonal.lengthFt) : '';
                    const color = plot.color ?? '#0f766e';
                    return <G key={`${plot.id}-diag-${index}`}><Line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={1 / stageScale} strokeDasharray={`${6 / stageScale},${6 / stageScale}`} opacity={0.4} />{text ? <SvgDiagonalBadge x={mid.x} y={mid.y} text={text} stageScale={stageScale} color={color} /> : null}</G>;
                  })}
                  {mode !== 'manual_divide_plot' && <SvgBadge x={label.center.x} y={label.center.y} text={`${toBengaliDigits(plot.results.shotok.toFixed(2))} শতক`} stageScale={stageScale} color={plot.color ?? '#0f766e'} rotation={label.rotation} compact />}
                </G>
              );
            })}

            {splitPreview && selectedPlot && (
              <G>
                <Polygon points={pointString(splitPreview.poly1)} fill={selectedPlot.color ?? '#0F766E'} fillOpacity={0.3} stroke={selectedPlot.color ?? '#0F766E'} strokeWidth={2 / stageScale} />
                <Polygon points={pointString(splitPreview.poly2)} fill='#0284C7' fillOpacity={0.3} stroke='#0284C7' strokeWidth={2 / stageScale} />
                {[{ points: splitPreview.poly1, value: splitPreview.resultA?.shotok }, { points: splitPreview.poly2, value: splitPreview.resultB?.shotok }].map((part, index) => {
                  const label = getPolygonAreaLabelLayout(part.points);
                  return part.value ? <SvgBadge key={`split-label-${index}`} x={label.center.x} y={label.center.y} text={`${part.value.toFixed(2)} শতক`} stageScale={stageScale} color={index === 0 ? selectedPlot.color ?? '#0F766E' : '#0284C7'} rotation={label.rotation} compact /> : null;
                })}
              </G>
            )}

            {plotPoints.length > 0 && mode === 'drawing_plot' && (
              <G>
                {plotPoints.length >= 2 && <Polyline points={pointString(plotPoints)} fill='none' stroke='#2563eb' strokeWidth={3 / stageScale} />}
                {getActivePlotDots(plotPoints).map(({ point, index, isCorner }) => isCorner ? <Circle key={`point-${index}`} cx={point.x} cy={point.y} r={5 / stageScale} fill='#3182CE' stroke='#ffffff' strokeWidth={1.5 / stageScale} /> : null)}
                {getActiveSegmentLabels(plotPoints, scale, stageScale).map((edge) => <SvgOutlinedText key={edge.id} x={edge.x} y={edge.y} text={edge.text} stageScale={stageScale} color={edge.color} rotation={edge.rotation} fontPx={edge.fontPx} />)}
              </G>
            )}

            {mode === 'calibrating' && (
              <G>
                {calibrationPoints.length === 2 && <Line x1={calibrationPoints[0].x} y1={calibrationPoints[0].y} x2={calibrationPoints[1].x} y2={calibrationPoints[1].y} stroke={UI_CONFIG.colors.drawPrimary} strokeWidth={3 / stageScale} />}
                {calibrationPoints.map((point, index) => <Circle key={`cal-${index}`} cx={point.x} cy={point.y} r={5 / stageScale} fill={UI_CONFIG.colors.drawPrimary} stroke='#fff' strokeWidth={1 / stageScale} />)}
              </G>
            )}

            {manualCutLine && selectedPlot && <G>
              <Defs><ClipPath id='manual-cut-clip'><Polygon points={pointString(selectedPlot.points)} /></ClipPath></Defs>
              <G clipPath='url(#manual-cut-clip)'><Polyline points={pointString(manualCutLine)} fill='none' stroke='#DC2626' strokeWidth={2 / stageScale} strokeDasharray={`${8 / stageScale},${8 / stageScale}`} /></G>
              {manualCutLine.map((point, index) => <Circle key={`cut-${index}`} cx={point.x} cy={point.y} r={8 / stageScale} fill='#DC2626' stroke='#FFFFFF' strokeWidth={2 / stageScale} />)}
            </G>}
          </G>

          <LiveMeasurementOverlay ref={liveOverlayRef} initial={getLiveOverlay({ scale: stageScale, pos: stagePos })} />
          {mapImage && isMagnifierEnabled && viewport.width > 0 && (mode === 'drawing_plot' || mode === 'calibrating') && <NativeMagnifier ref={magnifierRef} initial={{ scale: stageScale, pos: stagePos }} image={mapImage} viewport={viewport} fitScale={fitScaleRef.current} mode={mode} plots={plots} plotPoints={plotPoints} calibrationPoints={calibrationPoints} scale={scale} isShowDiagonals={isShowDiagonals} />}

          {(mode === 'drawing_plot' || mode === 'calibrating') && (
            <G>
              <Line x1={viewport.width / 2 - 13} y1={viewport.height / 2} x2={viewport.width / 2 - 3} y2={viewport.height / 2} stroke='#ffffff' strokeWidth={3.5} strokeOpacity={0.8} />
              <Line x1={viewport.width / 2 + 3} y1={viewport.height / 2} x2={viewport.width / 2 + 13} y2={viewport.height / 2} stroke='#ffffff' strokeWidth={3.5} strokeOpacity={0.8} />
              <Line x1={viewport.width / 2} y1={viewport.height / 2 - 13} x2={viewport.width / 2} y2={viewport.height / 2 - 3} stroke='#ffffff' strokeWidth={3.5} strokeOpacity={0.8} />
              <Line x1={viewport.width / 2} y1={viewport.height / 2 + 3} x2={viewport.width / 2} y2={viewport.height / 2 + 13} stroke='#ffffff' strokeWidth={3.5} strokeOpacity={0.8} />
              <Line x1={viewport.width / 2 - 13} y1={viewport.height / 2} x2={viewport.width / 2 - 3} y2={viewport.height / 2} stroke='#ef4444' strokeWidth={1.5} />
              <Line x1={viewport.width / 2 + 3} y1={viewport.height / 2} x2={viewport.width / 2 + 13} y2={viewport.height / 2} stroke='#ef4444' strokeWidth={1.5} />
              <Line x1={viewport.width / 2} y1={viewport.height / 2 - 13} x2={viewport.width / 2} y2={viewport.height / 2 - 3} stroke='#ef4444' strokeWidth={1.5} />
              <Line x1={viewport.width / 2} y1={viewport.height / 2 + 3} x2={viewport.width / 2} y2={viewport.height / 2 + 13} stroke='#ef4444' strokeWidth={1.5} />
              <Circle cx={viewport.width / 2} cy={viewport.height / 2} r={2} fill='#ef4444' />
            </G>
          )}
        </Svg>
      )}

      {!mapImage && <View pointerEvents='none' style={styles.emptyState}><Text style={styles.emptyTitle}>মৌজা ম্যাপ যোগ করুন</Text><Text style={styles.emptyText}>স্কেল ও জমির সীমানা মাপতে ম্যাপের ছবি প্রয়োজন</Text></View>}
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
