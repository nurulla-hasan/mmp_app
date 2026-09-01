import { StateCreator } from 'zustand';
import { ErrorToast } from '@/lib/utils';
import { PLOT_COLOR_PALETTE } from '../../utils/canvas';
import { calculatePolygonData } from '../../utils/calculations';
import { getSnappedPoint } from '../../utils/geometry';
import { splitPolygonByPolyline } from '../../utils/polygonDivision';
import type { Point, PlotRecord } from '../../types/map';

export type NudgeTarget = 'all' | 'start' | 'end';

export interface DivideState {
  manualDividePlotId: string | null;
  manualCutLine: Point[] | null;
  nudgeTarget: NudgeTarget;
}

export interface DivideActions {
  setManualDividePlotId: (id: string | null) => void;
  setManualCutLine: (line: Point[] | null) => void;
  setNudgeTarget: (target: NudgeTarget) => void;
  nudgeManualCutLine: (direction: -1 | 1, step?: number) => void;
  startManualDivide: () => void;
  cancelManualDivide: () => void;
  executeManualDivide: (plots: PlotRecord[], scale: number | null) => PlotRecord[] | null;
}

export type DivideSlice = DivideState & DivideActions;

export const createDivideSlice: StateCreator<DivideSlice, [], [], DivideSlice> = (
  set,
  get,
  // _store
) => ({
  // State
  manualDividePlotId: null,
  manualCutLine: null,
  nudgeTarget: 'all',

  // Actions
  setManualDividePlotId: (id) => set({ manualDividePlotId: id }),
  setManualCutLine: (line) => set({ manualCutLine: line }),
  setNudgeTarget: (target) => set({ nudgeTarget: target }),

  nudgeManualCutLine: (direction, step = 0.6) => {
    const state = get();
    const { manualCutLine, manualDividePlotId, nudgeTarget } = state;
    const fullState = get() as unknown as {
      plots: PlotRecord[];
      stageScale: number;
    };
    if (!manualCutLine || manualCutLine.length < 2 || !manualDividePlotId) return;

    const plot = fullState.plots?.find((p) => p.id === manualDividePlotId);
    if (!plot) return;

    const scaleFactor = fullState.stageScale || 1;
    const effectiveStep = (step / scaleFactor) * direction;

    const p0 = manualCutLine[0];
    const pEnd = manualCutLine[manualCutLine.length - 1];
    const dx = pEnd.x - p0.x;
    const dy = pEnd.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    // Unit normal vector perpendicular to cut line
    const nx = -dy / len;
    const ny = dx / len;

    const target = nudgeTarget ?? 'all';
    const lastIndex = manualCutLine.length - 1;

    const newLines = manualCutLine.map((pt, idx) => {
      const isTarget =
        target === 'all' ||
        (target === 'start' && idx === 0) ||
        (target === 'end' && idx === lastIndex);

      if (!isTarget) return pt;

      const shifted = {
        x: pt.x + nx * effectiveStep,
        y: pt.y + ny * effectiveStep,
      };

      const isBoundary = idx === 0 || idx === lastIndex;
      return getSnappedPoint(
        shifted,
        [plot.points],
        isBoundary ? Number.POSITIVE_INFINITY : 14 / scaleFactor
      );
    });

    set({ manualCutLine: newLines });
  },

  // These are handled in main store as they need to set mode
  startManualDivide: () => {},
  cancelManualDivide: () => {},

  executeManualDivide: (plots, scale) => {
    const state = get();
    if (!state.manualDividePlotId || !state.manualCutLine || !scale) return null;

    const plotIndex = plots.findIndex((p) => p.id === state.manualDividePlotId);
    if (plotIndex === -1) return null;
    const plot = plots[plotIndex];

    if (state.manualCutLine.length < 2) return null;

    const polySplits = splitPolygonByPolyline(plot.points, state.manualCutLine);
    if (!polySplits) {
      ErrorToast('সঠিকভাবে জমি ভাগ করা সম্ভব হয়নি। লাইনটি সম্পূর্ণ জমির উপর দিয়ে টানুন।');
      return null;
    }

    const { poly1: splitA, poly2: splitB } = polySplits;

    if (splitA.length < 3 || splitB.length < 3) {
      ErrorToast('সঠিকভাবে জমি ভাগ করা সম্ভব হয়নি। লাইনটি সম্পূর্ণ জমির উপর দিয়ে টানুন।');
      return null;
    }

    const resultsA = calculatePolygonData(splitA, scale);
    const resultsB = calculatePolygonData(splitB, scale);

    if (!resultsA || !resultsB) {
      ErrorToast('ভাগ করা জমির ক্ষেত্রফল হিসাব করা সম্ভব হয়নি।');
      return null;
    }

    const newPlot1: PlotRecord = {
      id: crypto.randomUUID(),
      name: '',
      points: splitA,
      results: resultsA,
      color: plot.color,
    };

    const newPlot2: PlotRecord = {
      id: crypto.randomUUID(),
      name: '',
      points: splitB,
      results: resultsB,
      color: PLOT_COLOR_PALETTE[(plotIndex + 1) % PLOT_COLOR_PALETTE.length],
    };

    const newPlots = [...plots];
    newPlots.splice(plotIndex, 1, newPlot1, newPlot2);

    // Re-index after every split so repeated divisions can never create duplicate names.
    const renamedPlots = newPlots.map((item, index) => ({
      ...item,
      name: `Plot ${index + 1}`,
    }));

    set({ manualDividePlotId: null, manualCutLine: null, nudgeTarget: 'all' });

    return renamedPlots;
  },
});
