import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalculationService } from '../services/calculation-service';
import type { TCalculation } from '../types/calculation';

// 5 minutes cache TTL (aligned with Next.js CACHE_TIME.FIVE_MINUTES)
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CalculationState {
  calculations: TCalculation[];
  lastFetchedAt: number | null;
  isLoading: boolean;

  fetchCalculations: (force?: boolean, searchTerm?: string) => Promise<TCalculation[]>;
  removeCalculation: (id: string) => void;
  addCalculation: (calc: TCalculation) => void;
  invalidateCache: () => void;
}

export const useCalculationStore = create<CalculationState>()(
  persist(
    (set, get) => ({
      calculations: [],
      lastFetchedAt: null,
      isLoading: false,

      fetchCalculations: async (force = false, searchTerm = '') => {
        const { calculations, lastFetchedAt, isLoading } = get();
        const now = Date.now();
        const isFresh = lastFetchedAt && now - lastFetchedAt < CACHE_TTL_MS;

        // If not forced, no search term, and cache is fresh, return cached calculations immediately!
        if (!force && !searchTerm && isFresh && calculations.length > 0) {
          return calculations;
        }

        // Avoid multiple simultaneous background calls
        if (isLoading) return calculations;

        try {
          // Only show loading spinner if we have no cached data or user is actively searching
          if (calculations.length === 0 || searchTerm) {
            set({ isLoading: true });
          }

          const res = await CalculationService.getCalculations(searchTerm);
          if (res.success && res.data) {
            if (!searchTerm) {
              set({
                calculations: res.data,
                lastFetchedAt: Date.now(),
                isLoading: false,
              });
            } else {
              set({ isLoading: false });
            }
            return res.data;
          }
        } catch {
          // Keep existing cache on network error
        } finally {
          set({ isLoading: false });
        }

        return get().calculations;
      },

      removeCalculation: (id: string) => {
        set((state) => ({
          calculations: state.calculations.filter((c) => c.id !== id),
        }));
      },

      addCalculation: (calc: TCalculation) => {
        set((state) => ({
          calculations: [calc, ...state.calculations.filter((c) => c.id !== calc.id)],
        }));
      },

      invalidateCache: () => {
        set({ lastFetchedAt: null });
      },
    }),
    {
      name: '@mmp_cached_calculations',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        calculations: state.calculations,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);

