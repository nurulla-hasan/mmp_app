import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorToast, SuccessToast } from '@/lib/utils';
import { CalculationService } from '@/services/calculation-service';
import { calculatePolygonData } from '../utils/calculations';
import {
  clipLineToPolygon,
  getLineIntersection,
  getLogicalCorners,
  getSnappedPoint,
  isPointInPolygon,
  normalizePolygonPoints,
} from '../utils/geometry';
import { getDirectionalContainingPlot } from '../utils/directionalPlot';
import { splitPolygonByPolyline } from '../utils/polygonDivision';
import { MANUAL_DIVIDE_CORNER_SNAP_PX, PLOT_COLOR_PALETTE } from '../utils/canvas';
import type { MapMode, PlotRecord, Point, PolygonResults, SavedPlotRecord } from '../types/map';

export type MapImage = {
  uri: string;
  width: number;
  height: number;
  name?: string;
  size?: number;
};

export type NudgeTarget = 'all' | 'start' | 'end';
export type ReportInfo = { mouza: string; jlNo: string; dagNo: string; khatianNo: string; date: string; surveyorName: string };

const SCALE_KEY = 'mapScale';
const SAVED_PLOTS_KEY = 'mouzaSavedPlots';
const SAVED_PLOT_TTL_MS = 10 * 24 * 60 * 60 * 1000;

const incrementMeasuredPlotCount = async () => {
  try {
    await CalculationService.incrementPlotCount();
  } catch {
    // Analytics must never interrupt an on-device measurement.
  }
};

