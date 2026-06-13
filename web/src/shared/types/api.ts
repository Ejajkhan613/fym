export type ApiEnvelope<TData> = {
  data: TData;
  message?: string;
  meta?: Record<string, unknown>;
};

export type PaginatedResult<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
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
