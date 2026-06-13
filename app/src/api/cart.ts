import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';

export function addCartItem(payload: {
  customerId: string;
  medicineId?: string;
  requestedName: string;
  quantity: number;
  unitPrice: number;
  requiresPrescription: boolean;
}) {
  return apiRequest<ApiEnvelope<unknown>>('/cart/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
