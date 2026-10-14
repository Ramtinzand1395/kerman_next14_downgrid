import test from "node:test";
import assert from "node:assert/strict";
import {
  bucketIndexForDate,
  createBuckets,
  jalaliDateToUtcStart,
  parseJalaliDate,
  resolveReportRange,
  safePercentChange,
  tehranDateTimeToUtc,
  utcToJalaliDate,
} from "./lib/dashboard-date-range.ts";
import {
  MANUAL_ORDER_AMOUNT_LABEL,
  chartTotal,
  documentedAppointmentAmount,
  shouldAcceptReportResponse,
  summarizeFinancialEvidence,
} from "./lib/dashboard-report-policy.ts";

const rangeStart = new Date("2026-10-12T20:30:00.000Z");
const rangeEnd = new Date("2026-10-13T20:30:00.000Z");

test("half-open range includes the exact start and excludes the exact end", () => {
  const buckets = createBuckets(rangeStart, rangeEnd, "hour");
  assert.equal(bucketIndexForDate(rangeStart, buckets), 0);
  assert.equal(bucketIndexForDate(new Date(rangeEnd.getTime() - 1), buckets), 23);
  assert.equal(bucketIndexForDate(rangeEnd, buckets), -1);
});

test("Tehran midnight is converted to UTC explicitly", () => {
  const midnight = tehranDateTimeToUtc({ year: 2026, month: 10, day: 13 });
  assert.equal(midnight.toISOString(), "2026-10-12T20:30:00.000Z");
});

test("Jalali month, Nowruz, year and leap Esfand boundaries are valid", () => {
  assert.equal(jalaliDateToUtcStart("1405-01-01").toISOString(), "2026-03-20T20:30:00.000Z");
  assert.equal(utcToJalaliDate(jalaliDateToUtcStart("1405-07-01")), "1405-07-01");
  assert.deepEqual(parseJalaliDate("1403-12-30"), { year: 2025, month: 3, day: 20 });
  assert.equal(utcToJalaliDate(jalaliDateToUtcStart("1403-12-30")), "1403-12-30");
  assert.equal(utcToJalaliDate(jalaliDateToUtcStart("1404-01-01")), "1404-01-01");
  assert.throws(() => parseJalaliDate("1404-12-30"), /معتبر نیست/);
});

test("thisMonth and thisYear use real Jalali boundaries", () => {
  const now = new Date("2026-10-13T08:00:00.000Z");
  const month = resolveReportRange({ range: "thisMonth" }, now);
  assert.equal(month.startJalali, "1405-07-01");
  assert.equal(month.endJalali, "1405-07-30");
  const year = resolveReportRange({ range: "thisYear" }, now);
  assert.equal(year.startJalali, "1405-01-01");
  assert.equal(year.endJalali, "1405-12-29");
  assert.equal(year.granularity, "jalali-month");
  assert.equal(year.buckets.length, 12);
});

test("custom end date is inclusive in UI and exclusive in query", () => {
  const range = resolveReportRange({ range: "custom", start: "1405-07-01", end: "1405-07-02" });
  assert.equal(range.startJalali, "1405-07-01");
  assert.equal(range.endJalali, "1405-07-02");
  assert.equal(range.buckets.length, 2);
  assert.throws(
    () => resolveReportRange({ range: "custom", start: "1405-08-01", end: "1405-07-01" }),
    /بعد از تاریخ پایان/,
  );
  assert.throws(() => resolveReportRange({ range: "custom", start: "1405-7", end: "" }), /الزامی|قالب/);
});

test("missing day buckets are preserved as zero", () => {
  const range = resolveReportRange({ range: "custom", start: "1405-07-01", end: "1405-07-03" });
  const points = range.buckets.map((bucket) => ({ key: bucket.key, value: 0 }));
  points[1].value = 4;
  assert.deepEqual(points.map((point) => point.value), [0, 4, 0]);
});

