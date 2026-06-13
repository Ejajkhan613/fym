const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ quiet: true });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.POSTGRES_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(
    process.env.POSTGRES_CONNECTION_TIMEOUT_MS || 5000,
  ),
});

module.exports = { pool };
