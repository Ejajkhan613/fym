module.exports = {
  ...require("./app"),
  ...require("./config/service-registry"),
  ...require("./middlewares/proxy.middleware"),
  ...require("./routes/gateway.routes"),
};
