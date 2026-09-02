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

export type TAuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'SURVEYOR' | 'ADMIN' | 'SUPER_ADMIN';
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
  authProvider?: 'EMAIL' | 'GOOGLE';
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

export type ApiMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiSuccess<T> = {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: ApiMeta;
};

export type ApiFailure = {
  success: false;
  statusCode: number;
  message: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
export type { TSurveyorProfile } from './surveyor';
