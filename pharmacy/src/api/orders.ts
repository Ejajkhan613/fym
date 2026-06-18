import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type { Order, OrderStatus, PharmacyOrderDetails, VendorOffer } from '../types/domain';

export function listVendorOffers(
  filters: {
    pharmacyId: string;
    status?: VendorOffer['status'];
    limit?: number;
    offset?: number;
  },
  accessToken?: string,
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return apiRequest<ApiEnvelope<VendorOffer[]>>(`/pharmacy/orders/offers?${params}`, {
    accessToken,
  });
}

export function listPharmacyOrders(
  filters: {
    pharmacyId: string;
    status?: OrderStatus;
    limit?: number;
    offset?: number;
  },
  accessToken?: string,
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return apiRequest<ApiEnvelope<Order[]>>(`/pharmacy/orders?${params}`, {
    accessToken,
  });
}

export function getPharmacyOrder(orderId: string, pharmacyId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<PharmacyOrderDetails>>(
    `/pharmacy/orders/${orderId}?pharmacyId=${encodeURIComponent(pharmacyId)}`,
    { accessToken },
  );
}

export function viewOffer(orderId: string, pharmacyId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<VendorOffer>>(`/pharmacy/orders/${orderId}/view`, {
    method: 'POST',
    body: JSON.stringify({ pharmacyId }),
    accessToken,
  });
}

export function acceptOffer(
  orderId: string,
  payload: {
    pharmacyId: string;
    stockConfirmed: boolean;
    expiryConfirmed: boolean;
    pharmacistVerified: boolean;
    packingTimeMinutes: number;
  },
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<{ order: Order; offer: VendorOffer }>>(
    `/pharmacy/orders/${orderId}/accept`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      accessToken,
    },
  );
}

export function rejectOffer(
  orderId: string,
  payload: {
    pharmacyId: string;
    reason: string;
  },
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<VendorOffer>>(`/pharmacy/orders/${orderId}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function markOrderPacking(
  orderId: string,
  payload: {
    pharmacyId: string;
    reason?: string;
  },
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<Order>>(`/pharmacy/orders/${orderId}/mark-packing`, {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function markOrderPacked(
  orderId: string,
  payload: {
    pharmacyId: string;
    reason?: string;
  },
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<Order>>(`/pharmacy/orders/${orderId}/mark-packed`, {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function cancelPharmacyOrder(
  orderId: string,
  payload: {
    pharmacyId: string;
    reason: string;
  },
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<Order>>(`/pharmacy/orders/${orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  });
}
