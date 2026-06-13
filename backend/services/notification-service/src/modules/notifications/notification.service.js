const createError = require("http-errors");
const { NotificationModel } = require("./notification.model");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

class NotificationService {
  constructor({ notificationModel = new NotificationModel() } = {}) {
    this.notificationModel = notificationModel;
  }

  async queue(input) {
    try {
      return await this.notificationModel.queue(input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async get(id) {
    const notification = await this.notificationModel.findById(id);
    if (!notification) throw createError(404, "Notification not found");
    return notification;
  }

  async list(filters = {}) {
    return this.notificationModel.list({
      recipientUserId: filters.recipientUserId,
      channel: filters.channel,
      status: filters.status,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async markSent(id) {
    return this.setStatus(id, { status: "SENT" });
  }

  async markFailed(id, input) {
    return this.setStatus(id, {
      status: "FAILED",
      failureReason: input.failureReason,
    });
  }

  async cancel(id, input = {}) {
    const current = await this.get(id);

    if (current.status === "SENT") {
      throw createError(409, "Sent notifications cannot be cancelled");
    }

    return this.setStatus(id, {
      status: "CANCELLED",
      failureReason: input.reason,
    });
  }

  async setStatus(id, input) {
    const notification = await this.notificationModel.updateStatus(id, input);
    if (!notification) throw createError(404, "Notification not found");
    return notification;
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(400, "Recipient user does not exist");
    }

    if (isCheckViolation(error)) {
      throw createError(400, "Notification data violates database constraints");
    }
  }
}

module.exports = {
  NotificationService,
};
