import { create } from 'zustand';
import {
  clipLineToPolygon,
  getSnappedPoint,
} from '../utils/geometry';
import { getDirectionalContainingPlot } from '../utils/directionalPlot';
import type { Point } from '../types/map';

// Import all slices
import { createImageSlice, type ImageSlice } from './slices/imageSlice';
import { createCalibrationSlice, type CalibrationSlice } from './slices/calibrationSlice';
import { createUISlice, type UISlice } from './slices/uiSlice';
import { createPlotSlice, type PlotSlice } from './slices/plotSlice';
import { createDivideSlice, type DivideSlice } from './slices/divideSlice';
import { createSavedPlotsSlice, type SavedPlotsSlice } from './slices/savedPlotsSlice';

// Re-export for convenience
export type { PlotRecord } from '../types/map';

// Combined store type
export type MapStore = ImageSlice &
  Omit<CalibrationSlice, 'handleManualScaleSubmit' | '_handleModalSubmit'> &
  UISlice &
  Omit<PlotSlice, 'finishPlot' | 'startPlotDrawing'> &
  Omit<DivideSlice, 'executeManualDivide' | 'startManualDivide' | 'cancelManualDivide'> &
  SavedPlotsSlice & {
    // High-level orchestration actions
    resetState: (fullReset?: boolean) => void;
    confirmClearMap: (callback?: () => void) => void;
    confirmClearPlot: (callback?: () => void) => void;
    executePendingAction: () => void;
    addPointAt: (pt: Point) => void;
    addCenterPoint: () => void;

    // Wrapper methods for component compatibility (overriding slice methods)
    handleManualScaleSubmit: (e: React.FormEvent) => void;
    _handleModalSubmit: (realDistance: number) => void;
    startPlotDrawing: () => void;
    finishPlot: () => void;
    startManualDivide: () => void;
    cancelManualDivide: () => void;
    executeManualDivide: () => void;
  };

