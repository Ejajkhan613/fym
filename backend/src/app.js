const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const errorHandler = require("./middlewares/error.middleware");
const notFoundHandler = require("./middlewares/not-found.middleware");
const apiRoutes = require("./routes");

function createApp() {
    const app = express();

    app.disable("x-powered-by");

    app.use(helmet());
    app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin }));
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true }));

    if (env.nodeEnv !== "test") {
        app.use(morgan("dev"));
    }

    app.use(env.apiPrefix, apiRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}

module.exports = createApp;
