import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SurveyorService } from '../../services/surveyor-service';
import { ReviewService } from '../../services/review-service';
import { queryKeys } from '../../lib/query-keys';
import { useAuthStore } from '../../stores/auth-store';
import { ErrorToast, SuccessToast } from '../../lib/utils';
import type {
  CreateSurveyorReviewPayload,
  SurveyorApplicationPayload,
  UpdateSurveyorProfilePayload,
} from '../../types/surveyor';

export function useApplyAsSurveyor() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuthStore();
  return useMutation({
    mutationFn: (payload: SurveyorApplicationPayload) => SurveyorService.applyAsSurveyor(payload),
    onSuccess: async (result) => {
      if (!result.success) {
        ErrorToast(result.message || 'আবেদন জমা দিতে সমস্যা হয়েছে।');
        return;
      }
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.surveyors.all });
      SuccessToast('আপনার আবেদন সফলভাবে জমা হয়েছে!');
    },
  });
}

export function useUpdateMySurveyorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSurveyorProfilePayload) => SurveyorService.updateMyProfile(payload),
    onSuccess: (result) => {
      if (!result.success) {
        ErrorToast(result.message || 'সার্ভেয়ার প্রোফাইল আপডেট করা যায়নি।');
        return;
      }
      queryClient.setQueryData(queryKeys.surveyors.myProfile(), result.data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.surveyors.all });
      SuccessToast('সার্ভেয়ার প্রোফাইল আপডেট হয়েছে।');
    },
  });
}

export function useCreateSurveyorReview(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSurveyorReviewPayload) => ReviewService.createSurveyorReview(payload),
    onSuccess: (result) => {
      if (!result.success) {
        ErrorToast(result.message || 'রিভিউ জমা দেওয়া যায়নি।');
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.surveyors.detail(slug) });
      SuccessToast('রিভিউ জমা হয়েছে। যাচাইয়ের পর প্রকাশ হবে।');
    },
  });
}
