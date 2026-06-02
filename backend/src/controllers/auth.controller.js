const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const {
    createUser,
    findUserById,
    findUserByPhone
} = require("../models/user.model");
const {
    createCustomerProfile,
    findCustomerProfileByUserId
} = require("../models/customer-profile.model");

const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PURPOSE = Object.freeze({
    REGISTER: "REGISTER",
    LOGIN: "LOGIN",
    CHANGE_PHONE: "CHANGE_PHONE"
});

const OTP_NEXT_STEP = Object.freeze({
    [OTP_PURPOSE.REGISTER]: "verify_registration_otp",
    [OTP_PURPOSE.LOGIN]: "login_with_otp",
    [OTP_PURPOSE.CHANGE_PHONE]: "verify_phone_change_otp"
});

function createHttpError(statusCode, code, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

function normalizePhone(phone) {
    if (typeof phone !== "string") {
        return "";
    }

    return phone.replace(/\s+/g, "").trim();
}

function assertPhone(phone) {
    if (!phone || !/^\+?[0-9]{10,15}$/.test(phone)) {
        throw createHttpError(
            400,
            "INVALID_PHONE",
            "Phone must contain 10 to 15 digits and may start with +"
        );
    }
}

function sanitizeOptionalString(value) {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}

function normalizeOtpPurpose(value) {
    const purpose = sanitizeOptionalString(value);

    if (!purpose) {
        throw createHttpError(400, "OTP_PURPOSE_REQUIRED", "otpPurpose is required");
    }

    const normalizedPurpose = purpose.toUpperCase();

    if (!Object.values(OTP_PURPOSE).includes(normalizedPurpose)) {
        throw createHttpError(400, "INVALID_OTP_PURPOSE", "otpPurpose is invalid");
    }

    return normalizedPurpose;
}

function otpKey(phone, otpPurpose) {
    return `${otpPurpose}:${phone}`;
}

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at
    };
}

function issueTokens(user) {
    const payload = {
        sub: user.id,
        role: user.role,
        phone: user.phone
    };

    return {
        tokenType: "Bearer",
        accessToken: jwt.sign(payload, env.auth.jwtAccessTokenSecret, {
            expiresIn: env.auth.accessTokenTtl
        }),
        refreshToken: jwt.sign(payload, env.auth.jwtRefreshTokenSecret, {
            expiresIn: env.auth.refreshTokenTtl
        }),
        accessTokenExpiresIn: env.auth.accessTokenTtl,
        refreshTokenExpiresIn: env.auth.refreshTokenTtl
    };
}

async function ensureCustomerProfile(userId) {
    const existingProfile = await findCustomerProfileByUserId(userId);

    if (existingProfile) {
        return existingProfile;
    }

    return createCustomerProfile({ userId });
}

function assertActiveUser(user) {
    if (user.status === "BLOCKED") {
        throw createHttpError(403, "USER_BLOCKED", "User account is blocked");
    }

    if (user.status !== "ACTIVE") {
        throw createHttpError(
            403,
            "USER_NOT_ACTIVE",
            "User account is not active"
        );
    }
}

async function requestOtp(req, res) {
    const phone = normalizePhone(req.body.phone);
    const otpPurpose = normalizeOtpPurpose(req.body.otpPurpose);
    assertPhone(phone);

    const existingUser = await findUserByPhone(phone);

    if (otpPurpose === OTP_PURPOSE.REGISTER && existingUser) {
        throw createHttpError(
            409,
            "USER_ALREADY_EXISTS",
            "User already exists. Request a login OTP instead."
        );
    }

    if (otpPurpose === OTP_PURPOSE.LOGIN) {
        if (!existingUser) {
            throw createHttpError(
                404,
                "USER_NOT_FOUND",
                "User not found. Register before login."
            );
        }

        assertActiveUser(existingUser);
    }

    const otp = String(crypto.randomInt(100000, 1000000));

    otpStore.set(otpKey(phone, otpPurpose), {
        otp,
        otpPurpose,
        phone,
        attempts: 0,
        expiresAt: Date.now() + OTP_TTL_MS
    });

    const response = {
        status: "otp_sent",
        phone,
        otpPurpose,
        expiresInSeconds: OTP_TTL_MS / 1000,
        nextStep: OTP_NEXT_STEP[otpPurpose]
    };

    if (env.nodeEnv !== "production" && env.auth.exposeDevOtp) {
        response.devOtp = otp;
    }

    res.status(202).json(response);
}

