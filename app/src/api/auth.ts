import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type { AuthPurpose, AuthSession, OtpChallenge } from '../types/domain';

export function requestOtp(payload: { phone: string; purpose: AuthPurpose }) {
  return apiRequest<ApiEnvelope<OtpChallenge>>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function verifyOtp(payload: {
  phone: string;
  otp: string;
  purpose: AuthPurpose;
  name?: string;
}) {
  return apiRequest<ApiEnvelope<AuthSession>>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout(refreshToken: string) {
  return apiRequest<ApiEnvelope<{ revoked: true }>>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}
