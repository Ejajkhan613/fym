export const orderStatuses = [
  "CREATED",
  "PAYMENT_PENDING",
  "PRESCRIPTION_UPLOADED",
  "PRESCRIPTION_UNDER_REVIEW",
  "PRESCRIPTION_REJECTED",
  "VENDOR_MATCHING",
  "VENDOR_OFFERED",
  "VENDOR_ACCEPTED",
  "PHARMACIST_APPROVED",
  "PACKING",
  "PACKED",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED_BY_USER",
  "CANCELLED_BY_VENDOR",
  "CANCELLED_BY_ADMIN",
  "FAILED_DELIVERY",
  "REFUNDED",
  "DISPUTED",
] as const;

export const vendorOfferStatuses = [
  "OFFER_SENT",
  "OFFER_VIEWED",
  "OFFER_ACCEPTED",
  "OFFER_REJECTED",
  "OFFER_EXPIRED",
  "OFFER_CLOSED_ORDER_ASSIGNED_ELSEWHERE",
] as const;

export const paymentStatuses = [
  "PAYMENT_INITIATED",
  "PAYMENT_AUTHORIZED",
  "PAYMENT_CAPTURED",
  "PAYMENT_FAILED",
  "REFUND_INITIATED",
  "REFUND_PROCESSED",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type VendorOfferStatus = (typeof vendorOfferStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
