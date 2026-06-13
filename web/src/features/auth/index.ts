import { frontendFeatures } from "@/features/feature-definitions";

export {
  getCurrentUser,
  logout,
  refreshAuthSession,
  requestOtp,
  verifyOtp,
} from "@/features/auth/api";
export {
  loginFormSchema,
  requestOtpSchema,
  signupFormSchema,
  verifyOtpSchema,
} from "@/features/auth/schemas";
export type {
  AuthPurpose,
  AuthSession,
  AuthTokens,
  AuthUser,
  OtpChallenge,
  RequestOtpPayload,
  VerifyOtpPayload,
} from "@/features/auth/types";

export const authFeature = frontendFeatures.auth;
