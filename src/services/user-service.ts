import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import type { ApiResult, TAuthUser } from '../types/auth';

// The profile-image endpoint intentionally returns a safe user projection,
// not the complete /auth/me shape (for example hasPassword is not included).
export const UserService = {
  uploadProfileImage: (formData: FormData): Promise<ApiResult<Partial<TAuthUser>>> =>
    apiFetch<Partial<TAuthUser>>(API_ENDPOINTS.users.profileImage, {
      method: 'PATCH',
      body: formData,
      auth: true,
    }),
};
