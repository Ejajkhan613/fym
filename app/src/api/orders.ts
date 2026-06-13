import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type { CartEntry } from '../types/domain';

export function createOrder(payload: {
  customerId: string;
  items: CartEntry[];
}) {
  return apiRequest<ApiEnvelope<unknown>>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      customerId: payload.customerId,
      orderType: payload.items.some((item) => item.requiresPrescription) ? 'PRESCRIPTION' : 'OTC',
      paymentStatus: 'PAYMENT_PENDING',
      deliveryFee: 25,
      platformFee: 5,
      discount: 0,
      deliveryAddress: {
        label: 'Home',
        addressLine1: 'Koramangala 5th Block',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560095',
        latitude: 12.9352,
        longitude: 77.6245,
      },
      items: payload.items.map((item) => ({
        medicineId: item.medicineId,
        requestedName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        requiresPrescription: item.requiresPrescription,
      })),
    }),
  });
}
