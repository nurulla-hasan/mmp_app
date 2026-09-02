import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import type { ApiResult, TAuthUser } from '../types/auth';

export const UserService = {
  uploadProfileImage: (formData: FormData): Promise<ApiResult<TAuthUser>> =>
    apiFetch<TAuthUser>(API_ENDPOINTS.users.profileImage, {
      method: 'PATCH',
      body: formData,
      auth: true,
    }),
};
