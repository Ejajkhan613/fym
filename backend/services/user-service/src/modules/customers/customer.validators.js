const { z } = require("zod");

const uuidParamSchema = z.object({ userId: z.string().uuid() }).strict();

const addressParamSchema = z
  .object({
    userId: z.string().uuid(),
    addressId: z.string().uuid(),
  })
  .strict();

const familyProfileParamSchema = z
  .object({
    userId: z.string().uuid(),
    familyProfileId: z.string().uuid(),
  })
  .strict();

const reminderParamSchema = z
  .object({
    userId: z.string().uuid(),
    reminderId: z.string().uuid(),
  })
  .strict();

const profileSchema = z
  .object({
    dateOfBirth: z.coerce.date().optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
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

const familyProfileSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    relationship: z.string().trim().min(1).max(80),
    dateOfBirth: z.coerce.date().optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  })
  .strict();

const updateFamilyProfileSchema = familyProfileSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const reminderBaseSchema = z
  .object({
    familyProfileId: z.string().uuid().optional(),
    medicineName: z.string().trim().min(1).max(180),
    dosage: z.string().trim().min(1).max(120).optional(),
    frequency: z.string().trim().min(1).max(80),
    scheduleTime: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    notes: z.string().trim().min(1).max(1000).optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

const reminderSchema = reminderBaseSchema.refine(
  (value) => !value.endDate || value.endDate >= value.startDate,
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  },
);

const updateReminderSchema = reminderBaseSchema
  .partial()
  .refine(
    (value) =>
      !value.endDate || !value.startDate || value.endDate >= value.startDate,
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  )
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const privacySettingsSchema = z
  .object({
    pushNotificationsEnabled: z.boolean().optional(),
    smsNotificationsEnabled: z.boolean().optional(),
    orderUpdatesEnabled: z.boolean().optional(),
    prescriptionUpdatesEnabled: z.boolean().optional(),
    supportUpdatesEnabled: z.boolean().optional(),
    medicineRemindersEnabled: z.boolean().optional(),
    promotionalOffersEnabled: z.boolean().optional(),
    dataSharingConsent: z.boolean().optional(),
    gpsForAddressesEnabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

module.exports = {
  uuidParamSchema,
  addressParamSchema,
  familyProfileParamSchema,
  reminderParamSchema,
  profileSchema,
  addressSchema,
  updateAddressSchema,
  familyProfileSchema,
  updateFamilyProfileSchema,
  reminderSchema,
  updateReminderSchema,
  privacySettingsSchema,
};
