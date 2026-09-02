import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import { UserService } from './user-service';
import type {
  LoginPayload,
  RegisterPayload,
  VerifyEmailPayload,
  ResendOtpPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
  UpdateProfilePayload,
  AuthTokens,
  TAuthUser,
  ApiResult,
} from '../types/auth';

export const AuthService = {
  login: (payload: LoginPayload): Promise<ApiResult<AuthTokens>> =>
    apiFetch<AuthTokens>(API_ENDPOINTS.auth.login, {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  register: (payload: RegisterPayload): Promise<ApiResult<{ email: string }>> =>
    apiFetch<{ email: string }>(API_ENDPOINTS.auth.register, {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  verifyEmail: (payload: VerifyEmailPayload): Promise<ApiResult<AuthTokens>> =>
    apiFetch<AuthTokens>(API_ENDPOINTS.auth.verifyEmail, {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  resendOtp: (payload: ResendOtpPayload): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.resendOtp, {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  forgotPassword: (payload: { email: string }): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.forgotPassword, {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  resendResetOtp: (payload: { email: string }): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.resendResetOtp, {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  resetPassword: (payload: ResetPasswordPayload): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.resetPassword, {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  getMe: (): Promise<ApiResult<{ user: TAuthUser }>> =>
    apiFetch<{ user: TAuthUser }>(API_ENDPOINTS.auth.me, {
      method: 'GET',
      auth: true,
    }),

  // Backend returns a safe user projection here. Merge it with the current
  // /auth/me user instead of treating it as a complete auth identity.
  updateMe: (
    payload: UpdateProfilePayload
  ): Promise<ApiResult<{ user: Partial<TAuthUser> }>> =>
    apiFetch<{ user: Partial<TAuthUser> }>(API_ENDPOINTS.auth.me, {
      method: 'PATCH',
      body: payload,
      auth: true,
    }),

  changePassword: (payload: ChangePasswordPayload): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.changePassword, {
      method: 'POST',
      body: payload,
      auth: true,
    }),

  getDistricts: (): Promise<
    ApiResult<{ value: string; label: string; upazilas: string[] }[]>
  > =>
    apiFetch<{ value: string; label: string; upazilas: string[] }[]>(
      API_ENDPOINTS.catalog.districts,
      {
        method: 'GET',
        auth: false,
      }
    ),

  // Backward-compatible alias. New profile code should use UserService directly.
  uploadProfileImage: UserService.uploadProfileImage,

  logout: (): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.logout, {
      method: 'POST',
      auth: false,
    }),
};
