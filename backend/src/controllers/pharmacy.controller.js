const {
    createPharmacy,
    findPharmacyById,
    findPharmacyByLicenseNumber,
    findPrimaryPharmacyByOwner,
    listPharmacies,
    listPharmaciesByOwner,
    updatePharmacy,
    updatePharmacyStatus
} = require("../models/pharmacy.model");
const {
    createPharmacyDocument,
    findPharmacyDocumentById,
    listPharmacyDocuments,
    updatePharmacyDocument
} = require("../models/pharmacy-document.model");
const { listOrdersByPharmacy } = require("../models/order.model");
const { listPenaltiesByPharmacy } = require("../models/penalty.model");
const { listAuditLogsForEntity } = require("../models/audit-log.model");
const { updateUser } = require("../models/user.model");

const PHARMACY_DOCUMENT_TYPES = [
    "DRUG_LICENSE",
    "GST",
    "SHOP_REGISTRATION",
    "OWNER_KYC",
    "PHARMACIST_CERTIFICATE",
    "BANK_ACCOUNT",
    "INVOICE_FORMAT",
    "RETURN_POLICY",
    "PLATFORM_AGREEMENT",
    "PENALTY_AGREEMENT",
    "PRESCRIPTION_COMPLIANCE_DECLARATION",
    "OTHER"
];

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

function sanitizeBoolean(value, fieldName) {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value !== "boolean") {
        throw createHttpError(400, "INVALID_BOOLEAN", `${fieldName} must be boolean`);
    }

    return value;
}

function sanitizeDate(value, fieldName) {
    const date = sanitizeString(value, fieldName);

    if (date === undefined || date === null) {
        return date;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
        throw createHttpError(400, "INVALID_DATE", `${fieldName} must be YYYY-MM-DD`);
    }

    return date;
}

function sanitizeTime(value, fieldName) {
    const time = sanitizeString(value, fieldName);

    if (time === undefined || time === null) {
        return time;
    }

    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
        throw createHttpError(400, "INVALID_TIME", `${fieldName} must be HH:mm`);
    }

    return time;
}

function stripUndefined(payload) {
    return Object.entries(payload).reduce((cleanPayload, [key, value]) => {
        if (value !== undefined) {
            cleanPayload[key] = value;
        }

        return cleanPayload;
    }, {});
}

function parsePagination(query) {
    return {
        limit: sanitizeNumber(query.limit, "limit", { min: 1, max: 100 }) || 50,
        offset: sanitizeNumber(query.offset, "offset", { min: 0 }) || 0
    };
}

function pharmacyPayload(body, { partial = false } = {}) {
    return stripUndefined({
        name: sanitizeString(body.name, "name", { required: !partial }),
        licenseNumber: sanitizeString(body.licenseNumber, "licenseNumber", {
            required: !partial
        }),
        licenseValidFrom: sanitizeDate(body.licenseValidFrom, "licenseValidFrom"),
        licenseValidTo: sanitizeDate(body.licenseValidTo, "licenseValidTo"),
        gstNumber: sanitizeString(body.gstNumber, "gstNumber"),
        addressLine: sanitizeString(body.addressLine, "addressLine", {
            required: !partial
        }),
        city: sanitizeString(body.city, "city", { required: !partial }),
        state: sanitizeString(body.state, "state", { required: !partial }),
        pincode: sanitizeString(body.pincode, "pincode", { required: !partial }),
        latitude: sanitizeNumber(body.latitude, "latitude", { min: -90, max: 90 }),
        longitude: sanitizeNumber(body.longitude, "longitude", {
            min: -180,
            max: 180
        }),
        serviceRadiusKm: sanitizeNumber(body.serviceRadiusKm, "serviceRadiusKm", {
            min: 0.1,
            max: 50
        }),
        openingTime: sanitizeTime(body.openingTime, "openingTime"),
        closingTime: sanitizeTime(body.closingTime, "closingTime"),
        is24x7: sanitizeBoolean(body.is24x7, "is24x7"),
        deliveryCapability: sanitizeString(
            body.deliveryCapability,
            "deliveryCapability"
        ),
        coldChainCapable: sanitizeBoolean(
            body.coldChainCapable,
            "coldChainCapable"
        )
    });
}

