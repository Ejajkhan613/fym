import { frontendFeatures } from "@/features/feature-definitions";

export const customersFeature = frontendFeatures.customers;

export {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerProfile,
  listCustomerAddresses,
  setDefaultCustomerAddress,
  updateCustomerAddress,
  upsertCustomerProfile,
} from "@/features/customers/api";
export {
  customerAddressFormSchema,
  customerProfileFormSchema,
} from "@/features/customers/schemas";
export type {
  CustomerAddressFormValues,
  CustomerProfileFormValues,
} from "@/features/customers/schemas";
export type {
  CreateCustomerAddressPayload,
  CustomerAddress,
  CustomerGender,
  CustomerProfile,
  UpdateCustomerAddressPayload,
  UpsertCustomerProfilePayload,
} from "@/features/customers/types";
