import type { UserRole, UserStatus } from "@/shared/types/domain";

export type User = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateUserPayload = {
  name?: string;
  phone?: string;
  role?: UserRole;
};
