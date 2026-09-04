import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalculationService } from '../../services/calculation-service';
import { unwrapApiResult } from '../../lib/api-result';
import { queryKeys } from '../../lib/query-keys';
import { SuccessToast, ErrorToast } from '../../lib/utils';
import type { CreateCalculationPayload, UpdateCalculationPayload } from '../../types/calculation';

export function useSaveCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCalculationPayload) =>
      unwrapApiResult(await CalculationService.saveCalculation(payload)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.calculations.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats() });
      SuccessToast('পরিমাপ সফলভাবে সংরক্ষণ করা হয়েছে!');
    },
    onError: (error: Error) => {
      ErrorToast(error.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    },
  });
}

export function useUpdateCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateCalculationPayload }) =>
      unwrapApiResult(await CalculationService.updateCalculation(id, payload)),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.calculations.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.calculations.lists() });
      SuccessToast('পরিমাপ সফলভাবে আপডেট হয়েছে!');
    },
    onError: (error: Error) => {
      ErrorToast(error.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    },
  });
}

export function useDeleteCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      unwrapApiResult(await CalculationService.deleteCalculation(id)),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.calculations.all });

      const previousData = queryClient.getQueriesData({
        queryKey: queryKeys.calculations.all,
      });

      queryClient.setQueriesData(
        { queryKey: queryKeys.calculations.lists() },
        (oldData: unknown) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.filter(
            (calculation) =>
              typeof calculation !== 'object' ||
              calculation === null ||
              !('id' in calculation) ||
              calculation.id !== deletedId
          );
        }
      );

      return { previousData };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.calculations.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats() });
      SuccessToast('পরিমাপ সফলভাবে মুছে ফেলা হয়েছে।');
    },
    onError: (error: Error, _id, context) => {
      context?.previousData?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      ErrorToast(error.message || 'মুছতে সমস্যা হয়েছে।');
    },
  });
}

export function useIncrementPlotCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      unwrapApiResult(await CalculationService.incrementPlotCount()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats() });
    },
  });
}
