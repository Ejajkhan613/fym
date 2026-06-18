const dotenv = require("dotenv");

dotenv.config({ quiet: true });

const SERVICE_FACTORIES = {
  "api-gateway": {
    path: "../services/api-gateway/src",
    factory: "createApiGatewayApp",
    defaultPort: 4000,
  },
  auth: {
    path: "../services/auth-service/src",
    factory: "createAuthServiceApp",
    defaultPort: 4101,
  },
  user: {
    path: "../services/user-service/src",
    factory: "createUserServiceApp",
    defaultPort: 4102,
  },
  pharmacy: {
    path: "../services/pharmacy-service/src",
    factory: "createPharmacyServiceApp",
    defaultPort: 4103,
  },
  catalog: {
    path: "../services/catalog-service/src",
    factory: "createCatalogServiceApp",
    defaultPort: 4104,
  },
  prescription: {
    path: "../services/prescription-service/src",
    factory: "createPrescriptionServiceApp",
    defaultPort: 4105,
  },
  order: {
    path: "../services/order-service/src",
    factory: "createOrderServiceApp",
    serverFactory: "createOrderServiceServer",
    defaultPort: 4106,
  },
  matching: {
    path: "../services/matching-service/src",
    factory: "createMatchingServiceApp",
    defaultPort: 4107,
  },
  payment: {
    path: "../services/payment-service/src",
    factory: "createPaymentServiceApp",
    defaultPort: 4108,
  },
  delivery: {
    path: "../services/delivery-service/src",
    factory: "createDeliveryServiceApp",
    defaultPort: 4109,
  },
  notification: {
    path: "../services/notification-service/src",
    factory: "createNotificationServiceApp",
    defaultPort: 4110,
  },
  support: {
    path: "../services/support-service/src",
    factory: "createSupportServiceApp",
    defaultPort: 4111,
  },
  penalty: {
    path: "../services/penalty-service/src",
    factory: "createPenaltyServiceApp",
    defaultPort: 4112,
  },
  audit: {
    path: "../services/audit-compliance-service/src",
    factory: "createAuditComplianceServiceApp",
    defaultPort: 4113,
  },
  analytics: {
    path: "../services/analytics-service/src",
    factory: "createAnalyticsServiceApp",
    defaultPort: 4114,
  },
  admin: {
    path: "../services/admin-service/src",
    factory: "createAdminServiceApp",
    defaultPort: 4115,
  },
};

function getServiceConfig(serviceName) {
  return SERVICE_FACTORIES[serviceName] || null;
}

function createServiceApp(serviceName) {
  const config = getServiceConfig(serviceName);

  if (!config) {
    const names = Object.keys(SERVICE_FACTORIES).sort().join(", ");
    throw new Error(
      `Unknown service "${serviceName}". Available services: ${names}`,
    );
  }

  const serviceModule = require(config.path);
  const factory = serviceModule[config.factory];

  if (typeof factory !== "function") {
    throw new Error(`Service factory ${config.factory} was not exported`);
  }

  return {
    app: factory(),
    defaultPort: config.defaultPort,
  };
}

function createServiceRuntime(serviceName) {
  const config = getServiceConfig(serviceName);

  if (!config) {
    const names = Object.keys(SERVICE_FACTORIES).sort().join(", ");
    throw new Error(
      `Unknown service "${serviceName}". Available services: ${names}`,
    );
  }

  const serviceModule = require(config.path);
  const runtimeFactoryName = config.serverFactory || config.factory;
  const runtimeFactory = serviceModule[runtimeFactoryName];

  if (typeof runtimeFactory !== "function") {
    throw new Error(`Service factory ${runtimeFactoryName} was not exported`);
  }

  const runtime = runtimeFactory();

  if (runtime && runtime.app) {
    return {
      ...runtime,
      defaultPort: config.defaultPort,
    };
  }

  return {
    app: runtime,
    defaultPort: config.defaultPort,
  };
}

function startService(serviceName, options = {}) {
  const { app, server, defaultPort } = createServiceRuntime(serviceName);
  const port = Number(options.port || process.env.PORT || defaultPort);
  const listener = server || app;

  return listener.listen(port, () => {
    console.log(`${serviceName} listening on port ${port}`);
  });
}

if (require.main === module) {
  const serviceName = process.argv[2] || process.env.SERVICE_NAME;

  if (!serviceName) {
    const names = Object.keys(SERVICE_FACTORIES).sort().join(", ");
    console.error(
      `SERVICE_NAME or service argument is required. Available services: ${names}`,
    );
    process.exit(1);
  }

  startService(serviceName);
}

module.exports = {
  SERVICE_FACTORIES,
  getServiceConfig,
  createServiceApp,
  createServiceRuntime,
  startService,
};
