import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type {
  CreateSupportTicketPayload,
  SupportTicket,
  SupportTicketDetails,
} from '../types/domain';

export function listSupportTickets(customerId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<SupportTicket[]>>(
    `/support/tickets?customerId=${encodeURIComponent(customerId)}`,
    { accessToken },
  );
}

export function createSupportTicket(
  payload: CreateSupportTicketPayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<SupportTicketDetails>>('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  });
}
