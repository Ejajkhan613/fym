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
};

export type CustomerGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type CustomerProfile = {
  id: string;
  userId: string;
  dateOfBirth?: string | null;
  gender?: CustomerGender | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  abhaIdOptional?: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type UpsertCustomerProfilePayload = {
  dateOfBirth?: string;
  gender?: CustomerGender;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  abhaIdOptional?: string;
  metadata?: Record<string, unknown>;
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
