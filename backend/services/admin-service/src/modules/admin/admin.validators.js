const { z } = require("zod");
const {
  userRoles,
  userStatuses,
  pharmacyStatuses,
} = require("./admin.constants");

const uuidParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const listUsersQuerySchema = z
  .object({
    role: z.enum(userRoles).optional(),
    status: z.enum(userStatuses).optional(),
    search: z.string().trim().min(1).max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const updateUserStatusSchema = z
  .object({
    status: z.enum(userStatuses),
    actorUserId: z.string().uuid(),
    reason: z.string().trim().min(1).max(1000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      ["suspended", "blocked", "deleted"].includes(value.status) &&
      !value.reason
    ) {
      context.addIssue({
        code: "custom",
        message: "Reason is required for this status",
        path: ["reason"],
      });
    }
  });

const listPharmaciesQuerySchema = z
  .object({
    status: z.enum(pharmacyStatuses).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    ownerUserId: z.string().uuid().optional(),
    search: z.string().trim().min(1).max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const adminActorSchema = z
  .object({
    actorUserId: z.string().uuid(),
    reason: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

const requiredReasonActorSchema = z
  .object({
    actorUserId: z.string().uuid(),
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

const listAuditLogsQuerySchema = z
  .object({
    actorUserId: z.string().uuid().optional(),
    entityType: z.string().trim().min(1).max(80).optional(),
    entityId: z.string().uuid().optional(),
    action: z.string().trim().min(1).max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

module.exports = {
  uuidParamSchema,
  listUsersQuerySchema,
  updateUserStatusSchema,
  listPharmaciesQuerySchema,
  adminActorSchema,
  requiredReasonActorSchema,
  listAuditLogsQuerySchema,
};
