import { StateCreator } from 'zustand';
import { SuccessToast, WarningToast } from '@/lib/utils';
import type { SavedPlotRecord, PlotRecord } from '../../types/map';

const SAVED_PLOTS_KEY = 'mouzaSavedPlots';
const SAVED_PLOT_TTL_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

export const writeSavedPlots = (plots: SavedPlotRecord[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SAVED_PLOTS_KEY, JSON.stringify(plots));
  }
};

const readSavedPlots = (): SavedPlotRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_PLOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const now = Date.now();
    return parsed.filter((p: SavedPlotRecord) => p.expiresAt > now);
  } catch {
    return [];
  }
};

export interface SavedPlotsState {
  savedPlots: SavedPlotRecord[];
  plotSaveName: string;
}

export interface SavedPlotsActions {
  setSavedPlots: (plots: SavedPlotRecord[] | ((prev: SavedPlotRecord[]) => SavedPlotRecord[])) => void;
  setPlotSaveName: (name: string) => void;
  savePlotsToLibrary: (
    plots: PlotRecord[],
    scale: number | null,
    imageName: string,
    selectedFileName: string | undefined
  ) => boolean;
  deleteSavedPlot: (plotId: string) => void;
  updateSavedPlot: (plotId: string, updates: Partial<SavedPlotRecord>) => void;
}

export type SavedPlotsSlice = SavedPlotsState & SavedPlotsActions;

export const createSavedPlotsSlice: StateCreator<SavedPlotsSlice, [], [], SavedPlotsSlice> = (set, get, _store) => ({
  // State
  savedPlots: readSavedPlots(),
  plotSaveName: '',

  // Actions
  setSavedPlots: (savedPlots) =>
    set((state) => ({
      savedPlots: typeof savedPlots === 'function' ? savedPlots(state.savedPlots) : savedPlots,
    })),

  setPlotSaveName: (name) => set({ plotSaveName: name }),

  savePlotsToLibrary: (plots, scale, imageName, selectedFileName) => {
    const state = get();
    if (!scale) {
      WarningToast('সেভ করার আগে দয়া করে স্কেল সেট করে নিন');
      return false;
    }

    const targetPlots = plots.filter((plot) => !plot.isSaved);
    if (targetPlots.length === 0) {
      WarningToast('সেভ করার আগে দয়া করে অন্তত একটি প্লট আঁকা শেষ করুন');
      return false;
    }

    const cleanName = state.plotSaveName.trim();
    if (!cleanName) {
      WarningToast('দয়া করে প্লটের নাম লিখুন');
      return false;
    }

    const now = Date.now();
    const namedPlots: SavedPlotRecord[] = targetPlots.map((plot, index) => ({
      ...plot,
      id: `${now}-${index}`,
      name: targetPlots.length > 1 ? `${cleanName} - প্লট ${index + 1}` : cleanName,
      color: plot.color || '#0d9488',
      scale: scale,
      sourceName: imageName || selectedFileName || 'আপলোড করা ম্যাপ',
      createdAt: now,
      expiresAt: now + SAVED_PLOT_TTL_MS,
    }));

    const nextSavedPlots = [
      ...state.savedPlots.filter((plot) => plot.expiresAt > now),
      ...namedPlots,
    ];
    writeSavedPlots(nextSavedPlots);

    set({ savedPlots: nextSavedPlots, plotSaveName: '' });

    SuccessToast('স্ক্র্যাচ লাইব্রেরিতে প্লটটি সফলভাবে সেভ করা হয়েছে');
    return true;
  },

  deleteSavedPlot: (plotId: string) => {
    const state = get();
    const nextSavedPlots = state.savedPlots.filter((plot) => plot.id !== plotId);
    writeSavedPlots(nextSavedPlots);
    set({ savedPlots: nextSavedPlots });
    SuccessToast('সেভ করা প্লটটি মুছে ফেলা হয়েছে');
  },

  updateSavedPlot: (plotId: string, updates: Partial<SavedPlotRecord>) => {
    const state = get();
    const nextSavedPlots = state.savedPlots.map((plot) =>
      plot.id === plotId ? { ...plot, ...updates } : plot
    );
    writeSavedPlots(nextSavedPlots);
    set({ savedPlots: nextSavedPlots });
  },
});
