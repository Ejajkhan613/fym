import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type { CustomerNotification } from '../types/domain';

export function listNotifications(recipientUserId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<CustomerNotification[]>>(
    `/notifications?recipientUserId=${encodeURIComponent(recipientUserId)}`,
    { accessToken },
  );
}
