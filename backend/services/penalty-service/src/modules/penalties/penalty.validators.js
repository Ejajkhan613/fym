const { z } = require("zod");

const penaltyStatuses = ["applied", "waived", "paid", "disputed", "cancelled"];
const appealStatuses = ["submitted", "under_review", "approved", "rejected"];

const uuidParamSchema = z.object({ id: z.string().uuid() }).strict();

const createPenaltySchema = z
  .object({
    pharmacyId: z.string().uuid(),
    orderId: z.string().uuid().optional(),
    penaltyType: z.string().trim().min(1).max(80),
    level: z.coerce.number().int().min(1).max(5).default(1),
    baseAmount: z.coerce.number().min(0).max(100000).default(0),
    customerInconvenienceFee: z.coerce.number().min(0).max(100000).default(0),
    deliveryLossFee: z.coerce.number().min(0).max(100000).default(0),
    platformSlaFee: z.coerce.number().min(0).max(100000).default(0),
    repeatMultiplier: z.coerce.number().min(1).max(10).default(1),
    reason: z.string().trim().min(1).max(2000),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdByUserId: z.string().uuid().optional(),
  })
  .strict();

const listPenaltiesQuerySchema = z
  .object({
    pharmacyId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    status: z.enum(penaltyStatuses).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const waivePenaltySchema = z
  .object({
    actorUserId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(2000),
  })
  .strict();

const appealPenaltySchema = z
  .object({
    reason: z.string().trim().min(1).max(3000),
    evidenceUrls: z.array(z.string().trim().url()).max(10).optional(),
  })
  .strict();

const listAppealsQuerySchema = z
  .object({
    penaltyId: z.string().uuid().optional(),
    pharmacyId: z.string().uuid().optional(),
    status: z.enum(appealStatuses).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const reviewAppealSchema = z
  .object({
    status: z.enum(["under_review", "approved", "rejected"]),
    reviewedByUserId: z.string().uuid().optional(),
    reviewReason: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

module.exports = {
  penaltyStatuses,
  appealStatuses,
  uuidParamSchema,
  createPenaltySchema,
  listPenaltiesQuerySchema,
  waivePenaltySchema,
  appealPenaltySchema,
  listAppealsQuerySchema,
  reviewAppealSchema,
};
