import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { CalculationService } from '../../services/calculation-service';
import { queryKeys, STALE_TIME } from '../../lib/query-keys';
import { unwrapApiResult } from '../../lib/api-result';
import { useAuthStore } from '../../stores/auth-store';

const SAVED_PAGE_SIZE = 6;

// List: GET /calculations?searchTerm=...
export function useCalculations(searchTerm?: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.calculations.list(searchTerm),
    queryFn: async () =>
      unwrapApiResult(await CalculationService.getCalculations(searchTerm)),
    enabled: isAuthenticated,
    staleTime: STALE_TIME.FIVE_MINUTES,
  });
}

// Cached paginated list used by the Land Measurement Saved sheet.
// Cached pages render immediately on reopen; stale data refreshes in the background.
export function useSavedCalculations(searchTerm = '', enabled = true) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useInfiniteQuery({
    queryKey: queryKeys.calculations.library(searchTerm),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const result = await CalculationService.getCalculations(
        searchTerm,
        pageParam,
        SAVED_PAGE_SIZE,
      );

      if (!result.success) {
        throw new Error(result.message || 'Could not load saved measurements.');
      }

      const nextPage = result.meta
        ? pageParam < result.meta.totalPages
          ? pageParam + 1
          : undefined
        : result.data.length >= SAVED_PAGE_SIZE
          ? pageParam + 1
          : undefined;

      return { items: result.data, nextPage };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: isAuthenticated && enabled,
    staleTime: STALE_TIME.FIVE_MINUTES,
    gcTime: STALE_TIME.DAY,
  });
}

// Detail: GET /calculations/:id
export function useCalculationById(id: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.calculations.detail(id),
    queryFn: async () =>
      unwrapApiResult(await CalculationService.getCalculationById(id)),
    enabled: isAuthenticated && Boolean(id),
    staleTime: 60 * 1000,
  });
}

// Stats: GET /calculations/stats/me
export function useMyMeasurementStats() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.profile.stats(),
    queryFn: async () =>
      unwrapApiResult(await CalculationService.getMyMeasurementStats()),
    enabled: isAuthenticated,
    staleTime: STALE_TIME.FIVE_MINUTES,
  });
}
