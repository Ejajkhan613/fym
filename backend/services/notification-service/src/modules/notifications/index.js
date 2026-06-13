const { NotificationModel } = require("./notification.model");
const { NotificationService } = require("./notification.service");
const {
  createNotificationRoutes,
  notificationRouteErrorHandler,
} = require("./notification.routes");
const validators = require("./notification.validators");

module.exports = {
  NotificationModel,
  NotificationService,
  createNotificationRoutes,
  notificationRouteErrorHandler,
  validators,
};
