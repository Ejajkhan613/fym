const router = require("express").Router();

const { checkDatabaseConnection } = require("../db");

router.get("/", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "fym-backend",
        timestamp: new Date().toISOString()
    });
});

router.get("/ready", async (req, res) => {
    try {
        const database = await checkDatabaseConnection();

        res.status(200).json({
            status: "ready",
            checks: {
                api: "ok",
                database
            }
        });
    } catch (error) {
        res.status(503).json({
            status: "not_ready",
            checks: {
                api: "ok",
                database: {
                    status: "error",
                    code: error.code || "DATABASE_CONNECTION_FAILED",
                    message: error.message
                }
            }
        });
    }
});

module.exports = router;
