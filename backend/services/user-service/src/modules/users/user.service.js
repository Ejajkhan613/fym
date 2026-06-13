const createError = require("http-errors");
const { UserModel } = require("./user.model");

function normalizePhone(phone) {
  if (phone === undefined || phone === null) {
    return phone;
  }

  return phone.replace(/[\s-]/g, "");
}

function isUniqueViolation(error) {
  return error && error.code === "23505";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

function toConflictError(error) {
  const constraint = error.constraint || "";

  if (constraint.includes("phone")) {
    return createError(409, "A user with this phone number already exists");
  }

  return createError(409, "User already exists");
}

function toValidationError(error) {
  if (error.constraint === "users_phone_required") {
    return createError(400, "Phone number is required");
  }

  return createError(400, "User data violates database constraints");
}

class UserService {
  constructor({ userModel = new UserModel() } = {}) {
    this.userModel = userModel;
  }

  async createUser(input) {
    const payload = {
      ...input,
      phone: normalizePhone(input.phone),
    };

    if (!payload.phone) {
      throw createError(400, "Phone number is required");
    }

    try {
      return await this.userModel.create(payload);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw toConflictError(error);
      }

      if (isCheckViolation(error)) {
        throw toValidationError(error);
      }

      throw error;
    }
  }

  async getUserById(id) {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw createError(404, "User not found");
    }

    return user;
  }

  async listUsers(filters = {}) {
    return this.userModel.list({
      role: filters.role,
      status: filters.status,
      search: filters.search,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async updateUser(id, input) {
    const payload = {};

    if (Object.prototype.hasOwnProperty.call(input, "name")) {
      payload.name = input.name;
    }

    if (Object.prototype.hasOwnProperty.call(input, "phone")) {
      payload.phone = normalizePhone(input.phone);
    }

    if (Object.prototype.hasOwnProperty.call(input, "role")) {
      payload.role = input.role;
    }

    try {
      const user = await this.userModel.updateById(id, payload);

      if (!user) {
        throw createError(404, "User not found");
      }

      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw toConflictError(error);
      }

      if (isCheckViolation(error)) {
        throw toValidationError(error);
      }

      throw error;
    }
  }

  async updateUserStatus(id, status) {
    const user = await this.userModel.setStatus(id, status);

    if (!user) {
      throw createError(404, "User not found");
    }

    return user;
  }

  async deleteUser(id) {
    const user = await this.userModel.softDelete(id);

    if (!user) {
      throw createError(404, "User not found");
    }

    return user;
  }
}

module.exports = {
  UserService,
};
