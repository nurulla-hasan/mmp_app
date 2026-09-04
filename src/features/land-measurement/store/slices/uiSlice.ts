import { StateCreator } from 'zustand';
import type { MapMode } from '../../types/map';

export interface UIState {
  mode: MapMode;
  isModalOpen: boolean;
  stagePos: { x: number; y: number };
  stageScale: number;
  stageSize: { width: number; height: number };
  isPinching: boolean;
  pendingAction: { type: 'clearMap' | 'clearPlot'; callback?: () => void } | null;
  snapHint: boolean;
  isShowDiagonals: boolean;
  reportInfo: { mouza: string; jlNo: string; dagNo: string; khatianNo: string; date: string; surveyorName: string };
  reportImage: string | null;
  currentProjectId: string | null;
  pointerPos: { x: number; y: number } | null;
  deviceType: 'mouse' | 'touch';
}

export interface UIActions {
  setMode: (mode: MapMode) => void;
  setIsModalOpen: (isOpen: boolean) => void;
  setStagePos: (pos: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setStageScale: (scale: number | ((prev: number) => number)) => void;
  setStageTransform: (transform: { scale: number; pos: { x: number; y: number } }) => void;
  setStageSize: (size: { width: number; height: number }) => void;
  setIsPinching: (isPinching: boolean) => void;
  setPendingAction: (action: { type: 'clearMap' | 'clearPlot'; callback?: () => void } | null) => void;
  setSnapHint: (hint: boolean) => void;
  setIsShowDiagonals: (enabled: boolean) => void;
  setReportInfo: (info: { mouza: string; jlNo: string; dagNo: string; khatianNo: string; date: string; surveyorName: string } | ((prev: { mouza: string; jlNo: string; dagNo: string; khatianNo: string; date: string; surveyorName: string }) => { mouza: string; jlNo: string; dagNo: string; khatianNo: string; date: string; surveyorName: string })) => void;
  setReportImage: (image: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;
  setPointerPos: (pos: { x: number; y: number } | null) => void;
  setDeviceType: (type: 'mouse' | 'touch') => void;
  getStageCenterPoint: () => { x: number; y: number };
  getStageTargetPoint: () => { x: number; y: number };
}

export type UISlice = UIState & UIActions;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set, get, _store) => ({
  // State
  mode: 'none',
  isModalOpen: false,
  stagePos: { x: 0, y: 0 },
  stageScale: 1,
  stageSize: { width: 0, height: 0 },
  isPinching: false,
  pendingAction: null,
  snapHint: false,
  isShowDiagonals: false,
  reportInfo: { mouza: '', jlNo: '', dagNo: '', khatianNo: '', date: new Date().toLocaleDateString('en-GB'), surveyorName: '' },
  reportImage: null,
  currentProjectId: null,
  pointerPos: null,
  deviceType: 'touch',

  // Actions
  setMode: (mode) => set({ mode }),
  setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
  setStagePos: (pos) =>
    set((state) => ({
      stagePos: typeof pos === 'function' ? pos(state.stagePos) : pos,
    })),
  setStageScale: (scale) =>
    set((state) => ({
      stageScale: typeof scale === 'function' ? scale(state.stageScale) : scale,
    })),
  setStageTransform: ({ scale, pos }) => set({ stageScale: scale, stagePos: pos }),
  setStageSize: (stageSize) => set({ stageSize }),
  setIsPinching: (isPinching) => set({ isPinching }),
  setPendingAction: (action) => set({ pendingAction: action }),
  setSnapHint: (snapHint) => set({ snapHint }),
  setIsShowDiagonals: (enabled) => set({ isShowDiagonals: enabled }),
  setReportInfo: (info) =>
    set((state) => ({
      reportInfo: typeof info === 'function' ? info(state.reportInfo) : info,
    })),
  setReportImage: (reportImage) => set({ reportImage }),
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setPointerPos: (pos) => set({ pointerPos: pos }),
  setDeviceType: (type) => set({ deviceType: type }),

  getStageCenterPoint: () => {
    const state = get();
    const cx = state.stageSize.width / 2;
    const cy = state.stageSize.height / 2;
    return {
      x: (cx - state.stagePos.x) / state.stageScale,
      y: (cy - state.stagePos.y) / state.stageScale,
    };
  },
  
  getStageTargetPoint: () => {
    const state = get();
    if (state.deviceType === 'mouse' && state.pointerPos) {
      return state.pointerPos;
    }
    return state.getStageCenterPoint();
  },
});
