import { useQuery } from '@tanstack/react-query';
import { unwrapApiResult } from '../../lib/api-result';
import { queryKeys } from '../../lib/query-keys';
import { BroadcastService } from '../../services/broadcast-service';
import { useAuthStore } from '../../stores/auth-store';

const BROADCAST_REFRESH_INTERVAL_MS = 15_000;

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
    staleTime: 0,
    refetchInterval: BROADCAST_REFRESH_INTERVAL_MS,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}
