const {
    createPharmacist,
    findPharmacistById,
    listPharmacists,
    listPharmacistsByPharmacy,
    updatePharmacist,
    updatePharmacistStatus
} = require("../models/pharmacist.model");
const { findPrimaryPharmacyByOwner } = require("../models/pharmacy.model");

function createHttpError(statusCode, code, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

function sanitizeString(value, fieldName, { required = false } = {}) {
    if (value === undefined || value === null) {
        if (required) {
            throw createHttpError(400, "REQUIRED_FIELD", `${fieldName} is required`);
        }

        return undefined;
    }

    if (typeof value !== "string") {
        throw createHttpError(400, "INVALID_INPUT", `${fieldName} must be a string`);
    }

    const trimmed = value.trim();

    if (required && !trimmed) {
        throw createHttpError(400, "REQUIRED_FIELD", `${fieldName} is required`);
    }

    return trimmed || null;
}

function sanitizeNumber(value, fieldName, { min = null, max = null } = {}) {
    if (value === undefined || value === null || value === "") {
        return undefined;
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

function parsePagination(query) {
    return {
        limit: sanitizeNumber(query.limit, "limit", { min: 1, max: 100 }) || 50,
        offset: sanitizeNumber(query.offset, "offset", { min: 0 }) || 0
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

async function requireMyPharmacy(userId) {
    const pharmacy = await findPrimaryPharmacyByOwner(userId);

    if (!pharmacy) {
        throw createHttpError(404, "PHARMACY_NOT_FOUND", "Pharmacy not found");
    }

    return pharmacy;
}

async function requireMyPharmacist(userId, pharmacistId) {
    const pharmacy = await requireMyPharmacy(userId);
    const pharmacist = await findPharmacistById(pharmacistId);

    if (!pharmacist || pharmacist.pharmacy_id !== pharmacy.id) {
        throw createHttpError(404, "PHARMACIST_NOT_FOUND", "Pharmacist not found");
    }

    return {
        pharmacy,
        pharmacist
    };
}

function pharmacistPayload(body, { partial = false } = {}) {
    return stripUndefined({
        name: sanitizeString(body.name, "name", { required: !partial }),
        registrationNumber: sanitizeString(
            body.registrationNumber,
            "registrationNumber",
            { required: !partial }
        ),
        certificateUrl: sanitizeString(body.certificateUrl, "certificateUrl"),
        userId: sanitizeString(body.userId, "userId")
    });
}

async function listMyPharmacists(req, res) {
    const pharmacy = await requireMyPharmacy(req.user.id);
    const pharmacists = await listPharmacistsByPharmacy(pharmacy.id);

    res.status(200).json({
        pharmacists
    });
}

async function createMyPharmacist(req, res) {
    const pharmacy = await requireMyPharmacy(req.user.id);
    const payload = pharmacistPayload(req.body);
    const pharmacist = await createPharmacist({
        ...payload,
        pharmacyId: pharmacy.id,
        status: "PENDING_VERIFICATION"
    });

    res.status(201).json({
        pharmacist
    });
}

async function getMyPharmacist(req, res) {
    const { pharmacist } = await requireMyPharmacist(
        req.user.id,
        req.params.pharmacistId
    );

    res.status(200).json({
        pharmacist
    });
}

async function updateMyPharmacist(req, res) {
    const { pharmacist } = await requireMyPharmacist(
        req.user.id,
        req.params.pharmacistId
    );
    const payload = pharmacistPayload(req.body, { partial: true });
    const updatedPharmacist = await updatePharmacist(pharmacist.id, payload);

    res.status(200).json({
        pharmacist: updatedPharmacist
    });
}

async function listAdminPharmacists(req, res) {
    const pharmacists = await listPharmacists({
        status: sanitizeString(req.query.status, "status"),
        pharmacyId: sanitizeString(req.query.pharmacyId, "pharmacyId"),
        ...parsePagination(req.query)
    });

    res.status(200).json({
        pharmacists
    });
}

async function getAdminPharmacist(req, res) {
    const pharmacist = await findPharmacistById(req.params.pharmacistId);

    if (!pharmacist) {
        throw createHttpError(404, "PHARMACIST_NOT_FOUND", "Pharmacist not found");
    }

    res.status(200).json({
        pharmacist
    });
}

async function updateAdminPharmacistStatus(req, res, status) {
    const pharmacist = await updatePharmacistStatus(req.params.pharmacistId, status);

    if (!pharmacist) {
        throw createHttpError(404, "PHARMACIST_NOT_FOUND", "Pharmacist not found");
    }

    res.status(200).json({
        pharmacist
    });
}

async function verifyAdminPharmacist(req, res) {
    return updateAdminPharmacistStatus(req, res, "VERIFIED");
}

async function rejectAdminPharmacist(req, res) {
    return updateAdminPharmacistStatus(req, res, "REJECTED");
}

async function suspendAdminPharmacist(req, res) {
    return updateAdminPharmacistStatus(req, res, "SUSPENDED");
}

module.exports = {
    createMyPharmacist,
    getAdminPharmacist,
    getMyPharmacist,
    listAdminPharmacists,
    listMyPharmacists,
    rejectAdminPharmacist,
    suspendAdminPharmacist,
    updateMyPharmacist,
    verifyAdminPharmacist
};
