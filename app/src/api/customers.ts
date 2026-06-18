import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type {
  CreateCustomerAddressPayload,
  CustomerAddress,
  CustomerFamilyProfile,
  CustomerProfile,
  CustomerPrivacySettings,
  MedicineReminder,
  UpdateCustomerAddressPayload,
  UpdatePrivacySettingsPayload,
  UpsertCustomerFamilyProfilePayload,
  UpsertMedicineReminderPayload,
  UpsertCustomerProfilePayload,
} from '../types/domain';

export function getCustomerProfile(userId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<CustomerProfile>>(`/customers/${userId}/profile`, {
    accessToken,
  });
}

export function upsertCustomerProfile(
  userId: string,
  payload: UpsertCustomerProfilePayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<CustomerProfile>>(`/customers/${userId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function listCustomerAddresses(userId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<CustomerAddress[]>>(`/customers/${userId}/addresses`, {
    accessToken,
  });
}

export function createCustomerAddress(
  userId: string,
  payload: CreateCustomerAddressPayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<CustomerAddress>>(`/customers/${userId}/addresses`, {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function updateCustomerAddress(
  userId: string,
  addressId: string,
  payload: UpdateCustomerAddressPayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<CustomerAddress>>(`/customers/${userId}/addresses/${addressId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function setDefaultCustomerAddress(
  userId: string,
  addressId: string,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<CustomerAddress>>(
    `/customers/${userId}/addresses/${addressId}/default`,
    {
      method: 'POST',
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
    method: 'DELETE',
    accessToken,
  });
}

export function listCustomerFamilyProfiles(userId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<CustomerFamilyProfile[]>>(
    `/customers/${userId}/family-profiles`,
    { accessToken },
  );
}

export function createCustomerFamilyProfile(
  userId: string,
  payload: UpsertCustomerFamilyProfilePayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<CustomerFamilyProfile>>(
    `/customers/${userId}/family-profiles`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      accessToken,
    },
  );
}

export function updateCustomerFamilyProfile(
  userId: string,
  familyProfileId: string,
  payload: Partial<UpsertCustomerFamilyProfilePayload>,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<CustomerFamilyProfile>>(
    `/customers/${userId}/family-profiles/${familyProfileId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
      accessToken,
    },
  );
}

export function deleteCustomerFamilyProfile(
  userId: string,
  familyProfileId: string,
  accessToken?: string,
) {
  return apiRequest<null>(`/customers/${userId}/family-profiles/${familyProfileId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function listMedicineReminders(userId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<MedicineReminder[]>>(
    `/customers/${userId}/medicine-reminders`,
    { accessToken },
  );
}

export function createMedicineReminder(
  userId: string,
  payload: UpsertMedicineReminderPayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<MedicineReminder>>(
    `/customers/${userId}/medicine-reminders`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      accessToken,
    },
  );
}

export function updateMedicineReminder(
  userId: string,
  reminderId: string,
  payload: Partial<UpsertMedicineReminderPayload>,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<MedicineReminder>>(
    `/customers/${userId}/medicine-reminders/${reminderId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
      accessToken,
    },
  );
}

export function deleteMedicineReminder(
  userId: string,
  reminderId: string,
  accessToken?: string,
) {
  return apiRequest<null>(`/customers/${userId}/medicine-reminders/${reminderId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function getPrivacySettings(userId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<CustomerPrivacySettings>>(
    `/customers/${userId}/privacy-settings`,
    { accessToken },
  );
}

export function updatePrivacySettings(
  userId: string,
  payload: UpdatePrivacySettingsPayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<CustomerPrivacySettings>>(
    `/customers/${userId}/privacy-settings`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
      accessToken,
    },
  );
}
