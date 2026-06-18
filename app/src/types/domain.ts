export type AuthPurpose = 'login' | 'register';

export type UserRole = 'customer' | 'pharmacy' | 'rider' | 'admin';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'blocked' | 'deleted';

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
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

export type Medicine = {
  id: string;
  brandName: string;
  genericName?: string;
  saltComposition?: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  packSize?: string;
  mrp?: number;
  scheduleCategory?: string;
  requiresPrescription?: boolean;
  isRestricted?: boolean;
  coldChainRequired?: boolean;
  substitutionAllowed?: boolean;
};

export type CartEntry = {
  id: string;
  medicineId?: string;
  name: string;
  pack: string;
  price: number;
  quantity: number;
  requiresPrescription: boolean;
};

export type LocalOrder = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  itemsCount: number;
  itemsSummary?: string;
  deliveryLabel?: string;
  deliveryAddress?: string;
  paymentStatus?: string;
  orderType?: string;
};

export type CustomerGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type CustomerProfile = {
  id: string;
  userId: string;
  dateOfBirth?: string | null;
  gender?: CustomerGender | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpsertCustomerProfilePayload = {
  dateOfBirth?: string;
  gender?: CustomerGender;
};

export type CustomerFamilyProfile = {
  id: string;
  userId: string;
  fullName: string;
  relationship: string;
  dateOfBirth?: string | null;
  gender?: CustomerGender | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpsertCustomerFamilyProfilePayload = {
  fullName: string;
  relationship: string;
  dateOfBirth?: string;
  gender?: CustomerGender;
};

export type CustomerAddress = {
  id: string;
  userId: string;
  label?: string | null;
  recipientName?: string | null;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCustomerAddressPayload = {
  label?: string;
  recipientName?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateCustomerAddressPayload = Partial<CreateCustomerAddressPayload>;

export type CustomerPrivacySettings = {
  userId: string;
  pushNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  orderUpdatesEnabled: boolean;
  prescriptionUpdatesEnabled: boolean;
  supportUpdatesEnabled: boolean;
  promotionalOffersEnabled: boolean;
  dataSharingConsent: boolean;
  gpsForAddressesEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdatePrivacySettingsPayload = Partial<
  Omit<CustomerPrivacySettings, 'userId' | 'createdAt' | 'updatedAt'>
>;

export type PrescriptionRecord = {
  id: string;
  customerId: string;
  orderId?: string | null;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  ocrText?: string | null;
  extractedItems: Array<Record<string, unknown>>;
  verificationStatus: string;
  confidenceScore?: number | null;
  rejectionReason?: string | null;
  fraudFlags: string[];
  uploadedAt?: string;
  reviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentTransaction = {
  id: string;
  orderId: string;
  customerId: string;
  provider: string;
  providerReference?: string | null;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type RefundRecord = {
  id: string;
  paymentTransactionId: string;
  orderId: string;
  amount: number;
  status: string;
  reason?: string | null;
  providerReference?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerPaymentSummary = {
  payments: PaymentTransaction[];
  refunds: RefundRecord[];
};

export type SupportTicket = {
  id: string;
  customerId?: string | null;
  orderId?: string | null;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';
  subject: string;
  description: string;
  resolution?: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string | null;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  senderUserId?: string | null;
  senderType: string;
  message: string;
  attachmentUrls: string[];
  metadata: Record<string, unknown>;
  createdAt?: string;
};

export type SupportTicketDetails = {
  ticket: SupportTicket;
  messages: SupportMessage[];
};

export type CreateSupportTicketPayload = {
  customerId: string;
  orderId?: string;
  category: string;
  priority?: SupportTicket['priority'];
  subject: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export type CustomerNotification = {
  id: string;
  recipientUserId?: string | null;
  channel: 'push' | 'sms' | 'email' | 'websocket';
  templateKey: string;
  title?: string | null;
  body: string;
  payload: Record<string, unknown>;
  status: 'QUEUED' | 'SENT' | 'FAILED' | 'CANCELLED';
  scheduledAt?: string | null;
  sentAt?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
