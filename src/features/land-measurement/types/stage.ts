import type { MapMode, Point, PlotRecord } from './map';
import type Konva from 'konva';

export type StageBackgroundProps = {
  image: HTMLImageElement | null;
};

export type StageCalibrationProps = {
  mode: MapMode;
  calibrationLine: number[];
  stageScale: number;
  stagePos: Point;
  getStageCenterPoint: () => Point;
};

export type StagePlotsProps = {
  plots: PlotRecord[];
  stageScale: number;
};

export type StageActivePlotProps = {
  mode: MapMode;
  isPlotFinished: boolean;
  plotPoints: Point[];
  flatPlotPoints: number[];
  snapHint: boolean;
  stageScale: number;
  stagePos: Point;
  scale: number | null;
  handlePointDragEnd: (e: Konva.KonvaEventObject<DragEvent>, i: number) => void;
  getStageCenterPoint: () => Point;
};

export type PlotSegment = {
  i: number;
  point: Point;
  nextPoint: Point;
  dx: number;
  dy: number;
  distPx: number;
  angle: number;
  lengthFt: number;
};

export type PlotSegmentGroup = {
  segments: PlotSegment[];
  totalLengthFt: number;
};

export type ActivePlotLabelData = {
  i: number;
  midX: number;
  midY: number;
  rotation: number;
  lineEndX: number;
  lineEndY: number;
  labelDist: number;
  perpX: number;
  perpY: number;
  estWidth: number;
  estHeight: number;
  labelText: string;
  fontSize: number;
  padding: number;
};

export type PlotsLabelData = {
  plotId: string;
  color: string;
  i: number;
  midX: number;
  midY: number;
  rotation: number;
  idealX: number;
  idealY: number;
  x: number;
  y: number;
  labelDist: number;
  perpX: number;
  perpY: number;
  estWidth: number;
  estHeight: number;
  labelText: string;
  fontSize: number;
  padding: number;
};
