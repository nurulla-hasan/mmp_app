import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import type {
  TCalculation,
  CreateCalculationPayload,
  UpdateCalculationPayload,
  TUserMeasurementStat,
} from '../types/calculation';
import type { ApiResult } from '../types/auth';

export const CalculationService = {
  getCalculations: (searchTerm?: string): Promise<ApiResult<TCalculation[]>> => {
    const query = searchTerm ? `?searchTerm=${encodeURIComponent(searchTerm)}` : '';
    return apiFetch<TCalculation[]>(`${API_ENDPOINTS.calculations.root}${query}`, {
      method: 'GET',
      auth: true,
    });
  },

  getCalculationById: (id: string): Promise<ApiResult<TCalculation>> =>
    apiFetch<TCalculation>(API_ENDPOINTS.calculations.byId(id), {
      method: 'GET',
      auth: true,
    }),

  saveCalculation: (payload: CreateCalculationPayload): Promise<ApiResult<TCalculation>> =>
    apiFetch<TCalculation>(API_ENDPOINTS.calculations.root, {
      method: 'POST',
      body: payload,
      auth: true,
    }),

  updateCalculation: (
    id: string,
    payload: UpdateCalculationPayload
  ): Promise<ApiResult<TCalculation>> =>
    apiFetch<TCalculation>(API_ENDPOINTS.calculations.byId(id), {
      method: 'PATCH',
      body: payload,
      auth: true,
    }),

  deleteCalculation: (id: string): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.calculations.byId(id), {
      method: 'DELETE',
      auth: true,
    }),

  getMyMeasurementStats: (): Promise<ApiResult<TUserMeasurementStat>> =>
    apiFetch<TUserMeasurementStat>(API_ENDPOINTS.calculations.stats.me, {
      method: 'GET',
      auth: true,
    }),

  incrementPlotCount: (): Promise<ApiResult<TUserMeasurementStat>> =>
    apiFetch<TUserMeasurementStat>(API_ENDPOINTS.calculations.stats.incrementPlot, {
      method: 'POST',
      auth: true,
    }),
};
