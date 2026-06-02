const jwt = require("jsonwebtoken");

const env = require("../config/env");
const { findUserById } = require("../models/user.model");

function unauthorized(message = "Authentication required") {
    const error = new Error(message);
    error.statusCode = 401;
    error.code = "UNAUTHORIZED";
    return error;
}

async function authenticate(req, res, next) {
    try {
        const header = req.get("authorization");

        if (!header || !header.startsWith("Bearer ")) {
            throw unauthorized();
        }

        const token = header.slice("Bearer ".length).trim();

        if (!token) {
            throw unauthorized();
        }

        const payload = jwt.verify(token, env.auth.jwtAccessTokenSecret);
        const user = await findUserById(payload.sub);

        if (!user) {
            throw unauthorized("User no longer exists");
        }

        if (user.status !== "ACTIVE") {
            const error = new Error("User account is not active");
            error.statusCode = 403;
            error.code = "USER_NOT_ACTIVE";
            throw error;
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            next(unauthorized("Invalid or expired access token"));
            return;
        }

        next(error);
    }
}

function requireRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            next(unauthorized());
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            const error = new Error("You do not have access to this resource");
            error.statusCode = 403;
            error.code = "FORBIDDEN";
            next(error);
            return;
        }

        next();
    };
}

module.exports = {
    authenticate,
    requireRoles
};
