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

  return useQuery({
    queryKey: queryKeys.subscriptions.mine(),
    queryFn: async () => unwrapApiResult(await SubscriptionService.getMine()),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: (query) =>
      query.state.data?.pendingSubscription ? 30_000 : false,
  });
}
