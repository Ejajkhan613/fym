export type ApiEnvelope<TData> = {
  data: TData;
  message?: string;
  meta?: Record<string, unknown>;
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
