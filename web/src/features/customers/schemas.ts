import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();

export const customerProfileFormSchema = z.object({
  dateOfBirth: optionalText(20),
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say"])
    .optional(),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: optionalText(20),
  abhaIdOptional: optionalText(80),
});

export const customerAddressFormSchema = z.object({
  label: optionalText(80),
  recipientName: optionalText(120),
  phone: optionalText(20),
  addressLine1: z.string().trim().min(1).max(500),
  addressLine2: optionalText(500),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/),
  isDefault: z.boolean().optional(),
});

export type CustomerProfileFormValues = z.infer<
  typeof customerProfileFormSchema
>;
export type CustomerAddressFormValues = z.infer<
  typeof customerAddressFormSchema
>;
