const { z } = require("zod");

const inventorySources = [
  "manual",
  "bulk_upload",
  "pos_sync",
  "system_adjustment",
];

const mismatchReasons = [
  "shelf_count_mismatch",
  "expired_batch_found",
  "damaged_stock",
  "billing_sync_issue",
  "order_acceptance_mismatch",
  "other",
];

const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === "true" || value === true) {
    return true;
  }

  if (value === "false" || value === false) {
    return false;
  }

  return value;
}, z.boolean().optional());

const pharmacyParamSchema = z
  .object({
    pharmacyId: z.string().uuid(),
  })
  .strict();

const inventoryParamSchema = z
  .object({
    pharmacyId: z.string().uuid(),
    inventoryId: z.string().uuid(),
  })
  .strict();

const listInventoryQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    lowStockOnly: booleanQuerySchema,
    lowStockThreshold: z.coerce.number().int().min(0).max(500).default(10),
    expiringWithinDays: z.coerce.number().int().min(0).max(730).optional(),
    coldChainRequired: booleanQuerySchema,
    fastMoving: booleanQuerySchema,
    limit: z.coerce.number().int().min(1).max(250).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const inventoryItemBaseSchema = z.object({
  medicineId: z.string().uuid().optional(),
  medicineName: z.string().trim().min(1).max(180),
  genericName: z.string().trim().min(1).max(180).optional(),
  strength: z.string().trim().min(1).max(80).optional(),
  quantity: z.coerce.number().int().min(0).max(100000),
  batchNumber: z.string().trim().min(1).max(120).optional(),
  expiryDate: z.coerce.date().optional(),
  price: z.coerce.number().min(0).max(100000),
  coldChainRequired: z.boolean().default(false),
  fastMoving: z.boolean().default(false),
  source: z.enum(inventorySources).default("manual"),
  stockConfidenceScore: z.coerce.number().min(0).max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const createInventoryItemSchema = inventoryItemBaseSchema.strict();

const updateInventoryItemSchema = inventoryItemBaseSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const adjustInventorySchema = z
  .object({
    quantityDelta: z.coerce.number().int().min(-100000).max(100000),
  })
  .strict();

const bulkUploadInventorySchema = z
  .object({
    source: z.enum(inventorySources).default("bulk_upload"),
    items: z.array(createInventoryItemSchema).min(1).max(100),
  })
  .strict();

const reportStockMismatchSchema = z
  .object({
    inventoryId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    medicineName: z.string().trim().min(1).max(180),
    expectedQuantity: z.coerce.number().int().min(0).max(100000).optional(),
    actualQuantity: z.coerce.number().int().min(0).max(100000).optional(),
    reason: z.enum(mismatchReasons),
    notes: z.string().trim().min(1).max(1000).optional(),
    reportedByUserId: z.string().uuid().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

module.exports = {
  inventorySources,
  mismatchReasons,
  pharmacyParamSchema,
  inventoryParamSchema,
  listInventoryQuerySchema,
  createInventoryItemSchema,
  updateInventoryItemSchema,
  adjustInventorySchema,
  bulkUploadInventorySchema,
  reportStockMismatchSchema,
};
