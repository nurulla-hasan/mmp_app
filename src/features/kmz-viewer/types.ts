export type KmzCoordinate = {
  latitude: number;
  longitude: number;
};

export type KmzStyle = {
  lineColor: string;
  lineWidth: number;
  polygonFillColor: string;
  polygonStrokeColor: string;
};

export type KmzGroundOverlay = {
  id: string;
  name: string;
  imageUri: string;
  opacity: number;
  /** KML gx:LatLonQuad order: lower-left, lower-right, upper-right, upper-left. */
  quad: [KmzCoordinate, KmzCoordinate, KmzCoordinate, KmzCoordinate];
};

export type KmzPlacemark = {
  id: string;
  name: string;
  description?: string;
  points: KmzCoordinate[];
  lines: KmzCoordinate[][];
  polygons: KmzCoordinate[][];
  style: KmzStyle;
};

export type KmzDocument = {
  name: string;
  sourceName: string;
  overlays: KmzGroundOverlay[];
  placemarks: KmzPlacemark[];
  allCoordinates: KmzCoordinate[];
  cacheUris: string[];
  warnings: string[];
};
