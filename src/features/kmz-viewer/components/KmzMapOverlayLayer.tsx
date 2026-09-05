import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Region } from 'react-native-maps';
import Svg, {
  Circle,
  G,
  Image as SvgImage,
  Polygon as SvgPolygon,
  Polyline as SvgPolyline,
  Text as SvgText,
} from 'react-native-svg';
import type { KmzCoordinate, KmzDocument } from '../types';

type Size = { width: number; height: number };

type Props = {
  document: KmzDocument;
  region: Region;
  viewport: Size;
  overlayOpacity: number;
};

const MAX_LATITUDE = 85.05112878;

function clampLatitude(latitude: number) {
  return Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
}

function mercatorV(latitude: number) {
  const lat = clampLatitude(latitude);
  const sinLatitude = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI);
}

function longitudeU(longitude: number) {
  return (longitude + 180) / 360;
}

function createProjection(region: Region, viewport: Size) {
  const west = longitudeU(region.longitude - region.longitudeDelta / 2);
  const east = longitudeU(region.longitude + region.longitudeDelta / 2);
  const north = mercatorV(region.latitude + region.latitudeDelta / 2);
  const south = mercatorV(region.latitude - region.latitudeDelta / 2);
  const spanU = Math.max(1e-12, east - west);
  const spanV = Math.max(1e-12, south - north);

  return (point: KmzCoordinate) => ({
    x: ((longitudeU(point.longitude) - west) / spanU) * viewport.width,
    y: ((mercatorV(point.latitude) - north) / spanV) * viewport.height,
  });
}

function pointsText(points: { x: number; y: number }[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export const KmzMapOverlayLayer = memo(function KmzMapOverlayLayer({
  document,
  region,
  viewport,
  overlayOpacity,
}: Props) {
  const project = useMemo(
    () => createProjection(region, viewport),
    [region, viewport],
  );

  if (viewport.width <= 0 || viewport.height <= 0) return null;

  return (
    <View pointerEvents='none' style={StyleSheet.absoluteFill}>
      <Svg width={viewport.width} height={viewport.height}>
        {document.overlays.map((overlay) => {
          const lowerLeft = project(overlay.quad[0]);
          const upperRight = project(overlay.quad[2]);
          const upperLeft = project(overlay.quad[3]);
          const lowerRight = project(overlay.quad[1]);
          const a = upperRight.x - upperLeft.x;
          const b = upperRight.y - upperLeft.y;
          const c = lowerLeft.x - upperLeft.x;
          const d = lowerLeft.y - upperLeft.y;
          const predictedLowerRight = {
            x: upperLeft.x + a + c,
            y: upperLeft.y + b + d,
          };
          const quadError = Math.hypot(
            predictedLowerRight.x - lowerRight.x,
            predictedLowerRight.y - lowerRight.y,
          );

          return (
            <G
              key={overlay.id}
              opacity={Math.max(0, Math.min(1, overlay.opacity * overlayOpacity))}
            >
              <SvgImage
                href={{ uri: overlay.imageUri }}
                x={0}
                y={0}
                width={1}
                height={1}
                preserveAspectRatio='none'
                transform={`matrix(${a} ${b} ${c} ${d} ${upperLeft.x} ${upperLeft.y})`}
              />
              {quadError > 6 ? (
                <SvgPolygon
                  points={pointsText([upperLeft, upperRight, lowerRight, lowerLeft])}
                  fill='transparent'
                  stroke='rgba(245,158,11,0.55)'
                  strokeWidth={1}
                  strokeDasharray='4 4'
                />
              ) : null}
            </G>
          );
        })}

        {document.placemarks.flatMap((placemark) =>
          placemark.polygons.map((polygon, index) => {
            const points = polygon.map(project);
            return (
              <SvgPolygon
                key={`${placemark.id}-polygon-${index}`}
                points={pointsText(points)}
                fill={placemark.style.polygonFillColor}
                stroke={placemark.style.polygonStrokeColor}
                strokeWidth={placemark.style.lineWidth}
              />
            );
          }),
        )}

        {document.placemarks.flatMap((placemark) =>
          placemark.lines.map((line, index) => {
            const points = line.map(project);
            return (
              <SvgPolyline
                key={`${placemark.id}-line-${index}`}
                points={pointsText(points)}
                fill='none'
                stroke={placemark.style.lineColor}
                strokeWidth={placemark.style.lineWidth}
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            );
          }),
        )}

        {document.placemarks.flatMap((placemark) =>
          placemark.points.map((point, index) => {
            const screen = project(point);
            return (
              <G key={`${placemark.id}-point-${index}`}>
                <Circle cx={screen.x} cy={screen.y} r={7} fill='#dc2626' stroke='#ffffff' strokeWidth={2} />
                {placemark.name ? (
                  <SvgText
                    x={screen.x + 10}
                    y={screen.y - 8}
                    fill='#0f172a'
                    stroke='#ffffff'
                    strokeWidth={2.5}
                    fontSize={11}
                    fontWeight='700'
                  >
                    {placemark.name}
                  </SvgText>
                ) : null}
              </G>
            );
          }),
        )}
      </Svg>
    </View>
  );
});