test("paid evidence uses payment time, includes wallet purchases and excludes other payment states", () => {
  const totals = summarizeFinancialEvidence(
    [
      { id: "gateway", paymentStatus: "paid", paymentGateway: "zarinpal", paymentVerifiedAt: "2026-10-13T01:00:00Z", createdAt: "2026-10-01T01:00:00Z", finalPrice: 1000 },
      { id: "wallet", paymentStatus: "paid", paymentGateway: "wallet", paymentVerifiedAt: "2026-10-13T02:00:00Z", createdAt: "2026-10-13T01:55:00Z", finalPrice: 2000 },
      { id: "unpaid", paymentStatus: "unpaid", createdAt: "2026-10-13T03:00:00Z", finalPrice: 3000 },
      { id: "failed", paymentStatus: "failed", createdAt: "2026-10-13T04:00:00Z", finalPrice: 4000 },
      { id: "pending-refund", paymentStatus: "pending_refund", createdAt: "2026-10-13T05:00:00Z", finalPrice: 5000 },
      { id: "outside-by-payment", paymentStatus: "paid", paymentVerifiedAt: "2026-10-14T01:00:00Z", createdAt: "2026-10-13T06:00:00Z", finalPrice: 6000 },
    ],
    [],
    rangeStart,
    rangeEnd,
  );
  assert.equal(totals.grossPaidAmount, 3000);
  assert.equal(totals.paidOrders, 2);
});

test("legacy payment fallback is explicit and retries do not double-count", () => {
  const legacy = { id: "same-order", paymentStatus: "paid", paymentGateway: "wallet", paymentVerifiedAt: null, createdAt: "2026-10-13T02:00:00Z", finalPrice: 2500 };
  const totals = summarizeFinancialEvidence([legacy, legacy], [], rangeStart, rangeEnd);
  assert.equal(totals.grossPaidAmount, 2500);
  assert.equal(totals.paidOrders, 1);
  assert.equal(totals.estimatedPaidOrders, 1);
});

test("only completed refund evidence reduces net amount", () => {
  const order = { id: "order", paymentStatus: "paid", paymentVerifiedAt: "2026-10-13T01:00:00Z", createdAt: "2026-10-13T00:00:00Z", finalPrice: 5000 };
  const totals = summarizeFinancialEvidence(
    [order],
    [
      { id: "pending", type: "refund", status: "pending", refKind: "Order", createdAt: "2026-10-13T03:00:00Z", amount: 5000 },
      { id: "charge", type: "charge", status: "completed", refKind: "Order", createdAt: "2026-10-13T03:00:00Z", amount: 5000 },
      { id: "actual", type: "refund", status: "completed", refKind: "Order", createdAt: "2026-10-13T04:00:00Z", amount: 2000 },
    ],
    rangeStart,
    rangeEnd,
  );
  assert.equal(totals.refundedAmount, 2000);
  assert.equal(totals.netPaidAmount, 3000);
});

test("unknown appointment pricing and manual orders are not called revenue", () => {
  assert.deepEqual(documentedAppointmentAmount({ status: "completed", pricingKnown: false, finalAmount: null }), { amount: null, label: "داده کافی نیست" });
  assert.match(MANUAL_ORDER_AMOUNT_LABEL, /ثبت‌شده/);
  assert.doesNotMatch(MANUAL_ORDER_AMOUNT_LABEL, /درآمد/);
});

test("chart total equals its card and zero comparison never becomes Infinity", () => {
  assert.equal(chartTotal([{ value: 100 }, { value: 0 }, { value: 250 }]), 350);
  assert.equal(safePercentChange(350, 0), null);
  assert.equal(Number.isFinite(safePercentChange(350, 100)), true);
});

test("stale response cannot overwrite a newer request and errors are not coerced to zero", () => {
  assert.equal(shouldAcceptReportResponse(4, 5), false);
  assert.equal(shouldAcceptReportResponse(5, 5), true);
  const failedSection = { status: "error", error: "database unavailable" };
  assert.equal("data" in failedSection, false);
});
