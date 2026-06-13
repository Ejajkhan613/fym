const { z } = require("zod");

const ticketStatuses = [
  "open",
  "in_progress",
  "waiting_on_customer",
  "resolved",
  "closed",
];
const priorities = ["low", "medium", "high", "urgent"];
const senderTypes = [
  "customer",
  "support_agent",
  "admin",
  "pharmacy",
  "system",
];

const uuidParamSchema = z.object({ id: z.string().uuid() }).strict();

const createTicketSchema = z
  .object({
    customerId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    category: z.string().trim().min(1).max(80),
    priority: z.enum(priorities).default("medium"),
    subject: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1).max(5000),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const listTicketsQuerySchema = z
  .object({
    customerId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    assignedToUserId: z.string().uuid().optional(),
    status: z.enum(ticketStatuses).optional(),
    priority: z.enum(priorities).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const updateTicketSchema = z
  .object({
    assignedToUserId: z.string().uuid().optional(),
    priority: z.enum(priorities).optional(),
    status: z.enum(ticketStatuses).optional(),
    resolution: z.string().trim().min(1).max(5000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const addMessageSchema = z
  .object({
    senderUserId: z.string().uuid().optional(),
    senderType: z.enum(senderTypes),
    message: z.string().trim().min(1).max(5000),
    attachmentUrls: z.array(z.string().trim().url()).max(10).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

module.exports = {
  ticketStatuses,
  priorities,
  senderTypes,
  uuidParamSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
  addMessageSchema,
};
