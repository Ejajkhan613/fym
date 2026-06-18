const { z } = require("zod");

const uuidParamSchema = z.object({ id: z.string().uuid() }).strict();
const orderIdParamSchema = z.object({ orderId: z.string().uuid() }).strict();
const customerIdParamSchema = z
  .object({ customerId: z.string().uuid() })
  .strict();

const initiatePaymentSchema = z
  .object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    provider: z.string().trim().min(1).max(80),
    providerReference: z.string().trim().min(1).max(160).optional(),
    paymentMethod: z.enum(["upi", "card", "netbanking", "wallet", "cod"]),
    amount: z.coerce.number().min(0).max(10000000),
    currency: z.string().trim().min(3).max(8).default("INR"),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const paymentStatusUpdateSchema = z
  .object({
    providerReference: z.string().trim().min(1).max(160).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const failPaymentSchema = paymentStatusUpdateSchema
  .extend({
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

const createRefundSchema = z
  .object({
    amount: z.coerce.number().min(0).max(10000000),
    reason: z.string().trim().min(1).max(1000).optional(),
    providerReference: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

const updateRefundStatusSchema = z
  .object({
    status: z.enum(["REFUND_PROCESSED", "REFUND_FAILED"]),
    providerReference: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

module.exports = {
  uuidParamSchema,
  orderIdParamSchema,
  customerIdParamSchema,
  initiatePaymentSchema,
  paymentStatusUpdateSchema,
  failPaymentSchema,
  createRefundSchema,
  updateRefundStatusSchema,
};
