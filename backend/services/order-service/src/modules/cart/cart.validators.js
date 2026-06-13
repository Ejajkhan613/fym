const { z } = require("zod");

const uuidParamSchema = z.object({ id: z.string().uuid() }).strict();

const cartQuerySchema = z
  .object({
    customerId: z.string().uuid(),
  })
  .strict();

const addCartItemSchema = z
  .object({
    customerId: z.string().uuid(),
    medicineId: z.string().uuid().optional(),
    requestedName: z.string().trim().min(1).max(180),
    quantity: z.coerce.number().int().min(1).max(100),
    unitPrice: z.coerce.number().min(0).max(100000).default(0),
    requiresPrescription: z.boolean().default(false),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const updateCartItemSchema = z
  .object({
    quantity: z.coerce.number().int().min(1).max(100).optional(),
    unitPrice: z.coerce.number().min(0).max(100000).optional(),
    requiresPrescription: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

module.exports = {
  uuidParamSchema,
  cartQuerySchema,
  addCartItemSchema,
  updateCartItemSchema,
};
