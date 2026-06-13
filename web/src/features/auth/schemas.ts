import { z } from "zod";

export const mobileNumberSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Use a valid mobile number.");

export const authNameSchema = z.string().trim().min(1).max(120);

export const requestOtpSchema = z.object({
  phone: mobileNumberSchema,
  purpose: z.enum(["login", "register"]),
});

export const verifyOtpSchema = z.object({
  phone: mobileNumberSchema,
  otp: z.string().trim().regex(/^\d{4,8}$/, "Use the OTP sent to your phone."),
  purpose: z.enum(["login", "register"]),
  name: authNameSchema.optional(),
});

export const loginFormSchema = z.object({
  phone: mobileNumberSchema,
  otp: z.string().trim().optional(),
});

export const signupFormSchema = z.object({
  name: authNameSchema,
  phone: mobileNumberSchema,
  otp: z.string().trim().optional(),
});
