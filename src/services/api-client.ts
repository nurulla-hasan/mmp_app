// ─────────────────────────────────────────────────────────────────────────────
// api-client.ts
//
// Base HTTP client for mobile app API requests.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiResult } from '../types/auth';

// Backend API URL
export const API_BASE_URL = 'https://mmp-backend-xi.vercel.app/api/v1';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@mmp_access_token',
  REFRESH_TOKEN: '@mmp_refresh_token',
  USER: '@mmp_auth_user',
};

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// apiFetch — Pure fetch wrapper. Caching is handled by TanStack Query.
// ─────────────────────────────────────────────────────────────────────────────
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResult<T>> {
  const { method = 'GET', body, auth = true } = options;
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Ignore token read error silently
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: isFormData ? (body as any) : body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json();

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        message: json.message || 'অনুরোধটি সম্পন্ন করা যায়নি।',
      };
    }

    return {
      success: true,
      statusCode: response.status,
      message: json.message || 'সফল',
      data: json.data !== undefined ? json.data : json,
    };
  } catch (error: any) {
    return {
      success: false,
      statusCode: 500,
      message: error?.message || 'সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না।',
    };
  }
}
