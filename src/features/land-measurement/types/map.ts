export type Point = {
  x: number;
  y: number;
};

export type StageSize = {
  width: number;
  height: number;
};

export type MapMode = "none" | "calibrating" | "manual_scale" | "drawing_plot" | "measuring" | "manual_divide_plot";

export type PolygonResults = {
  sqft: number;
  shotok: number;
  katha: number;
  lengths: number[];
  perimeter: number;
  diagonals?: { p1Index: number; p2Index: number; lengthFt: number; }[];
};

export type PlotRecord = {
  id: string;
  name: string;
  points: Point[];
  results: PolygonResults;
  isSaved?: boolean;
  color?: string;
};

export type SavedPlotRecord = PlotRecord & {
  scale: number;
  sourceName: string;
  createdAt: number;
  expiresAt: number;
};

export type ScratchLine = {
  id: string;
  start: Point;
  end: Point;
  dashed: boolean;
};

export type SavedMapData = {
  scale?: number;
  plotPoints: Point[];
  plots?: PlotRecord[];
};

export type PinchStart = {
  distance: number;
  scale: number;
  stagePos: Point;
  centerClient: Point;
};

export type TouchSession = {
  active: boolean;
  single: boolean;
  moved: boolean;
  startClient: Point;
  startTime: number;
};
