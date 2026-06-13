const createError = require("http-errors");
const { CartModel } = require("./cart.model");

function isForeignKeyViolation(error) {
  return error && error.code === "23503";
}

function calculateSummary(items) {
  const subtotal = Number(
    items.reduce((total, item) => total + item.lineTotal, 0).toFixed(2),
  );

  return {
    itemCount: items.length,
    quantity: items.reduce((total, item) => total + item.quantity, 0),
    subtotal,
    requiresPrescription: items.some((item) => item.requiresPrescription),
  };
}

class CartService {
  constructor({ cartModel = new CartModel() } = {}) {
    this.cartModel = cartModel;
  }

  async getCart(customerId) {
    const items = await this.cartModel.list(customerId);
    return { items, summary: calculateSummary(items) };
  }

  async addItem(input) {
    try {
      return await this.cartModel.addItem(input);
    } catch (error) {
      this.rethrowKnownDatabaseError(error);
      throw error;
    }
  }

  async updateItem(id, input) {
    const item = await this.cartModel.updateItem(id, input);
    if (!item) throw createError(404, "Cart item not found");
    return item;
  }

  async removeItem(id) {
    const item = await this.cartModel.removeItem(id);
    if (!item) throw createError(404, "Cart item not found");
    return item;
  }

  async clear(customerId) {
    const items = await this.cartModel.clear(customerId);
    return { removed: items.length };
  }

  rethrowKnownDatabaseError(error) {
    if (isForeignKeyViolation(error)) {
      throw createError(400, "Referenced customer or medicine does not exist");
    }
  }
}

module.exports = {
  CartService,
  calculateSummary,
};
