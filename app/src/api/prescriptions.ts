import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type { PrescriptionRecord } from '../types/domain';

type ListPrescriptionsResponse = ApiEnvelope<PrescriptionRecord[]>;

export function uploadPrescription(payload: {
  customerId: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
}) {
  return apiRequest<ApiEnvelope<unknown>>('/prescriptions/upload', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listPrescriptions(customerId: string, accessToken?: string) {
  return apiRequest<ListPrescriptionsResponse>(
    `/prescriptions?customerId=${encodeURIComponent(customerId)}`,
    { accessToken },
  );
}
