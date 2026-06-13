import { env } from "@/shared/config/env";
import type { ApiErrorBody } from "@/shared/types/api";

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(
      body?.message ||
        body?.error?.message ||
        `Request failed with status ${status}`,
    );
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type ApiRequestOptions = RequestInit & {
  accessToken?: string;
};

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
) {
  const { accessToken, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
    credentials: "include",
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
