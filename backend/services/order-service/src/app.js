const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const {
  OrderService,
  RealtimePublisher,
  createOrderRealtimeGateway,
  createOrderRoutes,
  createPharmacyOrderRoutes,
  createRealtimeRoutes,
  orderRouteErrorHandler,
} = require("./modules/orders");
const { createCartRoutes } = require("./modules/cart");

function createOrderServiceContext(options = {}) {
  const realtimePublisher =
    options.realtimePublisher || new RealtimePublisher();
  const orderService =
    options.orderService ||
    new OrderService({ orderModel: options.orderModel, realtimePublisher });
  const orderModel = options.orderModel || orderService.orderModel;

  return {
    realtimePublisher,
    orderService,
    orderModel,
  };
}

function createOrderServiceApp(options = {}) {
  const { realtimePublisher, orderService, orderModel } =
    createOrderServiceContext(options);
  const app = express();

  app.locals.realtimePublisher = realtimePublisher;
  app.locals.orderService = orderService;

  app.use(express.json({ limit: "1mb" }));
  app.use("/cart", createCartRoutes(options));
  app.use("/orders", createOrderRoutes({ ...options, orderService }));
  app.use(
    "/pharmacy/orders",
    createPharmacyOrderRoutes({ ...options, orderService }),
  );
  app.use("/realtime", createRealtimeRoutes({ ...options, orderModel }));
  app.use(orderRouteErrorHandler);

  return app;
}

function createOrderServiceServer(options = {}) {
  const realtimePublisher =
    options.realtimePublisher || new RealtimePublisher();
  const orderService =
    options.orderService ||
    new OrderService({ orderModel: options.orderModel, realtimePublisher });
  const app = createOrderServiceApp({
    ...options,
    orderService,
    realtimePublisher,
  });
  const server = http.createServer(app);
  const io =
    options.io ||
    new Server(server, {
      cors: options.cors || {
        origin: process.env.CORS_ORIGIN || "*",
      },
    });

  createOrderRealtimeGateway(io);
  realtimePublisher.attachSocketServer(io);
  app.locals.io = io;

  return {
    app,
    server,
    io,
    realtimePublisher,
  };
}

module.exports = {
  createOrderServiceApp,
  createOrderServiceServer,
};
