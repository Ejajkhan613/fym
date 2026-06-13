import { frontendFeatures } from "@/features/feature-definitions";

export const usersFeature = frontendFeatures.users;

export { getUser, updateUser } from "@/features/users/api";
export { updateUserFormSchema } from "@/features/users/schemas";
export type {
  UpdateUserFormValues,
} from "@/features/users/schemas";
export type { UpdateUserPayload, User } from "@/features/users/types";
