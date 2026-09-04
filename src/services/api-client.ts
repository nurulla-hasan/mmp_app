import type { ApiResult } from '../types/api';
import type { AuthTokens } from '../types/auth';
import { API_ENDPOINTS } from './api-endpoints';
import { emitSessionExpired, emitTokensRefreshed } from './auth-events';
import { SessionStorage } from './session-storage';

// Backward-compatible export for any existing imports. New code should use
// session-storage directly for token/user persistence responsibilities.
export { STORAGE_KEYS } from './session-storage';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const developmentFallbackUrl = 'https://apis.mouzamappro.com/api/v1';

if (!configuredBaseUrl && typeof __DEV__ !== 'undefined' && __DEV__) {
  console.warn(
    '[MMP] EXPO_PUBLIC_API_URL is not configured. Using the development fallback API URL.'
  );
}

if (!configuredBaseUrl && typeof __DEV__ !== 'undefined' && !__DEV__) {
  throw new Error('EXPO_PUBLIC_API_URL must be configured for production builds.');
}

export const API_BASE_URL = (configuredBaseUrl || developmentFallbackUrl).replace(/\/+$/, '');

const configuredTimeout = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS);
const REQUEST_TIMEOUT_MS =
  Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 20_000;

type AuthMode = 'auth' | 'none';

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth: AuthMode;
  headers?: Record<string, string>;
};

type JsonRecord = Record<string, unknown>;

let refreshPromise: Promise<AuthTokens | null> | null = null;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isApiResult<T>(value: unknown): value is ApiResult<T> {
  return (
    isRecord(value) &&
    typeof value.success === 'boolean' &&
    typeof value.statusCode === 'number' &&
    typeof value.message === 'string'
  );
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

async function requestOnce<T>(
  endpoint: string,
  options: FetchOptions,
  accessToken: string | null
): Promise<ApiResult<T>> {
  const { method = 'GET', body, headers: customHeaders } = options;
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...customHeaders,
  };

  if (!isFormData && body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });

    const payload = await parseResponse(response);

    if (isApiResult<T>(payload)) {
      return payload;
    }

    const message =
      isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : response.ok
          ? 'সফল'
          : 'অনুরোধটি সম্পন্ন করা যায়নি।';

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        message,
      };
    }

    const data =
      isRecord(payload) && Object.prototype.hasOwnProperty.call(payload, 'data')
        ? (payload.data as T)
        : (payload as T);

    return {
      success: true,
      statusCode: response.status,
      message,
      data,
    };
  } catch (error: unknown) {
    const isAbortError = error instanceof Error && error.name === 'AbortError';

    return {
      success: false,
      statusCode: isAbortError ? 408 : 500,
      message: isAbortError
        ? 'সার্ভারের উত্তর পেতে সময়সীমা অতিক্রম হয়েছে।'
        : error instanceof Error
          ? error.message
          : 'সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না।',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function expireSession(): Promise<void> {
  await SessionStorage.clear();
  emitSessionExpired();
}

async function refreshSessionTokens(): Promise<AuthTokens | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken } = await SessionStorage.getTokens();
    if (!refreshToken) {
      await expireSession();
      return null;
    }

    const result = await requestOnce<AuthTokens>(
      API_ENDPOINTS.auth.refreshToken,
      {
        method: 'POST',
        body: { refreshToken },
        auth: 'none',
      },
      null
    );

    if (
      result.success &&
      result.data?.accessToken &&
      result.data?.refreshToken
    ) {
      await SessionStorage.setTokens(result.data);
      emitTokensRefreshed(result.data);
      return result.data;
    }

    // Only destroy the local session when the refresh credential itself is
    // rejected. Temporary network/server failures must not log the user out.
    if ([400, 401, 403].includes(result.statusCode)) {
      await expireSession();
    }

    return null;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// Pure mobile HTTP client. TanStack Query owns server-state caching.
// Every caller states its auth contract explicitly, mirroring the web service layer.
// Authenticated requests automatically rotate tokens and retry once after 401.
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions
): Promise<ApiResult<T>> {
  const requiresAuth = options.auth === 'auth';
  const { accessToken } = requiresAuth
    ? await SessionStorage.getTokens()
    : { accessToken: null };

  const firstResult = await requestOnce<T>(endpoint, options, accessToken);

  if (
    !requiresAuth ||
    firstResult.statusCode !== 401 ||
    endpoint === API_ENDPOINTS.auth.refreshToken
  ) {
    return firstResult;
  }

  const refreshedTokens = await refreshSessionTokens();
  if (!refreshedTokens) return firstResult;

  const retryResult = await requestOnce<T>(endpoint, options, refreshedTokens.accessToken);

  if (retryResult.statusCode === 401) {
    await expireSession();
  }

  return retryResult;
}
