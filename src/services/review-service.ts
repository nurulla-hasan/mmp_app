import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import type { ApiResult } from '../types/auth';
import type { CreateSurveyorReviewPayload, TSurveyorReview } from '../types/surveyor';

export const ReviewService = {
  createSurveyorReview: (payload: CreateSurveyorReviewPayload): Promise<ApiResult<TSurveyorReview>> =>
    apiFetch<TSurveyorReview>(API_ENDPOINTS.reviews.root, {
      method: 'POST', body: payload, auth: true,
    }),
};
