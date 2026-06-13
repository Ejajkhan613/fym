const { z } = require("zod");

const offerStatuses = [
  "OFFER_SENT",
  "OFFER_VIEWED",
  "OFFER_ACCEPTED",
  "OFFER_REJECTED",
  "OFFER_EXPIRED",
  "OFFER_CLOSED_ORDER_ASSIGNED_ELSEWHERE",
];

const candidateShape = {
  city: z.string().trim().min(1).max(80).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(25).default(5),
  minimumTrustScore: z.coerce.number().min(0).max(100).default(0),
  limit: z.coerce.number().int().min(1).max(20).default(5),
};

function requireCompleteCoordinates(schema) {
  return schema.refine(
    (value) =>
      (value.latitude === undefined && value.longitude === undefined) ||
      (value.latitude !== undefined && value.longitude !== undefined),
    {
      message: "Latitude and longitude must be provided together",
      path: ["latitude"],
    },
  );
}

const candidateQuerySchema = requireCompleteCoordinates(
  z.object(candidateShape).strict(),
);

const dispatchSchema = requireCompleteCoordinates(
  z
    .object({
      ...candidateShape,
      orderId: z.string().uuid(),
      candidatePharmacyIds: z
        .array(z.string().uuid())
        .min(1)
        .max(20)
        .optional(),
      waveNumber: z.coerce.number().int().min(1).max(10).default(1),
      offerTtlSeconds: z.coerce.number().int().min(10).max(600).default(45),
    })
    .strict(),
);

const listOffersQuerySchema = z
  .object({
    orderId: z.string().uuid().optional(),
    pharmacyId: z.string().uuid().optional(),
    status: z.enum(offerStatuses).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

module.exports = {
  offerStatuses,
  candidateQuerySchema,
  dispatchSchema,
  listOffersQuerySchema,
};
