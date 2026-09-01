import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Dimensions,
  Text,
} from 'react-native';
import Svg, { Polygon, Polyline, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useMapStore } from '../../store/useMapStore';
import { CanvasMagnifier } from './CanvasMagnifier';
import { calculatePolygonData } from '../../utils/calculations';
import type { Point, PlotRecord } from '../../types/map';
import { Fonts } from '../../../../constants/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const MobileMapCanvas: React.FC = () => {
  const {
    image,
    originalWidth,
    originalHeight,
    scale: storeScale,
    mode,
    isPlotFinished,
    plotPoints,
    plots,
    addPointAt,
    finishPlot,
    setCalibrationLine,
    setScale,
  } = useMapStore();

  // Viewport transformation (Zoom & Pan)
  const [scale, setScaleState] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  // Active gesture states
  const [magnifierPos, setMagnifierPos] = useState<Point | null>(null);
  const [calibrationStart, setCalibrationStart] = useState<Point | null>(null);
  const [calibrationEnd, setCalibrationEnd] = useState<Point | null>(null);

  const initialPinchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const lastPanRef = useRef<Point>({ x: 0, y: 0 });

  const screenToCanvas = (screenX: number, screenY: number): Point => ({
    x: (screenX - translateX) / scale,
    y: (screenY - translateY) / scale,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          // 2-finger pinch start
          const p1 = touches[0];
          const p2 = touches[1];
          initialPinchDistRef.current = Math.hypot(p2.pageX - p1.pageX, p2.pageY - p1.pageY);
          initialScaleRef.current = scale;
          return;
        }

        const touch = evt.nativeEvent;
        const canvasPt = screenToCanvas(touch.locationX, touch.locationY);

        // Calibrate Mode: Start 2-point ruler line
        if (mode === 'calibrating') {
          setCalibrationStart(canvasPt);
          setCalibrationEnd(canvasPt);
          setMagnifierPos({ x: touch.locationX, y: touch.locationY });
          return;
        }

        // Draw Mode: Show magnifier loupe above finger
        if (mode === 'drawing_plot' && !isPlotFinished) {
          setMagnifierPos({ x: touch.locationX, y: touch.locationY });
        }

        lastPanRef.current = { x: touch.locationX, y: touch.locationY };
      },

      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const touches = evt.nativeEvent.touches;

        // 1. Two-finger Pinch-to-zoom
        if (touches.length === 2 && initialPinchDistRef.current) {
          const p1 = touches[0];
          const p2 = touches[1];
          const currentDist = Math.hypot(p2.pageX - p1.pageX, p2.pageY - p1.pageY);
          const newScale = Math.max(0.4, Math.min(6.0, initialScaleRef.current * (currentDist / initialPinchDistRef.current)));
          setScaleState(newScale);
          return;
        }

        const touch = evt.nativeEvent;
        const canvasPt = screenToCanvas(touch.locationX, touch.locationY);

        // 2. Calibrate Line Dragging
        if (mode === 'calibrating' && calibrationStart) {
          setCalibrationEnd(canvasPt);
          setMagnifierPos({ x: touch.locationX, y: touch.locationY });
          return;
        }

        // 3. Pan Mode
        if (mode === 'none') {
          setTranslateX((prev) => prev + gestureState.vx * 12);
          setTranslateY((prev) => prev + gestureState.vy * 12);
        }

        if (mode === 'drawing_plot') {
          setMagnifierPos({ x: touch.locationX, y: touch.locationY });
        }
      },

      onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const touch = evt.nativeEvent;
        const canvasPt = screenToCanvas(touch.locationX, touch.locationY);

        initialPinchDistRef.current = null;
        setMagnifierPos(null);

        // Finalize Calibration Line
        if (mode === 'calibrating' && calibrationStart && calibrationEnd) {
          const dist = Math.hypot(calibrationEnd.x - calibrationStart.x, calibrationEnd.y - calibrationStart.y);
          if (dist > 15) {
            setCalibrationLine([calibrationStart.x, calibrationStart.y, calibrationEnd.x, calibrationEnd.y]);
            const calculatedScale = dist / 660; // 10 chains default
            setScale(calculatedScale);
          }
          setCalibrationStart(null);
          setCalibrationEnd(null);
          return;
        }

        // Add Vertex Point in Drawing Mode
        if (mode === 'drawing_plot' && !isPlotFinished) {
          if (plotPoints.length >= 3) {
            const firstPt = plotPoints[0];
            const distToFirst = Math.hypot(canvasPt.x - firstPt.x, canvasPt.y - firstPt.y);
            // Close polygon if tapped near first vertex
            if (distToFirst < 24 / scale) {
              finishPlot();
              return;
            }
          }

          if (Math.abs(gestureState.dx) < 8 && Math.abs(gestureState.dy) < 8) {
            addPointAt(canvasPt);
          }
        }
      },
    })
  ).current;

  const activePointsStr = plotPoints.map((p: Point) => `${p.x},${p.y}`).join(' ');
  const polygonResults = calculatePolygonData(plotPoints, storeScale || 1.0);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View
        style={[
          styles.transformedLayer,
          {
            transform: [
              { translateX },
              { translateY },
              { scale },
            ],
          },
        ]}
      >
        {/* 1. Map Image Layer */}
        {image ? (
          <Image
            source={{ uri: typeof image === 'string' ? image : image.src }}
            style={[
              styles.mapImage,
              {
                width: originalWidth || 1200,
                height: originalHeight || 900,
              },
            ]}
            resizeMode='contain'
          />
        ) : (
          <View style={[styles.placeholderMap, { width: 1200, height: 900 }]}>
            <View style={styles.gridOverlay} />
            <Text style={styles.placeholderText}>মৌজা ম্যাপ সিলেক্ট করুন বা সরাসরি ড্রয়িং শুরু করুন</Text>
          </View>
        )}

        {/* 2. Vector SVG Overlay Layer */}
        <Svg
          style={StyleSheet.absoluteFill}
          width={1200}
          height={900}
          viewBox='0 0 1200 900'
        >
          {/* Saved Polygons */}
          {plots.map((plot: PlotRecord) => {
            const plotStr = plot.points.map((p: Point) => `${p.x},${p.y}`).join(' ');
            return (
              <G key={plot.id}>
                <Polygon
                  points={plotStr}
                  fill={plot.color || '#16a34a'}
                  fillOpacity={0.25}
                  stroke={plot.color || '#16a34a'}
                  strokeWidth={2 / scale}
                  strokeLinejoin='round'
                />
              </G>
            );
          })}

          {/* Active Polygon Drawing */}
          {plotPoints.length >= 2 && (
            <G>
              {isPlotFinished ? (
                <Polygon
                  points={activePointsStr}
                  fill='#16a34a'
                  fillOpacity={0.25}
                  stroke='#16a34a'
                  strokeWidth={2.5 / scale}
                  strokeLinejoin='round'
                />
              ) : (
                <Polyline
                  points={activePointsStr}
                  fill='none'
                  stroke='#16a34a'
                  strokeWidth={2.5 / scale}
                  strokeDasharray={`${6 / scale}, ${4 / scale}`}
                  strokeLinejoin='round'
                  strokeLinecap='round'
                />
              )}
            </G>
          )}

          {/* Active Polygon Vertices */}
          {plotPoints.map((point: Point, index: number) => {
            const isFirst = index === 0;
            return (
              <G key={`v_${index}`}>
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={(isFirst && !isPlotFinished ? 7 : 5) / scale}
                  fill={isFirst && !isPlotFinished ? '#e11d48' : '#ffffff'}
                  stroke='#16a34a'
                  strokeWidth={2 / scale}
                />
              </G>
            );
          })}

          {/* Edge Length Labels */}
          {polygonResults &&
            polygonResults.lengths.map((lengthFt: number, idx: number) => {
              const p1 = plotPoints[idx];
              const p2 = plotPoints[(idx + 1) % plotPoints.length];
              if (!p1 || !p2) return null;
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;

              return (
                <G key={`edge_${idx}`}>
                  <SvgText
                    x={midX}
                    y={midY - 6 / scale}
                    fontSize={11 / scale}
                    fill='#0f172a'
                    fontWeight='bold'
                    textAnchor='middle'
                  >
                    {lengthFt.toFixed(1)}′
                  </SvgText>
                </G>
              );
            })}

          {/* Active Calibration Line */}
          {calibrationStart && calibrationEnd && (
            <G>
              <Line
                x1={calibrationStart.x}
                y1={calibrationStart.y}
                x2={calibrationEnd.x}
                y2={calibrationEnd.y}
                stroke='#d97706'
                strokeWidth={3 / scale}
                strokeLinecap='round'
              />
              <Circle
                cx={calibrationStart.x}
                cy={calibrationStart.y}
                r={6 / scale}
                fill='#d97706'
              />
              <Circle
                cx={calibrationEnd.x}
                cy={calibrationEnd.y}
                r={6 / scale}
                fill='#d97706'
              />
            </G>
          )}
        </Svg>
      </View>

      {/* 3. Floating Touch Magnifier Loupe */}
      {magnifierPos && (
        <CanvasMagnifier
          x={magnifierPos.x}
          y={magnifierPos.y}
          visible={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    overflow: 'hidden',
  },
  transformedLayer: {
    width: 1200,
    height: 900,
  },
  mapImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  placeholderMap: {
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: Fonts.sansMedium,
  },
});
