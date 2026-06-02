const { Pool } = require("pg");

const env = require("../config/env");

let pool;

function createPool() {
    if (!env.database.url) {
        const error = new Error("DATABASE_URL is not configured");
        error.code = "DATABASE_NOT_CONFIGURED";
        throw error;
    }

    const createdPool = new Pool({
        connectionString: env.database.url,
        max: env.database.maxConnections,
        idleTimeoutMillis: env.database.idleTimeoutMs,
        connectionTimeoutMillis: env.database.connectionTimeoutMs,
        ssl: env.database.ssl ? { rejectUnauthorized: false } : false
    });

    createdPool.on("error", (error) => {
        console.error("Unexpected PostgreSQL client error", error);
    });

    return createdPool;
}

function getPool() {
    if (!pool) {
        pool = createPool();
    }

    return pool;
}

async function closePool() {
    if (!pool) {
        return;
    }

    await pool.end();
    pool = undefined;
}

module.exports = {
    getPool,
    closePool
};
