import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type {
  AddPharmacistPayload,
  CreatePharmacyDraftPayload,
  Pharmacist,
  Pharmacy,
  PharmacyDocument,
  PharmacyProfile,
  PharmacyStatus,
  UploadDocumentPayload,
} from '../types/domain';

export function listPharmacies(
  filters: {
    ownerUserId?: string;
    status?: PharmacyStatus;
    city?: string;
    search?: string;
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

  return apiRequest<ApiEnvelope<Pharmacy[]>>(
    `/pharmacies/onboarding/?${params.toString()}`,
    { accessToken },
  );
}

export function createPharmacyDraft(payload: CreatePharmacyDraftPayload, accessToken?: string) {
  return apiRequest<ApiEnvelope<Pharmacy>>('/pharmacies/onboarding/drafts', {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function getPharmacyProfile(pharmacyId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<PharmacyProfile>>(`/pharmacies/onboarding/${pharmacyId}`, {
    accessToken,
  });
}

export function updatePharmacyDraft(
  pharmacyId: string,
  payload: Partial<CreatePharmacyDraftPayload>,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<Pharmacy>>(`/pharmacies/onboarding/${pharmacyId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function uploadPharmacyDocument(
  pharmacyId: string,
  payload: UploadDocumentPayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<PharmacyDocument>>(
    `/pharmacies/onboarding/${pharmacyId}/documents`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      accessToken,
    },
  );
}

export function addPharmacist(
  pharmacyId: string,
  payload: AddPharmacistPayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<Pharmacist>>(
    `/pharmacies/onboarding/${pharmacyId}/pharmacists`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      accessToken,
    },
  );
}

export function submitPharmacyForReview(
  pharmacyId: string,
  actorUserId?: string,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<Pharmacy>>(`/pharmacies/onboarding/${pharmacyId}/submit`, {
    method: 'POST',
    body: JSON.stringify(actorUserId ? { actorUserId } : {}),
    accessToken,
  });
}
