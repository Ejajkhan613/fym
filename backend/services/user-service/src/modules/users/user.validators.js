const { z } = require("zod");

const userRoles = [
  "customer",
  "pharmacy_owner",
  "pharmacist",
  "delivery_partner",
  "admin",
  "support_agent",
];

const userStatuses = [
  "pending_verification",
  "active",
  "suspended",
  "blocked",
  "deleted",
];

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Phone must be a valid E.164-style number");

const createUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: phoneSchema,
    role: z.enum(userRoles).default("customer"),
    status: z.enum(userStatuses).default("pending_verification"),
  })
  .strict();

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: phoneSchema.optional(),
    role: z.enum(userRoles).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const updateUserStatusSchema = z
  .object({
    status: z.enum(userStatuses),
  })
  .strict();

const userIdParamSchema = z
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

module.exports = {
  userRoles,
  userStatuses,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamSchema,
  listUsersQuerySchema,
};
