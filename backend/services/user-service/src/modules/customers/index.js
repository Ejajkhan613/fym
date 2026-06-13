const { CustomerModel } = require("./customer.model");
const { CustomerService } = require("./customer.service");
const { createCustomerRoutes } = require("./customer.routes");
const validators = require("./customer.validators");

module.exports = {
  CustomerModel,
  CustomerService,
  createCustomerRoutes,
  validators,
};
