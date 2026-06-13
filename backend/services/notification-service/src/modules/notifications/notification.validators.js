const { z } = require("zod");

const channels = ["push", "sms", "email", "websocket"];
const statuses = ["QUEUED", "SENT", "FAILED", "CANCELLED"];

const uuidParamSchema = z.object({ id: z.string().uuid() }).strict();

const queueNotificationSchema = z
  .object({
    recipientUserId: z.string().uuid().optional(),
    channel: z.enum(channels),
    templateKey: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(180).optional(),
    body: z.string().trim().min(1).max(4000),
    payload: z.record(z.string(), z.unknown()).optional(),
    scheduledAt: z.coerce.date().optional(),
  })
  .strict();

const listNotificationsQuerySchema = z
  .object({
    recipientUserId: z.string().uuid().optional(),
    channel: z.enum(channels).optional(),
    status: z.enum(statuses).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const markFailedSchema = z
  .object({
    failureReason: z.string().trim().min(1).max(1000),
  })
  .strict();

const cancelNotificationSchema = z
  .object({
    reason: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

module.exports = {
  channels,
  statuses,
  uuidParamSchema,
  queueNotificationSchema,
  listNotificationsQuerySchema,
  markFailedSchema,
  cancelNotificationSchema,
};
