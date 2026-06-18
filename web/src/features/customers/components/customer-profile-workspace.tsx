"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  CircleAlert,
  CreditCard,
  FileText,
  Home,
  IdCard,
  LogOut,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  Star,
  Trash2,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { logout } from "@/features/auth/api";
import { useAuthSession } from "@/features/auth/session-store";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerProfile,
  listCustomerAddresses,
  setDefaultCustomerAddress,
  updateCustomerAddress,
  upsertCustomerProfile,
} from "@/features/customers/api";
import {
  customerAddressFormSchema,
  customerProfileFormSchema,
  type CustomerAddressFormValues,
  type CustomerProfileFormValues,
} from "@/features/customers/schemas";
import type { CustomerAddress } from "@/features/customers/types";
import { getUser, updateUser } from "@/features/users/api";
import {
  updateUserFormSchema,
  type UpdateUserFormValues,
} from "@/features/users/schemas";
import { ApiError } from "@/shared/api/http-client";
import { StatusPill } from "@/shared/ui/status-pill";
import { cn } from "@/shared/utils/cn";

const accountNav = [
  { label: "Overview", icon: Star },
  { label: "Profile", icon: UserRound },
  { label: "Profile details", icon: IdCard },
  { label: "Addresses", icon: Home },
  { label: "Prescriptions", icon: FileText },
  { label: "Payments", icon: CreditCard },
  { label: "Privacy", icon: ShieldCheck },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function formatDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

async function getCustomerProfileOrNull(userId: string, accessToken?: string) {
  try {
    const response = await getCustomerProfile(userId, accessToken);
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function CustomerProfileWorkspace() {
  const queryClient = useQueryClient();
  const session = useAuthSession((state) => state.session);
  const setSession = useAuthSession((state) => state.setSession);
  const clearSession = useAuthSession((state) => state.clearSession);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const userId = session?.user.id;
  const accessToken = session?.tokens.accessToken;

  const userQuery = useQuery({
    queryKey: ["users", userId],
    queryFn: async () => {
      const response = await getUser(userId as string, accessToken);
      return response.data;
    },
    enabled: Boolean(userId),
    initialData: session?.user,
  });

  const profileQuery = useQuery({
    queryKey: ["customers", userId, "profile"],
    queryFn: () => getCustomerProfileOrNull(userId as string, accessToken),
    enabled: Boolean(userId),
    retry: false,
  });

  const addressesQuery = useQuery({
    queryKey: ["customers", userId, "addresses"],
    queryFn: async () => {
      const response = await listCustomerAddresses(userId as string, accessToken);
      return response.data;
    },
    enabled: Boolean(userId),
  });

  const accountForm = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues: {
      name: session?.user.name || "",
      phone: session?.user.phone || "",
    },
  });

  const profileForm = useForm<CustomerProfileFormValues>({
    resolver: zodResolver(customerProfileFormSchema),
    defaultValues: {
      dateOfBirth: "",
      gender: undefined,
    },
  });

  const addressForm = useForm<CustomerAddressFormValues>({
    resolver: zodResolver(customerAddressFormSchema),
    defaultValues: {
      label: "Home",
      recipientName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: true,
    },
  });

  useEffect(() => {
    if (userQuery.data) {
      accountForm.reset({
        name: userQuery.data.name,
        phone: userQuery.data.phone,
      });
    }
  }, [accountForm, userQuery.data]);

  useEffect(() => {
    if (profileQuery.data) {
      profileForm.reset({
        dateOfBirth: formatDateInput(profileQuery.data.dateOfBirth),
        gender: profileQuery.data.gender || undefined,
      });
    }
  }, [profileForm, profileQuery.data]);

  const accountMutation = useMutation({
    mutationFn: (values: UpdateUserFormValues) =>
      updateUser(userId as string, values, accessToken),
    onSuccess: (response) => {
      queryClient.setQueryData(["users", userId], response.data);
      if (session) {
        setSession({
          ...session,
          user: { ...session.user, ...response.data },
        });
      }
    },
  });

  const profileMutation = useMutation({
    mutationFn: (values: CustomerProfileFormValues) =>
      upsertCustomerProfile(userId as string, values, accessToken),
    onSuccess: (response) => {
      queryClient.setQueryData(["customers", userId, "profile"], response.data);
    },
  });

  const addressMutation = useMutation({
    mutationFn: (values: CustomerAddressFormValues) => {
      if (editingAddressId) {
        return updateCustomerAddress(
          userId as string,
          editingAddressId,
          values,
          accessToken,
        );
      }

      return createCustomerAddress(userId as string, values, accessToken);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["customers", userId, "addresses"],
      });
      setEditingAddressId(null);
      addressForm.reset({
        label: "Home",
        recipientName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        pincode: "",
        isDefault: false,
      });
    },
  });

  const defaultAddressMutation = useMutation({
    mutationFn: (addressId: string) =>
      setDefaultCustomerAddress(userId as string, addressId, accessToken),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["customers", userId, "addresses"],
      }),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (addressId: string) =>
      deleteCustomerAddress(userId as string, addressId, accessToken),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["customers", userId, "addresses"],
      }),
  });

  const logoutMutation = useMutation({
    mutationFn: () =>
      session?.tokens.refreshToken
        ? logout(session.tokens.refreshToken)
        : Promise.resolve(null),
    onSettled: clearSession,
  });

  if (!session) {
    return (
      <section className="overflow-hidden rounded-2xl border border-[#dde3ea] bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4 p-6">
            <StatusPill tone="warning">Account required</StatusPill>
            <h1 className="max-w-2xl text-3xl font-bold text-[#0f172a]">
              Login to manage your prescriptions, addresses, and refills.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[#64748b]">
              Your FYM account keeps patient details, delivery preferences, and
              medicine order history in one place.
            </p>
          </div>
          <div className="flex items-center gap-2 border-t border-[#dde3ea] bg-[#f8fafc] p-6 lg:border-l lg:border-t-0">
            <Link
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-[#087f5b] px-4 text-sm font-bold text-white"
              href="/login"
            >
              Login
            </Link>
            <Link
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-[#dde3ea] bg-white px-4 text-sm font-bold text-[#0f172a]"
              href="/signup"
            >
              Sign up
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const user = userQuery.data ?? session.user;
  const addresses = addressesQuery.data ?? [];
  const defaultAddress = addresses.find((address) => address.isDefault);
  const profileComplete = Boolean(profileQuery.data);

  function startEditingAddress(address: CustomerAddress) {
    setEditingAddressId(address.id);
    addressForm.reset({
      label: address.label || "",
      recipientName: address.recipientName || "",
      phone: address.phone || "",
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-[#dde3ea] bg-white shadow-sm">
          <div className="bg-[#073b3a] p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-xl font-black">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold">{user.name}</h1>
                <p className="truncate text-sm text-white/75">{user.phone}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 p-4">
            <StatusPill tone={user.status === "active" ? "primary" : "warning"}>
              {user.status.replaceAll("_", " ")}
            </StatusPill>
            <StatusPill tone="accent">{user.role.replaceAll("_", " ")}</StatusPill>
          </div>
        </section>

        <section className="rounded-2xl border border-[#dde3ea] bg-white p-3 shadow-sm">
          {accountNav.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                className={cn(
                  "flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-bold",
                  index === 0
                    ? "bg-[#eefcf5] text-[#076448]"
                    : "text-[#334155] hover:bg-[#f8fafc]",
                )}
                key={item.label}
                type="button"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            );
          })}
        </section>

        <button
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 shadow-sm"
          onClick={() => logoutMutation.mutate()}
          type="button"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </button>
      </aside>

      <main className="space-y-5">
        <section className="rounded-2xl border border-[#dde3ea] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-[#087f5b]">My account</p>
              <h2 className="mt-1 text-3xl font-bold text-[#0f172a]">
                Account overview
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dde3ea] px-3 text-sm font-bold text-[#334155]"
                href="/customer/orders"
              >
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
                Orders
              </Link>
              <Link
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#087f5b] px-3 text-sm font-bold text-white"
                href="/customer/prescriptions"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Prescriptions
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={MapPin}
              label="Default delivery"
              value={defaultAddress ? defaultAddress.label || "Saved" : "Not set"}
              tone="primary"
            />
            <MetricCard
              icon={IdCard}
              label="Profile details"
              value={profileComplete ? "Ready" : "Pending"}
              tone={profileComplete ? "primary" : "warning"}
            />
            <MetricCard icon={FileText} label="Prescription vault" value="Secure" />
            <MetricCard icon={Truck} label="Live tracking" value="Enabled" />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <SectionCard
            eyebrow="Identity"
            icon={UserRound}
            title="Account details"
          >
            <form
              className="grid gap-4"
              onSubmit={accountForm.handleSubmit((values) =>
                accountMutation.mutate(values),
              )}
            >
              <TextField
                error={accountForm.formState.errors.name?.message}
                icon={UserRound}
                label="Full name"
                registration={accountForm.register("name")}
              />
              <TextField
                error={accountForm.formState.errors.phone?.message}
                icon={Phone}
                inputMode="tel"
                label="Mobile number"
                registration={accountForm.register("phone")}
              />
              <MutationMessage
                error={accountMutation.error}
                success={accountMutation.isSuccess}
                successText="Account details saved"
              />
              <PrimaryButton disabled={accountMutation.isPending}>
                Save account
              </PrimaryButton>
            </form>
          </SectionCard>

          <SectionCard
            eyebrow="Patient"
            icon={IdCard}
            title="Profile details"
          >
            <form
              className="grid gap-4"
              onSubmit={profileForm.handleSubmit((values) =>
                profileMutation.mutate(values),
              )}
            >
              <TextField
                error={profileForm.formState.errors.dateOfBirth?.message}
                label="Date of birth"
                registration={profileForm.register("dateOfBirth")}
                type="date"
              />
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#0f172a]">
                  Gender
                </span>
                <select
                  className="min-h-12 w-full rounded-lg border border-[#d7dee8] bg-[#f8fafc] px-3 text-sm outline-none transition focus:border-[#087f5b] focus:bg-white"
                  {...profileForm.register("gender")}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>
              <MutationMessage
                error={profileMutation.error}
                success={profileMutation.isSuccess}
                successText="Profile details saved"
              />
              <PrimaryButton disabled={profileMutation.isPending}>
                Save profile
              </PrimaryButton>
            </form>
          </SectionCard>
        </section>

        <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <SectionCard
            eyebrow="Delivery"
            icon={Home}
            title={editingAddressId ? "Edit address" : "Add address"}
          >
            <form
              className="grid gap-4"
              onSubmit={addressForm.handleSubmit((values) =>
                addressMutation.mutate(values),
              )}
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <TextField
                  error={addressForm.formState.errors.label?.message}
                  label="Label"
                  registration={addressForm.register("label")}
                />
                <TextField
                  error={addressForm.formState.errors.recipientName?.message}
                  label="Recipient"
                  registration={addressForm.register("recipientName")}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <TextField
                  error={addressForm.formState.errors.phone?.message}
                  inputMode="tel"
                  label="Phone"
                  registration={addressForm.register("phone")}
                />
                <TextField
                  error={addressForm.formState.errors.pincode?.message}
                  inputMode="numeric"
                  label="Pincode"
                  registration={addressForm.register("pincode")}
                />
              </div>
              <TextField
                error={addressForm.formState.errors.addressLine1?.message}
                label="Address line 1"
                registration={addressForm.register("addressLine1")}
              />
              <TextField
                error={addressForm.formState.errors.addressLine2?.message}
                label="Address line 2"
                registration={addressForm.register("addressLine2")}
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <TextField
                  error={addressForm.formState.errors.city?.message}
                  label="City"
                  registration={addressForm.register("city")}
                />
                <TextField
                  error={addressForm.formState.errors.state?.message}
                  label="State"
                  registration={addressForm.register("state")}
                />
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-[#dde3ea] bg-[#f8fafc] px-3 py-3">
                <input
                  className="h-4 w-4 accent-[var(--primary)]"
                  type="checkbox"
                  {...addressForm.register("isDefault")}
                />
                <span className="text-sm font-bold text-[#334155]">
                  Set as default delivery address
                </span>
              </label>
              <MutationMessage
                error={addressMutation.error}
                success={addressMutation.isSuccess}
                successText="Address saved"
              />
              <div className="flex flex-wrap gap-2">
                <PrimaryButton disabled={addressMutation.isPending}>
                  {editingAddressId ? "Save address" : "Add address"}
                </PrimaryButton>
                {editingAddressId ? (
                  <button
                    className="min-h-11 rounded-lg border border-[#dde3ea] px-4 text-sm font-bold text-[#334155]"
                    onClick={() => {
                      setEditingAddressId(null);
                      addressForm.reset();
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </SectionCard>

          <SectionCard eyebrow="Saved" icon={MapPin} title="Delivery addresses">
            {addresses.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-center">
                <CircleAlert className="h-8 w-8 text-[#64748b]" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-[#0f172a]">
                  No delivery address yet
                </p>
                <p className="mt-1 max-w-xs text-sm leading-6 text-[#64748b]">
                  Add one address to speed up checkout and pharmacy matching.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {addresses.map((address) => (
                  <article
                    className={cn(
                      "rounded-xl border bg-white p-4 shadow-sm",
                      address.isDefault
                        ? "border-[#087f5b] ring-2 ring-emerald-50"
                        : "border-[#dde3ea]",
                    )}
                    key={address.id}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eefcf5] text-[#087f5b]">
                        <MapPin className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-[#0f172a]">
                            {address.label || "Address"}
                          </h3>
                          {address.isDefault ? (
                            <StatusPill tone="primary">Default</StatusPill>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#64748b]">
                          {address.addressLine1}
                          {address.addressLine2
                            ? `, ${address.addressLine2}`
                            : ""}
                          , {address.city}, {address.state} {address.pincode}
                        </p>
                        {address.recipientName ? (
                          <p className="mt-1 text-sm font-medium text-[#475569]">
                            {address.recipientName}
                            {address.phone ? `, ${address.phone}` : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="min-h-9 rounded-lg border border-[#dde3ea] px-3 text-sm font-bold text-[#334155]"
                        onClick={() => startEditingAddress(address)}
                        type="button"
                      >
                        Edit
                      </button>
                      {!address.isDefault ? (
                        <button
                          className="min-h-9 rounded-lg border border-[#dde3ea] px-3 text-sm font-bold text-[#334155]"
                          onClick={() => defaultAddressMutation.mutate(address.id)}
                          type="button"
                        >
                          Set default
                        </button>
                      ) : null}
                      <button
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700"
                        onClick={() => deleteAddressMutation.mutate(address.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "neutral" | "primary" | "warning";
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#dde3ea] bg-[#f8fafc] p-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            tone === "primary" && "bg-[#eefcf5] text-[#087f5b]",
            tone === "warning" && "bg-amber-50 text-amber-800",
            tone === "neutral" && "bg-white text-[#1d4ed8]",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-sm text-[#64748b]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#0f172a]">{value}</p>
    </div>
  );
}

function SectionCard({
  children,
  eyebrow,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-[#dde3ea] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3 border-b border-[#edf1f5] pb-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eefcf5] text-[#087f5b]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#087f5b]">
            {eyebrow}
          </p>
          <h2 className="text-xl font-bold text-[#0f172a]">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextField({
  error,
  icon: Icon,
  inputMode,
  label,
  registration,
  type = "text",
}: {
  error?: string;
  icon?: LucideIcon;
  inputMode?: "text" | "tel" | "numeric";
  label: string;
  registration: UseFormRegisterReturn;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[#0f172a]">
        {Icon ? <Icon className="h-4 w-4 text-[#64748b]" aria-hidden="true" /> : null}
        {label}
      </span>
      <input
        className="min-h-12 w-full rounded-lg border border-[#d7dee8] bg-[#f8fafc] px-3 text-sm outline-none transition focus:border-[#087f5b] focus:bg-white"
        inputMode={inputMode}
        type={type}
        {...registration}
      />
      {error ? (
        <span className="mt-1 block text-sm font-medium text-[#b91c1c]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function PrimaryButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#087f5b] px-4 text-sm font-bold text-white transition hover:bg-[#076448] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={disabled}
      type="submit"
    >
      <Check className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}

function MutationMessage({
  error,
  success,
  successText,
}: {
  error: unknown;
  success: boolean;
  successText: string;
}) {
  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {getErrorMessage(error)}
      </p>
    );
  }

  if (success) {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {successText}
      </p>
    );
  }

  return null;
}
