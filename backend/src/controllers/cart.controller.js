const {
    addCartItem,
    clearCart,
    deleteCartItem,
    listCartItems,
    updateCartItem
} = require("../models/cart.model");
const { findMedicineById } = require("../models/medicine.model");
const {
    createHttpError,
    sanitizeInteger,
    sanitizeString
} = require("./controller-utils");

async function getCart(req, res) {
    const items = await listCartItems(req.user.id);

    res.status(200).json({ items });
}

async function addItem(req, res) {
    const medicineId = sanitizeString(req.body.medicineId, "medicineId");
    const quantity = sanitizeInteger(req.body.quantity, "quantity", {
        min: 1,
        defaultValue: 1
    });
    let requestedName = sanitizeString(req.body.requestedName, "requestedName");

    if (medicineId) {
        const medicine = await findMedicineById(medicineId);

        if (!medicine) {
            throw createHttpError(404, "MEDICINE_NOT_FOUND", "Medicine not found");
        }

        requestedName = requestedName || medicine.brand_name;
    }

    if (!requestedName) {
        throw createHttpError(
            400,
            "REQUESTED_NAME_REQUIRED",
            "requestedName is required when medicineId is not provided"
        );
    }

    const item = await addCartItem({
        userId: req.user.id,
        medicineId,
        requestedName,
        quantity
    });

    res.status(201).json({ item });
}

async function updateItem(req, res) {
    const item = await updateCartItem(req.params.itemId, req.user.id, {
        quantity: sanitizeInteger(req.body.quantity, "quantity", { min: 1 }),
        requestedName: sanitizeString(req.body.requestedName, "requestedName")
    });

    if (!item) {
        throw createHttpError(404, "CART_ITEM_NOT_FOUND", "Cart item not found");
    }

    res.status(200).json({ item });
}

async function removeItem(req, res) {
    const item = await deleteCartItem(req.params.itemId, req.user.id);

    if (!item) {
        throw createHttpError(404, "CART_ITEM_NOT_FOUND", "Cart item not found");
    }

    res.status(200).json({ deleted: true, item });
}

async function clear(req, res) {
    const items = await clearCart(req.user.id);

    res.status(200).json({ deleted: items.length, items });
}

module.exports = {
    addItem,
    clear,
    getCart,
    removeItem,
    updateItem
};
