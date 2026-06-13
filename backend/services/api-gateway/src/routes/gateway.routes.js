const express = require("express");

function createGatewayRoutes({ serviceRegistry = [] } = {}) {
  const router = express.Router();

  router.get("/health", (req, res) => {
    res.json({
      data: {
        service: "api-gateway",
        status: "ok",
        timestamp: new Date().toISOString(),
      },
    });
  });

  router.get("/gateway/services", (req, res) => {
    res.json({
      data: serviceRegistry.map((service) => ({
        name: service.name,
        prefixes: service.prefixes,
        url: service.url,
      })),
    });
  });

  return router;
}

module.exports = {
  createGatewayRoutes,
};
