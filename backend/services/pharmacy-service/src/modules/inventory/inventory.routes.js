const express = require("express");
const createError = require("http-errors");
const { ZodError } = require("zod");
const { PharmacyInventoryService } = require("./inventory.service");
const {
  pharmacyParamSchema,
  inventoryParamSchema,
  listInventoryQuerySchema,
  createInventoryItemSchema,
  updateInventoryItemSchema,
  adjustInventorySchema,
  bulkUploadInventorySchema,
  reportStockMismatchSchema,
} = require("./inventory.validators");

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

function createPharmacyInventoryRoutes({
  inventoryService = new PharmacyInventoryService(),
} = {}) {
  const router = express.Router({ mergeParams: true });

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const { pharmacyId } = parse(pharmacyParamSchema, req.params);
      const filters = parse(listInventoryQuerySchema, req.query);
      const result = await inventoryService.listInventory(pharmacyId, filters);

      res.json({
        data: result.items,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          lowStockThreshold: filters.lowStockThreshold,
        },
      });
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { pharmacyId } = parse(pharmacyParamSchema, req.params);
      const payload = parse(createInventoryItemSchema, req.body);
      const item = await inventoryService.createInventoryItem(
        pharmacyId,
        payload,
      );

      res.status(201).json({ data: item });
    }),
  );

  router.post(
    "/bulk-upload",
    asyncHandler(async (req, res) => {
      const { pharmacyId } = parse(pharmacyParamSchema, req.params);
      const payload = parse(bulkUploadInventorySchema, req.body);
      const items = await inventoryService.bulkUploadInventory(
        pharmacyId,
        payload,
      );

      res.status(201).json({
        data: items,
        meta: {
          imported: items.length,
        },
      });
    }),
  );

  router.post(
    "/mismatch-reports",
    asyncHandler(async (req, res) => {
      const { pharmacyId } = parse(pharmacyParamSchema, req.params);
      const payload = parse(reportStockMismatchSchema, req.body);
      const report = await inventoryService.reportStockMismatch(
        pharmacyId,
        payload,
      );

      res.status(201).json({ data: report });
    }),
  );

  router.patch(
    "/:inventoryId",
    asyncHandler(async (req, res) => {
      const { pharmacyId, inventoryId } = parse(
        inventoryParamSchema,
        req.params,
      );
      const payload = parse(updateInventoryItemSchema, req.body);
      const item = await inventoryService.updateInventoryItem(
        pharmacyId,
        inventoryId,
        payload,
      );

      res.json({ data: item });
    }),
  );

  router.post(
    "/:inventoryId/adjust",
    asyncHandler(async (req, res) => {
      const { pharmacyId, inventoryId } = parse(
        inventoryParamSchema,
        req.params,
      );
      const payload = parse(adjustInventorySchema, req.body);
      const item = await inventoryService.adjustInventoryQuantity(
        pharmacyId,
        inventoryId,
        payload,
      );

      res.json({ data: item });
    }),
  );

  router.post(
    "/:inventoryId/mismatch-reports",
    asyncHandler(async (req, res) => {
      const { pharmacyId, inventoryId } = parse(
        inventoryParamSchema,
        req.params,
      );
      const payload = parse(reportStockMismatchSchema, {
        ...req.body,
        inventoryId,
      });
      const report = await inventoryService.reportStockMismatch(
        pharmacyId,
        payload,
      );

      res.status(201).json({ data: report });
    }),
  );

  return router;
}

function pharmacyInventoryErrorHandler(error, req, res, next) {
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
  createPharmacyInventoryRoutes,
  pharmacyInventoryErrorHandler,
};
