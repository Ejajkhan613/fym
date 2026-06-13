import { z } from "zod";
import { mobileNumberSchema } from "@/features/auth/schemas";

export const updateUserFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: mobileNumberSchema,
});

export type UpdateUserFormValues = z.infer<typeof updateUserFormSchema>;
