const { z } = require("zod");

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Phone must be a valid E.164-style number");

const loginOtpSchema = z
  .object({
    phone: phoneSchema,
  })
  .strict();

const signupOtpSchema = loginOtpSchema;

const refreshSchema = z
  .object({
    refreshToken: z.string().min(32),
  })
  .strict();

const logoutSchema = refreshSchema;

const requestOtpSchema = z
  .object({
    phone: phoneSchema,
    purpose: z.enum(["login", "register"]).default("login"),
  })
  .strict();

const verifyOtpSchema = z
  .object({
    phone: phoneSchema,
    otp: z.string().regex(/^\d{4,8}$/, "OTP must contain only digits"),
    purpose: z.enum(["login", "register"]).default("login"),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.purpose === "register" && !value.name) {
      context.addIssue({
        code: "custom",
        message: "Name is required for OTP registration",
        path: ["name"],
      });
    }
  });

module.exports = {
  loginOtpSchema,
  signupOtpSchema,
  refreshSchema,
  logoutSchema,
  requestOtpSchema,
  verifyOtpSchema,
};
