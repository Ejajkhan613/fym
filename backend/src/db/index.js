const { closePool, getPool } = require("./pool");

async function query(text, params) {
    return getPool().query(text, params);
}

async function checkDatabaseConnection() {
    const startedAt = Date.now();
    await query("SELECT 1");

    return {
        status: "ok",
        latencyMs: Date.now() - startedAt
    };
}

module.exports = {
    checkDatabaseConnection,
    closePool,
    getPool,
    query
};
