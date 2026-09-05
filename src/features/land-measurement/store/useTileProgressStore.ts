import { create } from 'zustand';

export type TileProgressStatus = 'idle' | 'preparing' | 'generating' | 'ready';

type TileProgressState = {
  status: TileProgressStatus;
  completed: number;
  total: number;
  setProgress: (status: TileProgressStatus, completed?: number, total?: number) => void;
  reset: () => void;
};

const initialState = {
  status: 'idle' as TileProgressStatus,
  completed: 0,
  total: 0,
};

export const useTileProgressStore = create<TileProgressState>((set) => ({
  ...initialState,
  setProgress: (status, completed = 0, total = 0) => set({ status, completed, total }),
  reset: () => set(initialState),
}));
