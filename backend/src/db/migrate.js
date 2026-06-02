const fs = require("fs");
const path = require("path");

const { closePool, getPool } = require("./pool");

const migrationsDirectory = path.join(__dirname, "migrations");

async function ensureMigrationsTable(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
}

function getMigrationFiles() {
    return fs
        .readdirSync(migrationsDirectory)
        .filter((fileName) => fileName.endsWith(".sql"))
        .sort();
}

async function hasMigrationRun(client, fileName) {
    const result = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [fileName]
    );

    return result.rowCount > 0;
}

async function runMigration(client, fileName) {
    const filePath = path.join(migrationsDirectory, fileName);
    const sql = fs.readFileSync(filePath, "utf8");

    await client.query("BEGIN");

    try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
            fileName
        ]);
        await client.query("COMMIT");
        console.log(`Applied migration: ${fileName}`);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
}

async function migrate() {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await ensureMigrationsTable(client);

        const migrationFiles = getMigrationFiles();

        for (const fileName of migrationFiles) {
            if (await hasMigrationRun(client, fileName)) {
                console.log(`Skipped migration: ${fileName}`);
                continue;
            }

            await runMigration(client, fileName);
        }
    } finally {
        client.release();
        await closePool();
    }
}

if (require.main === module) {
    migrate().catch((error) => {
        console.error("Migration failed", error);
        process.exit(1);
    });
}

module.exports = {
    migrate
};
