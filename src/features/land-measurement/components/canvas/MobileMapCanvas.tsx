import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { LocateFixed, Minus, Plus } from 'lucide-react-native';
import { useMapStore } from '../../store/useMapStore';
import { calculatePolygonData } from '../../utils/calculations';
import { clipLineToPolygon, getSnappedPoint, groupPolygonSegments } from '../../utils/geometry';
import { getDirectionalContainingPlot } from '../../utils/directionalPlot';
import { splitPolygonByPolyline } from '../../utils/polygonDivision';
import { formatFeetInches } from '../../utils/canvas';
import { getPolygonAreaLabelLayout } from '../../utils/polygon-label';
import { getReadableRotation } from '../../utils/component-helpers';
import type { Point } from '../../types/map';
import { toBengaliDigits } from '../../../../lib/utils';
import { Fonts } from '../../../../constants/typography';
import { NativeTiledMap } from './NativeTiledMap';

type Size = { width: number; height: number };

const pointString = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ');
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

type Transform = { scale: number; pos: Point };
type LiveOverlayData = {
  start: Point | null;
  end: Point;
  lengthText: string | null;
  color: string;
  snapped: boolean;
};
type LiveOverlayHandle = { update: (value: LiveOverlayData) => void };

const LiveMeasurementOverlay = forwardRef<LiveOverlayHandle, { initial: LiveOverlayData }>(function LiveMeasurementOverlay({ initial }, ref) {
  const [data, setData] = useState(initial);
  useImperativeHandle(ref, () => ({ update: setData }), []);
  if (!data.start) return null;

  const mid = midpoint(data.start, data.end);
  const angle = Math.atan2(data.end.y - data.start.y, data.end.x - data.start.x) * 180 / Math.PI;
  return (
    <G pointerEvents='none'>
      <Line x1={data.start.x} y1={data.start.y} x2={data.end.x} y2={data.end.y} stroke={data.color} strokeWidth={2.5} strokeDasharray='8,5' />
      {data.lengthText && <SvgOutlinedText x={mid.x} y={mid.y} text={data.lengthText} stageScale={1} color={data.color} rotation={angle} />}
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
};

function SvgBadge({ x, y, text, stageScale, color, rotation = 0, compact = false }: BadgeProps) {
  const safeScale = Math.max(stageScale, 0.01);
  const fontSize = (compact ? 10 : 11.5) / safeScale;
  const height = (compact ? 19 : 23) / safeScale;
  const screenWidth = Math.max(compact ? 42 : 58, text.length * (compact ? 5.7 : 6.6) + 14);
  const width = screenWidth / safeScale;

  return (
    <G transform={`translate(${x} ${y}) rotate(${getReadableRotation(rotation)})`}>
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={5 / safeScale}
        fill={color}
        fillOpacity={0.94}
        stroke='#ffffff'
        strokeOpacity={0.22}
        strokeWidth={0.8 / safeScale}
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

function SvgOutlinedText({ x, y, text, stageScale, color, rotation = 0 }: BadgeProps) {
  const safeScale = Math.max(stageScale, 0.01);
  const fontSize = 11.5 / safeScale;
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
      <SvgText {...common} fill={color} stroke={color} strokeWidth={3.6 / safeScale} strokeLinejoin='round'>{text}</SvgText>
      <SvgText {...common} fill='#ffffff'>{text}</SvgText>
    </G>
  );
}

export function MobileMapCanvas() {
  const state = useMapStore();
  const {
    mapImage, mode, scale, plotPoints, plots, calibrationLine, stageScale, stagePos,
    isShowDiagonals, isMagnifierEnabled, manualDividePlotId, manualCutLine,
  } = state;
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const contentGroupRef = useRef<React.ElementRef<typeof G> | null>(null);
  const liveOverlayRef = useRef<LiveOverlayHandle | null>(null);
  const liveRafRef = useRef<number | null>(null);
  const pendingLiveTransformRef = useRef<Transform | null>(null);
  const fitScaleRef = useRef(1);
  const transformRef = useRef({ scale: stageScale, pos: stagePos });
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const didPinchRef = useRef(false);
  const draggingAnchorRef = useRef<number | null>(null);
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
    return {
      start: startCanvas ? toScreen(startCanvas) : null,
      end: toScreen(target),
      lengthText: current.mode === 'drawing_plot' && lengthFt >= 1 ? formatFeetInches(lengthFt) : null,
      color: current.mode === 'calibrating' ? '#f59e0b' : '#2563eb',
      snapped: distance(raw, target) * transform.scale > 2,
    };
  }, [viewport.height, viewport.width]);

  const scheduleLiveOverlay = useCallback((transform: Transform) => {
    pendingLiveTransformRef.current = transform;
    if (liveRafRef.current !== null) return;
    liveRafRef.current = requestAnimationFrame(() => {
      liveRafRef.current = null;
      const pending = pendingLiveTransformRef.current;
      if (pending) liveOverlayRef.current?.update(getLiveOverlay(pending));
    });
  }, [getLiveOverlay]);

  useEffect(() => () => {
    if (liveRafRef.current !== null) cancelAnimationFrame(liveRafRef.current);
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
    const min = Math.max(fitScaleRef.current * 0.5, 0.02);
    const nextScale = Math.max(min, Math.min(fitScaleRef.current * 12, current.scale * factor));
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

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      panStartRef.current = { ...transformRef.current.pos };
      draggingAnchorRef.current = findAnchor(point);
      didPinchRef.current = false;
      pinchRef.current = null;
    },
    onPanResponderMove: (event, gesture) => {
      const touches = event.nativeEvent.touches;
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
        const min = Math.max(fitScaleRef.current * 0.5, 0.02);
        const nextScale = Math.max(min, Math.min(fitScaleRef.current * 12, initial.scale * nextDistance / initial.distance));
        const ratio = nextScale / initial.scale;
        applyNativeTransform({ scale: nextScale, pos: { x: center.x - (initial.center.x - initial.pos.x) * ratio, y: center.y - (initial.center.y - initial.pos.y) * ratio } });
        return;
      }
      if (didPinchRef.current) return;
      if (draggingAnchorRef.current !== null) {
        useMapStore.getState().moveManualCutAnchor(draggingAnchorRef.current, screenToCanvas({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }));
        return;
      }
      applyNativeTransform({ scale: transformRef.current.scale, pos: { x: panStartRef.current.x + gesture.dx, y: panStartRef.current.y + gesture.dy } });
    },
    onPanResponderRelease: (event, gesture) => {
      const wasDragging = draggingAnchorRef.current !== null;
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
      draggingAnchorRef.current = null;
      pinchRef.current = null;
      commitTransform(transformRef.current);
    },
  }), [applyNativeTransform, commitTransform, findAnchor, screenToCanvas]);

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

  const magnifier = useMemo(() => {
    if (!mapImage || !isMagnifierEnabled || !viewport.width || (mode !== 'drawing_plot' && mode !== 'calibrating')) return null;
    const radius = 55;
    const lens = { x: viewport.width - radius - 14, y: radius + 66 };
    const zoom = 2.5;
    const centerCanvas = {
      x: (viewport.width / 2 - stagePos.x) / Math.max(stageScale, 0.001),
      y: (viewport.height / 2 - stagePos.y) / Math.max(stageScale, 0.001),
    };
    const magScale = stageScale * zoom;
    const magPos = { x: lens.x - centerCanvas.x * magScale, y: lens.y - centerCanvas.y * magScale };
    const tilePos = { x: radius - centerCanvas.x * magScale, y: radius - centerCanvas.y * magScale };

    return (
      <G pointerEvents='none'>
        <Defs><ClipPath id='map-magnifier-clip'><Circle cx={lens.x} cy={lens.y} r={radius} /></ClipPath></Defs>
        <Circle cx={lens.x} cy={lens.y} r={radius + 2} fill='#f8fafc' />
        <G clipPath='url(#map-magnifier-clip)'>
          <G transform={`translate(${magPos.x} ${magPos.y}) scale(${magScale})`}>
            <NativeTiledMap
              image={mapImage}
              viewport={{ width: radius * 2, height: radius * 2 }}
              stageScale={magScale}
              stagePos={tilePos}
              fitScale={fitScaleRef.current}
            />
            {plots.map((plot) => <Polygon key={`mag-${plot.id}`} points={pointString(plot.points)} fill={plot.color ?? '#0f766e'} fillOpacity={0.18} stroke={plot.color ?? '#0f766e'} strokeWidth={2 / magScale} />)}
            {mode === 'drawing_plot' && plotPoints.length >= 2 && <Polyline points={pointString(plotPoints)} fill='none' stroke='#2563eb' strokeWidth={2.5 / magScale} />}
          </G>
        </G>
        <Circle cx={lens.x} cy={lens.y} r={radius} fill='none' stroke='rgba(15,23,42,0.72)' strokeWidth={3} />
        <Line x1={lens.x - 10} y1={lens.y} x2={lens.x + 10} y2={lens.y} stroke='#ef4444' strokeWidth={2} />
        <Line x1={lens.x} y1={lens.y - 10} x2={lens.x} y2={lens.y + 10} stroke='#ef4444' strokeWidth={2} />
      </G>
    );
  }, [isMagnifierEnabled, mapImage, mode, plotPoints, plots, stagePos.x, stagePos.y, stageScale, viewport.height, viewport.width]);

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
              return (
                <G key={plot.id} opacity={hiddenForPreview ? 0.2 : 1}>
                  <Polygon points={pointString(plot.points)} fill={plot.color ?? '#0f766e'} fillOpacity={0.2} stroke={plot.color ?? '#0f766e'} strokeWidth={2.5 / stageScale} />
                  {groupPolygonSegments(plot.points).map((group, index) => {
                    const first = group[0].point;
                    const last = group[group.length - 1].nextPoint;
                    const mid = midpoint(first, last);
                    const lengthFt = group.reduce((sum, segment) => sum + segment.distPx / (scale ?? 1), 0);
                    return <SvgOutlinedText key={`${plot.id}-side-${index}`} x={mid.x} y={mid.y} text={formatFeetInches(lengthFt)} stageScale={stageScale} color={plot.color ?? '#0f766e'} rotation={group[0].angle} />;
                  })}
                  {isShowDiagonals && plot.results.diagonals?.map((diagonal, index) => {
                    const start = plot.points[diagonal.p1Index];
                    const end = plot.points[diagonal.p2Index];
                    if (!start || !end) return null;
                    const mid = midpoint(start, end);
                    const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
                    return <G key={`${plot.id}-diag-${index}`}><Line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke='#8b5cf6' strokeWidth={1.3 / stageScale} strokeDasharray={`${5 / stageScale},${4 / stageScale}`} /><SvgOutlinedText x={mid.x} y={mid.y} text={formatFeetInches(diagonal.lengthFt)} stageScale={stageScale} color='#6d28d9' rotation={angle} /></G>;
                  })}
                  <SvgBadge x={label.center.x} y={label.center.y} text={`${toBengaliDigits(plot.results.shotok.toFixed(3))} শতক`} stageScale={stageScale} color={plot.color ?? '#0f766e'} rotation={label.rotation} />
                </G>
              );
            })}

            {splitPreview && selectedPlot && (
              <G>
                <Polygon points={pointString(splitPreview.poly1)} fill='#16a34a' fillOpacity={0.28} stroke='#22c55e' strokeWidth={2 / stageScale} />
                <Polygon points={pointString(splitPreview.poly2)} fill='#2563eb' fillOpacity={0.26} stroke='#60a5fa' strokeWidth={2 / stageScale} />
                {[{ points: splitPreview.poly1, value: splitPreview.resultA?.shotok }, { points: splitPreview.poly2, value: splitPreview.resultB?.shotok }].map((part, index) => {
                  const label = getPolygonAreaLabelLayout(part.points);
                  return part.value ? <SvgBadge key={`split-label-${index}`} x={label.center.x} y={label.center.y} text={`${toBengaliDigits(part.value.toFixed(3))} শতক`} stageScale={stageScale} color={index === 0 ? '#15803d' : '#1d4ed8'} rotation={label.rotation} /> : null;
                })}
              </G>
            )}

            {plotPoints.length > 0 && mode === 'drawing_plot' && (
              <G>
                {plotPoints.length >= 2 && <Polyline points={pointString(plotPoints)} fill='none' stroke='#2563eb' strokeWidth={3 / stageScale} />}
                {plotPoints.map((point, index) => <Circle key={`point-${index}`} cx={point.x} cy={point.y} r={(index === 0 ? 7 : 5) / stageScale} fill={index === 0 ? '#f97316' : '#fff'} stroke='#2563eb' strokeWidth={2 / stageScale} />)}
                {plotPoints.slice(0, -1).map((point, index) => {
                  const next = plotPoints[index + 1];
                  const lengthFt = scale ? distance(point, next) / scale : 0;
                  if (lengthFt < 1) return null;
                  const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
                  return <SvgOutlinedText key={`live-side-${index}`} x={(point.x + next.x) / 2} y={(point.y + next.y) / 2} text={formatFeetInches(lengthFt)} stageScale={stageScale} color='#2563eb' rotation={angle} />;
                })}
              </G>
            )}

            {mode === 'calibrating' && (
              <G>
                {calibrationPoints.length === 2 && <Line x1={calibrationPoints[0].x} y1={calibrationPoints[0].y} x2={calibrationPoints[1].x} y2={calibrationPoints[1].y} stroke='#f59e0b' strokeWidth={3 / stageScale} />}
                {calibrationPoints.map((point, index) => <Circle key={`cal-${index}`} cx={point.x} cy={point.y} r={6 / stageScale} fill='#f59e0b' stroke='#fff' strokeWidth={2 / stageScale} />)}
              </G>
            )}

            {manualCutLine && <G><Polyline points={pointString(manualCutLine)} fill='none' stroke='#ef4444' strokeWidth={3 / stageScale} strokeDasharray={`${8 / stageScale},${5 / stageScale}`} />{manualCutLine.map((point, index) => <Circle key={`cut-${index}`} cx={point.x} cy={point.y} r={7 / stageScale} fill={index === 0 || index === manualCutLine.length - 1 ? '#ef4444' : '#fff'} stroke='#7f1d1d' strokeWidth={2 / stageScale} />)}</G>}
          </G>

          <LiveMeasurementOverlay ref={liveOverlayRef} initial={getLiveOverlay({ scale: stageScale, pos: stagePos })} />
          {magnifier}

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
