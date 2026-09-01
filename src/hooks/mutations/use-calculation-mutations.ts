// ─────────────────────────────────────────────────────────────────────────────
// use-calculation-mutations.ts  (Mutation Hooks)
//
// Calculation mutation hooks with automatic query invalidation and optimistic updates.
// ─────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalculationService } from '../../services/calculation-service';
import { queryKeys } from '../../lib/query-keys';
import { SuccessToast, ErrorToast } from '../../lib/utils';
import type { CreateCalculationPayload, UpdateCalculationPayload } from '../../types/calculation';

// ── Save Calculation: POST /calculations ─────────────────────────────────────
export function useSaveCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCalculationPayload) =>
      CalculationService.saveCalculation(payload),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.calculations.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats() });
        SuccessToast('পরিমাপ সফলভাবে সংরক্ষণ করা হয়েছে!');
      } else {
        ErrorToast(res.message || 'পরিমাপ সংরক্ষণ করা যায়নি।');
      }
    },
    onError: (err: any) => {
      ErrorToast(err?.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    },
  });
}

// ── Update Calculation: PATCH /calculations/:id ──────────────────────────────
export function useUpdateCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCalculationPayload }) =>
      CalculationService.updateCalculation(id, payload),
    onSuccess: (res, { id }) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.calculations.detail(id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.calculations.lists() });
        SuccessToast('পরিমাপ সফলভাবে আপডেট হয়েছে!');
      } else {
        ErrorToast(res.message || 'আপডেট করা যায়নি।');
      }
    },
    onError: (err: any) => {
      ErrorToast(err?.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    },
  });
}

// ── Delete Calculation: DELETE /calculations/:id ─────────────────────────────
export function useDeleteCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CalculationService.deleteCalculation(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.calculations.all });

      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.calculations.all });

      queryClient.setQueriesData(
        { queryKey: queryKeys.calculations.lists() },
        (oldData: any) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.filter((c: any) => c.id !== deletedId);
        }
      );

      return { previousData };
    },
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.calculations.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats() });
        SuccessToast('পরিমাপ সফলভাবে মুছে ফেলা হয়েছে।');
      } else {
        ErrorToast(res.message || 'মুছতে সমস্যা হয়েছে।');
      }
    },
    onError: (err: any, _id, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      ErrorToast(err?.message || 'মুছতে সমস্যা হয়েছে।');
    },
  });
}

// ── Increment Plot Count: POST /calculations/stats/increment-plot ─────────────
export function useIncrementPlotCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => CalculationService.incrementPlotCount(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats() });
    },
  });
}