function consumeOtp({ phone, otp, otpPurpose }) {
    if (!otp) {
        throw createHttpError(400, "OTP_REQUIRED", "OTP is required");
    }

    const key = otpKey(phone, otpPurpose);
    const otpRecord = otpStore.get(key);

    if (!otpRecord || otpRecord.expiresAt < Date.now()) {
        otpStore.delete(key);
        throw createHttpError(400, "OTP_EXPIRED", "OTP is invalid or expired");
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
        otpStore.delete(key);
        throw createHttpError(
            429,
            "OTP_ATTEMPTS_EXCEEDED",
            "Too many OTP attempts"
        );
    }

    if (otpRecord.otp !== otp) {
        otpRecord.attempts += 1;
        throw createHttpError(400, "OTP_INVALID", "OTP is invalid or expired");
    }

    otpStore.delete(key);
}

async function verifyOtp(req, res) {
    const phone = normalizePhone(req.body.phone);
    const otp = sanitizeOptionalString(req.body.otp);
    const otpPurpose = normalizeOtpPurpose(req.body.otpPurpose);
    const name = sanitizeOptionalString(req.body.name) || "Customer";
    const email = sanitizeOptionalString(req.body.email);

    assertPhone(phone);

    if (otpPurpose !== OTP_PURPOSE.REGISTER) {
        throw createHttpError(
            400,
            "INVALID_OTP_VERIFY_PURPOSE",
            "Use /auth/login to verify login OTPs"
        );
    }

    consumeOtp({ phone, otp, otpPurpose });

    let user = await findUserByPhone(phone);

    if (user) {
        throw createHttpError(
            409,
            "USER_ALREADY_EXISTS",
            "User already exists. Request a login OTP instead."
        );
    }

    user = await createUser({
        name,
        phone,
        email: email || null,
        role: "CUSTOMER",
        status: "ACTIVE"
    });

    assertActiveUser(user);
    await ensureCustomerProfile(user.id);

    res.status(200).json({
        user: publicUser(user),
        tokens: issueTokens(user)
    });
}

async function login(req, res) {
    const phone = normalizePhone(req.body.phone);
    const otp = sanitizeOptionalString(req.body.otp);

    assertPhone(phone);
    consumeOtp({
        phone,
        otp,
        otpPurpose: OTP_PURPOSE.LOGIN
    });

    const user = await findUserByPhone(phone);

    if (!user) {
        throw createHttpError(404, "USER_NOT_FOUND", "User not found");
    }

    assertActiveUser(user);
    await ensureCustomerProfile(user.id);

    res.status(200).json({
        user: publicUser(user),
        tokens: issueTokens(user)
    });
}

async function refreshToken(req, res) {
    const refreshTokenValue = sanitizeOptionalString(req.body.refreshToken);

    if (!refreshTokenValue) {
        throw createHttpError(
            400,
            "REFRESH_TOKEN_REQUIRED",
            "Refresh token is required"
        );
    }

    let payload;

    try {
        payload = jwt.verify(refreshTokenValue, env.auth.jwtRefreshTokenSecret);
    } catch (error) {
        throw createHttpError(
            401,
            "INVALID_REFRESH_TOKEN",
            "Invalid or expired refresh token"
        );
    }

    const user = await findUserById(payload.sub);

    if (!user) {
        throw createHttpError(401, "INVALID_REFRESH_TOKEN", "User no longer exists");
    }

    assertActiveUser(user);

    res.status(200).json({
        user: publicUser(user),
        tokens: issueTokens(user)
    });
}

async function logout(req, res) {
    res.status(200).json({
        status: "logged_out"
    });
}

module.exports = {
    login,
    logout,
    OTP_PURPOSE,
    refreshToken,
    requestOtp,
    verifyOtp
};
