const { OrderModel } = require("./order.model");
const { OrderService } = require("./order.service");
const { RealtimePublisher } = require("./realtime.publisher");
const { createOrderRealtimeGateway } = require("./realtime.gateway");
const {
  createOrderRoutes,
  createPharmacyOrderRoutes,
  orderRouteErrorHandler,
} = require("./order.routes");
const constants = require("./order.constants");
const validators = require("./order.validators");

module.exports = {
  OrderModel,
  OrderService,
  RealtimePublisher,
  createOrderRealtimeGateway,
  createOrderRoutes,
  createPharmacyOrderRoutes,
  orderRouteErrorHandler,
  constants,
  validators,
};
