import { useQuery } from '@tanstack/react-query';
import { AuthService } from '../../services/auth-service';
import { CatalogService } from '../../services/catalog-service';
import { queryKeys, STALE_TIME } from '../../lib/query-keys';
import { unwrapApiResult } from '../../lib/api-result';
import { useAuthStore } from '../../stores/auth-store';

export function useProfile() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: async () => {
      const result = unwrapApiResult(await AuthService.getMe());
      return result.user;
    },
    enabled: isAuthenticated,
    staleTime: STALE_TIME.FIVE_MINUTES,
    placeholderData: user ?? undefined,
  });
}

export function useDistricts() {
  return useQuery({
    queryKey: queryKeys.districts.list(),
    queryFn: async () => unwrapApiResult(await CatalogService.getDistricts()),
    staleTime: STALE_TIME.DAY,
    gcTime: STALE_TIME.DAY * 2,
  });
}
