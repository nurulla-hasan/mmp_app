import { useQuery } from '@tanstack/react-query';
import { unwrapApiResult } from '../../lib/api-result';
import { queryKeys, STALE_TIME } from '../../lib/query-keys';
import { BroadcastService } from '../../services/broadcast-service';
import { useAuthStore } from '../../stores/auth-store';

export function useActiveBroadcasts() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authLoading = useAuthStore((state) => state.isLoading);

  const audience = isAuthenticated && user
    ? `${user.role}-${user.isSubscribed ? 'pro' : 'free'}`
    : 'guest';

  return useQuery({
    queryKey: queryKeys.broadcasts.active(audience),
    queryFn: async () => unwrapApiResult(await BroadcastService.getActive()),
    enabled: !authLoading,
    staleTime: STALE_TIME.FIVE_MINUTES,
    refetchOnMount: true,
  });
}
