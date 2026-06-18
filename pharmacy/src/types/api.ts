export type ApiEnvelope<TData> = {
  data: TData;
  message?: string;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    [key: string]: unknown;
  };
};

export type ApiErrorBody = {
  message?: string;
  code?: string;
  details?: unknown;
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
};
