const createError = require("http-errors");
const { SupportModel } = require("./support.model");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function isCheckViolation(error) {
  return error && error.code === "23514";
}

class SupportService {
  constructor({ supportModel = new SupportModel() } = {}) {
    this.supportModel = supportModel;
  }

  async createTicket(input) {
    try {
      return await this.supportModel.createTicket(input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async getTicket(id) {
    const ticket = await this.supportModel.getTicketDetails(id);
    if (!ticket) throw createError(404, "Support ticket not found");
    return ticket;
  }

  async listTickets(filters = {}) {
    return this.supportModel.listTickets({
      customerId: filters.customerId,
      orderId: filters.orderId,
      assignedToUserId: filters.assignedToUserId,
      status: filters.status,
      priority: filters.priority,
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
    });
  }

  async updateTicket(id, input) {
    await this.getTicket(id);

    try {
      const ticket = await this.supportModel.updateTicket(id, input);
      if (!ticket) throw createError(404, "Support ticket not found");
      return ticket;
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async addMessage(ticketId, input) {
    await this.getTicket(ticketId);

    try {
      return await this.supportModel.addMessage(ticketId, input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(
        400,
        "Referenced customer, order, or agent does not exist",
      );
    }

    if (isCheckViolation(error)) {
      throw createError(400, "Support data violates database constraints");
    }
  }
}

module.exports = {
  SupportService,
};
