const { z } = require("zod");
const {
  pharmacyStatuses,
  documentTypes,
  documentStatuses,
  pharmacistStatuses,
} = require("./onboarding.constants");

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Phone must be a valid E.164-style number");

const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "Pincode must be a valid 6 digit Indian pincode");

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format");

const uuidParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const pharmacyProfileBaseSchema = z.object({
  ownerUserId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160).optional(),
  legalName: z.string().trim().min(1).max(200).optional(),
  licenseNumber: z.string().trim().min(3).max(80).optional(),
  licenseValidFrom: z.coerce.date().optional(),
  licenseValidTo: z.coerce.date().optional(),
  gstNumber: z.string().trim().min(3).max(32).optional(),
  shopRegistrationNumber: z.string().trim().min(3).max(80).optional(),
  addressLine1: z.string().trim().min(1).max(500).optional(),
  addressLine2: z.string().trim().max(500).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  state: z.string().trim().min(1).max(80).optional(),
  pincode: pincodeSchema.optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  serviceRadiusKm: z.coerce.number().positive().max(25).optional(),
  openingTime: timeSchema.optional(),
  closingTime: timeSchema.optional(),
  is24x7: z.boolean().optional(),
  hasOwnDelivery: z.boolean().optional(),
  supportsPlatformDelivery: z.boolean().optional(),
  coldChainCapable: z.boolean().optional(),
});

const createPharmacyDraftSchema = pharmacyProfileBaseSchema
  .extend({
    ownerUserId: z.string().uuid(),
    name: z.string().trim().min(1).max(160),
    licenseNumber: z.string().trim().min(3).max(80),
    addressLine1: z.string().trim().min(1).max(500),
    city: z.string().trim().min(1).max(80),
    state: z.string().trim().min(1).max(80),
    pincode: pincodeSchema,
  })
  .strict();

const updatePharmacyDraftSchema = pharmacyProfileBaseSchema
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const uploadDocumentSchema = z
  .object({
    documentType: z.enum(documentTypes),
    fileUrl: z.string().trim().url(),
    documentNumber: z.string().trim().min(1).max(120).optional(),
    expiresAt: z.coerce.date().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const addPharmacistSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: phoneSchema,
    registrationNumber: z.string().trim().min(3).max(120),
    certificateDocumentId: z.string().uuid().optional(),
  })
  .strict();

const actorSchema = z
  .object({
    actorUserId: z.string().uuid(),
    reason: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

const approvalSchema = z
  .object({
    reviewedByUserId: z.string().uuid(),
    reason: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

const rejectionSchema = z
  .object({
    reviewedByUserId: z.string().uuid(),
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

const submitSchema = z
  .object({
    actorUserId: z.string().uuid().optional(),
  })
  .strict();

const listPharmaciesQuerySchema = z
  .object({
    ownerUserId: z.string().uuid().optional(),
    status: z.enum(pharmacyStatuses).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    search: z.string().trim().min(1).max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

module.exports = {
  pharmacyStatuses,
  documentTypes,
  documentStatuses,
  pharmacistStatuses,
  uuidParamSchema,
  createPharmacyDraftSchema,
  updatePharmacyDraftSchema,
  uploadDocumentSchema,
  addPharmacistSchema,
  submitSchema,
  actorSchema,
  approvalSchema,
  rejectionSchema,
  listPharmaciesQuerySchema,
};
