import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import { CatalogService } from './catalog-service';
import { UserService } from './user-service';
import type { ApiResult } from '../types/api';
import type {
  LoginPayload,
  RegisterPayload,
  VerifyEmailPayload,
  ResendOtpPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
  UpdateProfilePayload,
  GoogleMobileExchangePayload,
  AuthTokens,
  TAuthUser,
} from '../types/auth';

export const AuthService = {
  login: (payload: LoginPayload): Promise<ApiResult<AuthTokens>> =>
    apiFetch<AuthTokens>(API_ENDPOINTS.auth.login, {
      method: 'POST',
      body: payload,
      auth: 'none',
    }),

  exchangeGoogleMobileCode: (
    payload: GoogleMobileExchangePayload
  ): Promise<ApiResult<AuthTokens>> =>
    apiFetch<AuthTokens>(API_ENDPOINTS.auth.googleMobileExchange, {
      method: 'POST',
      body: payload,
      auth: 'none',
    }),

  register: (payload: RegisterPayload): Promise<ApiResult<{ email: string }>> =>
    apiFetch<{ email: string }>(API_ENDPOINTS.auth.register, {
      method: 'POST',
      body: payload,
      auth: 'none',
    }),

  verifyEmail: (payload: VerifyEmailPayload): Promise<ApiResult<AuthTokens>> =>
    apiFetch<AuthTokens>(API_ENDPOINTS.auth.verifyEmail, {
      method: 'POST',
      body: payload,
      auth: 'none',
    }),

  resendOtp: (payload: ResendOtpPayload): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.resendOtp, {
      method: 'POST',
      body: payload,
      auth: 'none',
    }),

  forgotPassword: (payload: { email: string }): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.forgotPassword, {
      method: 'POST',
      body: payload,
      auth: 'none',
    }),

  resendResetOtp: (payload: { email: string }): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.resendResetOtp, {
      method: 'POST',
      body: payload,
      auth: 'none',
    }),

  resetPassword: (payload: ResetPasswordPayload): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.resetPassword, {
      method: 'POST',
      body: payload,
      auth: 'none',
    }),

  getMe: (): Promise<ApiResult<{ user: TAuthUser }>> =>
    apiFetch<{ user: TAuthUser }>(API_ENDPOINTS.auth.me, {
      method: 'GET',
      auth: 'auth',
    }),

  updateMe: (
    payload: UpdateProfilePayload
  ): Promise<ApiResult<{ user: Partial<TAuthUser> }>> =>
    apiFetch<{ user: Partial<TAuthUser> }>(API_ENDPOINTS.auth.me, {
      method: 'PATCH',
      body: payload,
      auth: 'auth',
    }),

  changePassword: (payload: ChangePasswordPayload): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.changePassword, {
      method: 'POST',
      body: payload,
      auth: 'auth',
    }),

  // Backward-compatible catalog alias for existing profile code.
  getDistricts: CatalogService.getDistricts,

  // Backward-compatible user-service alias.
  uploadProfileImage: UserService.uploadProfileImage,

  logout: (): Promise<ApiResult<null>> =>
    apiFetch<null>(API_ENDPOINTS.auth.logout, {
      method: 'POST',
      auth: 'none',
    }),
};
