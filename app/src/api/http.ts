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

export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}) {
  const { accessToken, headers, body, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  if (body && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...requestOptions,
    body,
    headers: requestHeaders,
  });

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
