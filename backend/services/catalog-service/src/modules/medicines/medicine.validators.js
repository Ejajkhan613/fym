const { z } = require("zod");

const uuidParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const medicineSchema = z
  .object({
    brandName: z.string().trim().min(1).max(180),
    genericName: z.string().trim().min(1).max(180).optional(),
    saltComposition: z.string().trim().min(1).max(1000).optional(),
    strength: z.string().trim().min(1).max(80).optional(),
    dosageForm: z.string().trim().min(1).max(80).optional(),
    manufacturer: z.string().trim().min(1).max(160).optional(),
    packSize: z.string().trim().min(1).max(80).optional(),
    mrp: z.coerce.number().min(0).max(100000).default(0),
    scheduleCategory: z.string().trim().min(1).max(40).optional(),
    requiresPrescription: z.boolean().default(false),
    isRestricted: z.boolean().default(false),
    coldChainRequired: z.boolean().default(false),
    substitutionAllowed: z.boolean().default(true),
    therapeuticClass: z.string().trim().min(1).max(120).optional(),
    storageType: z.string().trim().min(1).max(80).optional(),
    sideEffectWarning: z.string().trim().min(1).max(2000).optional(),
    interactionWarning: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

const updateMedicineSchema = medicineSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const searchMedicinesQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    query: z.string().trim().min(1).max(120).optional(),
    requiresPrescription: z.coerce.boolean().optional(),
    isRestricted: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const synonymSchema = z
  .object({
    synonym: z.string().trim().min(1).max(180),
  })
  .strict();

module.exports = {
  uuidParamSchema,
  medicineSchema,
  updateMedicineSchema,
  searchMedicinesQuerySchema,
  synonymSchema,
};
