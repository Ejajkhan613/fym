import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type { Penalty } from '../types/domain';

export function listPenalties(pharmacyId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<Penalty[]>>(
    `/penalties?pharmacyId=${encodeURIComponent(pharmacyId)}&limit=25`,
    { accessToken },
  );
}

export function appealPenalty(
  penaltyId: string,
  payload: {
    reason: string;
    evidenceUrls?: string[];
  },
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<unknown>>(`/penalties/${penaltyId}/appeal`, {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  });
}
