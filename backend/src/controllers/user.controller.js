const {
    createCustomerProfile,
    findCustomerProfileByUserId,
    updateCustomerProfile
} = require("../models/customer-profile.model");
const { findUserById, updateUser } = require("../models/user.model");

function createHttpError(statusCode, code, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

function sanitizeOptionalString(value) {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value !== "string") {
        throw createHttpError(400, "INVALID_INPUT", "Expected a string value");
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function assertEmail(email) {
    if (email === undefined || email === null) {
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw createHttpError(400, "INVALID_EMAIL", "Email is invalid");
    }
}

function assertGender(gender) {
    if (
        gender === undefined ||
        gender === null ||
        ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"].includes(gender)
    ) {
        return;
    }

    throw createHttpError(400, "INVALID_GENDER", "Gender is invalid");
}

function assertDate(value, fieldName) {
    if (value === undefined || value === null) {
        return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
        throw createHttpError(400, "INVALID_DATE", `${fieldName} must be YYYY-MM-DD`);
    }
}

function toUserResponse(user, profile) {
    return {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        profile,
        created_at: user.created_at,
        updated_at: user.updated_at
    };
}

async function getMe(req, res) {
    const user = await findUserById(req.user.id);

    if (!user) {
        throw createHttpError(404, "USER_NOT_FOUND", "User not found");
    }

    const profile = await findCustomerProfileByUserId(user.id);

    res.status(200).json({
        user: toUserResponse(user, profile)
    });
}

async function updateMe(req, res) {
    const name = sanitizeOptionalString(req.body.name);
    const email = sanitizeOptionalString(req.body.email);
    const dateOfBirth = sanitizeOptionalString(req.body.dateOfBirth);
    const gender = sanitizeOptionalString(req.body.gender);
    const abhaIdOptional = sanitizeOptionalString(req.body.abhaIdOptional);

    if (req.body.name !== undefined && !name) {
        throw createHttpError(400, "INVALID_NAME", "Name cannot be empty");
    }

    assertEmail(email);
    assertGender(gender);
    assertDate(dateOfBirth, "dateOfBirth");

    const user = await updateUser(req.user.id, {
        name,
        email
    });

    if (!user) {
        throw createHttpError(404, "USER_NOT_FOUND", "User not found");
    }

    let profile = await findCustomerProfileByUserId(user.id);
    const profileUpdates = {
        dateOfBirth,
        gender,
        abhaIdOptional
    };

    const hasProfileUpdates = Object.values(profileUpdates).some(
        (value) => value !== undefined
    );

    if (!profile) {
        profile = await createCustomerProfile({
            userId: user.id,
            ...profileUpdates
        });
    } else if (hasProfileUpdates) {
        profile = await updateCustomerProfile(profile.id, profileUpdates);
    }

    res.status(200).json({
        user: toUserResponse(user, profile)
    });
}

module.exports = {
    getMe,
    updateMe
};
