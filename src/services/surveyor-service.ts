import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import { buildQueryString } from '../lib/build-query-string';
import type { ApiResult } from '../types/api';
import type {
  SurveyorApplicationPayload,
  SurveyorQuery,
  TSurveyorProfile,
  UpdateSurveyorProfilePayload,
} from '../types/surveyor';

export const SurveyorService = {
  getSurveyors: (query: SurveyorQuery = {}): Promise<ApiResult<TSurveyorProfile[]>> =>
    apiFetch<TSurveyorProfile[]>(
      `${API_ENDPOINTS.surveyors.root}${buildQueryString(
        query as Record<string, string | number | undefined>
      )}`,
      { method: 'GET', auth: 'none' }
    ),

  getSurveyorBySlug: (slug: string): Promise<ApiResult<TSurveyorProfile>> =>
    apiFetch<TSurveyorProfile>(API_ENDPOINTS.surveyors.bySlug(slug), {
      method: 'GET',
      auth: 'none',
    }),

  applyAsSurveyor: (payload: SurveyorApplicationPayload): Promise<ApiResult<TSurveyorProfile>> =>
    apiFetch<TSurveyorProfile>(API_ENDPOINTS.surveyors.profile, {
      method: 'POST',
      body: payload,
      auth: 'auth',
    }),

  getMyProfile: (): Promise<ApiResult<TSurveyorProfile>> =>
    apiFetch<TSurveyorProfile>(API_ENDPOINTS.surveyors.profile, {
      method: 'GET',
      auth: 'auth',
    }),

  updateMyProfile: (payload: UpdateSurveyorProfilePayload): Promise<ApiResult<TSurveyorProfile>> =>
    apiFetch<TSurveyorProfile>(API_ENDPOINTS.surveyors.profile, {
      method: 'PATCH',
      body: payload,
      auth: 'auth',
    }),

  uploadCertificate: (
    formData: FormData
  ): Promise<ApiResult<{ url: string; publicId: string; format: string }>> =>
    apiFetch<{ url: string; publicId: string; format: string }>(
      API_ENDPOINTS.surveyors.uploadCertificate,
      {
        method: 'POST',
        body: formData,
        auth: 'auth',
      }
    ),

  deleteCertificate: (publicId: string): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.surveyors.deleteCertificate, {
      method: 'DELETE',
      body: { publicId },
      auth: 'auth',
    }),
};
