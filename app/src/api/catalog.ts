import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type { Medicine } from '../types/domain';

export function searchMedicines(query: string) {
  const params = new URLSearchParams({
    q: query,
    limit: '20',
    offset: '0',
  });

  return apiRequest<ApiEnvelope<Medicine[]>>(`/medicines/search?${params.toString()}`);
}
