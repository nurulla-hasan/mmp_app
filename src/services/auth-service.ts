import { apiFetch } from './api-client';
import type {
  LoginPayload,
  RegisterPayload,
  VerifyEmailPayload,
  ResendOtpPayload,
  ResetPasswordPayload,
  AuthTokens,
  TAuthUser,
  ApiResult,
} from '../types/auth';

export const AuthService = {
  login: (payload: LoginPayload): Promise<ApiResult<AuthTokens>> =>
    apiFetch<AuthTokens>('/auth/login', {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  register: (payload: RegisterPayload): Promise<ApiResult<{ email: string }>> =>
    apiFetch<{ email: string }>('/auth/register', {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  verifyEmail: (payload: VerifyEmailPayload): Promise<ApiResult<AuthTokens>> =>
    apiFetch<AuthTokens>('/auth/verify-email', {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  resendOtp: (payload: ResendOtpPayload): Promise<ApiResult<null>> =>
    apiFetch<null>('/auth/resend-otp', {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  forgotPassword: (payload: { email: string }): Promise<ApiResult<{ message: string }>> =>
    apiFetch<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  resetPassword: (payload: ResetPasswordPayload): Promise<ApiResult<{ message: string }>> =>
    apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  getMe: (): Promise<ApiResult<{ user: TAuthUser }>> =>
    apiFetch<{ user: TAuthUser }>('/auth/me', {
      method: 'GET',
      auth: true,
    }),

  updateMe: (payload: Partial<TAuthUser>): Promise<ApiResult<{ user: TAuthUser }>> =>
    apiFetch<{ user: TAuthUser }>('/auth/me', {
      method: 'PATCH',
      body: payload,
      auth: true,
    }),

  changePassword: (payload: { oldPassword?: string; newPassword?: string }): Promise<ApiResult<{ message: string }>> =>
    apiFetch<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: payload,
      auth: true,
    }),

  getDistricts: (): Promise<ApiResult<{ value: string; label: string; upazilas: string[] }[]>> =>
    apiFetch<{ value: string; label: string; upazilas: string[] }[]>('/districts', {
      method: 'GET',
      auth: false,
    }),

  uploadProfileImage: (formData: FormData): Promise<ApiResult<TAuthUser>> =>
    apiFetch<TAuthUser>('/users/profile-image', {
      method: 'PATCH',
      body: formData,
      auth: true,
    }),

  logout: (): Promise<ApiResult<null>> =>
    apiFetch<null>('/auth/logout', {
      method: 'POST',
      auth: true,
    }),
};

