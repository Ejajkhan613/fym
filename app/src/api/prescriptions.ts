import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';

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
