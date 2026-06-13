"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  ChevronDown,
  CircleCheck,
  Clock3,
  FileText,
  HeartPulse,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Phone,
  Pill,
  Search,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Syringe,
  Truck,
  Upload,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import { requestOtp, verifyOtp } from "@/features/auth/api";
import { normalizePhoneForApi, maskPhone } from "@/features/auth/phone";
import {
  loginFormSchema,
  signupFormSchema,
  verifyOtpSchema,
} from "@/features/auth/schemas";
import { useAuthSession } from "@/features/auth/session-store";
import type { AuthPurpose, OtpChallenge } from "@/features/auth/types";
import { cn } from "@/shared/utils/cn";

type AuthMode = "login" | "signup";
type AuthStep = "phone" | "otp";

type AuthFormValues = {
  name?: string;
  phone: string;
  otp?: string;
};

type Category = {
  label: string;
  sublabel: string;
  icon: LucideIcon;
  tone: string;
};

const categories: Category[] = [
  {
    label: "Medicines",
    sublabel: "OTC and Rx",
    icon: Pill,
    tone: "bg-emerald-50 text-emerald-800 border-emerald-100",
  },
  {
    label: "Prescription",
    sublabel: "Upload and verify",
    icon: FileText,
    tone: "bg-rose-50 text-rose-800 border-rose-100",
  },
  {
    label: "Diabetes",
    sublabel: "Refills and devices",
    icon: Syringe,
    tone: "bg-blue-50 text-blue-800 border-blue-100",
  },
  {
    label: "Consult",
    sublabel: "Pharmacist help",
    icon: Stethoscope,
    tone: "bg-violet-50 text-violet-800 border-violet-100",
  },
  {
    label: "Wellness",
    sublabel: "Daily care",
    icon: HeartPulse,
    tone: "bg-amber-50 text-amber-900 border-amber-100",
  },
  {
    label: "Orders",
    sublabel: "Live tracking",
    icon: Truck,
    tone: "bg-cyan-50 text-cyan-800 border-cyan-100",
  },
];

const serviceCards = [
  {
    title: "Upload prescription",
    body: "Verified before dispensing",
    icon: Upload,
    className: "bg-[#fff5f1] text-[#8b2f1d] border-[#ffd8ca]",
  },
  {
    title: "Search medicines",
    body: "Brand, salt, strength",
    icon: Search,
    className: "bg-[#eefcf5] text-[#076448] border-[#c9f4df]",
  },
  {
    title: "Repeat refills",
    body: "For chronic care",
    icon: BellRing,
    className: "bg-[#eef4ff] text-[#1d4ed8] border-[#c9dbff]",
  },
];

const trustRows = [
  { label: "Licensed nearby pharmacies", icon: BadgeCheck },
  { label: "Prescription access logged", icon: ShieldCheck },
  { label: "Invoice and delivery proof", icon: PackageCheck },
];

const quickSearches = ["Dolo 650", "ORS", "BP monitor", "Insulin", "Vitamin D"];

