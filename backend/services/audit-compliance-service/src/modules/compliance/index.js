const { ComplianceModel } = require("./compliance.model");
const { ComplianceService } = require("./compliance.service");
const {
  createComplianceRoutes,
  complianceRouteErrorHandler,
} = require("./compliance.routes");
const validators = require("./compliance.validators");

module.exports = {
  ComplianceModel,
  ComplianceService,
  createComplianceRoutes,
  complianceRouteErrorHandler,
  validators,
};
