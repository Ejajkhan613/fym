const {
    createMedicine,
    findMedicineById,
    listMedicines,
    searchMedicines,
    updateMedicine
} = require("../models/medicine.model");
const {
    createHttpError,
    parsePagination,
    sanitizeBoolean,
    sanitizeNumber,
    sanitizeString,
    stripUndefined
} = require("./controller-utils");

function medicinePayload(body, { partial = false } = {}) {
    return stripUndefined({
        brandName: sanitizeString(body.brandName, "brandName", { required: !partial }),
        genericName: sanitizeString(body.genericName, "genericName"),
        saltComposition: sanitizeString(body.saltComposition, "saltComposition"),
        strength: sanitizeString(body.strength, "strength"),
        form: sanitizeString(body.form, "form"),
        manufacturer: sanitizeString(body.manufacturer, "manufacturer"),
        packSize: sanitizeString(body.packSize, "packSize"),
        mrp: sanitizeNumber(body.mrp, "mrp", { min: 0 }),
        scheduleCategory: sanitizeString(body.scheduleCategory, "scheduleCategory"),
        requiresPrescription: sanitizeBoolean(
            body.requiresPrescription,
            "requiresPrescription"
        ),
        isRestricted: sanitizeBoolean(body.isRestricted, "isRestricted"),
        storageType: sanitizeString(body.storageType, "storageType"),
        coldChainRequired: sanitizeBoolean(body.coldChainRequired, "coldChainRequired"),
        substitutionGroupId: sanitizeString(
            body.substitutionGroupId,
            "substitutionGroupId"
        ),
        therapeuticClass: sanitizeString(body.therapeuticClass, "therapeuticClass"),
        sideEffectWarning: sanitizeString(body.sideEffectWarning, "sideEffectWarning"),
        interactionWarning: sanitizeString(
            body.interactionWarning,
            "interactionWarning"
        )
    });
}

async function searchPublicMedicines(req, res) {
    const q = sanitizeString(req.query.q, "q", { required: true });
    const medicines = await searchMedicines(q, parsePagination(req.query));

    res.status(200).json({ medicines });
}

async function getPublicMedicine(req, res) {
    const medicine = await findMedicineById(req.params.medicineId);

    if (!medicine) {
        throw createHttpError(404, "MEDICINE_NOT_FOUND", "Medicine not found");
    }

    res.status(200).json({ medicine });
}

async function listAdminMedicines(req, res) {
    const medicines = req.query.q
        ? await searchMedicines(req.query.q, parsePagination(req.query))
        : await listMedicines(parsePagination(req.query));

    res.status(200).json({ medicines });
}

async function createAdminMedicine(req, res) {
    const medicine = await createMedicine(medicinePayload(req.body));

    res.status(201).json({ medicine });
}

async function getAdminMedicine(req, res) {
    return getPublicMedicine(req, res);
}

async function updateAdminMedicine(req, res) {
    const medicine = await updateMedicine(
        req.params.medicineId,
        medicinePayload(req.body, { partial: true })
    );

    if (!medicine) {
        throw createHttpError(404, "MEDICINE_NOT_FOUND", "Medicine not found");
    }

    res.status(200).json({ medicine });
}

async function restrictAdminMedicine(req, res) {
    const medicine = await updateMedicine(req.params.medicineId, {
        isRestricted: true,
        scheduleCategory: sanitizeString(req.body.scheduleCategory, "scheduleCategory", {
            defaultValue: "RESTRICTED"
        })
    });

    if (!medicine) {
        throw createHttpError(404, "MEDICINE_NOT_FOUND", "Medicine not found");
    }

    res.status(200).json({ medicine });
}

async function updateAdminPrescriptionPolicy(req, res) {
    const medicine = await updateMedicine(req.params.medicineId, {
        requiresPrescription: sanitizeBoolean(
            req.body.requiresPrescription,
            "requiresPrescription",
            { defaultValue: true }
        ),
        scheduleCategory: sanitizeString(req.body.scheduleCategory, "scheduleCategory")
    });

    if (!medicine) {
        throw createHttpError(404, "MEDICINE_NOT_FOUND", "Medicine not found");
    }

    res.status(200).json({ medicine });
}

async function updateAdminSubstitutionRules(req, res) {
    const medicine = await updateMedicine(req.params.medicineId, {
        substitutionGroupId: sanitizeString(
            req.body.substitutionGroupId,
            "substitutionGroupId",
            { required: true }
        )
    });

    if (!medicine) {
        throw createHttpError(404, "MEDICINE_NOT_FOUND", "Medicine not found");
    }

    res.status(200).json({ medicine });
}

async function importAdminMedicines(req, res) {
    if (!Array.isArray(req.body.medicines) || req.body.medicines.length === 0) {
        throw createHttpError(
            400,
            "MEDICINES_REQUIRED",
            "medicines must be a non-empty array"
        );
    }

    if (req.body.medicines.length > 500) {
        throw createHttpError(400, "TOO_MANY_MEDICINES", "Maximum 500 medicines");
    }

    const medicines = [];

    for (const item of req.body.medicines) {
        medicines.push(await createMedicine(medicinePayload(item)));
    }

    res.status(201).json({ medicines });
}

module.exports = {
    createAdminMedicine,
    getAdminMedicine,
    getPublicMedicine,
    importAdminMedicines,
    listAdminMedicines,
    restrictAdminMedicine,
    searchPublicMedicines,
    updateAdminMedicine,
    updateAdminPrescriptionPolicy,
    updateAdminSubstitutionRules
};
