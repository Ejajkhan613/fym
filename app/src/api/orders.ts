import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type { CartEntry, CustomerAddress } from '../types/domain';
import { toDeliveryAddress } from '../utils/addresses';

export type ApiOrder = {
  id: string;
  customerId: string;
  pharmacyId?: string | null;
  status: string;
  orderType?: string | null;
  paymentStatus?: string | null;
  subtotal?: number | null;
  deliveryFee?: number | null;
  platformFee?: number | null;
  discount?: number | null;
  totalAmount?: number | null;
  deliveryAddress?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateOrderResponse = {
  order: ApiOrder;
  items: Array<{
    id: string;
    orderId: string;
    requestedName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    requiresPrescription: boolean;
  }>;
};

export function createOrder(payload: {
  customerId: string;
  items: CartEntry[];
  deliveryAddress: CustomerAddress;
  prescriptionId?: string;
  accessToken?: string;
}) {
  return apiRequest<ApiEnvelope<CreateOrderResponse>>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      customerId: payload.customerId,
      orderType: payload.items.some((item) => item.requiresPrescription) ? 'PRESCRIPTION' : 'OTC',
      paymentStatus: 'PAYMENT_PENDING',
      deliveryFee: 25,
      platformFee: 5,
      discount: 0,
      ...(payload.prescriptionId ? { prescriptionId: payload.prescriptionId } : {}),
      deliveryAddress: toDeliveryAddress(payload.deliveryAddress),
      items: payload.items.map((item) => ({
        medicineId: item.medicineId,
        requestedName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        requiresPrescription: item.requiresPrescription,
      })),
    }),
    accessToken: payload.accessToken,
  });
}

export function listCustomerOrders(customerId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<ApiOrder[]>>(
    `/orders?customerId=${encodeURIComponent(customerId)}&limit=25`,
    {
      accessToken,
    },
  );
}
