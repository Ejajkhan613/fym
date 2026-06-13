const { z } = require("zod");

const actorTypes = [
  "customer",
  "pharmacy",
  "pharmacist",
  "admin",
  "support_agent",
  "auditor",
];
const reportStatuses = ["draft", "generated", "submitted", "archived"];

const uuidParamSchema = z.object({ id: z.string().uuid() }).strict();

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

const logPrescriptionAccessSchema = z
  .object({
    prescriptionId: z.string().uuid(),
    actorUserId: z.string().uuid().optional(),
    actorType: z.enum(actorTypes),
    accessReason: z.string().trim().min(1).max(1000),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const listPrescriptionAccessQuerySchema = z
  .object({
    prescriptionId: z.string().uuid().optional(),
    actorUserId: z.string().uuid().optional(),
    actorType: z.enum(actorTypes).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const licenseAlertsQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(365).default(30),
  })
  .strict();

const createRegulatoryReportSchema = z
  .object({
    reportType: z.string().trim().min(1).max(80),
    status: z.enum(reportStatuses).default("draft"),
    periodStart: z.coerce.date().optional(),
    periodEnd: z.coerce.date().optional(),
    generatedByUserId: z.string().uuid().optional(),
    fileUrl: z.string().trim().url().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const listRegulatoryReportsQuerySchema = z
  .object({
    reportType: z.string().trim().min(1).max(80).optional(),
    status: z.enum(reportStatuses).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const updateRegulatoryReportSchema = z
  .object({
    status: z.enum(reportStatuses).optional(),
    fileUrl: z.string().trim().url().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

module.exports = {
  actorTypes,
  reportStatuses,
  uuidParamSchema,
  listAuditLogsQuerySchema,
  logPrescriptionAccessSchema,
  listPrescriptionAccessQuerySchema,
  licenseAlertsQuerySchema,
  createRegulatoryReportSchema,
  listRegulatoryReportsQuerySchema,
  updateRegulatoryReportSchema,
};
