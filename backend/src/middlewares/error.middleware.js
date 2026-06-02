function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
        error: {
            code: err.code || "INTERNAL_SERVER_ERROR",
            message: statusCode === 500 ? "Internal server error" : err.message
        }
    });
}

module.exports = errorHandler;
