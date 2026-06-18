import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type { CustomerPaymentSummary } from '../types/domain';

export function listCustomerPayments(customerId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<CustomerPaymentSummary>>(
    `/payments/customer/${customerId}`,
    { accessToken },
  );
}
