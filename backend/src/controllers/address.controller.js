const {
    createAddress,
    deleteAddressByIdForUser,
    findAddressByIdForUser,
    listAddressesByUser,
    setDefaultAddress,
    updateAddress
} = require("../models/address.model");

function createHttpError(statusCode, code, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

function sanitizeString(value, fieldName, required = false) {
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

function sanitizeCoordinate(value, fieldName, min, max) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
        throw createHttpError(400, "INVALID_COORDINATE", `${fieldName} is invalid`);
    }

    return parsed;
}

function addressPayload(body, { partial = false } = {}) {
    return {
        label: sanitizeString(body.label, "label"),
        addressLine: sanitizeString(body.addressLine, "addressLine", !partial),
        city: sanitizeString(body.city, "city", !partial),
        state: sanitizeString(body.state, "state", !partial),
        pincode: sanitizeString(body.pincode, "pincode", !partial),
        latitude: sanitizeCoordinate(body.latitude, "latitude", -90, 90),
        longitude: sanitizeCoordinate(body.longitude, "longitude", -180, 180)
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

async function listMyAddresses(req, res) {
    const addresses = await listAddressesByUser(req.user.id);

    res.status(200).json({
        addresses
    });
}

async function createMyAddress(req, res) {
    const payload = stripUndefined(addressPayload(req.body));
    const shouldSetDefault = req.body.isDefault === true;

    const address = await createAddress({
        ...payload,
        userId: req.user.id,
        isDefault: shouldSetDefault ? false : req.body.isDefault === true
    });

    if (!shouldSetDefault) {
        res.status(201).json({ address });
        return;
    }

    const defaultAddress = await setDefaultAddress(req.user.id, address.id);

    res.status(201).json({
        address: defaultAddress
    });
}

async function getMyAddress(req, res) {
    const address = await findAddressByIdForUser(
        req.params.addressId,
        req.user.id
    );

    if (!address) {
        throw createHttpError(404, "ADDRESS_NOT_FOUND", "Address not found");
    }

    res.status(200).json({
        address
    });
}

async function updateMyAddress(req, res) {
    const existingAddress = await findAddressByIdForUser(
        req.params.addressId,
        req.user.id
    );

    if (!existingAddress) {
        throw createHttpError(404, "ADDRESS_NOT_FOUND", "Address not found");
    }

    const payload = stripUndefined(addressPayload(req.body, { partial: true }));
    let address = existingAddress;

    if (Object.keys(payload).length > 0) {
        address = await updateAddress(existingAddress.id, payload);
    }

    if (req.body.isDefault === true) {
        address = await setDefaultAddress(req.user.id, existingAddress.id);
    }

    res.status(200).json({
        address
    });
}

async function deleteMyAddress(req, res) {
    const address = await deleteAddressByIdForUser(
        req.params.addressId,
        req.user.id
    );

    if (!address) {
        throw createHttpError(404, "ADDRESS_NOT_FOUND", "Address not found");
    }

    res.status(200).json({
        deleted: true,
        address
    });
}

async function setMyDefaultAddress(req, res) {
    const address = await setDefaultAddress(req.user.id, req.params.addressId);

    if (!address) {
        throw createHttpError(404, "ADDRESS_NOT_FOUND", "Address not found");
    }

    res.status(200).json({
        address
    });
}

module.exports = {
    createMyAddress,
    deleteMyAddress,
    getMyAddress,
    listMyAddresses,
    setMyDefaultAddress,
    updateMyAddress
};
