export type Point = {
  x: number;
  y: number;
};

export type TPlot = {
  id: string;
  calculationId: string;
  plotNumber: string;
  points: Point[] | string;
  areaSqLink?: number;
  areaShotok: number;
  areaKatha: number;
  createdAt: string;
};

export type TCalculation = {
  id: string;
  userId: string;
  name: string;
  mapName?: string | null;
  scaleType: string;
  scalePxPerUnit?: number | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  createdAt: string;
  updatedAt: string;
  plots: TPlot[];
  _count?: {
    plots: number;
  };
};

export type TUserMeasurementStat = {
  id: string;
  userId: string;
  plotsCompleted: number;
  calculationsCount: number;
  lastActivityAt: string;
  updatedAt: string;
};

export type CreatePlotPayload = {
  plotNumber: string;
  points: Point[];
  areaSqLink?: number;
  areaShotok?: number;
  areaKatha?: number;
};

export type CreateCalculationPayload = {
  name: string;
  mapName?: string;
  scaleType?: string;
  scalePxPerUnit?: number;
  imageWidth?: number;
  imageHeight?: number;
  plots: CreatePlotPayload[];
};

export type UpdateCalculationPayload = Partial<CreateCalculationPayload>;

