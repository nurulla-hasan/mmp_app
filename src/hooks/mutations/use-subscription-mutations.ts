import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-keys';
import { SubscriptionService } from '../../services/subscription-service';
import { useAuthStore } from '../../stores/auth-store';
import { ErrorToast, SuccessToast } from '../../lib/utils';
import type { ManualCheckoutPayload } from '../../types/subscription';

export function useSubmitManualCheckout() {
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((state) => state.refreshUser);

  return useMutation({
    mutationFn: (payload: ManualCheckoutPayload) =>
      SubscriptionService.submitManualCheckout(payload),
    onSuccess: async (res) => {
      if (!res.success) {
        ErrorToast(res.message || 'পেমেন্ট রিকোয়েস্ট জমা দেওয়া যায়নি।');
        return;
      }

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
