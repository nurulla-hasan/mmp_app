import React, { memo, useMemo } from 'react';
import { Marker, Overlay, Polygon, Polyline } from 'react-native-maps';
import type { KmzCoordinate, KmzDocument, KmzGroundOverlay } from '../types';

type Props = {
  document: KmzDocument;
  overlayOpacity: number;
};

const EARTH_RADIUS_M = 6_378_137;
const METERS_PER_DEGREE_LAT = 111_320;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function normalizeBearing(value: number) {
  return ((value % 360) + 360) % 360;
}

function distanceMeters(a: KmzCoordinate, b: KmzCoordinate) {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLat = lat2 - lat1;
  const dLng = toRadians(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function headingDegrees(a: KmzCoordinate, b: KmzCoordinate) {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return normalizeBearing((Math.atan2(y, x) * 180) / Math.PI);
}

/**
 * Native Google Maps owns these overlays. That keeps KMZ imagery synchronized
 * with map pan/zoom instead of updating a separate JS/SVG viewport one frame
 * later. gx:LatLonQuad can technically be skewed, while GroundOverlay supports
 * rectangle + bearing, so we use the quad's averaged physical size and bearing.
 */
function getNativePlacement(overlay: KmzGroundOverlay) {
  const [lowerLeft, lowerRight, upperRight, upperLeft] = overlay.quad;
  const center = overlay.quad.reduce(
    (sum, point) => ({
      latitude: sum.latitude + point.latitude / 4,
      longitude: sum.longitude + point.longitude / 4,
    }),
    { latitude: 0, longitude: 0 },
  );

  const widthMeters = (
    distanceMeters(lowerLeft, lowerRight) + distanceMeters(upperLeft, upperRight)
  ) / 2;
  const heightMeters = (
    distanceMeters(lowerLeft, upperLeft) + distanceMeters(lowerRight, upperRight)
  ) / 2;
  const cosLat = Math.max(0.01, Math.cos(toRadians(center.latitude)));
  const halfLat = Math.max(0.0000001, (heightMeters / 2) / METERS_PER_DEGREE_LAT);
  const halfLng = Math.max(0.0000001, (widthMeters / 2) / (METERS_PER_DEGREE_LAT * cosLat));
  const bearing = normalizeBearing(headingDegrees(upperLeft, upperRight) - 90);

  // AIRMapOverlay expects bounds in south-west -> north-east order.
  // Passing north first makes Android throw
  // "southern latitude exceeds northern latitude" while mounting the overlay.
  const south = Math.min(center.latitude - halfLat, center.latitude + halfLat);
  const north = Math.max(center.latitude - halfLat, center.latitude + halfLat);
  const west = Math.min(center.longitude - halfLng, center.longitude + halfLng);
  const east = Math.max(center.longitude - halfLng, center.longitude + halfLng);

  return {
    bounds: [
      [south, west],
      [north, east],
    ] as [[number, number], [number, number]],
    bearing,
  };
}

export const KmzMapOverlayLayer = memo(function KmzMapOverlayLayer({
  document,
  overlayOpacity,
}: Props) {
  const placements = useMemo(
    () => document.overlays.map((overlay) => ({ overlay, placement: getNativePlacement(overlay) })),
    [document.overlays],
  );

  return (
    <>
      {placements.map(({ overlay, placement }) => (
        <Overlay
          key={overlay.id}
          image={{ uri: overlay.imageUri }}
          bounds={placement.bounds}
          bearing={placement.bearing}
          opacity={Math.max(0, Math.min(1, overlay.opacity * overlayOpacity))}
        />
      ))}

      {document.placemarks.flatMap((placemark) =>
        placemark.polygons.map((coordinates, index) => (
          <Polygon
            key={`${placemark.id}-polygon-${index}`}
            coordinates={coordinates}
            fillColor={placemark.style.polygonFillColor}
            strokeColor={placemark.style.polygonStrokeColor}
            strokeWidth={placemark.style.lineWidth}
          />
        )),
      )}

      {document.placemarks.flatMap((placemark) =>
        placemark.lines.map((coordinates, index) => (
          <Polyline
            key={`${placemark.id}-line-${index}`}
            coordinates={coordinates}
            strokeColor={placemark.style.lineColor}
            strokeWidth={placemark.style.lineWidth}
          />
        )),
      )}

      {document.placemarks.flatMap((placemark) =>
        placemark.points.map((coordinate, index) => (
          <Marker
            key={`${placemark.id}-point-${index}`}
            coordinate={coordinate}
            title={placemark.name || undefined}
            description={placemark.description}
            pinColor='#dc2626'
          />
        )),
      )}
    </>
  );
});
