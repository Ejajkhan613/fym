const { UserModel } = require("./user.model");
const { UserService } = require("./user.service");
const { createUserRoutes, userRouteErrorHandler } = require("./user.routes");
const validators = require("./user.validators");

module.exports = {
  UserModel,
  UserService,
  createUserRoutes,
  userRouteErrorHandler,
  validators,
};
