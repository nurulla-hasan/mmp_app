import { StateCreator } from 'zustand';
import { SuccessToast, ErrorToast } from '@/lib/utils';

const readSavedScale = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('mapScale');
    return raw ? parseFloat(raw) : null;
  } catch {
    return null;
  }
};

export interface CalibrationState {
  scale: number | null;
  manualScale: string;
  showManualScale: boolean;
  calibrationLine: number[];
  isDrawing: boolean;
}

export interface CalibrationActions {
  setScale: (scale: number | null) => void;
  setManualScale: (val: string) => void;
  setShowManualScale: (show: boolean) => void;
  setCalibrationLine: (line: number[]) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  handleManualScaleSubmit: (e: React.FormEvent) => void;
  _handleModalSubmit: (realDistance: number) => void;
}

export type CalibrationSlice = CalibrationState & CalibrationActions;

export const createCalibrationSlice: StateCreator<
  CalibrationSlice,
  [],
  [],
  CalibrationSlice
// eslint-disable-next-line @typescript-eslint/no-unused-vars
> = (set, get, _store) => ({
  // State
  scale: readSavedScale(),
  manualScale: '',
  showManualScale: false,
  calibrationLine: [],
  isDrawing: false,

  // Actions
  setScale: (scale) => set({ scale }),
  setManualScale: (manualScale) => set({ manualScale }),
  setShowManualScale: (showManualScale) => set({ showManualScale }),
  setCalibrationLine: (calibrationLine) => set({ calibrationLine }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),

  handleManualScaleSubmit: (e) => {
    e.preventDefault();
    const state = get();
    const ftPerPx = Number(state.manualScale);
    if (Number.isFinite(ftPerPx) && ftPerPx > 0) {
      const scaleValue = 1 / ftPerPx;
      set({ scale: scaleValue, showManualScale: false, calibrationLine: [], isDrawing: false });
      localStorage.setItem('mapScale', scaleValue.toString());
      SuccessToast(`স্কেল সেট করা হয়েছে: 1 px = ${ftPerPx.toFixed(6)} ft`);
      
      // Need to set mode to 'none' but it's in UISlice
      // This will be handled in main store wrapper
    } else {
      ErrorToast('দয়া করে ০ এর চেয়ে বড় একটি সংখ্যা লিখুন');
    }
  },

  _handleModalSubmit: (realDistance: number) => {
    const state = get();
    if (!Number.isFinite(realDistance) || realDistance <= 0) {
      ErrorToast('দয়া করে ০ এর চেয়ে বড় দূরত্ব দিন');
      return;
    }
    if (state.calibrationLine.length < 4) {
      ErrorToast('স্কেল নির্ধারণের রেখাটি অসম্পূর্ণ');
      return;
    }
    
    let pixelDistance = 0;
    for (let i = 0; i < state.calibrationLine.length - 2; i += 2) {
      const x1 = state.calibrationLine[i];
      const y1 = state.calibrationLine[i+1];
      const x2 = state.calibrationLine[i+2];
      const y2 = state.calibrationLine[i+3];
      pixelDistance += Math.hypot(x2 - x1, y2 - y1);
    }
    
    if (!Number.isFinite(pixelDistance) || pixelDistance <= 0) {
      ErrorToast('স্কেল নির্ধারণের রেখার দূরত্ব অবৈধ');
      return;
    }

    const newScale = pixelDistance / realDistance;
    set({ scale: newScale, calibrationLine: [], isDrawing: false });
    try {
      localStorage.setItem('mapScale', newScale.toString());
    } catch {
      // ignore
    }
    SuccessToast(`স্কেল সেট হয়েছে (1 px = ${(1 / newScale).toFixed(6)} ft)`);
    
    // Need to set mode and isModalOpen but they're in UISlice
    // This will be handled in main store wrapper
  },
});
