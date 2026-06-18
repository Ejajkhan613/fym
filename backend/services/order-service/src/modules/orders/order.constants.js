const orderStatuses = [
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
];

const orderTypes = ["OTC", "PRESCRIPTION", "MIXED"];

const paymentStatuses = [
  "PAYMENT_PENDING",
  "PAYMENT_INITIATED",
  "PAYMENT_AUTHORIZED",
  "PAYMENT_CAPTURED",
  "PAYMENT_FAILED",
  "REFUND_INITIATED",
  "REFUND_PROCESSED",
];

const offerStatuses = [
  "OFFER_SENT",
  "OFFER_VIEWED",
  "OFFER_ACCEPTED",
  "OFFER_REJECTED",
  "OFFER_EXPIRED",
  "OFFER_CLOSED_ORDER_ASSIGNED_ELSEWHERE",
];

const orderEvents = {
  ORDER_CREATED: "OrderCreated",
  VENDOR_OFFER_SENT: "VendorOfferSent",
  VENDOR_OFFER_VIEWED: "VendorOfferViewed",
  VENDOR_OFFER_CLOSED: "VendorOfferClosed",
  VENDOR_OFFER_EXPIRED: "VendorOfferExpired",
  VENDOR_ACCEPTED: "VendorAccepted",
  VENDOR_REJECTED: "VendorRejected",
  ORDER_PACKING: "OrderPacking",
  ORDER_PACKED: "OrderPacked",
  ORDER_CANCELLED: "OrderCancelled",
};

module.exports = {
  orderStatuses,
  orderTypes,
  paymentStatuses,
  offerStatuses,
  orderEvents,
};
