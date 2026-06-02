const {
    createPenalty,
    findPenaltyById,
    listPenalties,
    listPenaltiesByPharmacy,
    resolvePenaltyAppeal,
    submitPenaltyAppeal,
    updatePenaltyStatus
} = require("../models/penalty.model");
const { findPrimaryPharmacyByOwner } = require("../models/pharmacy.model");
const {
    createHttpError,
    parsePagination,
    sanitizeNumber,
    sanitizeString
} = require("./controller-utils");

async function requireVendorPharmacy(userId) {
    const pharmacy = await findPrimaryPharmacyByOwner(userId);

    if (!pharmacy) {
        throw createHttpError(404, "PHARMACY_NOT_FOUND", "Pharmacy not found");
    }

    return pharmacy;
}

async function listVendorPenalties(req, res) {
    const pharmacy = await requireVendorPharmacy(req.user.id);
    const penalties = await listPenaltiesByPharmacy(
        pharmacy.id,
        parsePagination(req.query)
    );

    res.status(200).json({ penalties });
}

async function getVendorPenalty(req, res) {
    const pharmacy = await requireVendorPharmacy(req.user.id);
    const penalty = await findPenaltyById(req.params.penaltyId);

    if (!penalty || penalty.pharmacy_id !== pharmacy.id) {
        throw createHttpError(404, "PENALTY_NOT_FOUND", "Penalty not found");
    }

    res.status(200).json({ penalty });
}

async function appealVendorPenalty(req, res) {
    const pharmacy = await requireVendorPharmacy(req.user.id);
    const penalty = await findPenaltyById(req.params.penaltyId);

    if (!penalty || penalty.pharmacy_id !== pharmacy.id) {
        throw createHttpError(404, "PENALTY_NOT_FOUND", "Penalty not found");
    }

    const updatedPenalty = await submitPenaltyAppeal(
        penalty.id,
        sanitizeString(req.body.appealReason, "appealReason", { required: true })
    );

    res.status(200).json({ penalty: updatedPenalty });
}

async function listAdminPenalties(req, res) {
    const penalties = await listPenalties({
        pharmacyId: sanitizeString(req.query.pharmacyId, "pharmacyId"),
        status: sanitizeString(req.query.status, "status"),
        appealStatus: sanitizeString(req.query.appealStatus, "appealStatus"),
        ...parsePagination(req.query)
    });

    res.status(200).json({ penalties });
}

async function createAdminPenalty(req, res) {
    const penalty = await createPenalty({
        pharmacyId: sanitizeString(req.body.pharmacyId, "pharmacyId", {
            required: true
        }),
        orderId: sanitizeString(req.body.orderId, "orderId"),
        penaltyType: sanitizeString(req.body.penaltyType, "penaltyType", {
            required: true
        }),
        amount: sanitizeNumber(req.body.amount, "amount", {
            min: 0,
            required: true
        }),
        reason: sanitizeString(req.body.reason, "reason", { required: true }),
        status: sanitizeString(req.body.status, "status", { defaultValue: "PENDING" })
    });

    res.status(201).json({ penalty });
}

async function getAdminPenalty(req, res) {
    const penalty = await findPenaltyById(req.params.penaltyId);

    if (!penalty) {
        throw createHttpError(404, "PENALTY_NOT_FOUND", "Penalty not found");
    }

    res.status(200).json({ penalty });
}

async function waiveAdminPenalty(req, res) {
    const penalty = await updatePenaltyStatus(
        req.params.penaltyId,
        "WAIVED",
        sanitizeString(req.body.adminNote, "adminNote")
    );

    if (!penalty) {
        throw createHttpError(404, "PENALTY_NOT_FOUND", "Penalty not found");
    }

    res.status(200).json({ penalty });
}

async function approveAdminPenaltyAppeal(req, res) {
    const penalty = await resolvePenaltyAppeal(
        req.params.penaltyId,
        "APPROVED",
        sanitizeString(req.body.adminNote, "adminNote")
    );

    if (!penalty) {
        throw createHttpError(404, "PENALTY_NOT_FOUND", "Penalty not found");
    }

    res.status(200).json({ penalty });
}

async function rejectAdminPenaltyAppeal(req, res) {
    const penalty = await resolvePenaltyAppeal(
        req.params.penaltyId,
        "REJECTED",
        sanitizeString(req.body.adminNote, "adminNote")
    );

    if (!penalty) {
        throw createHttpError(404, "PENALTY_NOT_FOUND", "Penalty not found");
    }

    res.status(200).json({ penalty });
}

module.exports = {
    appealVendorPenalty,
    approveAdminPenaltyAppeal,
    createAdminPenalty,
    getAdminPenalty,
    getVendorPenalty,
    listAdminPenalties,
    listVendorPenalties,
    rejectAdminPenaltyAppeal,
    waiveAdminPenalty
};
