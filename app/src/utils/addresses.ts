import type { AuthSession, CreateCustomerAddressPayload, CustomerAddress } from '../types/domain';

export function createFallbackAddress(session: AuthSession): CustomerAddress {
  return {
    id: 'local-default-address',
    userId: session.user.id,
    label: 'Home',
    recipientName: session.user.name,
    phone: session.user.phone,
    addressLine1: 'Koramangala 5th Block',
    addressLine2: 'Near Forum Mall',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560095',
    latitude: 12.9352,
    longitude: 77.6245,
    isDefault: true,
    metadata: {},
  };
}

export function createLocalAddressFromPayload(
  userId: string,
  payload: CreateCustomerAddressPayload,
): CustomerAddress {
  return {
    id: `local-address-${Date.now()}`,
    userId,
    label: payload.label || null,
    recipientName: payload.recipientName || null,
    phone: payload.phone || null,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2 || null,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    isDefault: payload.isDefault ?? false,
    metadata: payload.metadata || {},
  };
}

export function formatAddress(address: CustomerAddress) {
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(', ');
}

export function formatShortAddress(address: CustomerAddress) {
  return [address.label, address.city, address.pincode].filter(Boolean).join(' - ');
}

export function isLocalAddressId(id: string) {
  return id.startsWith('local-');
}

export function normalizeDefaultAddress(address: CustomerAddress, nextIsDefault: boolean) {
  return nextIsDefault ? { ...address, isDefault: false } : address;
}

export function toDeliveryAddress(address: CustomerAddress) {
  return {
    ...(address.label ? { label: address.label } : {}),
    addressLine1: address.addressLine1,
    ...(address.addressLine2 ? { addressLine2: address.addressLine2 } : {}),
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    ...(address.latitude === null || address.latitude === undefined
      ? {}
      : { latitude: address.latitude }),
    ...(address.longitude === null || address.longitude === undefined
      ? {}
      : { longitude: address.longitude }),
  };
}
