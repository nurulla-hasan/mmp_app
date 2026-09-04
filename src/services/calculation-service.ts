import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import { buildQueryString } from '../lib/build-query-string';
import type { ApiResult } from '../types/api';
import type {
  TCalculation,
  CreateCalculationPayload,
  UpdateCalculationPayload,
  TUserMeasurementStat,
} from '../types/calculation';

export const CalculationService = {
  getCalculations: (
    searchTerm?: string,
    page = 1,
    limit?: number,
  ): Promise<ApiResult<TCalculation[]>> =>
    apiFetch<TCalculation[]>(
      `${API_ENDPOINTS.calculations.root}${buildQueryString({
        searchTerm: searchTerm?.trim() || undefined,
        page: page > 0 ? page : undefined,
        limit: limit && limit > 0 ? limit : undefined,
      })}`,
      {
        method: 'GET',
        auth: 'auth',
      }
    ),

  getCalculationById: (id: string): Promise<ApiResult<TCalculation>> =>
    apiFetch<TCalculation>(API_ENDPOINTS.calculations.byId(id), {
      method: 'GET',
      auth: 'auth',
    }),

  saveCalculation: (payload: CreateCalculationPayload): Promise<ApiResult<TCalculation>> =>
    apiFetch<TCalculation>(API_ENDPOINTS.calculations.root, {
      method: 'POST',
      body: payload,
      auth: 'auth',
    }),

  updateCalculation: (
    id: string,
    payload: UpdateCalculationPayload
  ): Promise<ApiResult<TCalculation>> =>
    apiFetch<TCalculation>(API_ENDPOINTS.calculations.byId(id), {
      method: 'PATCH',
      body: payload,
      auth: 'auth',
    }),

  deleteCalculation: (id: string): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.calculations.byId(id), {
      method: 'DELETE',
      auth: 'auth',
    }),

  getMyMeasurementStats: (): Promise<ApiResult<TUserMeasurementStat>> =>
    apiFetch<TUserMeasurementStat>(API_ENDPOINTS.calculations.stats.me, {
      method: 'GET',
      auth: 'auth',
    }),

  incrementPlotCount: (): Promise<ApiResult<TUserMeasurementStat>> =>
    apiFetch<TUserMeasurementStat>(API_ENDPOINTS.calculations.stats.incrementPlot, {
      method: 'POST',
      auth: 'auth',
    }),
};
