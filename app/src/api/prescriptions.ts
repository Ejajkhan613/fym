import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type { PrescriptionRecord } from '../types/domain';

type ListPrescriptionsResponse = ApiEnvelope<PrescriptionRecord[]>;
type PrescriptionFile = {
  name: string;
  uri: string;
  mimeType?: string;
};

export function uploadPrescription(payload: {
  customerId: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  orderId?: string;
  accessToken?: string;
}) {
  return apiRequest<ApiEnvelope<PrescriptionRecord>>('/prescriptions/upload', {
    method: 'POST',
    body: JSON.stringify({
      customerId: payload.customerId,
      fileUrl: payload.fileUrl,
      fileType: payload.fileType,
      ...(payload.orderId ? { orderId: payload.orderId } : {}),
    }),
    accessToken: payload.accessToken,
  });
}

export function uploadPrescriptionFile(payload: {
  customerId: string;
  file: PrescriptionFile;
  orderId?: string;
  accessToken?: string;
}) {
  const formData = new FormData();
  formData.append('customerId', payload.customerId);

  if (payload.orderId) {
    formData.append('orderId', payload.orderId);
  }

  formData.append('file', {
    uri: payload.file.uri,
    name: payload.file.name,
    type: payload.file.mimeType || getFallbackMimeType(payload.file.name),
  } as unknown as Blob);

  return apiRequest<ApiEnvelope<PrescriptionRecord>>('/prescriptions/upload-file', {
    method: 'POST',
    body: formData,
    accessToken: payload.accessToken,
  });
}

export function listPrescriptions(customerId: string, accessToken?: string) {
  return apiRequest<ListPrescriptionsResponse>(
    `/prescriptions?customerId=${encodeURIComponent(customerId)}`,
    { accessToken },
  );
}

export function linkPrescriptionToOrder(payload: {
  prescriptionId: string;
  orderId: string;
  accessToken?: string;
}) {
  return apiRequest<ApiEnvelope<PrescriptionRecord>>(
    `/prescriptions/${payload.prescriptionId}/order`,
    {
      method: 'PATCH',
      body: JSON.stringify({ orderId: payload.orderId }),
      accessToken: payload.accessToken,
    },
  );
}

export function deletePrescription(prescriptionId: string, accessToken?: string) {
  return apiRequest<null>(`/prescriptions/${prescriptionId}`, {
    method: 'DELETE',
    accessToken,
  });
}

function getFallbackMimeType(fileName: string) {
  const normalizedName = fileName.toLowerCase();

  if (normalizedName.endsWith('.pdf')) return 'application/pdf';
  if (normalizedName.endsWith('.png')) return 'image/png';
  if (normalizedName.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}
