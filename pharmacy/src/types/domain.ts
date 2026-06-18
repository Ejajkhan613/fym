export type AuthPurpose = 'login' | 'register';
export type UserRole = 'customer' | 'pharmacy' | 'rider' | 'admin';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'blocked' | 'deleted';

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessTokenExpiresIn: string;
  refreshTokenExpiresAt: string;
};

export type AuthSession = {
  user: AuthUser;
  tokens: AuthTokens;
};

export type OtpChallenge = {
  challengeId: string;
  phone: string;
  purpose: AuthPurpose;
  expiresAt: string;
  delivery: {
    channel: 'sms';
    status: 'queued';
  };
  devOtp?: string;
};

export type PharmacyStatus =
  | 'DRAFT'
  | 'DOCUMENT_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'BLACKLISTED';

export type PharmacyDocumentType =
  | 'DRUG_LICENSE'
  | 'GST_CERTIFICATE'
  | 'SHOP_REGISTRATION'
  | 'OWNER_KYC'
  | 'PHARMACIST_REGISTRATION_CERTIFICATE'
  | 'BANK_ACCOUNT'
  | 'STORE_ADDRESS_PROOF'
  | 'INVOICE_FORMAT'
  | 'RETURN_POLICY_AGREEMENT'
  | 'PLATFORM_SERVICE_AGREEMENT'
  | 'PENALTY_AGREEMENT'
  | 'PRESCRIPTION_COMPLIANCE_DECLARATION';

export type PharmacyDocumentStatus = 'UPLOADED' | 'APPROVED' | 'REJECTED';
export type PharmacistStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'INACTIVE';

