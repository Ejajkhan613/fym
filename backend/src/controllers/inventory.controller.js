const { findMedicineById } = require("../models/medicine.model");
const {
    deleteInventoryItemById,
    findInventoryItemById,
    listInventoryByPharmacy,
    updateInventoryItem,
    upsertInventoryItem
} = require("../models/pharmacy-inventory.model");
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

    return trimmed || "";
}

function sanitizeNumber(value, fieldName, { required = false, min = null, max = null } = {}) {
    if (value === undefined || value === null || value === "") {
        if (required) {
            throw createHttpError(400, "REQUIRED_FIELD", `${fieldName} is required`);
        }

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

function sanitizeDate(value, fieldName) {
    const date = sanitizeString(value, fieldName);

    if (date === undefined || date === "") {
        return undefined;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
        throw createHttpError(400, "INVALID_DATE", `${fieldName} must be YYYY-MM-DD`);
    }

    return date;
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
        limit: sanitizeInteger(query.limit, "limit", { min: 1, max: 100 }) || 100,
        offset: sanitizeInteger(query.offset, "offset", { min: 0 }) || 0
    };
}

async function requireMyPharmacy(userId) {
    const pharmacy = await findPrimaryPharmacyByOwner(userId);

    if (!pharmacy) {
        throw createHttpError(404, "PHARMACY_NOT_FOUND", "Pharmacy not found");
    }

    return pharmacy;
}

async function requireMyInventoryItem(userId, inventoryItemId) {
    const pharmacy = await requireMyPharmacy(userId);
    const inventoryItem = await findInventoryItemById(inventoryItemId);

    if (!inventoryItem || inventoryItem.pharmacy_id !== pharmacy.id) {
        throw createHttpError(
            404,
            "INVENTORY_ITEM_NOT_FOUND",
            "Inventory item not found"
        );
    }

    return {
        pharmacy,
        inventoryItem
    };
}

async function assertMedicineExists(medicineId) {
    const medicine = await findMedicineById(medicineId);

    if (!medicine) {
        throw createHttpError(404, "MEDICINE_NOT_FOUND", "Medicine not found");
    }
}

function inventoryPayload(body, { partial = false } = {}) {
    return stripUndefined({
        medicineId: sanitizeString(body.medicineId, "medicineId", {
            required: !partial
        }),
        quantity: sanitizeInteger(body.quantity, "quantity", {
            required: !partial,
            min: 0
        }),
        batchNumber: sanitizeString(body.batchNumber, "batchNumber"),
        expiryDate: sanitizeDate(body.expiryDate, "expiryDate"),
        price: sanitizeNumber(body.price, "price", { min: 0 }),
        stockConfidenceScore: sanitizeNumber(
            body.stockConfidenceScore,
            "stockConfidenceScore",
            { min: 0, max: 100 }
        )
    });
}

async function listMyInventory(req, res) {
    const pharmacy = await requireMyPharmacy(req.user.id);
    const inventory = await listInventoryByPharmacy(
        pharmacy.id,
        parsePagination(req.query)
    );

    res.status(200).json({
        inventory
    });
}

async function createMyInventoryItem(req, res) {
    const pharmacy = await requireMyPharmacy(req.user.id);
    const payload = inventoryPayload(req.body);

    await assertMedicineExists(payload.medicineId);

    const inventoryItem = await upsertInventoryItem({
        ...payload,
        pharmacyId: pharmacy.id
    });

    res.status(201).json({
        inventoryItem
    });
}

async function updateMyInventoryItem(req, res) {
    const { inventoryItem } = await requireMyInventoryItem(
        req.user.id,
        req.params.inventoryItemId
    );
    const payload = inventoryPayload(req.body, { partial: true });

    if (payload.medicineId && payload.medicineId !== inventoryItem.medicine_id) {
        throw createHttpError(
            400,
            "MEDICINE_CHANGE_NOT_ALLOWED",
            "Create a new inventory item to change medicine"
        );
    }

    delete payload.medicineId;

    const updatedInventoryItem = await updateInventoryItem(inventoryItem.id, payload);

    res.status(200).json({
        inventoryItem: updatedInventoryItem
    });
}

async function deleteMyInventoryItem(req, res) {
    const { inventoryItem } = await requireMyInventoryItem(
        req.user.id,
        req.params.inventoryItemId
    );
    const deletedInventoryItem = await deleteInventoryItemById(inventoryItem.id);

    res.status(200).json({
        deleted: true,
        inventoryItem: deletedInventoryItem
    });
}

async function bulkUploadMyInventory(req, res) {
    const pharmacy = await requireMyPharmacy(req.user.id);
    const items = req.body.items;

    if (!Array.isArray(items) || items.length === 0) {
        throw createHttpError(400, "ITEMS_REQUIRED", "items must be a non-empty array");
    }

    if (items.length > 500) {
        throw createHttpError(400, "TOO_MANY_ITEMS", "Maximum 500 items per upload");
    }

    const inventory = [];

    for (const item of items) {
        const payload = inventoryPayload(item);
        await assertMedicineExists(payload.medicineId);
        inventory.push(
            await upsertInventoryItem({
                ...payload,
                pharmacyId: pharmacy.id
            })
        );
    }

    res.status(200).json({
        inventory
    });
}

module.exports = {
    bulkUploadMyInventory,
    createMyInventoryItem,
    deleteMyInventoryItem,
    listMyInventory,
    updateMyInventoryItem
};
