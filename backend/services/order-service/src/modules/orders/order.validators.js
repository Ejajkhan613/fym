const { z } = require("zod");
const {
  orderStatuses,
  orderTypes,
  paymentStatuses,
  offerStatuses,
} = require("./order.constants");

const uuidParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const deliveryAddressSchema = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
    addressLine1: z.string().trim().min(1).max(500),
    addressLine2: z.string().trim().max(500).optional(),
    city: z.string().trim().min(1).max(80),
    state: z.string().trim().min(1).max(80),
    pincode: z
      .string()
      .trim()
      .regex(/^[1-9][0-9]{5}$/),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .strict();

const createOrderItemSchema = z
  .object({
    medicineId: z.string().uuid().optional(),
    requestedName: z.string().trim().min(1).max(180),
    quantity: z.coerce.number().int().min(1).max(100),
    unitPrice: z.coerce.number().min(0).max(100000),
    requiresPrescription: z.boolean().default(false),
  })
  .strict();

const createOrderSchema = z
  .object({
    customerId: z.string().uuid(),
    orderType: z.enum(orderTypes).optional(),
    paymentStatus: z.enum(paymentStatuses).default("PAYMENT_PENDING"),
    deliveryFee: z.coerce.number().min(0).max(100000).default(0),
    platformFee: z.coerce.number().min(0).max(100000).default(0),
    discount: z.coerce.number().min(0).max(100000).default(0),
    deliveryAddress: deliveryAddressSchema,
    prescriptionId: z.string().uuid().optional(),
    candidatePharmacyIds: z.array(z.string().uuid()).max(20).optional(),
    items: z.array(createOrderItemSchema).min(1).max(50),
  })
  .strict();

const listOrdersQuerySchema = z
  .object({
    customerId: z.string().uuid().optional(),
    pharmacyId: z.string().uuid().optional(),
    status: z.enum(orderStatuses).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const listPharmacyOffersQuerySchema = z
  .object({
    pharmacyId: z.string().uuid(),
    status: z.enum(offerStatuses).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const pharmacyIdSchema = z
  .object({
    pharmacyId: z.string().uuid(),
  })
  .strict();

const acceptOfferSchema = z
  .object({
    pharmacyId: z.string().uuid(),
    stockConfirmed: z.boolean(),
    expiryConfirmed: z.boolean(),
    pharmacistVerified: z.boolean(),
    packingTimeMinutes: z.coerce.number().int().min(1).max(180),
  })
  .strict();

const rejectOfferSchema = z
  .object({
    pharmacyId: z.string().uuid(),
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

const transitionOrderSchema = z
  .object({
    pharmacyId: z.string().uuid(),
    reason: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

const cancelCustomerOrderSchema = z
  .object({
    reason: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

const listRealtimeEventsQuerySchema = z
  .object({
    channel: z
      .string()
      .trim()
      .regex(
        /^(customer|pharmacy|order):[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    orderId: z.string().uuid().optional(),
    eventName: z.string().trim().min(1).max(120).optional(),
    afterId: z.string().uuid().optional(),
    after: z
      .string()
      .trim()
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "Invalid datetime",
      })
      .optional(),
    direction: z.enum(["asc", "desc"]).default("asc"),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

module.exports = {
  uuidParamSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  listPharmacyOffersQuerySchema,
  pharmacyIdSchema,
  acceptOfferSchema,
  rejectOfferSchema,
  transitionOrderSchema,
  cancelCustomerOrderSchema,
  listRealtimeEventsQuerySchema,
};
