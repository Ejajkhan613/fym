import type { UserRole, UserStatus } from "@/shared/types/domain";

export type AuthPurpose = "login" | "register";

export type RequestOtpPayload = {
  phone: string;
  purpose: AuthPurpose;
};

export type VerifyOtpPayload = {
  phone: string;
  otp: string;
  purpose: AuthPurpose;
  name?: string;
};

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  accessTokenExpiresIn: string;
  refreshTokenExpiresAt: string;
};

export type AuthSession = {
  user: AuthUser;
  tokens: AuthTokens;
};

export type OtpChallenge = {
  challengeId: string;
  phone: string;
  purpose: AuthPurpose;
  expiresAt: string;
  delivery: {
    channel: "sms";
    status: "queued";
  };
  devOtp?: string;
};
