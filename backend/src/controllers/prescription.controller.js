const {
    createPrescription,
    findPrescriptionById,
    listPrescriptions,
    listPrescriptionsByCustomer,
    updatePrescription,
    updatePrescriptionVerification
} = require("../models/prescription.model");
const { findPharmacistById } = require("../models/pharmacist.model");
const {
    assertOwned,
    createHttpError,
    parsePagination,
    sanitizeString
} = require("./controller-utils");

async function listMyPrescriptions(req, res) {
    const prescriptions = await listPrescriptionsByCustomer(
        req.user.id,
        parsePagination(req.query)
    );

    res.status(200).json({ prescriptions });
}

async function uploadPrescription(req, res) {
    const imageUrl = sanitizeString(req.body.imageUrl, "imageUrl", {
        required: true
    });
    const prescription = await createPrescription({
        customerId: req.user.id,
        imageUrl,
        ocrText: sanitizeString(req.body.ocrText, "ocrText"),
        metadataJson: req.body.metadataJson || {},
        verificationStatus: "PENDING_REVIEW"
    });

    res.status(201).json({ prescription });
}

async function getMyPrescription(req, res) {
    const prescription = await findPrescriptionById(req.params.prescriptionId);
    assertOwned(
        prescription,
        req.user.id,
        "customer_id",
        "PRESCRIPTION_NOT_FOUND",
        "Prescription not found"
    );

    res.status(200).json({ prescription });
}

async function getMyPrescriptionStatus(req, res) {
    const prescription = await findPrescriptionById(req.params.prescriptionId);
    assertOwned(
        prescription,
        req.user.id,
        "customer_id",
        "PRESCRIPTION_NOT_FOUND",
        "Prescription not found"
    );

    res.status(200).json({
        id: prescription.id,
        verificationStatus: prescription.verification_status,
        rejectionReason: prescription.rejection_reason,
        verifiedAt: prescription.verified_at
    });
}

async function listAdminPrescriptionReview(req, res) {
    const prescriptions = await listPrescriptions({
        verificationStatus: sanitizeString(
            req.query.verificationStatus,
            "verificationStatus",
            { defaultValue: "PENDING_REVIEW" }
        ),
        ...parsePagination(req.query)
    });

    res.status(200).json({ prescriptions });
}

async function getAdminPrescription(req, res) {
    const prescription = await findPrescriptionById(req.params.prescriptionId);

    if (!prescription) {
        throw createHttpError(404, "PRESCRIPTION_NOT_FOUND", "Prescription not found");
    }

    res.status(200).json({ prescription });
}

async function approveAdminPrescription(req, res) {
    const prescription = await updatePrescriptionVerification({
        id: req.params.prescriptionId,
        verificationStatus: "VERIFIED",
        verifiedByPharmacistId: sanitizeString(
            req.body.verifiedByPharmacistId,
            "verifiedByPharmacistId"
        )
    });

    if (!prescription) {
        throw createHttpError(404, "PRESCRIPTION_NOT_FOUND", "Prescription not found");
    }

    res.status(200).json({ prescription });
}

async function rejectAdminPrescription(req, res) {
    const prescription = await updatePrescriptionVerification({
        id: req.params.prescriptionId,
        verificationStatus: "REJECTED",
        rejectionReason: sanitizeString(req.body.rejectionReason, "rejectionReason", {
            required: true
        })
    });

    if (!prescription) {
        throw createHttpError(404, "PRESCRIPTION_NOT_FOUND", "Prescription not found");
    }

    res.status(200).json({ prescription });
}

async function flagFakeAdminPrescription(req, res) {
    const prescription = await updatePrescription(req.params.prescriptionId, {
        verificationStatus: "REJECTED",
        rejectionReason:
            sanitizeString(req.body.reason, "reason") || "Flagged as fake prescription",
        metadataJson: {
            fraudFlag: true,
            flaggedBy: req.user.id
        }
    });

    if (!prescription) {
        throw createHttpError(404, "PRESCRIPTION_NOT_FOUND", "Prescription not found");
    }

    res.status(200).json({ prescription });
}

async function assignAdminPrescriptionPharmacist(req, res) {
    const pharmacistId = sanitizeString(req.body.pharmacistId, "pharmacistId", {
        required: true
    });
    const pharmacist = await findPharmacistById(pharmacistId);

    if (!pharmacist) {
        throw createHttpError(404, "PHARMACIST_NOT_FOUND", "Pharmacist not found");
    }

    const prescription = await updatePrescription(req.params.prescriptionId, {
        verificationStatus: "NEEDS_MANUAL_REVIEW",
        verifiedByPharmacistId: pharmacistId
    });

    if (!prescription) {
        throw createHttpError(404, "PRESCRIPTION_NOT_FOUND", "Prescription not found");
    }

    res.status(200).json({ prescription });
}

module.exports = {
    approveAdminPrescription,
    assignAdminPrescriptionPharmacist,
    flagFakeAdminPrescription,
    getAdminPrescription,
    getMyPrescription,
    getMyPrescriptionStatus,
    listAdminPrescriptionReview,
    listMyPrescriptions,
    rejectAdminPrescription,
    uploadPrescription
};
