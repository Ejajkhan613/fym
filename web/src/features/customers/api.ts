import { apiRequest } from "@/shared/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api";
import type {
  CreateCustomerAddressPayload,
  CustomerAddress,
  CustomerProfile,
  UpdateCustomerAddressPayload,
  UpsertCustomerProfilePayload,
} from "@/features/customers/types";

export function getCustomerProfile(userId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<CustomerProfile>>(
    `/customers/${userId}/profile`,
    {
      accessToken,
    },
  );
}

export function upsertCustomerProfile(
  userId: string,
  payload: UpsertCustomerProfilePayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<CustomerProfile>>(
    `/customers/${userId}/profile`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
      accessToken,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export function listCustomerAddresses(userId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<CustomerAddress[]>>(
    `/customers/${userId}/addresses`,
    {
      accessToken,
    },
  );
}

export function createCustomerAddress(
  userId: string,
  payload: CreateCustomerAddressPayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<CustomerAddress>>(
    `/customers/${userId}/addresses`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      accessToken,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export function updateCustomerAddress(
  userId: string,
  addressId: string,
  payload: UpdateCustomerAddressPayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<CustomerAddress>>(
    `/customers/${userId}/addresses/${addressId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      accessToken,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export function setDefaultCustomerAddress(
  userId: string,
  addressId: string,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<CustomerAddress>>(
    `/customers/${userId}/addresses/${addressId}/default`,
    {
      method: "POST",
      accessToken,
    },
  );
}

export function deleteCustomerAddress(
  userId: string,
  addressId: string,
  accessToken?: string,
) {
  return apiRequest<null>(`/customers/${userId}/addresses/${addressId}`, {
    method: "DELETE",
    accessToken,
  });
}
