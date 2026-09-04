import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import type { ApiResult } from '../types/api';
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
      auth: 'none',
    }),

  getMine: (): Promise<ApiResult<MySubscriptionResponse>> =>
    apiFetch<MySubscriptionResponse>(API_ENDPOINTS.subscriptions.mySubscription, {
      method: 'GET',
      auth: 'auth',
    }),

  submitManualCheckout: (
    payload: ManualCheckoutPayload
  ): Promise<ApiResult<TSubscription>> =>
    apiFetch<TSubscription>(API_ENDPOINTS.subscriptions.manualCheckout, {
      method: 'POST',
      body: payload,
      auth: 'auth',
    }),
};
