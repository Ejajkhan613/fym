const { z } = require("zod");

const uuidParamSchema = z.object({ userId: z.string().uuid() }).strict();

const addressParamSchema = z
  .object({
    userId: z.string().uuid(),
    addressId: z.string().uuid(),
  })
  .strict();

const profileSchema = z
  .object({
    dateOfBirth: z.coerce.date().optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    emergencyContactName: z.string().trim().min(1).max(120).optional(),
    emergencyContactPhone: z.string().trim().min(7).max(20).optional(),
    abhaIdOptional: z.string().trim().min(1).max(80).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const addressSchema = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
    recipientName: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
    addressLine1: z.string().trim().min(1).max(500),
    addressLine2: z.string().trim().max(500).optional(),
    city: z.string().trim().min(1).max(80),
    state: z.string().trim().min(1).max(80),
    pincode: z
      .string()
      .trim()
      .regex(/^[1-9][0-9]{5}$/),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    isDefault: z.boolean().default(false),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const updateAddressSchema = addressSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

module.exports = {
  uuidParamSchema,
  addressParamSchema,
  profileSchema,
  addressSchema,
  updateAddressSchema,
};
