import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type { AuthUser } from '../types/domain';

export function updateUser(
  userId: string,
  payload: {
    name?: string;
  },
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<AuthUser>>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    accessToken,
  });
}
