import { apiRequest } from "@/shared/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api";
import type {
  AuthSession,
  OtpChallenge,
  RequestOtpPayload,
  VerifyOtpPayload,
} from "@/features/auth/types";

export function requestOtp(payload: RequestOtpPayload) {
  return apiRequest<ApiEnvelope<OtpChallenge>>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function verifyOtp(payload: VerifyOtpPayload) {
  return apiRequest<ApiEnvelope<AuthSession>>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function getCurrentUser(accessToken: string) {
  return apiRequest<ApiEnvelope<AuthSession["user"]>>("/auth/me", {
    accessToken,
  });
}

export function refreshAuthSession(refreshToken: string) {
  return apiRequest<ApiEnvelope<AuthSession>>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function logout(refreshToken: string) {
  return apiRequest<ApiEnvelope<{ revoked: true }>>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
