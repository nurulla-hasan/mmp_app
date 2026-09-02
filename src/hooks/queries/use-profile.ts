import { useQuery } from '@tanstack/react-query';
import { AuthService } from '../../services/auth-service';
import { queryKeys, STALE_TIME } from '../../lib/query-keys';
import { unwrapApiResult } from '../../lib/api-result';
import { useAuthStore } from '../../stores/auth-store';

// Profile: GET /auth/me
export function useProfile() {
  const { isAuthenticated, user } = useAuthStore();

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

// District catalog: GET /districts
export function useDistricts() {
  return useQuery({
    queryKey: queryKeys.districts.list(),
    queryFn: async () => unwrapApiResult(await AuthService.getDistricts()),
    staleTime: STALE_TIME.DAY,
    gcTime: STALE_TIME.DAY * 2,
  });
}
