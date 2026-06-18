import { env } from '../config/env';
import type { ApiErrorBody } from '../types/api';

type RequestOptions = RequestInit & {
  accessToken?: string;
};

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.message || body?.error?.message || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function isNetworkFailure(error: unknown) {
  return error instanceof TypeError || error instanceof Error;
}

async function fetchWithTimeout(url: string, options: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.apiTimeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}) {
  const { accessToken, headers, body, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData;

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  if (body && !requestHeaders.has('Content-Type') && !isFormDataBody) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const networkErrors: string[] = [];
  let response: Response | undefined;

  for (const apiBaseUrl of env.apiBaseUrls) {
    try {
      response = await fetchWithTimeout(`${apiBaseUrl}${path}`, {
        ...requestOptions,
        body,
        headers: requestHeaders,
      });
      break;
    } catch (error) {
      if (!isNetworkFailure(error)) {
        throw error;
      }

      networkErrors.push(
        `${apiBaseUrl}: ${error instanceof Error ? error.message : 'network request failed'}`,
      );
    }
  }

  if (!response) {
    throw new Error(`Backend is unreachable. Tried ${networkErrors.join('; ')}`);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorBody(response));
  }

  if (response.status === 204) {
    return null as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function parseErrorBody(response: Response) {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}
