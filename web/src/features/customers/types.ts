export type CustomerGender =
  | "male"
  | "female"
  | "other"
  | "prefer_not_to_say";

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
