function createHttpError(statusCode, code, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

function sanitizeString(value, fieldName, { required = false, defaultValue } = {}) {
    if (value === undefined || value === null) {
        if (required) {
            throw createHttpError(400, "REQUIRED_FIELD", `${fieldName} is required`);
        }

        return defaultValue;
    }

    if (typeof value !== "string") {
        throw createHttpError(400, "INVALID_INPUT", `${fieldName} must be a string`);
    }

    const trimmed = value.trim();

    if (required && !trimmed) {
        throw createHttpError(400, "REQUIRED_FIELD", `${fieldName} is required`);
    }

    return trimmed || defaultValue;
}

function sanitizeNumber(
    value,
    fieldName,
    { required = false, min = null, max = null, defaultValue } = {}
) {
    if (value === undefined || value === null || value === "") {
        if (required) {
            throw createHttpError(400, "REQUIRED_FIELD", `${fieldName} is required`);
        }

        return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw createHttpError(400, "INVALID_NUMBER", `${fieldName} must be a number`);
    }

    if (min !== null && parsed < min) {
        throw createHttpError(400, "INVALID_NUMBER", `${fieldName} is too low`);
    }

    if (max !== null && parsed > max) {
        throw createHttpError(400, "INVALID_NUMBER", `${fieldName} is too high`);
    }

    return parsed;
}

function sanitizeInteger(value, fieldName, options = {}) {
    const parsed = sanitizeNumber(value, fieldName, options);

    if (parsed === undefined) {
        return undefined;
    }

    if (!Number.isInteger(parsed)) {
        throw createHttpError(400, "INVALID_INTEGER", `${fieldName} must be integer`);
    }

    return parsed;
}

function sanitizeBoolean(value, fieldName, { defaultValue } = {}) {
    if (value === undefined || value === null || value === "") {
        return defaultValue;
    }

    if (typeof value === "boolean") {
        return value;
    }

    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    throw createHttpError(400, "INVALID_BOOLEAN", `${fieldName} must be boolean`);
}

function sanitizeDate(value, fieldName, { required = false } = {}) {
    const date = sanitizeString(value, fieldName, { required });

    if (!date) {
        return date;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
        throw createHttpError(400, "INVALID_DATE", `${fieldName} must be YYYY-MM-DD`);
    }

    return date;
}

function parsePagination(query) {
    return {
        limit: sanitizeInteger(query.limit, "limit", {
            min: 1,
            max: 100,
            defaultValue: 50
        }),
        offset: sanitizeInteger(query.offset, "offset", {
            min: 0,
            defaultValue: 0
        })
    };
}

function stripUndefined(payload) {
    return Object.entries(payload).reduce((cleanPayload, [key, value]) => {
        if (value !== undefined) {
            cleanPayload[key] = value;
        }

        return cleanPayload;
    }, {});
}

function assertOwned(resource, ownerId, ownerColumn, code, message) {
    if (!resource || resource[ownerColumn] !== ownerId) {
        throw createHttpError(404, code, message);
    }
}

module.exports = {
    assertOwned,
    createHttpError,
    parsePagination,
    sanitizeBoolean,
    sanitizeDate,
    sanitizeInteger,
    sanitizeNumber,
    sanitizeString,
    stripUndefined
};
