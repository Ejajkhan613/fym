const { AnalyticsModel } = require("./analytics.model");

class AnalyticsService {
  constructor({ analyticsModel = new AnalyticsModel() } = {}) {
    this.analyticsModel = analyticsModel;
  }

  async getOverview() {
    return this.analyticsModel.getOverview();
  }

  async getBusinessMetrics() {
    return this.analyticsModel.getBusinessMetrics();
  }

  async getOperationsMetrics() {
    return this.analyticsModel.getOperationsMetrics();
  }

  async getComplianceMetrics() {
    return this.analyticsModel.getComplianceMetrics();
  }
}

module.exports = {
  AnalyticsService,
};
