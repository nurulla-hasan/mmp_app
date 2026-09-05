import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unwrapApiResult } from '../../lib/api-result';
import { queryKeys } from '../../lib/query-keys';
import { BroadcastService } from '../../services/broadcast-service';
import { useAuthStore } from '../../stores/auth-store';

const fetchedAudiencesThisSession = new Set<string>();

export function useActiveBroadcasts() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authLoading = useAuthStore((state) => state.isLoading);

  const audience = isAuthenticated && user
    ? `${user.role}-${user.isSubscribed ? 'pro' : 'free'}`
    : 'guest';

  const query = useQuery({
    queryKey: queryKeys.broadcasts.active(audience),
    queryFn: async () => unwrapApiResult(await BroadcastService.getActive()),
    enabled: false,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (authLoading || fetchedAudiencesThisSession.has(audience)) return;

    fetchedAudiencesThisSession.add(audience);

    void query.refetch().then((result) => {
      if (result.isError) {
        fetchedAudiencesThisSession.delete(audience);
      }
    });
  }, [audience, authLoading, query.refetch]);

  return query;
}
