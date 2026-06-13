const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { MedicineService } = require("./medicine.service");
const {
  uuidParamSchema,
  medicineSchema,
  updateMedicineSchema,
  searchMedicinesQuerySchema,
  synonymSchema,
} = require("./medicine.validators");

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

function createMedicineRoutes({
  medicineService = new MedicineService(),
} = {}) {
  const router = express.Router();

  router.get(
    "/search",
    asyncHandler(async (req, res) => {
      const filters = parse(searchMedicinesQuerySchema, req.query);
      const result = await medicineService.searchMedicines(filters);

      res.json({
        data: result.medicines,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const payload = parse(medicineSchema, req.body);
      const medicine = await medicineService.createMedicine(payload);

      res.status(201).json({ data: medicine });
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filters = parse(searchMedicinesQuerySchema, req.query);
      const result = await medicineService.searchMedicines(filters);

      res.json({
        data: result.medicines,
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
      const medicine = await medicineService.getMedicine(id);

      res.json({ data: medicine });
    }),
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(updateMedicineSchema, req.body);
      const medicine = await medicineService.updateMedicine(id, payload);

      res.json({ data: medicine });
    }),
  );

  router.post(
    "/:id/synonyms",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const payload = parse(synonymSchema, req.body);
      const synonym = await medicineService.addSynonym(id, payload);

      res.status(201).json({ data: synonym });
    }),
  );

  router.get(
    "/:id/synonyms",
    asyncHandler(async (req, res) => {
      const { id } = parse(uuidParamSchema, req.params);
      const synonyms = await medicineService.listSynonyms(id);

      res.json({ data: synonyms });
    }),
  );

  return router;
}

function medicineRouteErrorHandler(error, req, res, next) {
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
  createMedicineRoutes,
  medicineRouteErrorHandler,
};
