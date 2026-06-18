const express = require("express");
const createError = require("http-errors");
const { CustomerService } = require("./customer.service");
const {
  uuidParamSchema,
  addressParamSchema,
  familyProfileParamSchema,
  reminderParamSchema,
  profileSchema,
  addressSchema,
  updateAddressSchema,
  familyProfileSchema,
  updateFamilyProfileSchema,
  reminderSchema,
  updateReminderSchema,
  privacySettingsSchema,
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

  router.get(
    "/:userId/family-profiles",
    asyncHandler(async (req, res) => {
      const { userId } = parse(uuidParamSchema, req.params);
      const profiles = await customerService.listFamilyProfiles(userId);
      res.json({ data: profiles });
    }),
  );

  router.post(
    "/:userId/family-profiles",
    asyncHandler(async (req, res) => {
      const { userId } = parse(uuidParamSchema, req.params);
      const payload = parse(familyProfileSchema, req.body);
      const profile = await customerService.createFamilyProfile(
        userId,
        payload,
      );
      res.status(201).json({ data: profile });
    }),
  );

  router.patch(
    "/:userId/family-profiles/:familyProfileId",
    asyncHandler(async (req, res) => {
      const { userId, familyProfileId } = parse(
        familyProfileParamSchema,
        req.params,
      );
      const payload = parse(updateFamilyProfileSchema, req.body);
      const profile = await customerService.updateFamilyProfile(
        userId,
        familyProfileId,
        payload,
      );
      res.json({ data: profile });
    }),
  );

  router.delete(
    "/:userId/family-profiles/:familyProfileId",
    asyncHandler(async (req, res) => {
      const { userId, familyProfileId } = parse(
        familyProfileParamSchema,
        req.params,
      );
      await customerService.deleteFamilyProfile(userId, familyProfileId);
      res.status(204).send();
    }),
  );

  router.get(
    "/:userId/medicine-reminders",
    asyncHandler(async (req, res) => {
      const { userId } = parse(uuidParamSchema, req.params);
      const reminders = await customerService.listMedicineReminders(userId);
      res.json({ data: reminders });
    }),
  );

  router.post(
    "/:userId/medicine-reminders",
    asyncHandler(async (req, res) => {
      const { userId } = parse(uuidParamSchema, req.params);
      const payload = parse(reminderSchema, req.body);
      const reminder = await customerService.createMedicineReminder(
        userId,
        payload,
      );
      res.status(201).json({ data: reminder });
    }),
  );

  router.patch(
    "/:userId/medicine-reminders/:reminderId",
    asyncHandler(async (req, res) => {
      const { userId, reminderId } = parse(reminderParamSchema, req.params);
      const payload = parse(updateReminderSchema, req.body);
      const reminder = await customerService.updateMedicineReminder(
        userId,
        reminderId,
        payload,
      );
      res.json({ data: reminder });
    }),
  );

  router.delete(
    "/:userId/medicine-reminders/:reminderId",
    asyncHandler(async (req, res) => {
      const { userId, reminderId } = parse(reminderParamSchema, req.params);
      await customerService.deleteMedicineReminder(userId, reminderId);
      res.status(204).send();
    }),
  );

  router.get(
    "/:userId/privacy-settings",
    asyncHandler(async (req, res) => {
      const { userId } = parse(uuidParamSchema, req.params);
      const settings = await customerService.getPrivacySettings(userId);
      res.json({ data: settings });
    }),
  );

  router.put(
    "/:userId/privacy-settings",
    asyncHandler(async (req, res) => {
      const { userId } = parse(uuidParamSchema, req.params);
      const payload = parse(privacySettingsSchema, req.body);
      const settings = await customerService.updatePrivacySettings(
        userId,
        payload,
      );
      res.json({ data: settings });
    }),
  );

  return router;
}

module.exports = {
  createCustomerRoutes,
};
