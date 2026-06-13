const userRoles = [
  "customer",
  "pharmacy_owner",
  "pharmacist",
  "delivery_partner",
  "admin",
  "support_agent",
];

const userStatuses = [
  "pending_verification",
  "active",
  "suspended",
  "blocked",
  "deleted",
];

const pharmacyStatuses = [
  "DRAFT",
  "DOCUMENT_SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "BLACKLISTED",
];

const adminActions = {
  USER_STATUS_UPDATED: "USER_STATUS_UPDATED",
  PHARMACY_REVIEW_STARTED: "PHARMACY_REVIEW_STARTED",
  PHARMACY_APPROVED: "PHARMACY_APPROVED",
  PHARMACY_REJECTED: "PHARMACY_REJECTED",
  PHARMACY_SUSPENDED: "PHARMACY_SUSPENDED",
  PHARMACY_BLACKLISTED: "PHARMACY_BLACKLISTED",
};

module.exports = {
  userRoles,
  userStatuses,
  pharmacyStatuses,
  adminActions,
};
