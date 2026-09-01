// ─────────────────────────────────────────────────────────────────────────────
// use-profile.ts  (Query Hooks)
//
// Profile and location reference query hooks.
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query';
import { AuthService } from '../../services/auth-service';
import { queryKeys, STALE_TIME } from '../../lib/query-keys';
import { useAuthStore } from '../../stores/auth-store';

// ── Profile: GET /users/me ────────────────────────────────────────────────────
export function useProfile() {
  const { isAuthenticated, user } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: () => AuthService.getMe(),
    enabled: isAuthenticated,
    staleTime: STALE_TIME.FIVE_MINUTES,
    select: (res) => (res.success && res.data ? res.data.user : null),
    placeholderData: user ? { success: true as const, statusCode: 200, message: '', data: { user } } : undefined,
  });
}

// ── Districts: GET /districts ────────────────────────────────────────────────
export function useDistricts() {
  return useQuery({
    queryKey: queryKeys.districts.list(),
    queryFn: () => AuthService.getDistricts(),
    staleTime: STALE_TIME.DAY,
    gcTime: STALE_TIME.DAY * 2,
    select: (res) => (res.success && res.data ? res.data : []),
  });
}
