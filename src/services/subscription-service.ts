import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import type { ApiResult } from '../types/auth';
import type {
  ManualCheckoutPayload,
  MySubscriptionResponse,
  PaymentNumbersResponse,
  TSubscription,
} from '../types/subscription';

export const SubscriptionService = {
  getPaymentNumbers: (): Promise<ApiResult<PaymentNumbersResponse>> =>
    apiFetch<PaymentNumbersResponse>(API_ENDPOINTS.subscriptions.paymentNumbers, {
      method: 'GET',
      auth: false,
    }),

  getMine: (): Promise<ApiResult<MySubscriptionResponse>> =>
    apiFetch<MySubscriptionResponse>(API_ENDPOINTS.subscriptions.mySubscription, {
      method: 'GET',
      auth: true,
    }),

  submitManualCheckout: (
    payload: ManualCheckoutPayload
  ): Promise<ApiResult<TSubscription>> =>
    apiFetch<TSubscription>(API_ENDPOINTS.subscriptions.manualCheckout, {
      method: 'POST',
      body: payload,
      auth: true,
    }),
};
