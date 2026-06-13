const express = require("express");
const createError = require("http-errors");
const { CustomerService } = require("./customer.service");
const {
  uuidParamSchema,
  addressParamSchema,
  profileSchema,
  addressSchema,
  updateAddressSchema,
} = require("./customer.validators");

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

function createCustomerRoutes({
  customerService = new CustomerService(),
} = {}) {
  const router = express.Router();

  router.put(
    "/:userId/profile",
    asyncHandler(async (req, res) => {
      const { userId } = parse(uuidParamSchema, req.params);
      const payload = parse(profileSchema, req.body);
      const profile = await customerService.upsertProfile(userId, payload);
      res.json({ data: profile });
    }),
  );

  router.get(
    "/:userId/profile",
    asyncHandler(async (req, res) => {
      const { userId } = parse(uuidParamSchema, req.params);
      const profile = await customerService.getProfile(userId);
      res.json({ data: profile });
    }),
  );

  router.post(
    "/:userId/addresses",
    asyncHandler(async (req, res) => {
      const { userId } = parse(uuidParamSchema, req.params);
      const payload = parse(addressSchema, req.body);
      const address = await customerService.createAddress(userId, payload);
      res.status(201).json({ data: address });
    }),
  );

  router.get(
    "/:userId/addresses",
    asyncHandler(async (req, res) => {
      const { userId } = parse(uuidParamSchema, req.params);
      const addresses = await customerService.listAddresses(userId);
      res.json({ data: addresses });
    }),
  );

  router.get(
    "/:userId/addresses/:addressId",
    asyncHandler(async (req, res) => {
      const { userId, addressId } = parse(addressParamSchema, req.params);
      const address = await customerService.getAddress(userId, addressId);
      res.json({ data: address });
    }),
  );

  router.patch(
    "/:userId/addresses/:addressId",
    asyncHandler(async (req, res) => {
      const { userId, addressId } = parse(addressParamSchema, req.params);
      const payload = parse(updateAddressSchema, req.body);
      const address = await customerService.updateAddress(
        userId,
        addressId,
        payload,
      );
      res.json({ data: address });
    }),
  );

  router.post(
    "/:userId/addresses/:addressId/default",
    asyncHandler(async (req, res) => {
      const { userId, addressId } = parse(addressParamSchema, req.params);
      const address = await customerService.setDefaultAddress(
        userId,
        addressId,
      );
      res.json({ data: address });
    }),
  );

  router.delete(
    "/:userId/addresses/:addressId",
    asyncHandler(async (req, res) => {
      const { userId, addressId } = parse(addressParamSchema, req.params);
      await customerService.deleteAddress(userId, addressId);
      res.status(204).send();
    }),
  );

  return router;
}

module.exports = {
  createCustomerRoutes,
};
