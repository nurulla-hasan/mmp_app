import type { TSurveyorProfile } from './surveyor';

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = { name: string; email: string; password: string };
export type VerifyEmailPayload = { email: string; otp: string };
export type ResendOtpPayload = { email: string };
export type ResetPasswordPayload = {
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
};

// Backend roles are shared with the web/admin panel.
// The mobile app itself only allows USER and SURVEYOR sessions.
export type BackendRole = 'USER' | 'SURVEYOR' | 'ADMIN' | 'SUPER_ADMIN';
export type MobileRole = 'USER' | 'SURVEYOR';

export type TAuthUser = {
  id: string;
  name: string;
  email: string;
  role: BackendRole;
  status: 'ACTIVE' | 'BLOCKED';
  emailVerified: boolean;
  isSubscribed: boolean;
  imageUrl?: string;
  phone?: string;
  whatsappNumber?: string;
  district?: string;
  upazila?: string;
  createdAt: string;
  updatedAt: string;
  hasPassword?: boolean;
  authProvider?: 'CREDENTIAL' | 'GOOGLE';
  surveyorProfile?: TSurveyorProfile;
};

export type UpdateProfilePayload = Partial<
  Pick<TAuthUser, 'name' | 'phone' | 'whatsappNumber' | 'district' | 'upazila' | 'imageUrl'>
>;

export type ChangePasswordPayload = {
  oldPassword?: string;
  newPassword: string;
  confirmPassword: string;
};

export type AuthTokens = { accessToken: string; refreshToken: string };

// Compatibility re-export while callers migrate to the shared API contract.
export type { ApiMeta, ApiSuccess, ApiFailure, ApiResult } from './api';
export type { TSurveyorProfile } from './surveyor';
