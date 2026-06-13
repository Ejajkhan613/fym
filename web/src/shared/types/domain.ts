export type UserRole =
  | "customer"
  | "pharmacy_owner"
  | "pharmacist"
  | "delivery_partner"
  | "admin"
  | "support_agent";

export type UserStatus =
  | "pending_verification"
  | "active"
  | "suspended"
  | "blocked"
  | "deleted";

export type PharmacyOnboardingStatus =
  | "DRAFT"
  | "DOCUMENT_SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "BLACKLISTED";

export type MedicineScheduleCategory =
  | "OTC"
  | "SCHEDULE_H"
  | "SCHEDULE_H1"
  | "SCHEDULE_X"
  | "RESTRICTED"
  | "UNKNOWN";
