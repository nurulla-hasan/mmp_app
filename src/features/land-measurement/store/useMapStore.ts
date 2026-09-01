import { create } from 'zustand';
import { ErrorToast, SuccessToast } from '@/lib/utils';
import { calculatePolygonData } from '../utils/calculations';
import { normalizePolygonPoints } from '../utils/geometry';
import type { MapMode, PlotRecord, Point, PolygonResults } from '../types/map';

const PLOT_COLORS = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#e11d48'];

export type MapImage = {
  uri: string;
  width: number;
  height: number;
  name?: string;
};

type MapStore = {
  mapImage: MapImage | null;
  mode: MapMode;
  scale: number | null;
  calibrationDistanceFt: number;
  calibrationPoints: Point[];
  plotPoints: Point[];
  plotPointsFuture: Point[];
  plots: PlotRecord[];
  plotsHistory: PlotRecord[][];
  plotsFuture: PlotRecord[][];
  results: PolygonResults | null;

  setMapImage: (image: MapImage) => void;
  clearMapImage: () => void;
  setMode: (mode: MapMode) => void;
  startPlotDrawing: () => void;
  addPointAt: (point: Point) => void;
  finishPlot: () => boolean;
  undoPlotAction: () => void;
  redoPlotAction: () => void;
  clearPlots: () => void;
  startCalibration: (distanceFt: number) => boolean;
  addCalibrationPoint: (point: Point) => void;
  cancelCalibration: () => void;
};

const emptyDrawingState = {
  mode: 'none' as MapMode,
  scale: null as number | null,
  calibrationPoints: [] as Point[],
  plotPoints: [] as Point[],
  plotPointsFuture: [] as Point[],
  plots: [] as PlotRecord[],
  plotsHistory: [] as PlotRecord[][],
  plotsFuture: [] as PlotRecord[][],
  results: null as PolygonResults | null,
};

export const useMapStore = create<MapStore>((set, get) => ({
  mapImage: null,
  calibrationDistanceFt: 660,
  ...emptyDrawingState,

  setMapImage: (mapImage) => set({ mapImage, ...emptyDrawingState }),

  clearMapImage: () => set({ mapImage: null, ...emptyDrawingState }),

  setMode: (mode) => set({ mode }),

  startPlotDrawing: () => set({ mode: 'drawing_plot', calibrationPoints: [] }),

  addPointAt: (point) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    set((state) => ({
      plotPoints: [...state.plotPoints, point],
      plotPointsFuture: [],
    }));
  },

  finishPlot: () => {
    const state = get();
    const points = normalizePolygonPoints(state.plotPoints);

    if (points.length < 3) {
      ErrorToast('প্লট শেষ করতে অন্তত ৩টি পয়েন্ট দিন।');
      return false;
    }
    if (!state.scale) {
      ErrorToast('সঠিক ফলাফলের জন্য আগে স্কেল সেট করুন।');
      return false;
    }

    const results = calculatePolygonData(points, state.scale);
    if (!results) {
      ErrorToast('প্লটের আকার সঠিক নয়। পয়েন্টগুলো আবার দিন।');
      return false;
    }

    const nextPlot: PlotRecord = {
      id: `${Date.now()}-${state.plots.length}`,
      name: `প্লট ${state.plots.length + 1}`,
      points,
      results,
      color: PLOT_COLORS[state.plots.length % PLOT_COLORS.length],
    };

    set({
      plots: [...state.plots, nextPlot],
      plotsHistory: [...state.plotsHistory, state.plots],
      plotsFuture: [],
      plotPoints: [],
      plotPointsFuture: [],
      results,
      mode: 'none',
    });
    SuccessToast(`${nextPlot.name} পরিমাপ সম্পন্ন হয়েছে।`);
    return true;
  },

  undoPlotAction: () => {
    const state = get();
    if (state.plotPoints.length > 0) {
      const undonePoint = state.plotPoints[state.plotPoints.length - 1];
      set({
        plotPoints: state.plotPoints.slice(0, -1),
        plotPointsFuture: [...state.plotPointsFuture, undonePoint],
      });
      return;
    }

    if (state.plotsHistory.length > 0) {
      const nextHistory = [...state.plotsHistory];
      const previousPlots = nextHistory.pop()!;
      set({
        plots: previousPlots,
        plotsHistory: nextHistory,
        plotsFuture: [...state.plotsFuture, state.plots],
        results: previousPlots.at(-1)?.results ?? null,
      });
    }
  },

  redoPlotAction: () => {
    const state = get();
    if (state.plotPointsFuture.length > 0) {
      const nextFuture = [...state.plotPointsFuture];
      const point = nextFuture.pop()!;
      set({
        plotPoints: [...state.plotPoints, point],
        plotPointsFuture: nextFuture,
      });
      return;
    }

    if (state.plotsFuture.length > 0) {
      const nextFuture = [...state.plotsFuture];
      const nextPlots = nextFuture.pop()!;
      set({
        plots: nextPlots,
        plotsHistory: [...state.plotsHistory, state.plots],
        plotsFuture: nextFuture,
        results: nextPlots.at(-1)?.results ?? null,
      });
    }
  },

  clearPlots: () => set({
    mode: 'none',
    calibrationPoints: [],
    plotPoints: [],
    plotPointsFuture: [],
    plots: [],
    plotsHistory: [],
    plotsFuture: [],
    results: null,
  }),

  startCalibration: (distanceFt) => {
    if (!Number.isFinite(distanceFt) || distanceFt <= 0) {
      ErrorToast('দূরত্ব ০-এর চেয়ে বড় হতে হবে।');
      return false;
    }
    set({
      mode: 'calibrating',
      calibrationDistanceFt: distanceFt,
      calibrationPoints: [],
    });
    return true;
  },

  addCalibrationPoint: (point) => {
    const state = get();
    if (state.calibrationPoints.length === 0) {
      set({ calibrationPoints: [point] });
      return;
    }

    const start = state.calibrationPoints[0];
    const pixelDistance = Math.hypot(point.x - start.x, point.y - start.y);
    if (pixelDistance < 2) {
      ErrorToast('দুটি আলাদা পয়েন্ট নির্বাচন করুন।');
      return;
    }

    set({
      scale: pixelDistance / state.calibrationDistanceFt,
      calibrationPoints: [start, point],
      mode: 'none',
    });
    SuccessToast(`স্কেল সেট হয়েছে: ${state.calibrationDistanceFt} ফুট`);
  },

  cancelCalibration: () => set({ mode: 'none', calibrationPoints: [] }),
}));

export type { PlotRecord } from '../types/map';
