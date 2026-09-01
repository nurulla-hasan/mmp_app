// ─────────────────────────────────────────────────────────────────────────────
// use-calculations.ts  (Query Hooks)
//
// Calculation data query hooks powered by TanStack Query.
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query';
import { CalculationService } from '../../services/calculation-service';
import { queryKeys, STALE_TIME } from '../../lib/query-keys';
import { useAuthStore } from '../../stores/auth-store';

// ── List: GET /calculations?searchTerm=... ───────────────────────────────────
export function useCalculations(searchTerm?: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.calculations.list(searchTerm),
    queryFn: () => CalculationService.getCalculations(searchTerm),
    enabled: isAuthenticated,
    staleTime: STALE_TIME.FIVE_MINUTES,
    select: (res) => (res.success && res.data ? res.data : []),
  });
}

// ── Detail: GET /calculations/:id ────────────────────────────────────────────
export function useCalculationById(id: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.calculations.detail(id),
    queryFn: () => CalculationService.getCalculationById(id),
    enabled: isAuthenticated && Boolean(id),
    staleTime: 60 * 1000,
    select: (res) => (res.success ? res.data : null),
  });
}

// ── Stats: GET /calculations/stats/me ────────────────────────────────────────
export function useMyMeasurementStats() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.profile.stats(),
    queryFn: () => CalculationService.getMyMeasurementStats(),
    enabled: isAuthenticated,
    staleTime: STALE_TIME.FIVE_MINUTES,
    select: (res) => (res.success ? res.data : null),
  });
}
