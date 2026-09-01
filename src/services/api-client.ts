import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiResult } from '../types/auth';

// Backend API URL: Production fallback & local development
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
  cacheTtlMs?: number;
  forceFresh?: boolean;
};

// In-memory cache for GET requests
const apiCache = new Map<string, { data: ApiResult<any>; expiry: number }>();

export function clearApiCache() {
  apiCache.clear();
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResult<T>> {
  const { method = 'GET', body, auth = true, cacheTtlMs = 30000, forceFresh = false } = options;

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const cacheKey = `${url}:${auth ? 'auth' : 'anon'}`;

  // Check cache for GET requests
  if (method === 'GET' && !forceFresh) {
    const cached = apiCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as ApiResult<T>;
    }
  }

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
      // Ignore token read error
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

    const result: ApiResult<T> = {
      success: true,
      statusCode: response.status,
      message: json.message || 'সফল',
      data: json.data !== undefined ? json.data : json,
    };

    if (method === 'GET') {
      if (cacheTtlMs > 0) {
        apiCache.set(cacheKey, { data: result, expiry: Date.now() + cacheTtlMs });
      }
    } else {
      // Invalidate cache on mutations (POST, PATCH, DELETE, etc.)
      apiCache.clear();
    }

    return result;
  } catch (error: any) {
    return {
      success: false,
      statusCode: 500,
      message: error?.message || 'সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না।',
    };
  }
}

