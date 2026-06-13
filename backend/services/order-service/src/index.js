const ordersModule = require("./modules/orders");
const cartModule = require("./modules/cart");

module.exports = {
  ...require("./app"),
  ...ordersModule,
  ...cartModule,
  orderValidators: ordersModule.validators,
  cartValidators: cartModule.validators,
};
