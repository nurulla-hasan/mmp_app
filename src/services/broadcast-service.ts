import { apiFetch } from './api-client';
import { API_ENDPOINTS } from './api-endpoints';
import type { ApiResult } from '../types/api';
import type { TBroadcast } from '../types/broadcast';

export const BroadcastService = {
  // The endpoint is public, but auth stays enabled so a signed-in viewer's
  // token can be attached for USER/SURVEYOR/PRO audience targeting. Guests
  // simply call the same endpoint without an Authorization header.
  getActive: (): Promise<ApiResult<TBroadcast[]>> =>
    apiFetch<TBroadcast[]>(API_ENDPOINTS.broadcasts.active, {
      method: 'GET',
      auth: 'auth',
    }),
};
