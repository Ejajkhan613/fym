import { apiRequest } from "@/shared/api/http-client";
import type { ApiEnvelope } from "@/shared/types/api";
import type { UpdateUserPayload, User } from "@/features/users/types";

export function getUser(userId: string, accessToken?: string) {
  return apiRequest<ApiEnvelope<User>>(`/users/${userId}`, {
    accessToken,
  });
}

export function updateUser(
  userId: string,
  payload: UpdateUserPayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<User>>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
