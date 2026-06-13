const usersModule = require("./modules/users");
const customersModule = require("./modules/customers");

module.exports = {
  ...require("./app"),
  ...usersModule,
  ...customersModule,
  userValidators: usersModule.validators,
  customerValidators: customersModule.validators,
};
