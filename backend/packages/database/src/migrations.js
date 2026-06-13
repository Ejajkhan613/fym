const { readdirSync, readFileSync } = require("fs");
const { basename, join } = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ quiet: true });

const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

function listMigrationFiles(migrationsDir = MIGRATIONS_DIR) {
  return readdirSync(migrationsDir)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort((left, right) => left.localeCompare(right));
}

function readMigration(migrationsDir, fileName) {
  return {
    name: basename(fileName),
    sql: readFileSync(join(migrationsDir, fileName), "utf8"),
  };
}

async function ensureSchemaMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query(`
    SELECT name
    FROM schema_migrations
    ORDER BY name ASC
  `);

  return new Set(result.rows.map((row) => row.name));
}

async function runMigrations({
  databaseUrl = process.env.DATABASE_URL,
  migrationsDir = MIGRATIONS_DIR,
  logger = console,
} = {}) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  const applied = [];

  try {
    await ensureSchemaMigrationsTable(client);
    const appliedMigrations = await getAppliedMigrations(client);
    const files = listMigrationFiles(migrationsDir);

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        logger.log(`Skipping migration ${file}`);
        continue;
      }

      const migration = readMigration(migrationsDir, file);

      logger.log(`Applying migration ${migration.name}`);
      await client.query("BEGIN");
      await client.query(migration.sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
        migration.name,
      ]);
      await client.query("COMMIT");
      applied.push(migration.name);
    }

    return { applied };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      logger.error(`Migration rollback failed: ${rollbackError.message}`);
    }

    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function getMigrationStatus({
  databaseUrl = process.env.DATABASE_URL,
  migrationsDir = MIGRATIONS_DIR,
} = {}) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to inspect migrations");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await ensureSchemaMigrationsTable(client);
    const appliedMigrations = await getAppliedMigrations(client);

    return listMigrationFiles(migrationsDir).map((file) => ({
      name: file,
      applied: appliedMigrations.has(file),
    }));
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = {
  MIGRATIONS_DIR,
  listMigrationFiles,
  readMigration,
  runMigrations,
  getMigrationStatus,
};
