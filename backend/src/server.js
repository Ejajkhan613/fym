const createApp = require("./app");
const env = require("./config/env");
const { closePool } = require("./db");

const app = createApp();

const server = app.listen(env.port, () => {
    console.log(`FYM backend listening on port ${env.port}`);
});

let isShuttingDown = false;

function shutdown(signal) {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;
    console.log(`${signal} received. Closing FYM backend.`);

    server.close(async () => {
        try {
            await closePool();
            process.exit(0);
        } catch (error) {
            console.error("Error while closing PostgreSQL pool", error);
            process.exit(1);
        }
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