type MapStore = {
  mapImage: MapImage | null;
  mode: MapMode;
  scale: number | null;
  calibrationLine: number[];
  calibrationLineFuture: number[];
  isDistanceModalOpen: boolean;
  plotPoints: Point[];
  plotPointsFuture: Point[];
  plots: PlotRecord[];
  plotsHistory: PlotRecord[][];
  plotsFuture: PlotRecord[][];
  results: PolygonResults | null;
  isPlotFinished: boolean;
  stageScale: number;
  stagePos: Point;
  stageSize: { width: number; height: number };
  isShowDiagonals: boolean;
  isMagnifierEnabled: boolean;
  isPinching: boolean;
  snapHint: boolean;
  reportInfo: ReportInfo;
  reportImage: string | null;
  currentProjectId: string | null;
  savedPlots: SavedPlotRecord[];
  plotSaveName: string;
  manualDividePlotId: string | null;
  manualCutLine: Point[] | null;
  nudgeTarget: NudgeTarget;

  setMapImage: (image: MapImage) => void;
  hydratePersistence: () => Promise<void>;
  clearMap: () => void;
  setScale: (scale: number | null) => void;
  setPlots: (plots: PlotRecord[] | ((previous: PlotRecord[]) => PlotRecord[])) => void;
  setMode: (mode: MapMode) => void;
  setStageSize: (size: { width: number; height: number }) => void;
  setStageTransform: (transform: { scale: number; pos: Point }) => void;
  getStageCenterPoint: () => Point;
  startCalibration: () => void;
  cancelCalibration: () => void;
  retryCalibration: () => void;
  submitCalibrationDistance: (distanceFt: number) => boolean;
  submitManualScale: (feetPerPixel: number) => boolean;
  undoCalibrationPoint: () => void;
  redoCalibrationPoint: () => void;
  startPlotDrawing: () => boolean;
  addPointAt: (point: Point) => void;
  addCenterPoint: () => void;
  finishPlot: () => boolean;
  cancelActiveMode: () => void;
  undoPlotAction: () => void;
  redoPlotAction: () => void;
  clearPlots: () => void;
  setIsShowDiagonals: (show: boolean) => void;
  setIsMagnifierEnabled: (enabled: boolean) => void;
  setIsPinching: (pinching: boolean) => void;
  setSnapHint: (hint: boolean) => void;
  setReportInfo: (info: ReportInfo | ((previous: ReportInfo) => ReportInfo)) => void;
  setReportImage: (image: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;
  setPlotSaveName: (name: string) => void;
  savePlotsToLibrary: () => boolean;
  deleteSavedPlot: (plotId: string) => void;
  updateSavedPlot: (plotId: string, updates: Partial<SavedPlotRecord>) => void;
  startManualDivide: () => void;
  cancelManualDivide: () => void;
  selectPlotForDivide: (point: Point) => void;
  setManualDividePlotId: (id: string | null) => void;
  setManualCutLine: (line: Point[] | null) => void;
  moveManualCutAnchor: (index: number, point: Point) => void;
  setNudgeTarget: (target: NudgeTarget) => void;
  nudgeManualCutLine: (direction: -1 | 1, step?: number) => void;
  addManualCutPoint: () => void;
  removeManualCutPoint: () => void;
  executeManualDivide: () => boolean;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getDefaultManualCutLine = (
  plotPoints: Point[],
  center: Point,
  stageScale: number,
): Point[] => {
  const xs = plotPoints.map((point) => point.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const padding = 1000 / Math.max(stageScale, 0.01);
  const lineStart = { x: minX - padding, y: center.y };
  const lineEnd = { x: maxX + padding, y: center.y };
  const intersections: Point[] = [];

  for (let index = 0; index < plotPoints.length; index += 1) {
    const intersection = getLineIntersection(
      lineStart,
      lineEnd,
      plotPoints[index],
      plotPoints[(index + 1) % plotPoints.length],
    );
    if (!intersection) continue;
    if (!intersections.some((point) => Math.hypot(point.x - intersection.x, point.y - intersection.y) < 1e-3)) {
      intersections.push(intersection);
    }
  }

  if (intersections.length >= 2) {
    intersections.sort((a, b) => a.x - b.x);
    return [intersections[0], intersections[intersections.length - 1]];
  }

  const fallbackOffset = 100 / Math.max(stageScale, 0.01);
  return [
    { x: center.x - fallbackOffset, y: center.y },
    { x: center.x + fallbackOffset, y: center.y },
  ];
};

const getCornerSnapPoint = (point: Point, polygon: Point[], threshold: number): Point | null => {
  let closest: Point | null = null;
  let closestDistance = threshold;
  for (const vertex of getLogicalCorners(polygon)) {
    const pointDistance = Math.hypot(point.x - vertex.x, point.y - vertex.y);
    if (pointDistance <= closestDistance) {
      closestDistance = pointDistance;
      closest = vertex;
    }
  }
  return closest ? { ...closest } : null;
};

const initialMeasurementState = {
  mode: 'none' as MapMode,
  scale: null as number | null,
  calibrationLine: [] as number[],
  calibrationLineFuture: [] as number[],
  isDistanceModalOpen: false,
  plotPoints: [] as Point[],
  plotPointsFuture: [] as Point[],
  plots: [] as PlotRecord[],
  plotsHistory: [] as PlotRecord[][],
  plotsFuture: [] as PlotRecord[][],
  results: null as PolygonResults | null,
  isPlotFinished: false,
  manualDividePlotId: null as string | null,
  manualCutLine: null as Point[] | null,
  nudgeTarget: 'all' as NudgeTarget,
};

export const useMapStore = create<MapStore>((set, get) => ({
  mapImage: null,
  stageScale: 1,
  stagePos: { x: 0, y: 0 },
  stageSize: { width: 0, height: 0 },
  isShowDiagonals: false,
  isMagnifierEnabled: false,
  isPinching: false,
  snapHint: false,
  reportInfo: { mouza: '', jlNo: '', dagNo: '', khatianNo: '', date: new Date().toLocaleDateString('en-GB'), surveyorName: '' },
  reportImage: null,
  currentProjectId: null,
  savedPlots: [],
  plotSaveName: '',
  ...initialMeasurementState,

  setMapImage: (mapImage) => set({
    mapImage,
    mode: 'none',
    calibrationLine: [],
    calibrationLineFuture: [],
    plotPoints: [],
    plotPointsFuture: [],
    plots: [],
    plotsHistory: [],
    plotsFuture: [],
    results: null,
    isPlotFinished: false,
    manualDividePlotId: null,
    manualCutLine: null,
    reportImage: null,
    currentProjectId: null,
  }),

  hydratePersistence: async () => {
    try {
      const [scaleRaw, plotsRaw] = await Promise.all([
        AsyncStorage.getItem(SCALE_KEY),
        AsyncStorage.getItem(SAVED_PLOTS_KEY),
      ]);
      const persistedScale = scaleRaw ? Number(scaleRaw) : null;
      const now = Date.now();
      const savedPlots = plotsRaw
        ? (JSON.parse(plotsRaw) as SavedPlotRecord[]).filter((plot) => plot.expiresAt > now)
        : [];
      set({
        scale: Number.isFinite(persistedScale) && (persistedScale ?? 0) > 0 ? persistedScale : get().scale,
        savedPlots,
      });
      await AsyncStorage.setItem(SAVED_PLOTS_KEY, JSON.stringify(savedPlots));
    } catch {
      // Corrupt or unavailable storage should not block the measurement canvas.
    }
  },

  clearMap: () => set({
    mapImage: null,
    mode: 'none',
    calibrationLine: [],
    calibrationLineFuture: [],
    plotPoints: [],
    plotPointsFuture: [],
    plots: [],
    plotsHistory: [],
    plotsFuture: [],
    results: null,
    isPlotFinished: false,
    manualDividePlotId: null,
    manualCutLine: null,
    reportImage: null,
    currentProjectId: null,
  }),

  setScale: (scale) => {
    set({ scale });
    if (scale && scale > 0) void AsyncStorage.setItem(SCALE_KEY, String(scale));
    else void AsyncStorage.removeItem(SCALE_KEY);
  },

  setPlots: (plots) => set((state) => {
    const nextPlots = typeof plots === 'function' ? plots(state.plots) : plots;
    return {
      plots: nextPlots,
      plotsHistory: [],
      plotsFuture: [],
      results: nextPlots.at(-1)?.results ?? null,
    };
  }),

  setMode: (mode) => set({ mode }),

  setStageSize: (stageSize) => set({ stageSize }),

  setStageTransform: ({ scale, pos }) => set({ stageScale: scale, stagePos: pos }),

  getStageCenterPoint: () => {
    const state = get();
    return {
      x: (state.stageSize.width / 2 - state.stagePos.x) / state.stageScale,
      y: (state.stageSize.height / 2 - state.stagePos.y) / state.stageScale,
    };
  },

  startCalibration: () => {
    const state = get();
    if (!state.mapImage) {
      ErrorToast('Upload a map before setting the scale.');
      return;
    }
    set({
      mode: 'calibrating',
      scale: null,
      calibrationLine: [],
      calibrationLineFuture: [],
      isDistanceModalOpen: false,
      plotPoints: [],
      plotPointsFuture: [],
      plots: [],
      plotsHistory: [],
      plotsFuture: [],
      results: null,
      isPlotFinished: false,
      manualDividePlotId: null,
      manualCutLine: null,
    });
  },

  cancelCalibration: () => set({
    mode: 'none',
    calibrationLine: [],
    calibrationLineFuture: [],
    isDistanceModalOpen: false,
  }),

  retryCalibration: () => set({
    mode: 'calibrating',
    calibrationLine: [],
    calibrationLineFuture: [],
    isDistanceModalOpen: false,
  }),

  submitCalibrationDistance: (distanceFt) => {
    const state = get();
    if (!Number.isFinite(distanceFt) || distanceFt <= 0) {
      ErrorToast('Distance must be greater than 0.');
      return false;
    }
    if (state.calibrationLine.length < 4) {
      ErrorToast('Add the start and end points of the scale bar.');
      return false;
    }

    const pixelDistance = Math.hypot(
      state.calibrationLine[2] - state.calibrationLine[0],
      state.calibrationLine[3] - state.calibrationLine[1],
    );
    if (pixelDistance <= 0) return false;

    const nextScale = pixelDistance / distanceFt;
    set({
      scale: nextScale,
      mode: 'none',
      calibrationLine: [],
      calibrationLineFuture: [],
      isDistanceModalOpen: false,
    });
    void AsyncStorage.setItem(SCALE_KEY, String(nextScale));
    SuccessToast(`Scale set: 1 pixel = ${(1 / nextScale).toFixed(6)} ft`);
    return true;
  },

  submitManualScale: (feetPerPixel) => {
    if (!Number.isFinite(feetPerPixel) || feetPerPixel <= 0) {
      ErrorToast('Feet per pixel must be greater than 0.');
      return false;
    }
    set({
      scale: 1 / feetPerPixel,
      mode: 'none',
      calibrationLine: [],
      calibrationLineFuture: [],
      isDistanceModalOpen: false,
      plotPoints: [],
      plotPointsFuture: [],
      plots: [],
      plotsHistory: [],
      plotsFuture: [],
      results: null,
    });
    void AsyncStorage.setItem(SCALE_KEY, String(1 / feetPerPixel));
    SuccessToast(`Scale set: 1 pixel = ${feetPerPixel.toFixed(6)} ft`);
    return true;
  },

  undoCalibrationPoint: () => {
    const state = get();
    if (state.calibrationLine.length < 2) return;
    const removed = state.calibrationLine.slice(-2);
    set({
      calibrationLine: state.calibrationLine.slice(0, -2),
      calibrationLineFuture: [...state.calibrationLineFuture, ...removed],
      isDistanceModalOpen: false,
    });
  },

  redoCalibrationPoint: () => {
    const state = get();
    if (state.calibrationLineFuture.length < 2 || state.calibrationLine.length >= 4) return;
    const restored = state.calibrationLineFuture.slice(-2);
    const calibrationLine = [...state.calibrationLine, ...restored];
    set({
      calibrationLine,
      calibrationLineFuture: state.calibrationLineFuture.slice(0, -2),
      isDistanceModalOpen: calibrationLine.length >= 4,
    });
  },

  startPlotDrawing: () => {
    const state = get();
    if (!state.mapImage) {
      ErrorToast('Upload a map before drawing a plot.');
      return false;
    }
    if (!state.scale) {
      ErrorToast('Set the scale before drawing a plot.');
      return false;
    }
    set({
      mode: 'drawing_plot',
      plotPoints: [],
      plotPointsFuture: [],
      isPlotFinished: false,
      calibrationLine: [],
    });
    return true;
  },

  addPointAt: (rawPoint) => {
    const state = get();
    const snapThreshold = 10 / Math.max(state.stageScale, 0.01);
    let point = getSnappedPoint(rawPoint, state.plots.map((plot) => plot.points), snapThreshold);

    if (state.mode === 'calibrating') {
      if (state.calibrationLine.length >= 4) return;
      if (state.calibrationLine.length >= 2) {
        const lastX = state.calibrationLine[state.calibrationLine.length - 2];
        const lastY = state.calibrationLine[state.calibrationLine.length - 1];
        if (Math.hypot(point.x - lastX, point.y - lastY) < 1e-3) return;
      }
      const calibrationLine = [...state.calibrationLine, point.x, point.y];
      set({
        calibrationLine,
        calibrationLineFuture: [],
        isDistanceModalOpen: calibrationLine.length >= 4,
      });
      return;
    }

    if (state.mode !== 'drawing_plot' || state.isPlotFinished) return;

    if (state.plotPoints.length > 0) {
      const firstPoint = state.plotPoints[0];
      const lastPoint = state.plotPoints[state.plotPoints.length - 1];
      const directionPoint = state.plotPoints.length >= 2 ? state.plotPoints[1] : point;
      const containingPlot = getDirectionalContainingPlot(
        state.plots,
        firstPoint,
        directionPoint,
        state.stageScale,
      );
      if (containingPlot) point = clipLineToPolygon(lastPoint, point, containingPlot.points);
    }

    if (state.plotPoints.length >= 3) {
      const first = state.plotPoints[0];
      const closeThreshold = 20 / Math.max(state.stageScale, 0.01);
      if (Math.hypot(point.x - first.x, point.y - first.y) <= closeThreshold) {
        get().finishPlot();
        return;
      }
    }

    set({ plotPoints: [...state.plotPoints, point], plotPointsFuture: [] });
  },

  addCenterPoint: () => get().addPointAt(get().getStageCenterPoint()),

  finishPlot: () => {
    const state = get();
    const points = normalizePolygonPoints(state.plotPoints);
    if (points.length < 3) {
      ErrorToast('Add at least 3 points to finish a plot.');
      return false;
    }
    const results = calculatePolygonData(points, state.scale);
    if (!results) {
      ErrorToast('The plot shape is invalid. Please adjust the points.');
      return false;
    }

    const nextPlot: PlotRecord = {
      id: createId(),
      name: `Plot ${state.plots.length + 1}`,
      points,
      results,
      color: PLOT_COLOR_PALETTE[state.plots.length % PLOT_COLOR_PALETTE.length],
    };
    set({
      plots: [...state.plots, nextPlot],
      plotsHistory: [...state.plotsHistory, state.plots],
      plotsFuture: [],
      plotPoints: [],
      plotPointsFuture: [],
      results,
      isPlotFinished: true,
      mode: 'none',
    });
    void incrementMeasuredPlotCount();
    SuccessToast(`${nextPlot.name} measured successfully.`);
    return true;
  },

  cancelActiveMode: () => set({
    mode: 'none',
    plotPoints: [],
    plotPointsFuture: [],
    calibrationLine: [],
    calibrationLineFuture: [],
    isDistanceModalOpen: false,
    manualDividePlotId: null,
    manualCutLine: null,
  }),

  undoPlotAction: () => {
    const state = get();
    if (state.plotPoints.length > 0) {
      const removed = state.plotPoints[state.plotPoints.length - 1];
      set({
        plotPoints: state.plotPoints.slice(0, -1),
        plotPointsFuture: [...state.plotPointsFuture, removed],
      });
      return;
    }
    if (state.plotsHistory.length === 0) return;
    const history = [...state.plotsHistory];
    const previousPlots = history.pop()!;
    set({
      plots: previousPlots,
      plotsHistory: history,
      plotsFuture: [...state.plotsFuture, state.plots],
      results: previousPlots.at(-1)?.results ?? null,
    });
  },

  redoPlotAction: () => {
    const state = get();
    if (state.plotPointsFuture.length > 0) {
      const future = [...state.plotPointsFuture];
      const nextPoint = future.pop()!;
      set({ plotPoints: [...state.plotPoints, nextPoint], plotPointsFuture: future });
      return;
    }
    if (state.plotPoints.length > 0 || state.plotsFuture.length === 0) return;
    const future = [...state.plotsFuture];
    const nextPlots = future.pop()!;
    set({
      plots: nextPlots,
      plotsHistory: [...state.plotsHistory, state.plots],
      plotsFuture: future,
      results: nextPlots.at(-1)?.results ?? null,
    });
  },

  clearPlots: () => set({
    mode: 'none',
    plotPoints: [],
    plotPointsFuture: [],
    plots: [],
    plotsHistory: [],
    plotsFuture: [],
    results: null,
    isPlotFinished: false,
    manualDividePlotId: null,
    manualCutLine: null,
  }),

  setIsShowDiagonals: (isShowDiagonals) => set({ isShowDiagonals }),

  setIsMagnifierEnabled: (isMagnifierEnabled) => set({ isMagnifierEnabled }),

  setIsPinching: (isPinching) => set({ isPinching }),

  setSnapHint: (snapHint) => set({ snapHint }),

  setReportInfo: (reportInfo) => set((state) => ({
    reportInfo: typeof reportInfo === 'function' ? reportInfo(state.reportInfo) : reportInfo,
  })),

  setReportImage: (reportImage) => set({ reportImage }),

  setCurrentProjectId: (currentProjectId) => set({ currentProjectId }),

  setPlotSaveName: (plotSaveName) => set({ plotSaveName }),

  savePlotsToLibrary: () => {
    const state = get();
    if (!state.scale) {
      ErrorToast('Set the scale before saving.');
      return false;
    }
    const targetPlots = state.plots.filter((plot) => !plot.isSaved);
    if (!targetPlots.length) {
      ErrorToast('Finish at least one plot before saving.');
      return false;
    }
    const cleanName = state.plotSaveName.trim();
    if (!cleanName) {
      ErrorToast('Enter a plot name.');
      return false;
    }
    const now = Date.now();
    const namedPlots: SavedPlotRecord[] = targetPlots.map((plot, index) => ({
      ...plot,
      id: `${now}-${index}`,
      name: targetPlots.length > 1 ? `${cleanName} - Plot ${index + 1}` : cleanName,
      color: plot.color || '#0d9488',
      scale: state.scale!,
      sourceName: state.mapImage?.name || 'Uploaded map',
      createdAt: now,
      expiresAt: now + SAVED_PLOT_TTL_MS,
    }));
    const savedPlots = [
      ...state.savedPlots.filter((plot) => plot.expiresAt > now),
      ...namedPlots,
    ];
    set({ savedPlots, plotSaveName: '' });
    void AsyncStorage.setItem(SAVED_PLOTS_KEY, JSON.stringify(savedPlots));
    SuccessToast('Plot saved to the scratch library.');
    return true;
  },

  deleteSavedPlot: (plotId) => {
    const savedPlots = get().savedPlots.filter((plot) => plot.id !== plotId);
    set({ savedPlots });
    void AsyncStorage.setItem(SAVED_PLOTS_KEY, JSON.stringify(savedPlots));
    SuccessToast('Saved plot deleted.');
  },

  updateSavedPlot: (plotId, updates) => {
    const savedPlots = get().savedPlots.map((plot) => plot.id === plotId ? { ...plot, ...updates } : plot);
    set({ savedPlots });
    void AsyncStorage.setItem(SAVED_PLOTS_KEY, JSON.stringify(savedPlots));
  },

  startManualDivide: () => {
    if (get().plots.length === 0) return;
    set({ mode: 'manual_divide_plot', manualDividePlotId: null, manualCutLine: null, nudgeTarget: 'all' });
  },

  cancelManualDivide: () => set({
    mode: 'none',
    manualDividePlotId: null,
    manualCutLine: null,
    nudgeTarget: 'all',
  }),

  selectPlotForDivide: (point) => {
    const state = get();
    if (state.mode !== 'manual_divide_plot') return;
    const plot = [...state.plots].reverse().find((item) => isPointInPolygon(point, item.points));
    if (!plot) return;
    set({
      manualDividePlotId: plot.id,
      manualCutLine: getDefaultManualCutLine(plot.points, point, state.stageScale),
      nudgeTarget: 'all',
    });
  },

  setManualDividePlotId: (manualDividePlotId) => set({ manualDividePlotId }),

  setManualCutLine: (manualCutLine) => set({ manualCutLine }),

  moveManualCutAnchor: (index, rawPoint) => {
    const state = get();
    if (!state.manualCutLine || !state.manualDividePlotId) return;
    const plot = state.plots.find((item) => item.id === state.manualDividePlotId);
    if (!plot || index < 0 || index >= state.manualCutLine.length) return;

    const lastIndex = state.manualCutLine.length - 1;
    const isBoundary = index === 0 || index === lastIndex;
    const cornerSnap = isBoundary
      ? getCornerSnapPoint(
          rawPoint,
          plot.points,
          MANUAL_DIVIDE_CORNER_SNAP_PX / Math.max(state.stageScale, 0.01),
        )
      : null;
    const point = cornerSnap ?? getSnappedPoint(
      rawPoint,
      [plot.points],
      isBoundary ? Number.POSITIVE_INFINITY : 14 / Math.max(state.stageScale, 0.01),
    );
    const manualCutLine = [...state.manualCutLine];
    manualCutLine[index] = point;
    set({ manualCutLine });
  },

  setNudgeTarget: (nudgeTarget) => set({ nudgeTarget }),

  nudgeManualCutLine: (direction, step = 0.6) => {
    const state = get();
    const line = state.manualCutLine;
    const plot = state.plots.find((item) => item.id === state.manualDividePlotId);
    if (!line || line.length < 2 || !plot) return;

    const first = line[0];
    const last = line[line.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const length = Math.hypot(dx, dy);
    if (!length) return;
    const offset = (step / Math.max(state.stageScale, 0.01)) * direction;
    const normal = { x: -dy / length, y: dx / length };

    const manualCutLine = line.map((point, index) => {
      const shouldMove = state.nudgeTarget === 'all'
        || (state.nudgeTarget === 'start' && index === 0)
        || (state.nudgeTarget === 'end' && index === line.length - 1);
      if (!shouldMove) return point;
      const shifted = { x: point.x + normal.x * offset, y: point.y + normal.y * offset };
      const isBoundary = index === 0 || index === line.length - 1;
      return getSnappedPoint(
        shifted,
        [plot.points],
        isBoundary ? Number.POSITIVE_INFINITY : 14 / Math.max(state.stageScale, 0.01),
      );
    });
    set({ manualCutLine });
  },

  addManualCutPoint: () => {
    const line = get().manualCutLine;
    if (!line || line.length < 2) return;
    let insertIndex = 1;
    let longestDistance = -1;
    for (let index = 0; index < line.length - 1; index += 1) {
      const pointDistance = Math.hypot(line[index + 1].x - line[index].x, line[index + 1].y - line[index].y);
      if (pointDistance > longestDistance) {
        longestDistance = pointDistance;
        insertIndex = index + 1;
      }
    }
    const start = line[insertIndex - 1];
    const end = line[insertIndex];
    set({
      manualCutLine: [
        ...line.slice(0, insertIndex),
        { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
        ...line.slice(insertIndex),
      ],
    });
  },

  removeManualCutPoint: () => {
    const line = get().manualCutLine;
    if (!line || line.length <= 2) return;
    set({ manualCutLine: [...line.slice(0, -2), line[line.length - 1]] });
  },

  executeManualDivide: () => {
    const state = get();
    const plotIndex = state.plots.findIndex((plot) => plot.id === state.manualDividePlotId);
    if (plotIndex < 0 || !state.manualCutLine || !state.scale) return false;
    const split = splitPolygonByPolyline(state.plots[plotIndex].points, state.manualCutLine);
    if (!split) {
      ErrorToast('The cut line must touch two plot boundaries. Adjust the line and try again.');
      return false;
    }
    const resultsA = calculatePolygonData(split.poly1, state.scale);
    const resultsB = calculatePolygonData(split.poly2, state.scale);
    if (!resultsA || !resultsB) {
      ErrorToast('Could not calculate the divided plot areas.');
      return false;
    }

    const source = state.plots[plotIndex];
    const nextPlots = [...state.plots];
    nextPlots.splice(
      plotIndex,
      1,
      { id: createId(), name: '', points: split.poly1, results: resultsA, color: source.color },
      {
        id: createId(),
        name: '',
        points: split.poly2,
        results: resultsB,
        color: PLOT_COLOR_PALETTE[(plotIndex + 1) % PLOT_COLOR_PALETTE.length],
      },
    );
    const renamedPlots = nextPlots.map((plot, index) => ({ ...plot, name: `Plot ${index + 1}` }));
    set({
      plots: renamedPlots,
      plotsHistory: [...state.plotsHistory, state.plots],
      plotsFuture: [],
      results: renamedPlots.at(-1)?.results ?? null,
      mode: 'none',
      manualDividePlotId: null,
      manualCutLine: null,
      nudgeTarget: 'all',
    });
    SuccessToast('Plot divided successfully.');
    return true;
  },
}));

export type { PlotRecord } from '../types/map';
