const createError = require("http-errors");
const { MedicineModel } = require("./medicine.model");

function isUniqueViolation(error) {
  return error && error.code === "23505";
}

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

class MedicineService {
  constructor({ medicineModel = new MedicineModel() } = {}) {
    this.medicineModel = medicineModel;
  }

  async createMedicine(input) {
    try {
      return await this.medicineModel.create(input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async getMedicine(id) {
    const medicine = await this.medicineModel.findById(id);

    if (!medicine) {
      throw createError(404, "Medicine not found");
    }

    return medicine;
  }

  async searchMedicines(filters = {}) {
    return this.medicineModel.search({
      query: filters.q || filters.query,
      requiresPrescription: filters.requiresPrescription,
      isRestricted: filters.isRestricted,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async updateMedicine(id, input) {
    const medicine = await this.medicineModel.updateById(id, input);

    if (!medicine) {
      throw createError(404, "Medicine not found");
    }

    return medicine;
  }

  async addSynonym(id, input) {
    await this.getMedicine(id);

    try {
      return await this.medicineModel.addSynonym(id, input.synonym);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async listSynonyms(id) {
    await this.getMedicine(id);
    return this.medicineModel.listSynonyms(id);
  }

  rethrowKnownDatabaseError(error) {
    if (isUniqueViolation(error)) {
      throw createError(409, "Medicine synonym already exists");
    }

    if (isForeignKeyViolation(error)) {
      throw createError(400, "Referenced medicine does not exist");
    }
  }
}

module.exports = {
  MedicineService,
};