export type Pharmacy = {
  id: string;
  ownerUserId: string;
  name: string;
  legalName?: string | null;
  licenseNumber: string;
  licenseValidFrom?: string | null;
  licenseValidTo?: string | null;
  gstNumber?: string | null;
  shopRegistrationNumber?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  status: PharmacyStatus;
  trustScore: number;
  serviceRadiusKm: number;
  openingTime?: string | null;
  closingTime?: string | null;
  is24x7: boolean;
  hasOwnDelivery: boolean;
  supportsPlatformDelivery: boolean;
  coldChainCapable: boolean;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PharmacyDocument = {
  id: string;
  pharmacyId: string;
  documentType: PharmacyDocumentType;
  fileUrl: string;
  documentNumber?: string | null;
  expiresAt?: string | null;
  status: PharmacyDocumentStatus;
  rejectionReason?: string | null;
  metadata: Record<string, unknown>;
  uploadedAt?: string;
  reviewedAt?: string | null;
};

export type Pharmacist = {
  id: string;
  pharmacyId: string;
  name: string;
  phone: string;
  registrationNumber: string;
  certificateDocumentId?: string | null;
  status: PharmacistStatus;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
};

export type PharmacyStatusHistory = {
  id: string;
  pharmacyId: string;
  fromStatus?: PharmacyStatus | null;
  toStatus: PharmacyStatus;
  reason?: string | null;
  actorUserId?: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
};

export type PharmacyProfile = {
  pharmacy: Pharmacy;
  documents: PharmacyDocument[];
  pharmacists: Pharmacist[];
  statusHistory: PharmacyStatusHistory[];
};

export type CreatePharmacyDraftPayload = {
  ownerUserId: string;
  name: string;
  legalName?: string;
  licenseNumber: string;
  licenseValidFrom?: string;
  licenseValidTo?: string;
  gstNumber?: string;
  shopRegistrationNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
  openingTime?: string;
  closingTime?: string;
  is24x7?: boolean;
  hasOwnDelivery?: boolean;
  supportsPlatformDelivery?: boolean;
  coldChainCapable?: boolean;
};

export type UploadDocumentPayload = {
  documentType: PharmacyDocumentType;
  fileUrl: string;
  documentNumber?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
};

export type AddPharmacistPayload = {
  name: string;
  phone: string;
  registrationNumber: string;
  certificateDocumentId?: string;
};

export type VendorOfferStatus =
  | 'OFFER_SENT'
  | 'OFFER_VIEWED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'OFFER_EXPIRED'
  | 'OFFER_CLOSED_ORDER_ASSIGNED_ELSEWHERE';

export type OrderStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PRESCRIPTION_UPLOADED'
  | 'PRESCRIPTION_UNDER_REVIEW'
  | 'PRESCRIPTION_REJECTED'
  | 'VENDOR_MATCHING'
  | 'VENDOR_OFFERED'
  | 'VENDOR_ACCEPTED'
  | 'PHARMACIST_APPROVED'
  | 'PACKING'
  | 'PACKED'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED_BY_USER'
  | 'CANCELLED_BY_VENDOR'
  | 'CANCELLED_BY_ADMIN'
  | 'FAILED_DELIVERY'
  | 'REFUNDED'
  | 'DISPUTED';

export type Order = {
  id: string;
  customerId: string;
  pharmacyId?: string | null;
  status: OrderStatus;
  orderType: 'OTC' | 'PRESCRIPTION' | 'MIXED';
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  totalAmount: number;
  deliveryAddress: Record<string, unknown>;
  prescriptionId?: string | null;
  acceptedAt?: string | null;
  packedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  medicineId?: string | null;
  requestedName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  requiresPrescription: boolean;
  status: string;
};

export type VendorOffer = {
  id: string;
  orderId: string;
  pharmacyId: string;
  status: VendorOfferStatus;
  sentAt: string;
  viewedAt?: string | null;
  respondedAt?: string | null;
  expiresAt: string;
  rejectionReason?: string | null;
  stockConfirmed: boolean;
  expiryConfirmed: boolean;
  pharmacistVerified: boolean;
  packingTimeMinutes?: number | null;
};

export type PharmacyOrderDetails = {
  order: Order;
  items: OrderItem[];
  offers: VendorOffer[];
  timeline: Array<{
    id: string;
    orderId: string;
    fromStatus?: OrderStatus | null;
    toStatus: OrderStatus;
    reason?: string | null;
    createdAt?: string;
  }>;
};

export type Penalty = {
  id: string;
  pharmacyId: string;
  orderId?: string | null;
  penaltyType: string;
  level: number;
  baseAmount: number;
  customerInconvenienceFee: number;
  deliveryLossFee: number;
  platformSlaFee: number;
  repeatMultiplier: number;
  amount: number;
  reason: string;
  status: 'applied' | 'waived' | 'paid' | 'disputed' | 'cancelled';
  createdAt?: string;
};

export type InventoryItem = {
  id: string;
  pharmacyId?: string;
  medicineId?: string | null;
  medicineName: string;
  genericName: string;
  strength: string;
  quantity: number;
  batchNumber: string;
  expiryDate?: string | null;
  price: number;
  coldChainRequired: boolean;
  fastMoving: boolean;
  source?: 'manual' | 'bulk_upload' | 'pos_sync' | 'system_adjustment';
  stockConfidenceScore?: number;
  lastUpdatedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateInventoryItemPayload = {
  medicineId?: string;
  medicineName: string;
  genericName?: string;
  strength?: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
  price: number;
  coldChainRequired?: boolean;
  fastMoving?: boolean;
  source?: InventoryItem['source'];
  stockConfidenceScore?: number;
  metadata?: Record<string, unknown>;
};

export type StockMismatchReason =
  | 'shelf_count_mismatch'
  | 'expired_batch_found'
  | 'damaged_stock'
  | 'billing_sync_issue'
  | 'order_acceptance_mismatch'
  | 'other';

export type StockMismatchReport = {
  id: string;
  pharmacyId: string;
  inventoryId?: string | null;
  orderId?: string | null;
  medicineName: string;
  expectedQuantity?: number | null;
  actualQuantity?: number | null;
  reason: StockMismatchReason;
  notes?: string | null;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  reportedByUserId?: string | null;
  createdAt?: string;
};
