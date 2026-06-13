const {
  runMigrations,
  getMigrationStatus,
} = require("../packages/database/src");

async function main() {
  const command = process.argv[2] || "up";

  if (command === "status") {
    const status = await getMigrationStatus();

    for (const migration of status) {
      const mark = migration.applied ? "applied" : "pending";
      console.log(`${mark.padEnd(8)} ${migration.name}`);
    }

    return;
  }

  if (command !== "up") {
    throw new Error(`Unknown migration command: ${command}`);
  }

  const result = await runMigrations();

  if (result.applied.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  console.log(`Applied ${result.applied.length} migration(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
