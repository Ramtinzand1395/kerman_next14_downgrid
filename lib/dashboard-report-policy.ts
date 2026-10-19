export const MANUAL_ORDER_AMOUNT_LABEL = "مبلغ سفارش‌های دستی ثبت‌شده";
export const DOCUMENTED_SERVICE_AMOUNT_LABEL = "مبلغ ثبت‌شده خدمات تکمیل‌شده (فاقد سند پرداخت)";

export type PaidOrderEvidence = {
  id: string;
  paymentStatus: "paid" | "unpaid" | "failed" | "pending_refund" | string;
  paymentGateway?: "wallet" | "zarinpal" | string | null;
  paymentVerifiedAt?: Date | string | null;
  createdAt: Date | string;
  finalPrice: number;
};

export type RefundEvidence = {
  id: string;
  type: string;
  status: string;
  refKind?: string | null;
  createdAt: Date | string;
  amount: number;
};

function asTime(value: Date | string) {
  return new Date(value).getTime();
}

export function isWithinHalfOpenRange(
  value: Date | string,
  startInclusive: Date,
  endExclusive: Date,
) {
  const timestamp = asTime(value);
  return timestamp >= startInclusive.getTime() && timestamp < endExclusive.getTime();
}

export function effectivePaymentEvidence(order: PaidOrderEvidence) {
  if (order.paymentStatus !== "paid") return null;
  return order.paymentVerifiedAt
    ? { at: new Date(order.paymentVerifiedAt), estimated: false }
    : { at: new Date(order.createdAt), estimated: true };
}

export function summarizeFinancialEvidence(
  orders: PaidOrderEvidence[],
  refunds: RefundEvidence[],
  startInclusive: Date,
  endExclusive: Date,
) {
  const uniqueOrders = new Map(orders.map((order) => [order.id, order]));
  const includedOrders = Array.from(uniqueOrders.values()).filter((order) => {
    const evidence = effectivePaymentEvidence(order);
    return evidence && isWithinHalfOpenRange(evidence.at, startInclusive, endExclusive);
  });
  const uniqueRefunds = new Map(refunds.map((refund) => [refund.id, refund]));
  const includedRefunds = Array.from(uniqueRefunds.values()).filter(
    (refund) =>
      refund.type === "refund" &&
      refund.status === "completed" &&
      refund.refKind === "Order" &&
      isWithinHalfOpenRange(refund.createdAt, startInclusive, endExclusive),
  );
  const grossPaidAmount = includedOrders.reduce((sum, order) => sum + order.finalPrice, 0);
  const refundedAmount = includedRefunds.reduce((sum, refund) => sum + refund.amount, 0);
  return {
    grossPaidAmount,
    refundedAmount,
    netPaidAmount: grossPaidAmount - refundedAmount,
    paidOrders: includedOrders.length,
    estimatedPaidOrders: includedOrders.filter((order) => !order.paymentVerifiedAt).length,
  };
}

export function documentedAppointmentAmount(input: {
  status: string;
  pricingKnown?: boolean | null;
  finalAmount?: number | null;
}) {
  if (input.status !== "completed" || input.pricingKnown !== true || input.finalAmount == null) {
    return { amount: null, label: "داده کافی نیست" };
  }
  return { amount: input.finalAmount, label: DOCUMENTED_SERVICE_AMOUNT_LABEL };
}

export function shouldAcceptReportResponse(requestSequence: number, latestSequence: number) {
  return requestSequence === latestSequence;
}

export function chartTotal(points: Array<{ value: number }>) {
  return points.reduce((sum, point) => sum + point.value, 0);
}
