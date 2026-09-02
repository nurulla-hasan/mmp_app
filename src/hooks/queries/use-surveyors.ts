import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { SurveyorService } from '../../services/surveyor-service';
import { ApiRequestError, unwrapApiResult } from '../../lib/api-result';
import { queryKeys, STALE_TIME } from '../../lib/query-keys';
import { useAuthStore } from '../../stores/auth-store';
import type { SurveyorQuery } from '../../types/surveyor';

function unwrapSurveyorPage(result: Awaited<ReturnType<typeof SurveyorService.getSurveyors>>) {
  if (!result.success) throw new ApiRequestError(result.statusCode, result.message);
  return { surveyors: result.data, meta: result.meta };
}

export function useSurveyors(filters: SurveyorQuery = {}) {
  return useQuery({
    queryKey: queryKeys.surveyors.list(filters),
    queryFn: async () => unwrapSurveyorPage(await SurveyorService.getSurveyors(filters)),
    staleTime: STALE_TIME.FIVE_MINUTES,
  });
}

export function useInfiniteSurveyors(filters: Omit<SurveyorQuery, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.surveyors.infinite(filters),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      unwrapSurveyorPage(
        await SurveyorService.getSurveyors({ ...filters, page: Number(pageParam) })
      ),
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta || meta.page >= meta.totalPages) return undefined;
      return meta.page + 1;
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
