import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unwrapApiResult } from '../../lib/api-result';
import { queryKeys } from '../../lib/query-keys';
import { SubscriptionService } from '../../services/subscription-service';
import { useAuthStore } from '../../stores/auth-store';
import { ErrorToast, SuccessToast } from '../../lib/utils';
import type { ManualCheckoutPayload } from '../../types/subscription';

export function useSubmitManualCheckout() {
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((state) => state.refreshUser);

  return useMutation({
    mutationFn: async (payload: ManualCheckoutPayload) =>
      unwrapApiResult(await SubscriptionService.submitManualCheckout(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
      SuccessToast('পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে।');
    },
    onError: (error: Error) => {
      ErrorToast(error.message || 'পেমেন্ট রিকোয়েস্ট জমা দেওয়া যায়নি।');
    },
  });
}
