import type { ApiResult } from '../types/api';

export class ApiRequestError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
  }
}

export function unwrapApiResult<T>(result: ApiResult<T>): T {
  if (!result.success) {
    throw new ApiRequestError(result.statusCode, result.message);
  }

  return result.data;
}
