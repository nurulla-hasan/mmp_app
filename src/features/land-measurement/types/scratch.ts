import type { Point, SavedPlotRecord } from './map';

export type LabelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlacedScratchLabel = {
  box: LabelBox;
  anchor: Point;
  angle: number;
  text: string;
};

export type PlotSheetLayout = {
  plot: SavedPlotRecord;
  bounds: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  };
  scale: number;
  offsetX: number;
  offsetY: number;
  slot: LabelBox;
};

export type ScratchPhysicsLabel = {
  id: string;
  midX: number;
  midY: number;
  x: number;
  y: number;
  offset: number;
  textAngle: number;
  labelText: string;
  fontSize?: number;
  color?: string;
};

export type ScratchSegmentGroup = {
  segments: {
    i: number;
    lengthFt: number;
    angle: number;
  }[];
  totalLengthFt: number;
};
