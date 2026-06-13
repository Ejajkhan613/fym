const { z } = require("zod");

const uuidParamSchema = z.object({ id: z.string().uuid() }).strict();

const assignmentStatuses = [
  "ASSIGNED",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
];

const assignDeliverySchema = z
  .object({
    orderId: z.string().uuid(),
    riderUserId: z.string().uuid().optional(),
    pharmacyId: z.string().uuid().optional(),
    pickupOtp: z.string().trim().min(4).max(12).optional(),
    deliveryOtp: z.string().trim().min(4).max(12).optional(),
  })
  .strict();

const listAssignmentsQuerySchema = z
  .object({
    riderUserId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    status: z.enum(assignmentStatuses).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const trackingEventSchema = z
  .object({
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    status: z.string().trim().min(1).max(60).optional(),
    note: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

const pickupDeliveryActionSchema = z
  .object({
    riderUserId: z.string().uuid().optional(),
    pickupOtp: z.string().trim().min(4).max(12).optional(),
  })
  .strict();

const riderActionSchema = z
  .object({
    riderUserId: z.string().uuid().optional(),
  })
  .strict();

const failDeliverySchema = z
  .object({
    riderUserId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

const proofOfDeliverySchema = z
  .object({
    riderUserId: z.string().uuid().optional(),
    recipientName: z.string().trim().min(1).max(120),
    deliveryOtp: z.string().trim().min(4).max(12).optional(),
    otpVerified: z.boolean().default(false),
    signatureUrl: z.string().trim().url().optional(),
    photoUrl: z.string().trim().url().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

module.exports = {
  uuidParamSchema,
  assignmentStatuses,
  assignDeliverySchema,
  listAssignmentsQuerySchema,
  trackingEventSchema,
  pickupDeliveryActionSchema,
  riderActionSchema,
  failDeliverySchema,
  proofOfDeliverySchema,
};
