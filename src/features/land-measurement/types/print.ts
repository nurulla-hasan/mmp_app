import type { Point } from './map';

export type PrintPhysicsLabel = {
  plotId: string;
  i: number;
  midX: number;
  midY: number;
  idealX: number;
  idealY: number;
  x: number;
  y: number;
  perpX: number;
  perpY: number;
  labelText: string;
};

export type PrintSegmentGroup = {
  segments: {
    point: Point;
    nextPoint: Point;
    dx: number;
    dy: number;
    distPx: number;
    angle: number;
    lengthFt: number;
  }[];
  totalDistPx: number;
  totalLengthFt: number;
};
