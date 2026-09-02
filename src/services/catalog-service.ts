import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import type { ApiResult } from '../types/auth';
import type { DistrictOption, TSurveyorService } from '../types/surveyor';

export const CatalogService = {
  getDistricts: (): Promise<ApiResult<DistrictOption[]>> =>
    apiFetch<DistrictOption[]>(API_ENDPOINTS.catalog.districts, {
      method: 'GET',
      auth: false,
    }),

  getServices: (): Promise<ApiResult<TSurveyorService[]>> =>
    apiFetch<TSurveyorService[]>(API_ENDPOINTS.catalog.services, {
      method: 'GET',
      auth: false,
    }),
};
