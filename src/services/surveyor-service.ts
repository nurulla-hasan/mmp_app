import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import { buildQueryString } from '../lib/build-query-string';
import type { ApiResult } from '../types/auth';
import type {
  SurveyorApplicationPayload,
  SurveyorQuery,
  TSurveyorProfile,
  UpdateSurveyorProfilePayload,
} from '../types/surveyor';

export const SurveyorService = {
  getSurveyors: (query: SurveyorQuery = {}): Promise<ApiResult<TSurveyorProfile[]>> =>
    apiFetch<TSurveyorProfile[]>(
      `${API_ENDPOINTS.surveyors.root}${buildQueryString(query as Record<string, string | number | undefined>)}`,
      { method: 'GET', auth: false }
    ),

  getSurveyorBySlug: (slug: string): Promise<ApiResult<TSurveyorProfile>> =>
    apiFetch<TSurveyorProfile>(API_ENDPOINTS.surveyors.bySlug(slug), {
      method: 'GET',
      auth: false,
    }),

  applyAsSurveyor: (payload: SurveyorApplicationPayload): Promise<ApiResult<TSurveyorProfile>> =>
    apiFetch<TSurveyorProfile>(API_ENDPOINTS.surveyors.profile, {
      method: 'POST',
      body: payload,
      auth: true,
    }),

  getMyProfile: (): Promise<ApiResult<TSurveyorProfile>> =>
    apiFetch<TSurveyorProfile>(API_ENDPOINTS.surveyors.profile, {
      method: 'GET',
      auth: true,
    }),

  updateMyProfile: (payload: UpdateSurveyorProfilePayload): Promise<ApiResult<TSurveyorProfile>> =>
    apiFetch<TSurveyorProfile>(API_ENDPOINTS.surveyors.profile, {
      method: 'PATCH',
      body: payload,
      auth: true,
    }),
};
