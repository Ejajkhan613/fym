const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { PharmacyOnboardingService } = require("./onboarding.service");
const {
  uuidParamSchema,
  createPharmacyDraftSchema,
  updatePharmacyDraftSchema,
  uploadDocumentSchema,
  addPharmacistSchema,
  submitSchema,
  actorSchema,
  approvalSchema,
  rejectionSchema,
  listPharmaciesQuerySchema,
} = require("./onboarding.validators");

function parse(schema, value) {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  throw createError(400, "Validation failed", {
    details: result.error.flatten(),
  });
}

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function createPharmacyOnboardingRoutes({
  onboardingService = new PharmacyOnboardingService(),
} = {}) {
  const router = express.Router();

  router.post(
    "/drafts",
    asyncHandler(async (req, res) => {
      const payload = parse(createPharmacyDraftSchema, req.body);
      const pharmacy = await onboardingService.createDraft(payload);

      res.status(201).json({ data: pharmacy });
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filters = parse(listPharmaciesQuerySchema, req.query);
      const result = await onboardingService.listPharmacies(filters);

      res.json({
        data: result.pharmacies,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const profile = await onboardingService.getOnboardingProfile(id);

      res.json({ data: profile });
    }),
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(updatePharmacyDraftSchema, req.body);
      const pharmacy = await onboardingService.updateDraft(id, payload);

      res.json({ data: pharmacy });
    }),
  );

  router.post(
    "/:id/documents",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(uploadDocumentSchema, req.body);
      const document = await onboardingService.uploadDocument(id, payload);

      res.status(201).json({ data: document });
    }),
  );

  router.get(
    "/:id/documents",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const documents = await onboardingService.listDocuments(id);

      res.json({ data: documents });
    }),
  );

  router.post(
    "/:id/pharmacists",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(addPharmacistSchema, req.body);
      const pharmacist = await onboardingService.addPharmacist(id, payload);

      res.status(201).json({ data: pharmacist });
    }),
  );

  router.get(
    "/:id/pharmacists",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const pharmacists = await onboardingService.listPharmacists(id);

      res.json({ data: pharmacists });
    }),
  );

  router.post(
    "/:id/submit",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(submitSchema, req.body);
      const pharmacy = await onboardingService.submitForReview(
        id,
        payload.actorUserId,
      );

      res.json({ data: pharmacy });
    }),
  );

  router.post(
    "/:id/review/start",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(actorSchema, req.body);
      const pharmacy = await onboardingService.startReview(
        id,
        payload.actorUserId,
      );

      res.json({ data: pharmacy });
    }),
  );

  router.post(
    "/:id/review/approve",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(approvalSchema, req.body);
      const pharmacy = await onboardingService.approve(id, payload);

      res.json({ data: pharmacy });
    }),
  );

  router.post(
    "/:id/review/reject",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(rejectionSchema, req.body);
      const pharmacy = await onboardingService.reject(id, payload);

      res.json({ data: pharmacy });
    }),
  );

  router.post(
    "/:id/suspend",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(actorSchema, req.body);
      const pharmacy = await onboardingService.suspend(id, payload);

      res.json({ data: pharmacy });
    }),
  );

  router.post(
    "/:id/blacklist",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(actorSchema, req.body);
      const pharmacy = await onboardingService.blacklist(id, payload);

      res.json({ data: pharmacy });
    }),
  );

  return router;
}

function pharmacyOnboardingErrorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || error.status || 500;
  const payload = {
    error: {
      message: statusCode === 500 ? "Internal server error" : error.message,
    },
  };

  if (error.details) {
    payload.error.details = error.details;
  }

  if (error instanceof ZodError) {
    payload.error.details = error.flatten();
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  createPharmacyOnboardingRoutes,
  pharmacyOnboardingErrorHandler,
};
