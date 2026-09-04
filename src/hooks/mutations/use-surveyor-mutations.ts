import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SurveyorService } from '../../services/surveyor-service';
import { ReviewService } from '../../services/review-service';
import { unwrapApiResult } from '../../lib/api-result';
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
  const refreshUser = useAuthStore((state) => state.refreshUser);

  return useMutation({
    mutationFn: async (payload: SurveyorApplicationPayload) => {
      const result = await SurveyorService.applyAsSurveyor(payload);

      if (!result.success && payload.certificatePublicId) {
        // Roll back an already-uploaded certificate so failed applications do not
        // leave orphaned Cloudinary assets behind.
        await SurveyorService.deleteCertificate(payload.certificatePublicId).catch(() => {});
      }

      return unwrapApiResult(result);
    },
    onSuccess: async () => {
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.surveyors.all });
      SuccessToast('আপনার আবেদন সফলভাবে জমা হয়েছে! অ্যাডমিন যাচাইয়ের পর প্রোফাইল সচল হবে।');
    },
    onError: (error: Error) =>
      ErrorToast(error.message || 'আবেদন জমা দিতে সমস্যা হয়েছে।'),
  });
}

export function useUpdateMySurveyorProfile() {
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((state) => state.refreshUser);

  return useMutation({
    mutationFn: async (payload: UpdateSurveyorProfilePayload) =>
      unwrapApiResult(await SurveyorService.updateMyProfile(payload)),
    onSuccess: async () => {
      // The backend updates nested service/service-area relations after the first
      // profile update result is formed. Re-fetch instead of trusting a stale relation snapshot.
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: queryKeys.surveyors.myProfile() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.surveyors.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      SuccessToast('সার্ভেয়ার প্রোফাইল আপডেট হয়েছে।');
    },
    onError: (error: Error) =>
      ErrorToast(error.message || 'সার্ভেয়ার প্রোফাইল আপডেট করা যায়নি।'),
  });
}

export function useCreateSurveyorReview(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSurveyorReviewPayload) =>
      unwrapApiResult(await ReviewService.createSurveyorReview(payload)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.surveyors.detail(slug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.bySurveyor(slug) });
      SuccessToast('রিভিউ জমা হয়েছে। যাচাইয়ের পর প্রকাশ হবে।');
    },
    onError: (error: Error) =>
      ErrorToast(error.message || 'রিভিউ জমা দেওয়া যায়নি।'),
  });
}
