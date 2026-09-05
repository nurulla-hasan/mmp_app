import { create } from 'zustand';
import type {
  AlignmentMode,
  ControlPair,
  GeoBackgroundMode,
  GeoImage,
  GeoMapStyle,
  GeoPoint,
  GeoTransform,
  GeoView,
  Point2D,
} from '../types';
import { solveGeoTransform } from '../utils/geo-math';

type GeoState = {
  image: GeoImage | null;
  activeView: GeoView;
  controlPairs: ControlPair[];
  redoPairs: ControlPair[];
  pendingSource: Point2D | null;
  transform: GeoTransform | null;
  alignmentMode: AlignmentMode;
  mapStyle: GeoMapStyle;
  opacity: number;
  backgroundMode: GeoBackgroundMode;
  setImage: (image: GeoImage) => void;
  clear: () => void;
  setActiveView: (view: GeoView) => void;
  setMapStyle: (style: GeoMapStyle) => void;
  setOpacity: (opacity: number) => void;
  setBackgroundMode: (mode: GeoBackgroundMode) => void;
  setAlignmentMode: (mode: AlignmentMode) => void;
  captureSource: (point: Point2D) => void;
  captureWorld: (point: GeoPoint) => void;
  removePair: (id: string) => void;
  undo: () => void;
  redo: () => void;
  resetAlignment: () => void;
};

function fit(
  pairs: ControlPair[],
  image: GeoImage | null,
  preferred: AlignmentMode,
): GeoTransform | null {
  if (!image || pairs.length < 2) return null;
  const mode: AlignmentMode = preferred === 'affine' && pairs.length >= 3 ? 'affine' : 'similarity';
  try {
    return solveGeoTransform(pairs, image, mode);
  } catch {
    return null;
  }
}

const initial = {
  image: null,
  activeView: 'source' as GeoView,
  controlPairs: [] as ControlPair[],
  redoPairs: [] as ControlPair[],
  pendingSource: null as Point2D | null,
  transform: null as GeoTransform | null,
  alignmentMode: 'similarity' as AlignmentMode,
  mapStyle: 'satellite' as GeoMapStyle,
  opacity: 0.72,
  backgroundMode: 'original' as GeoBackgroundMode,
};

export const useMouzaGeoStore = create<GeoState>((set, get) => ({
  ...initial,
  setImage: (image) => set({ ...initial, image }),
  clear: () => set({ ...initial }),
  setActiveView: (activeView) => set({ activeView }),
  setMapStyle: (mapStyle) => set({ mapStyle }),
  setOpacity: (opacity) => set({ opacity: Math.max(0.2, Math.min(1, opacity)) }),
  setBackgroundMode: (backgroundMode) => set({ backgroundMode }),
  setAlignmentMode: (alignmentMode) => {
    const state = get();
    set({ alignmentMode, transform: fit(state.controlPairs, state.image, alignmentMode) });
  },
  captureSource: (pendingSource) => set({ pendingSource, activeView: 'world' }),
  captureWorld: (world) => {
    const state = get();
    if (!state.image || !state.pendingSource) return;
    const controlPairs = [
      ...state.controlPairs,
      {
        id: `geo_pair_${Date.now()}_${state.controlPairs.length}`,
        source: state.pendingSource,
        world,
      },
    ];
    set({
      controlPairs,
      redoPairs: [],
      pendingSource: null,
      transform: fit(controlPairs, state.image, state.alignmentMode),
      activeView: 'source',
    });
  },
  removePair: (id) => {
    const state = get();
    const removed = state.controlPairs.find((pair) => pair.id === id);
    const controlPairs = state.controlPairs.filter((pair) => pair.id !== id);
    set({
      controlPairs,
      redoPairs: removed ? [...state.redoPairs, removed] : state.redoPairs,
      transform: fit(controlPairs, state.image, state.alignmentMode),
    });
  },
  undo: () => {
    const state = get();
    if (state.pendingSource) {
      set({ pendingSource: null, activeView: 'source' });
      return;
    }
    if (!state.controlPairs.length) return;
    const removed = state.controlPairs[state.controlPairs.length - 1];
    const controlPairs = state.controlPairs.slice(0, -1);
    set({
      controlPairs,
      redoPairs: [...state.redoPairs, removed],
      transform: fit(controlPairs, state.image, state.alignmentMode),
      activeView: 'source',
    });
  },
  redo: () => {
    const state = get();
    if (!state.redoPairs.length || state.pendingSource) return;
    const restored = state.redoPairs[state.redoPairs.length - 1];
    const controlPairs = [...state.controlPairs, restored];
    set({
      controlPairs,
      redoPairs: state.redoPairs.slice(0, -1),
      transform: fit(controlPairs, state.image, state.alignmentMode),
    });
  },
  resetAlignment: () => set({
    controlPairs: [],
    redoPairs: [],
    pendingSource: null,
    transform: null,
    alignmentMode: 'similarity',
    activeView: 'source',
  }),
}));
