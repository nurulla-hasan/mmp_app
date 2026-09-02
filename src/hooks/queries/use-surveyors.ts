import { useQuery } from '@tanstack/react-query';
import { SurveyorService } from '../../services/surveyor-service';
import { ApiRequestError, unwrapApiResult } from '../../lib/api-result';
import { queryKeys, STALE_TIME } from '../../lib/query-keys';
import { useAuthStore } from '../../stores/auth-store';
import type { SurveyorQuery } from '../../types/surveyor';

export function useSurveyors(filters: SurveyorQuery = {}) {
  return useQuery({
    queryKey: queryKeys.surveyors.list(filters),
    queryFn: async () => {
      const result = await SurveyorService.getSurveyors(filters);
      if (!result.success) throw new ApiRequestError(result.statusCode, result.message);
      return { surveyors: result.data, meta: result.meta };
    },
    staleTime: STALE_TIME.FIVE_MINUTES,
  });
}

export function useSurveyorBySlug(slug: string) {
  return useQuery({
    queryKey: queryKeys.surveyors.detail(slug),
    queryFn: async () => unwrapApiResult(await SurveyorService.getSurveyorBySlug(slug)),
    enabled: Boolean(slug),
    staleTime: 60 * 1000,
  });
}

export function useSurveyorServices() {
  return useQuery({
    queryKey: queryKeys.services.list(),
    queryFn: async () => unwrapApiResult(await SurveyorService.getServices()),
    staleTime: STALE_TIME.DAY,
    gcTime: STALE_TIME.DAY * 2,
  });
}

export function useSurveyorDistricts() {
  return useQuery({
    queryKey: queryKeys.districts.list(),
    queryFn: async () => unwrapApiResult(await SurveyorService.getDistricts()),
    staleTime: STALE_TIME.DAY,
    gcTime: STALE_TIME.DAY * 2,
  });
}

export function useMySurveyorProfile() {
  const { user, isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.surveyors.myProfile(),
    queryFn: async () => unwrapApiResult(await SurveyorService.getMyProfile()),
    enabled: isAuthenticated && user?.role === 'SURVEYOR',
    staleTime: STALE_TIME.FIVE_MINUTES,
  });
}
