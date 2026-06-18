const express = require("express");
const createError = require("http-errors");
const multer = require("multer");
const { ZodError } = require("zod");
const { PrescriptionService } = require("./prescription.service");
const { DEFAULT_MAX_FILE_SIZE_BYTES } = require("./prescription.storage");
const {
  uuidParamSchema,
  uploadPrescriptionFileSchema,
  uploadPrescriptionSchema,
  listPrescriptionsQuerySchema,
  updateOcrSchema,
  linkPrescriptionOrderSchema,
  reviewActorSchema,
  rejectPrescriptionSchema,
  flagPrescriptionSchema,
} = require("./prescription.validators");

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
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

const allowedUploadMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const uploadFileMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(
      process.env.PRESCRIPTION_UPLOAD_MAX_BYTES || DEFAULT_MAX_FILE_SIZE_BYTES,
    ),
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (!allowedUploadMimeTypes.has(file.mimetype)) {
      return callback(
        createError(400, "Only PDF, JPG, PNG, or WEBP prescriptions are allowed"),
      );
    }

    return callback(null, true);
  },
}).single("file");

function uploadFile(req, res, next) {
  uploadFileMiddleware(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return next(createError(statusCode, error.message));
    }

    return next(error);
  });
}

function getFileType(file) {
  return file?.mimetype === "application/pdf" ? "pdf" : "image";
}

function createPrescriptionRoutes({
  prescriptionService = new PrescriptionService(),
} = {}) {
  const router = express.Router();

  router.post(
    "/upload",
    asyncHandler(async (req, res) => {
      const payload = parse(uploadPrescriptionSchema, req.body);
      const prescription = await prescriptionService.upload(payload);
      res.status(201).json({ data: prescription });
    }),
  );

  router.post(
    "/upload-file",
    uploadFile,
    asyncHandler(async (req, res) => {
      const payload = parse(uploadPrescriptionFileSchema, req.body);

      if (!req.file) {
        throw createError(400, "Prescription file is required");
      }

      const prescription = await prescriptionService.uploadFile({
        ...payload,
        file: req.file,
        fileType: getFileType(req.file),
      });
      res.status(201).json({ data: prescription });
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filters = parse(listPrescriptionsQuerySchema, req.query);
      const result = await prescriptionService.list(filters);
      res.json({
        data: result.prescriptions,
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
      const prescription = await prescriptionService.get(id);
      res.json({ data: prescription });
    }),
  );

  router.patch(
    "/:id/ocr",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(updateOcrSchema, req.body);
      const prescription = await prescriptionService.updateOcr(id, payload);
      res.json({ data: prescription });
    }),
  );

  router.patch(
    "/:id/order",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(linkPrescriptionOrderSchema, req.body);
      const prescription = await prescriptionService.linkToOrder(id, payload);
      res.json({ data: prescription });
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      await prescriptionService.delete(id);
      res.status(204).send();
    }),
  );

  router.post(
    "/:id/review/start",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(reviewActorSchema, req.body);
      const prescription = await prescriptionService.markUnderReview(
        id,
        payload,
      );
      res.json({ data: prescription });
    }),
  );

  router.post(
    "/:id/review/approve",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(reviewActorSchema, req.body);
      const prescription = await prescriptionService.approve(id, payload);
      res.json({ data: prescription });
    }),
  );

  router.post(
    "/:id/review/reject",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(rejectPrescriptionSchema, req.body);
      const prescription = await prescriptionService.reject(id, payload);
      res.json({ data: prescription });
    }),
  );

  router.post(
    "/:id/fraud/flag",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(flagPrescriptionSchema, req.body);
      const prescription = await prescriptionService.flag(id, payload);
      res.json({ data: prescription });
    }),
  );

  return router;
}

function prescriptionRouteErrorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const statusCode = error.statusCode || error.status || 500;
  const payload = {
    error: {
      message: statusCode === 500 ? "Internal server error" : error.message,
    },
  };
  if (error.details) payload.error.details = error.details;
  if (error instanceof ZodError) payload.error.details = error.flatten();
  return res.status(statusCode).json(payload);
}

module.exports = {
  createPrescriptionRoutes,
  prescriptionRouteErrorHandler,
};
