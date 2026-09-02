import { useQuery } from '@tanstack/react-query';
import { CalculationService } from '../../services/calculation-service';
import { queryKeys, STALE_TIME } from '../../lib/query-keys';
import { unwrapApiResult } from '../../lib/api-result';
import { useAuthStore } from '../../stores/auth-store';

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