async function requireMyPharmacy(userId) {
    const pharmacy = await findPrimaryPharmacyByOwner(userId);

    if (!pharmacy) {
        throw createHttpError(404, "PHARMACY_NOT_FOUND", "Pharmacy not found");
    }

    return pharmacy;
}

async function getVendorProfile(req, res) {
    const pharmacies = await listPharmaciesByOwner(req.user.id);

    res.status(200).json({
        user: req.user,
        pharmacies
    });
}

async function updateVendorProfile(req, res) {
    const name = sanitizeString(req.body.name, "name");
    const email = sanitizeString(req.body.email, "email");

    if (req.body.name !== undefined && !name) {
        throw createHttpError(400, "INVALID_NAME", "Name cannot be empty");
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw createHttpError(400, "INVALID_EMAIL", "Email is invalid");
    }

    const user = await updateUser(req.user.id, { name, email });

    res.status(200).json({
        user
    });
}

async function getMyPharmacy(req, res) {
    const pharmacy = await findPrimaryPharmacyByOwner(req.user.id);

    res.status(200).json({
        pharmacy
    });
}

async function createMyPharmacy(req, res) {
    const existingPharmacy = await findPrimaryPharmacyByOwner(req.user.id);

    if (existingPharmacy) {
        throw createHttpError(
            409,
            "PHARMACY_ALREADY_EXISTS",
            "This account already has a pharmacy"
        );
    }

    const payload = pharmacyPayload(req.body);
    const existingLicense = await findPharmacyByLicenseNumber(payload.licenseNumber);

    if (existingLicense) {
        throw createHttpError(
            409,
            "LICENSE_ALREADY_EXISTS",
            "This license number is already registered"
        );
    }

    const pharmacy = await createPharmacy({
        ...payload,
        ownerUserId: req.user.id,
        status: "DRAFT"
    });

    res.status(201).json({
        pharmacy
    });
}

async function updateMyPharmacy(req, res) {
    const pharmacy = await requireMyPharmacy(req.user.id);
    const payload = pharmacyPayload(req.body, { partial: true });
    const updatedPharmacy = await updatePharmacy(pharmacy.id, payload);

    res.status(200).json({
        pharmacy: updatedPharmacy
    });
}

async function uploadMyPharmacyDocument(req, res) {
    const pharmacy = await requireMyPharmacy(req.user.id);
    const documentType = sanitizeString(req.body.documentType, "documentType", {
        required: true
    });
    const documentUrl = sanitizeString(req.body.documentUrl, "documentUrl", {
        required: true
    });

    if (!PHARMACY_DOCUMENT_TYPES.includes(documentType)) {
        throw createHttpError(
            400,
            "INVALID_DOCUMENT_TYPE",
            "Document type is invalid"
        );
    }

    const document = await createPharmacyDocument({
        pharmacyId: pharmacy.id,
        documentType,
        documentUrl
    });

    res.status(201).json({
        document
    });
}

async function listMyPharmacyDocuments(req, res) {
    const pharmacy = await requireMyPharmacy(req.user.id);
    const documents = await listPharmacyDocuments(pharmacy.id);

    res.status(200).json({
        documents
    });
}

async function submitMyPharmacyForReview(req, res) {
    const pharmacy = await requireMyPharmacy(req.user.id);
    const updatedPharmacy = await updatePharmacyStatus(
        pharmacy.id,
        "DOCUMENT_SUBMITTED"
    );

    res.status(200).json({
        pharmacy: updatedPharmacy
    });
}

async function listAdminPharmacies(req, res) {
    const pharmacies = await listPharmacies({
        status: sanitizeString(req.query.status, "status"),
        city: sanitizeString(req.query.city, "city"),
        ...parsePagination(req.query)
    });

    res.status(200).json({
        pharmacies
    });
}

async function getAdminPharmacy(req, res) {
    const pharmacy = await findPharmacyById(req.params.pharmacyId);

    if (!pharmacy) {
        throw createHttpError(404, "PHARMACY_NOT_FOUND", "Pharmacy not found");
    }

    res.status(200).json({
        pharmacy
    });
}