export const useMapStore = create<MapStore>((set, get, store) => {
  // Type casting is necessary here because Zustand slices have different signatures
  // than the combined store. This is a known pattern in Zustand slice composition.
  // Each slice expects its own state type, but we're combining them into MapStore.
  const divideSlice = createDivideSlice(
    set as never,
    get as never,
    store as never
  );
  const plotSlice = createPlotSlice(
    set as never,
    get as never,
    store as never
  );
  const calibrationSlice = createCalibrationSlice(
    set as never,
    get as never,
    store as never
  );

  return {
    // Combine all slices
    ...createImageSlice(set as never, get as never, store as never),
    ...calibrationSlice,
    ...createUISlice(set as never, get as never, store as never),
    ...plotSlice,
    ...divideSlice,
    ...createSavedPlotsSlice(set as never, get as never, store as never),

    // High-level orchestration actions that coordinate multiple slices
    resetState: (fullReset = true) => {
      const state = get();

      if (fullReset) {
        // Full reset - clear everything
        state.handleClearFile();
        set({ currentProjectId: null });
      }

      // Reset plot and UI state (keep image and scale)
      state.clearPlot();
      state.setCalibrationLine([]);
      state.setIsDrawing(false);
      state.cancelManualDivide();
      state.setMode('none');
      state.setReportImage(null);
      state.setSnapHint(false);
    },

    confirmClearMap: (callback) => {
      const state = get();
      if (state.plots.length > 0 || state.scale !== null) {
        set({ pendingAction: { type: 'clearMap', callback } });
      } else {
        get().handleClearFile();
        if (callback) callback();
      }
    },

    confirmClearPlot: (callback) => {
      const state = get();
      if (state.plots.length > 0 || state.plotPoints.length > 0) {
        set({ pendingAction: { type: 'clearPlot', callback } });
      } else {
        get().clearPlot();
        if (callback) callback();
      }
    },

    executePendingAction: () => {
      const state = get();
      if (!state.pendingAction) return;

      if (state.pendingAction.type === 'clearMap') {
        get().handleClearFile();
        get().resetState(true);
        if (state.pendingAction.callback) state.pendingAction.callback();
      } else if (state.pendingAction.type === 'clearPlot') {
        get().clearPlot();
        get().setReportImage(null);
        set({ currentProjectId: null });
        if (state.pendingAction.callback) state.pendingAction.callback();
      }
      set({ pendingAction: null });
    },

    addPointAt: (rawPt: Point) => {
      const state = get();
      const snapThreshold = 10 / state.stageScale;
      let pt = getSnappedPoint(rawPt, state.plots.map((p) => p.points), snapThreshold);

      if (state.mode === 'calibrating') {
        if (state.calibrationLine.length === 0) {
          set({ calibrationLine: [pt.x, pt.y], isDrawing: true });
        } else {
          const len = state.calibrationLine.length;
          const xLast = state.calibrationLine[len - 2];
          const yLast = state.calibrationLine[len - 1];
          const dist = Math.hypot(pt.x - xLast, pt.y - yLast);
          if (dist < 1e-3) return; // Prevent duplicate points

          const nextLine = [...state.calibrationLine, pt.x, pt.y];
          if (nextLine.length >= 4) {
            set({ calibrationLine: nextLine, isDrawing: false, isModalOpen: true });
          } else {
            set({ calibrationLine: nextLine, isDrawing: true });
          }
        }
      } else if (state.mode === 'drawing_plot' && !state.isPlotFinished) {
        const SNAP_THRESHOLD = 20 / state.stageScale;

        if (state.plotPoints.length > 0) {
          const firstPoint = state.plotPoints[0];
          const lastPoint = state.plotPoints[state.plotPoints.length - 1];
          // Lock the intended side from the first segment. While placing the
          // second point we use its current target; afterwards the committed
          // second point keeps the same plot choice for the rest of the draw.
          const directionPoint = state.plotPoints.length >= 2
            ? state.plotPoints[1]
            : pt;
          const containingPlot = getDirectionalContainingPlot(
            state.plots,
            firstPoint,
            directionPoint,
            state.stageScale,
          );

          if (containingPlot) {
            pt = clipLineToPolygon(lastPoint, pt, containingPlot.points);
          }
        }

        if (state.plotPoints.length >= 3) {
          const first = state.plotPoints[0];
          if (Math.hypot(pt.x - first.x, pt.y - first.y) <= SNAP_THRESHOLD) {
            // Call finishPlot wrapper which will handle the parameters
            plotSlice.finishPlot(state.scale, state.plots);
            set({ snapHint: false, mode: 'none' });
            return;
          }
        }

        set({ plotPoints: [...state.plotPoints, pt], plotPointsFuture: [], snapHint: false });
      }
    },

    addCenterPoint: () => {
      get().addPointAt(get().getStageCenterPoint());
    },

    // Wrapper methods for backward compatibility
    handleManualScaleSubmit: (e) => {
      calibrationSlice.handleManualScaleSubmit(e);
      set({ mode: 'none', isModalOpen: false, calibrationLine: [], isDrawing: false });
    },

    _handleModalSubmit: (realDistance) => {
      calibrationSlice._handleModalSubmit(realDistance);
      set({ mode: 'none', isModalOpen: false, calibrationLine: [], isDrawing: false });
    },

    startPlotDrawing: () => {
      set({ plotPoints: [], plotPointsFuture: [], mode: 'drawing_plot', isDrawing: true, isPlotFinished: false });
    },

    finishPlot: () => {
      const state = get();
      plotSlice.finishPlot(state.scale, state.plots);
      set({ mode: 'none' });
    },

    startManualDivide: () => {
      set({ mode: 'manual_divide_plot', manualDividePlotId: null, manualCutLine: null });
    },

    cancelManualDivide: () => {
      set({ mode: 'none', manualDividePlotId: null, manualCutLine: null });
    },

    executeManualDivide: () => {
      const state = get();
      const result = divideSlice.executeManualDivide(state.plots, state.scale);
      if (result) {
        const previousIds = new Set(state.plots.map((plot) => plot.id));
        result
          .filter((plot) => !previousIds.has(plot.id));

        set({
          plots: result,
          plotsHistory: [...state.plotsHistory, state.plots],
          plotsFuture: [],
          results: result.length > 0 ? result[result.length - 1].results : null,
          mode: 'none',
        });
      }
    },
  };
});
