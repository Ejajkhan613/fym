const createError = require("http-errors");
const { PharmacyInventoryModel } = require("./inventory.model");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

function nullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredString(value) {
  return String(value).trim();
}

function dateOnly(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

class PharmacyInventoryService {
  constructor({ inventoryModel = new PharmacyInventoryModel() } = {}) {
    this.inventoryModel = inventoryModel;
  }

  async listInventory(pharmacyId, filters = {}) {
    await this.getPharmacyOrThrow(pharmacyId);

    return this.inventoryModel.listInventory(pharmacyId, {
      ...filters,
      q: nullableString(filters.q),
      limit: filters.limit ?? 100,
      offset: filters.offset ?? 0,
    });
  }

  async createInventoryItem(pharmacyId, input) {
    await this.getPharmacyOrThrow(pharmacyId);

    try {
      return await this.inventoryModel.createInventoryItem(
        pharmacyId,
        this.normalizeInventoryItem(input, "manual"),
      );
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async bulkUploadInventory(pharmacyId, input) {
    await this.getPharmacyOrThrow(pharmacyId);

    const source = input.source || "bulk_upload";
    const items = input.items.map((item) =>
      this.normalizeInventoryItem({ ...item, source }, source),
    );

    try {
      return this.inventoryModel.bulkCreateInventoryItems(pharmacyId, items);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async updateInventoryItem(pharmacyId, inventoryId, input) {
    await this.getPharmacyOrThrow(pharmacyId);

    try {
      const item = await this.inventoryModel.updateInventoryItem(
        pharmacyId,
        inventoryId,
        this.normalizeInventoryPatch(input),
      );

      if (!item) {
        throw createError(404, "Inventory item not found");
      }

      return item;
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async adjustInventoryQuantity(pharmacyId, inventoryId, input) {
    await this.getPharmacyOrThrow(pharmacyId);

    const item = await this.inventoryModel.adjustInventoryQuantity(
      pharmacyId,
      inventoryId,
      input.quantityDelta,
    );

    if (!item) {
      throw createError(404, "Inventory item not found");
    }

    return item;
  }

  async reportStockMismatch(pharmacyId, input) {
    await this.getPharmacyOrThrow(pharmacyId);

    try {
      const report = await this.inventoryModel.createMismatchReport(
        pharmacyId,
        {
          ...input,
          medicineName: requiredString(input.medicineName),
          notes: nullableString(input.notes),
          metadata: input.metadata || {},
        },
      );

      if (!report) {
        throw createError(404, "Inventory item not found");
      }

      return report;
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async getPharmacyOrThrow(pharmacyId) {
    const pharmacy = await this.inventoryModel.findPharmacyById(pharmacyId);

    if (!pharmacy) {
      throw createError(404, "Pharmacy not found");
    }

    return pharmacy;
  }

  normalizeInventoryItem(input, fallbackSource) {
    return {
      medicineId: input.medicineId || null,
      medicineName: requiredString(input.medicineName),
      genericName: nullableString(input.genericName),
      strength: nullableString(input.strength),
      quantity: input.quantity,
      batchNumber: nullableString(input.batchNumber),
      expiryDate: dateOnly(input.expiryDate),
      price: input.price,
      coldChainRequired: Boolean(input.coldChainRequired),
      fastMoving: Boolean(input.fastMoving),
      source: input.source || fallbackSource,
      stockConfidenceScore: input.stockConfidenceScore ?? 55,
      metadata: input.metadata || {},
    };
  }

  normalizeInventoryPatch(input) {
    const patch = { ...input };

    if (Object.prototype.hasOwnProperty.call(patch, "medicineName")) {
      patch.medicineName = requiredString(patch.medicineName);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "genericName")) {
      patch.genericName = nullableString(patch.genericName);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "strength")) {
      patch.strength = nullableString(patch.strength);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "batchNumber")) {
      patch.batchNumber = nullableString(patch.batchNumber);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "expiryDate")) {
      patch.expiryDate = dateOnly(patch.expiryDate);
    }

    return patch;
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(
        400,
        "Referenced pharmacy, medicine, order, or user does not exist",
      );
    }

    if (isCheckViolation(error)) {
      throw createError(400, "Inventory data violates stock rules");
    }
  }
}

module.exports = {
  PharmacyInventoryService,
};