async function listAdminPharmacyDocuments(req, res) {
    const pharmacy = await findPharmacyById(req.params.pharmacyId);

    if (!pharmacy) {
        throw createHttpError(404, "PHARMACY_NOT_FOUND", "Pharmacy not found");
    }

    const documents = await listPharmacyDocuments(pharmacy.id);

    res.status(200).json({
        documents
    });
}

async function updateAdminPharmacyStatus(req, res, status) {
    const pharmacy = await updatePharmacyStatus(req.params.pharmacyId, status);

    if (!pharmacy) {
        throw createHttpError(404, "PHARMACY_NOT_FOUND", "Pharmacy not found");
    }

    res.status(200).json({
        pharmacy
    });
}

async function approveAdminPharmacy(req, res) {
    return updateAdminPharmacyStatus(req, res, "APPROVED");
}

async function rejectAdminPharmacy(req, res) {
    return updateAdminPharmacyStatus(req, res, "REJECTED");
}

async function suspendAdminPharmacy(req, res) {
    return updateAdminPharmacyStatus(req, res, "SUSPENDED");
}

async function blacklistAdminPharmacy(req, res) {
    return updateAdminPharmacyStatus(req, res, "BLACKLISTED");
}

async function updateAdminPharmacyServiceRadius(req, res) {
    const serviceRadiusKm = sanitizeNumber(
        req.body.serviceRadiusKm,
        "serviceRadiusKm",
        { min: 0.1, max: 50 }
    );

    if (serviceRadiusKm === undefined) {
        throw createHttpError(
            400,
            "SERVICE_RADIUS_REQUIRED",
            "serviceRadiusKm is required"
        );
    }

    const pharmacy = await updatePharmacy(req.params.pharmacyId, {
        serviceRadiusKm
    });

    if (!pharmacy) {
        throw createHttpError(404, "PHARMACY_NOT_FOUND", "Pharmacy not found");
    }

    res.status(200).json({
        pharmacy
    });
}

async function updateAdminPharmacyDocument(req, res, status) {
    const existingDocument = await findPharmacyDocumentById(req.params.documentId);

    if (!existingDocument || existingDocument.pharmacy_id !== req.params.pharmacyId) {
        throw createHttpError(404, "DOCUMENT_NOT_FOUND", "Document not found");
    }

    const updates = {
        status,
        rejectionReason: sanitizeString(req.body.rejectionReason, "rejectionReason"),
        verifiedAt: status === "VERIFIED" ? new Date() : null
    };
    const document = await updatePharmacyDocument(req.params.documentId, updates);

    res.status(200).json({
        document
    });
}

async function verifyAdminPharmacyDocument(req, res) {
    return updateAdminPharmacyDocument(req, res, "VERIFIED");
}

async function rejectAdminPharmacyDocument(req, res) {
    return updateAdminPharmacyDocument(req, res, "REJECTED");
}

async function listAdminPharmacyOrders(req, res) {
    const orders = await listOrdersByPharmacy(
        req.params.pharmacyId,
        parsePagination(req.query)
    );

    res.status(200).json({
        orders
    });
}

async function listAdminPharmacyPenalties(req, res) {
    const penalties = await listPenaltiesByPharmacy(
        req.params.pharmacyId,
        parsePagination(req.query)
    );

    res.status(200).json({
        penalties
    });
}

async function listAdminPharmacyAuditLogs(req, res) {
    const auditLogs = await listAuditLogsForEntity(
        "PHARMACY",
        req.params.pharmacyId,
        parsePagination(req.query)
    );

    res.status(200).json({
        auditLogs
    });
}

module.exports = {
    approveAdminPharmacy,
    blacklistAdminPharmacy,
    createMyPharmacy,
    getAdminPharmacy,
    getVendorProfile,
    getMyPharmacy,
    listAdminPharmacies,
    listAdminPharmacyAuditLogs,
    listAdminPharmacyDocuments,
    listAdminPharmacyOrders,
    listAdminPharmacyPenalties,
    listMyPharmacyDocuments,
    rejectAdminPharmacy,
    rejectAdminPharmacyDocument,
    submitMyPharmacyForReview,
    suspendAdminPharmacy,
    updateAdminPharmacyServiceRadius,
    updateMyPharmacy,
    updateVendorProfile,
    uploadMyPharmacyDocument,
    verifyAdminPharmacyDocument
};
