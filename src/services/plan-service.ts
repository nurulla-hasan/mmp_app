import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import { buildQueryString } from '../lib/build-query-string';
import type { ApiResult } from '../types/api';
import type { PlanQuery, TPlan } from '../types/plan';

export const PlanService = {
  getAll: (query: PlanQuery = {}): Promise<ApiResult<TPlan[]>> =>
    apiFetch<TPlan[]>(
      `${API_ENDPOINTS.plans.root}${buildQueryString(
        query as Record<string, string | number | boolean | null | undefined>
      )}`,
      { method: 'GET', auth: 'none' }
    ),
};
