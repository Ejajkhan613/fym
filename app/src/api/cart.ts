import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';

export type ApiCartItem = {
  id: string;
  customerId: string;
  medicineId?: string | null;
  requestedName: string;
  quantity: number;
  unitPrice: number;
  requiresPrescription: boolean;
  lineTotal: number;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export function getCart(customerId: string, accessToken?: string) {
  return apiRequest<
    ApiEnvelope<{
      items: ApiCartItem[];
      summary: {
        itemCount: number;
        quantity: number;
        subtotal: number;
        requiresPrescription: boolean;
      };
    }>
  >(`/cart?customerId=${encodeURIComponent(customerId)}`, {
    accessToken,
  });
}

export function addCartItem(payload: {
  customerId: string;
  medicineId?: string;
  requestedName: string;
  quantity: number;
  unitPrice: number;
  requiresPrescription: boolean;
  accessToken?: string;
}) {
  return apiRequest<ApiEnvelope<ApiCartItem>>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({
      customerId: payload.customerId,
      medicineId: payload.medicineId,
      requestedName: payload.requestedName,
      quantity: payload.quantity,
      unitPrice: payload.unitPrice,
      requiresPrescription: payload.requiresPrescription,
    }),
    accessToken: payload.accessToken,
  });
}

export function updateCartItem(
  itemId: string,
  payload: {
    quantity?: number;
    unitPrice?: number;
    requiresPrescription?: boolean;
  },
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<ApiCartItem>>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function removeCartItem(itemId: string, accessToken?: string) {
  return apiRequest<null>(`/cart/items/${itemId}`, {
    method: 'DELETE',
    accessToken,
  });
}
