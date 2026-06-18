const createError = require("http-errors");
const { CustomerModel } = require("./customer.model");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isUniqueViolation(error) {
  return error && error.code === "23505";
}

class CustomerService {
  constructor({ customerModel = new CustomerModel() } = {}) {
    this.customerModel = customerModel;
  }

  async upsertProfile(userId, input) {
    await this.assertUserExists(userId);

    try {
      return await this.customerModel.upsertProfile(userId, input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async getProfile(userId) {
    await this.assertUserExists(userId);
    const profile = await this.customerModel.findProfileByUserId(userId);
    if (!profile) throw createError(404, "Customer profile not found");
    return profile;
  }

  async createAddress(userId, input) {
    await this.assertUserExists(userId);

    try {
      return await this.customerModel.createAddress(userId, input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async listAddresses(userId) {
    await this.assertUserExists(userId);
    return this.customerModel.listAddresses(userId);
  }

  async getAddress(userId, addressId) {
    await this.assertUserExists(userId);
    const address = await this.customerModel.findAddressById(userId, addressId);
    if (!address) throw createError(404, "Address not found");
    return address;
  }

  async updateAddress(userId, addressId, input) {
    await this.getAddress(userId, addressId);
    const address = await this.customerModel.updateAddress(
      userId,
      addressId,
      input,
    );
    if (!address) throw createError(404, "Address not found");
    return address;
  }

  async setDefaultAddress(userId, addressId) {
    await this.getAddress(userId, addressId);
    const address = await this.customerModel.setDefaultAddress(
      userId,
      addressId,
    );
    if (!address) throw createError(404, "Address not found");
    return address;
  }

  async deleteAddress(userId, addressId) {
    await this.getAddress(userId, addressId);
    const address = await this.customerModel.deleteAddress(userId, addressId);
    if (!address) throw createError(404, "Address not found");
    return address;
  }

  async listFamilyProfiles(userId) {
    await this.assertUserExists(userId);
    return this.customerModel.listFamilyProfiles(userId);
  }

  async createFamilyProfile(userId, input) {
    await this.assertUserExists(userId);

    try {
      return await this.customerModel.createFamilyProfile(userId, input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async getFamilyProfile(userId, familyProfileId) {
    await this.assertUserExists(userId);
    const profile = await this.customerModel.findFamilyProfileById(
      userId,
      familyProfileId,
    );
    if (!profile) throw createError(404, "Family profile not found");
    return profile;
  }

  async updateFamilyProfile(userId, familyProfileId, input) {
    await this.getFamilyProfile(userId, familyProfileId);

    try {
      const profile = await this.customerModel.updateFamilyProfile(
        userId,
        familyProfileId,
        input,
      );
      if (!profile) throw createError(404, "Family profile not found");
      return profile;
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async deleteFamilyProfile(userId, familyProfileId) {
    await this.getFamilyProfile(userId, familyProfileId);
    const profile = await this.customerModel.deleteFamilyProfile(
      userId,
      familyProfileId,
    );
    if (!profile) throw createError(404, "Family profile not found");
    return profile;
  }

  async listMedicineReminders(userId) {
    await this.assertUserExists(userId);
    return this.customerModel.listMedicineReminders(userId);
  }

  async createMedicineReminder(userId, input) {
    await this.assertUserExists(userId);
    if (input.familyProfileId) {
      await this.getFamilyProfile(userId, input.familyProfileId);
    }

    try {
      return await this.customerModel.createMedicineReminder(userId, input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async getMedicineReminder(userId, reminderId) {
    await this.assertUserExists(userId);
    const reminder = await this.customerModel.findMedicineReminderById(
      userId,
      reminderId,
    );
    if (!reminder) throw createError(404, "Medicine reminder not found");
    return reminder;
  }

  async updateMedicineReminder(userId, reminderId, input) {
    await this.getMedicineReminder(userId, reminderId);
    if (input.familyProfileId) {
      await this.getFamilyProfile(userId, input.familyProfileId);
    }

    try {
      const reminder = await this.customerModel.updateMedicineReminder(
        userId,
        reminderId,
        input,
      );
      if (!reminder) throw createError(404, "Medicine reminder not found");
      return reminder;
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async deleteMedicineReminder(userId, reminderId) {
    await this.getMedicineReminder(userId, reminderId);
    const reminder = await this.customerModel.deleteMedicineReminder(
      userId,
      reminderId,
    );
    if (!reminder) throw createError(404, "Medicine reminder not found");
    return reminder;
  }

  async getPrivacySettings(userId) {
    await this.assertUserExists(userId);
    return this.customerModel.getPrivacySettings(userId);
  }

  async updatePrivacySettings(userId, input) {
    await this.assertUserExists(userId);

    try {
      return await this.customerModel.updatePrivacySettings(userId, input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async assertUserExists(userId) {
    const user = await this.customerModel.findUserById(userId);
    if (!user) throw createError(404, "User not found");
    return user;
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(400, "Referenced user does not exist");
    }

    if (isUniqueViolation(error)) {
      throw createError(409, "Only one default address is allowed per user");
    }
  }
}

module.exports = {
  CustomerService,
};