function getAuthSchema(mode: AuthMode) {
  return mode === "signup" ? signupFormSchema : loginFormSchema;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function OtpAuthWorkspace({
  initialMode = "login",
}: {
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const setSession = useAuthSession((state) => state.setSession);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>("phone");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);

  const authSchema = useMemo(() => getAuthSchema(mode), [mode]);
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      name: "",
      phone: "",
      otp: "",
    },
  });

  const purpose: AuthPurpose = mode === "signup" ? "register" : "login";

  const requestMutation = useMutation({
    mutationFn: async (values: AuthFormValues) =>
      requestOtp({
        phone: normalizePhoneForApi(values.phone),
        purpose,
      }),
    onSuccess: (response) => {
      setChallenge(response.data);
      setStep("otp");
      form.clearErrors("otp");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (values: AuthFormValues) => {
      const parsed = verifyOtpSchema.parse({
        phone: normalizePhoneForApi(values.phone),
        otp: values.otp || "",
        purpose,
        name: mode === "signup" ? values.name : undefined,
      });

      return verifyOtp(parsed);
    },
    onSuccess: (response) => {
      setSession(response.data);
      router.push("/customer/profile");
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        form.setError("otp", {
          message: error.issues[0]?.message || "Use the OTP sent to your phone.",
        });
      }
    },
  });

  const currentPhone =
    useWatch({
      control: form.control,
      name: "phone",
    }) || "";

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStep("phone");
    setChallenge(null);
    form.reset({ name: "", phone: "", otp: "" });
  }

  function submitPhone(values: AuthFormValues) {
    requestMutation.mutate(values);
  }

  function submitOtp() {
    verifyMutation.mutate(form.getValues());
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-foreground">
      <header className="sticky top-0 z-20 border-b border-[#e4e8ef] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link className="flex min-w-fit items-center gap-2" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#073b3a] text-sm font-black text-white">
              FYM
            </span>
            <span className="hidden text-base font-bold text-[#111827] sm:block">
              Find Your Medicines
            </span>
          </Link>

          <button
            className="hidden min-h-11 items-center gap-2 rounded-lg border border-[#dde3ea] bg-[#f8fafc] px-3 text-left text-sm text-[#111827] md:flex md:w-60"
            type="button"
          >
            <MapPin className="h-4 w-4 text-[#087f5b]" aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-xs text-[#64748b]">Deliver to</span>
              <span className="font-semibold">Select location</span>
            </span>
            <ChevronDown className="h-4 w-4 text-[#64748b]" aria-hidden="true" />
          </button>

          <div className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-[#dde3ea] bg-[#f8fafc] px-3">
            <Search className="h-4 w-4 text-[#64748b]" aria-hidden="true" />
            <span className="truncate text-sm text-[#64748b]">
              Search medicines, salt, symptoms, health products
            </span>
          </div>

          <Link
            className="hidden min-h-10 items-center gap-2 rounded-lg border border-[#dde3ea] px-3 text-sm font-semibold text-[#111827] lg:flex"
            href="/customer/orders"
          >
            <PackageCheck className="h-4 w-4 text-[#64748b]" aria-hidden="true" />
            Orders
          </Link>
          <Link
            className="hidden min-h-10 items-center gap-2 rounded-lg bg-[#111827] px-3 text-sm font-semibold text-white sm:flex"
            href="/customer/cart"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Cart
          </Link>
        </div>

        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
          {["Medicines", "Upload Rx", "Lab tests", "Health devices", "Care plans", "Offers"].map(
            (item) => (
              <button
                className="min-h-9 whitespace-nowrap rounded-full border border-[#dde3ea] bg-white px-3 text-sm font-semibold text-[#334155]"
                key={item}
                type="button"
              >
                {item}
              </button>
            ),
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_408px] lg:px-8">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-[#dde3ea] bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[1fr_310px]">
              <div className="space-y-6 p-5 sm:p-7">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#073b3a] px-3 py-1.5 text-sm font-semibold text-white">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    10-30 min medicine delivery
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#c9f4df] bg-[#eefcf5] px-3 py-1.5 text-sm font-semibold text-[#076448]">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Pharmacist checked
                  </span>
                </div>

                <div className="max-w-3xl space-y-3">
                  <h1 className="text-3xl font-bold tracking-normal text-[#0f172a] sm:text-5xl">
                    Order medicines from verified nearby pharmacies.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-[#64748b]">
                    A fast commerce experience for medicines, built around
                    prescription safety, licensed stores, and live fulfillment.
                  </p>
                </div>

                <div className="rounded-xl border border-[#d7dee8] bg-[#f8fafc] p-2">
                  <div className="flex min-h-14 items-center gap-3 rounded-lg bg-white px-3 shadow-sm">
                    <Search className="h-5 w-5 text-[#087f5b]" aria-hidden="true" />
                    <span className="flex-1 text-sm font-medium text-[#64748b]">
                      Search Dolo 650, Crocin, ORS, insulin, BP monitor
                    </span>
                    <button
                      className="hidden min-h-10 rounded-md bg-[#087f5b] px-4 text-sm font-bold text-white sm:block"
                      type="button"
                    >
                      Search
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 px-1 pb-1">
                    {quickSearches.map((item) => (
                      <button
                        className="rounded-full border border-[#dde3ea] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569]"
                        key={item}
                        type="button"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative min-h-80 border-t border-[#dde3ea] bg-[#eefcf5] p-5 lg:border-l lg:border-t-0">
                <div
                  aria-label="Medicine packs and prescription on a counter"
                  className="h-48 w-full rounded-xl bg-cover bg-center shadow-sm"
                  role="img"
                  style={{
                    backgroundImage:
                      "url(https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80)",
                  }}
                />
                <div className="mt-4 rounded-xl border border-[#c9f4df] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#073b3a] text-white">
                      <Pill className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0f172a]">
                        Pharmacy match
                      </p>
                      <p className="text-xs text-[#64748b]">
                        Top vendors in waves
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {["Prescription verified", "Stock manually confirmed", "Rider pickup ready"].map(
                      (item) => (
                        <div
                          className="flex items-center gap-2 text-sm font-medium text-[#334155]"
                          key={item}
                        >
                          <CircleCheck
                            className="h-4 w-4 text-[#087f5b]"
                            aria-hidden="true"
                          />
                          {item}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {serviceCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  className={cn(
                    "flex min-h-24 items-center justify-between rounded-xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5",
                    card.className,
                  )}
                  key={card.title}
                  type="button"
                >
                  <span>
                    <span className="block text-base font-bold">{card.title}</span>
                    <span className="mt-1 block text-sm opacity-80">
                      {card.body}
                    </span>
                  </span>
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  className="group flex min-h-24 items-center gap-3 rounded-xl border border-[#dde3ea] bg-white p-4 text-left shadow-sm transition hover:border-[#087f5b]"
                  key={category.label}
                  type="button"
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl border",
                      category.tone,
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-bold text-[#0f172a]">
                      {category.label}
                    </span>
                    <span className="mt-1 block text-sm text-[#64748b]">
                      {category.sublabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#dde3ea] bg-white p-5 shadow-sm">
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-[#f1f5f9] p-1">
              <button
                className={cn(
                  "min-h-11 rounded-lg text-sm font-bold transition",
                  mode === "login"
                    ? "bg-white text-[#0f172a] shadow-sm"
                    : "text-[#64748b]",
                )}
                onClick={() => switchMode("login")}
                type="button"
              >
                Login
              </button>
              <button
                className={cn(
                  "min-h-11 rounded-lg text-sm font-bold transition",
                  mode === "signup"
                    ? "bg-white text-[#0f172a] shadow-sm"
                    : "text-[#64748b]",
                )}
                onClick={() => switchMode("signup")}
                type="button"
              >
                Sign up
              </button>
            </div>

            <div>
              <p className="text-sm font-bold text-[#087f5b]">Mobile OTP</p>
              <h2 className="mt-1 text-2xl font-bold text-[#0f172a]">
                {mode === "login" ? "Access your account" : "Create account"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#64748b]">
                {step === "otp"
                  ? `OTP sent to ${maskPhone(currentPhone)}`
                  : "Phone-only account access for orders and prescriptions."}
              </p>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={form.handleSubmit(submitPhone)}
            >
              {mode === "signup" ? (
                <Field
                  error={form.formState.errors.name?.message}
                  icon={UserRound}
                  label="Full name"
                  placeholder="Aarav Sharma"
                  registration={form.register("name")}
                />
              ) : null}

              <Field
                error={form.formState.errors.phone?.message}
                icon={Phone}
                inputMode="tel"
                label="Mobile number"
                placeholder="9876543210"
                registration={form.register("phone")}
              />

              {step === "otp" ? (
                <Field
                  error={form.formState.errors.otp?.message}
                  icon={LockKeyhole}
                  inputMode="numeric"
                  label="OTP"
                  maxLength={8}
                  placeholder="------"
                  registration={form.register("otp")}
                  tracking
                />
              ) : null}

              {requestMutation.error ? (
                <Alert tone="danger">{getErrorMessage(requestMutation.error)}</Alert>
              ) : null}
              {verifyMutation.error && !(verifyMutation.error instanceof z.ZodError) ? (
                <Alert tone="danger">{getErrorMessage(verifyMutation.error)}</Alert>
              ) : null}
              {challenge?.devOtp ? (
                <Alert tone="warning">
                  Dev OTP: <span className="font-bold">{challenge.devOtp}</span>
                </Alert>
              ) : null}

              {step === "phone" ? (
                <button
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#087f5b] px-4 text-sm font-bold text-white transition hover:bg-[#076448] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={requestMutation.isPending}
                  type="submit"
                >
                  {requestMutation.isPending ? "Sending OTP" : "Continue"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#087f5b] px-4 text-sm font-bold text-white transition hover:bg-[#076448] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={verifyMutation.isPending}
                    onClick={submitOtp}
                    type="button"
                  >
                    {verifyMutation.isPending ? "Verifying" : "Verify and enter"}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    className="min-h-11 w-full rounded-lg border border-[#dde3ea] text-sm font-bold text-[#334155] transition hover:border-[#087f5b]"
                    disabled={requestMutation.isPending}
                    onClick={form.handleSubmit(submitPhone)}
                    type="button"
                  >
                    Resend OTP
                  </button>
                </div>
              )}
            </form>

            <div className="mt-5 rounded-xl border border-[#dde3ea] bg-[#f8fafc] p-3">
              <div className="flex items-start gap-3">
                <WalletCards
                  className="mt-0.5 h-4 w-4 text-[#1d4ed8]"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-[#64748b]">
                  Saved addresses, prescriptions, invoices, and support history
                  stay linked to this mobile number.
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-[#64748b]">
              {mode === "login" ? "New to FYM?" : "Already registered?"}{" "}
              <button
                className="font-bold text-[#087f5b]"
                onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                type="button"
              >
                {mode === "login" ? "Create account" : "Login"}
              </button>
            </p>
          </section>

          <section className="rounded-2xl border border-[#dde3ea] bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-[#0f172a]">Why FYM account?</p>
            <div className="mt-3 space-y-3">
              {trustRows.map((row) => {
                const Icon = row.icon;
                return (
                  <div className="flex items-center gap-3" key={row.label}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f5f9] text-[#087f5b]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-[#334155]">
                      {row.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Field({
  error,
  icon: Icon,
  inputMode,
  label,
  maxLength,
  placeholder,
  registration,
  tracking = false,
}: {
  error?: string;
  icon: LucideIcon;
  inputMode?: "tel" | "numeric";
  label: string;
  maxLength?: number;
  placeholder: string;
  registration: UseFormRegisterReturn;
  tracking?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[#0f172a]">
        <Icon className="h-4 w-4 text-[#64748b]" aria-hidden="true" />
        {label}
      </span>
      <input
        className={cn(
          "min-h-12 w-full rounded-lg border border-[#d7dee8] bg-[#f8fafc] px-3 text-sm outline-none transition focus:border-[#087f5b] focus:bg-white",
          tracking && "tracking-[0.3em]",
        )}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
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

function Alert({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "danger" | "warning";
}) {
  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "danger"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-amber-200 bg-amber-50 text-amber-900",
      )}
    >
      {children}
    </p>
  );
}
