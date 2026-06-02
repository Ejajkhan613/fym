const dotenv = require("dotenv");

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const port = Number(process.env.PORT || 4000);
const databaseMaxConnections = Number(process.env.DATABASE_MAX_CONNECTIONS || 10);
const databaseIdleTimeoutMs = Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 30000);
const databaseConnectionTimeoutMs = Number(
    process.env.DATABASE_CONNECTION_TIMEOUT_MS || 5000
);
const jwtAccessTokenSecret =
    process.env.JWT_ACCESS_TOKEN_SECRET ||
    (nodeEnv === "production" ? "" : "dev-access-token-secret");
const jwtRefreshTokenSecret =
    process.env.JWT_REFRESH_TOKEN_SECRET ||
    (nodeEnv === "production" ? "" : "dev-refresh-token-secret");

if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
}

function parseBoolean(value) {
    return ["1", "true", "yes"].includes(String(value).toLowerCase());
}

function assertPositiveInteger(name, value) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
}

assertPositiveInteger("DATABASE_MAX_CONNECTIONS", databaseMaxConnections);
assertPositiveInteger("DATABASE_IDLE_TIMEOUT_MS", databaseIdleTimeoutMs);
assertPositiveInteger(
    "DATABASE_CONNECTION_TIMEOUT_MS",
    databaseConnectionTimeoutMs
);

if (!jwtAccessTokenSecret) {
    throw new Error("JWT_ACCESS_TOKEN_SECRET is required");
}

if (!jwtRefreshTokenSecret) {
    throw new Error("JWT_REFRESH_TOKEN_SECRET is required");
}

module.exports = {
    nodeEnv,
    port,
    apiPrefix: process.env.API_PREFIX || "/api/v1",
    corsOrigin: process.env.CORS_ORIGIN || "*",
    database: {
        url: process.env.DATABASE_URL || "",
        ssl: parseBoolean(process.env.DATABASE_SSL || false),
        maxConnections: databaseMaxConnections,
        idleTimeoutMs: databaseIdleTimeoutMs,
        connectionTimeoutMs: databaseConnectionTimeoutMs
    },
    auth: {
        jwtAccessTokenSecret,
        jwtRefreshTokenSecret,
        accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL || "15m",
        refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL || "30d",
        exposeDevOtp: parseBoolean(process.env.EXPOSE_DEV_OTP || false)
    }
};
