const {
    listNotificationsByUser,
    markNotificationRead,
    registerNotificationDevice,
    unregisterNotificationDevice
} = require("../models/notification.model");
const {
    createHttpError,
    parsePagination,
    sanitizeBoolean,
    sanitizeString
} = require("./controller-utils");

async function listMyNotifications(req, res) {
    const notifications = await listNotificationsByUser(req.user.id, {
        unreadOnly: sanitizeBoolean(req.query.unreadOnly, "unreadOnly", {
            defaultValue: false
        }),
        ...parsePagination(req.query)
    });

    res.status(200).json({ notifications });
}

async function markMyNotificationRead(req, res) {
    const notification = await markNotificationRead(
        req.params.notificationId,
        req.user.id
    );

    if (!notification) {
        throw createHttpError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");
    }

    res.status(200).json({ notification });
}

async function registerMyDevice(req, res) {
    const device = await registerNotificationDevice({
        userId: req.user.id,
        platform: sanitizeString(req.body.platform, "platform", { required: true }),
        deviceToken: sanitizeString(req.body.deviceToken, "deviceToken", {
            required: true
        })
    });

    res.status(201).json({ device });
}

async function unregisterMyDevice(req, res) {
    const device = await unregisterNotificationDevice(
        req.params.deviceId,
        req.user.id
    );

    if (!device) {
        throw createHttpError(404, "DEVICE_NOT_FOUND", "Device not found");
    }

    res.status(200).json({ device });
}

module.exports = {
    listMyNotifications,
    markMyNotificationRead,
    registerMyDevice,
    unregisterMyDevice
};
