const pharmacyStatuses = [
  "DRAFT",
  "DOCUMENT_SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "BLACKLISTED",
];

const editablePharmacyStatuses = ["DRAFT", "DOCUMENT_SUBMITTED", "REJECTED"];

const documentTypes = [
  "DRUG_LICENSE",
  "GST_CERTIFICATE",
  "SHOP_REGISTRATION",
  "OWNER_KYC",
  "PHARMACIST_REGISTRATION_CERTIFICATE",
  "BANK_ACCOUNT",
  "STORE_ADDRESS_PROOF",
  "INVOICE_FORMAT",
  "RETURN_POLICY_AGREEMENT",
  "PLATFORM_SERVICE_AGREEMENT",
  "PENALTY_AGREEMENT",
  "PRESCRIPTION_COMPLIANCE_DECLARATION",
];

const requiredDocumentTypes = [...documentTypes];

const documentStatuses = ["UPLOADED", "APPROVED", "REJECTED"];

const pharmacistStatuses = [
  "PENDING_VERIFICATION",
  "VERIFIED",
  "REJECTED",
  "INACTIVE",
];

module.exports = {
  pharmacyStatuses,
  editablePharmacyStatuses,
  documentTypes,
  requiredDocumentTypes,
  documentStatuses,
  pharmacistStatuses,
};
