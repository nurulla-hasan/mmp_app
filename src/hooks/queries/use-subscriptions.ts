import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unwrapApiResult } from '../../lib/api-result';
import { queryKeys, STALE_TIME } from '../../lib/query-keys';
import { PlanService } from '../../services/plan-service';
import { SubscriptionService } from '../../services/subscription-service';
import { useAuthStore } from '../../stores/auth-store';

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans.list(),
    queryFn: async () =>
      unwrapApiResult(
        await PlanService.getAll({ isActive: 'true', sortBy: 'sortOrder' })
      ),
    staleTime: STALE_TIME.DAY,
  });
}

export function usePaymentNumbers() {
  return useQuery({
    queryKey: queryKeys.subscriptions.paymentNumbers(),
    queryFn: async () => unwrapApiResult(await SubscriptionService.getPaymentNumbers()),
    staleTime: STALE_TIME.DAY,
  });
}

export function useMySubscription() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const cachedIsSubscribed = useAuthStore((state) => state.user?.isSubscribed);
  const refreshUser = useAuthStore((state) => state.refreshUser);

  const query = useQuery({
    queryKey: queryKeys.subscriptions.mine(),
    queryFn: async () => unwrapApiResult(await SubscriptionService.getMine()),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: (queryState) =>
      queryState.state.data?.pendingSubscription ? 30_000 : false,
  });

  // Admin approval happens on the web. When a pending request becomes active,
  // sync the auth identity so Pro-gated screens do not keep stale isSubscribed=false.
  useEffect(() => {
    if (query.data?.isSubscribed && cachedIsSubscribed !== true) {
      void refreshUser();
    }
  }, [query.data?.isSubscribed, cachedIsSubscribed, refreshUser]);

  return query;
}
