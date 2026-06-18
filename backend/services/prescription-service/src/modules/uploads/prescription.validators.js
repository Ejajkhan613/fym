const { z } = require("zod");

const prescriptionStatuses = [
  "UPLOADED",
  "OCR_PENDING",
  "OCR_COMPLETED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "FLAGGED",
];

const uuidParamSchema = z.object({ id: z.string().uuid() }).strict();

const uploadPrescriptionSchema = z
  .object({
    customerId: z.string().uuid(),
    orderId: z.string().uuid().optional(),
    fileUrl: z.string().trim().url(),
    fileType: z.enum(["image", "pdf"]).default("image"),
  })
  .strict();

const uploadPrescriptionFileSchema = z
  .object({
    customerId: z.string().uuid(),
    orderId: z.string().uuid().optional(),
  })
  .strict();

const listPrescriptionsQuerySchema = z
  .object({
    customerId: z.string().uuid().optional(),
    status: z.enum(prescriptionStatuses).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const extractedItemSchema = z
  .object({
    name: z.string().trim().min(1).max(180),
    strength: z.string().trim().max(80).optional(),
    dosage: z.string().trim().max(120).optional(),
    frequency: z.string().trim().max(120).optional(),
    duration: z.string().trim().max(120).optional(),
    quantity: z.coerce.number().int().min(1).max(1000).optional(),
    confidence: z.coerce.number().min(0).max(100).optional(),
  })
  .strict();

const updateOcrSchema = z
  .object({
    ocrText: z.string().trim().max(20000).optional(),
    extractedItems: z.array(extractedItemSchema).default([]),
    confidenceScore: z.coerce.number().min(0).max(100).optional(),
  })
  .strict();

const linkPrescriptionOrderSchema = z
  .object({
    orderId: z.string().uuid(),
  })
  .strict();

const reviewActorSchema = z
  .object({
    reviewedByUserId: z.string().uuid(),
  })
  .strict();

const rejectPrescriptionSchema = z
  .object({
    reviewedByUserId: z.string().uuid(),
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

const flagPrescriptionSchema = rejectPrescriptionSchema
  .extend({
    fraudFlags: z.array(z.string().trim().min(1).max(120)).min(1),
  })
  .strict();

module.exports = {
  prescriptionStatuses,
  uuidParamSchema,
  uploadPrescriptionSchema,
  uploadPrescriptionFileSchema,
  listPrescriptionsQuerySchema,
  updateOcrSchema,
  linkPrescriptionOrderSchema,
  reviewActorSchema,
  rejectPrescriptionSchema,
  flagPrescriptionSchema,
};
