const express = require("express");
const { getServiceRegistry } = require("./config/service-registry");
const { createProxyMiddleware } = require("./middlewares/proxy.middleware");
const { createGatewayRoutes } = require("./routes/gateway.routes");

function createApiGatewayApp(options = {}) {
  const serviceRegistry = options.serviceRegistry || getServiceRegistry();
  const app = express();

  app.use(express.json({ limit: "2mb" }));
  app.use(createGatewayRoutes({ serviceRegistry }));

  for (const service of serviceRegistry) {
    for (const prefix of service.prefixes) {
      app.use(prefix, createProxyMiddleware(service.url));
    }
  }

  app.use((req, res) => {
    res.status(404).json({ error: { message: "Gateway route not found" } });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const statusCode = error.statusCode || error.status || 500;
    return res.status(statusCode).json({
      error: {
        message: statusCode === 500 ? "Internal server error" : error.message,
      },
    });
  });

  return app;
}

module.exports = {
  createApiGatewayApp,
};
