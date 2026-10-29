import mongoose from "mongoose";
import { POS_PAYMENT_METHODS } from "../lib/pos/sales-contract.ts";
import { PosSaleItemSchema } from "./PosSaleItem.ts";

const nonNegativeSafeInteger = () => ({
  type: Number,
  required: true,
  validate: {
    validator: (value: unknown) =>
      typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
    message: "value must be a non-negative safe integer",
  },
});

const PaymentMethodSchema = new mongoose.Schema(
  {
    method: { type: String, enum: POS_PAYMENT_METHODS, required: true },
    amountToman: nonNegativeSafeInteger(),
    reference: { type: String, default: null, maxlength: 120 },
  },
  { _id: false },
);

const PosSaleSchema = new mongoose.Schema(
  {
    saleId: { type: String, required: true, immutable: true, maxlength: 128 },
    deviceId: { type: String, required: true, immutable: true, maxlength: 80 },
    siteSaleId: { type: String, required: true, unique: true, immutable: true },
    invoiceNumber: { type: String, required: true, unique: true, immutable: true },
    requestHash: {
      type: String,
      required: true,
      immutable: true,
      select: false,
    },
    soldAtUtc: { type: Date, required: true, immutable: true },
    syncedAtUtc: { type: Date, required: true, immutable: true },
    items: { type: [PosSaleItemSchema], required: true },
    finalAmountToman: nonNegativeSafeInteger(),
    paymentMethods: { type: [PaymentMethodSchema], required: true },
    customer: {
      type: new mongoose.Schema(
        {
          customerId: { type: String, default: null, maxlength: 100 },
          name: { type: String, default: null, maxlength: 120 },
          mobile: { type: String, default: null, maxlength: 30 },
        },
        { _id: false },
      ),
      default: null,
    },
    cashier: {
      type: new mongoose.Schema(
        {
          cashierId: { type: String, required: true, maxlength: 100 },
          name: { type: String, required: true, maxlength: 120 },
        },
        { _id: false },
      ),
      required: true,
    },
    syncStatus: {
      type: String,
      enum: ["synced", "review_required"],
      required: true,
      index: true,
    },
    reviewReasons: {
      type: [
        {
          type: String,
          enum: ["offline_delay", "price_mismatch", "catalog_state"],
        },
      ],
      default: [],
    },
    audit: {
      type: new mongoose.Schema(
        {
          source: { type: String, enum: ["pos"], required: true },
          deviceId: { type: String, required: true },
          referenceId: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
  },
  { timestamps: true },
);

PosSaleSchema.index({ deviceId: 1, saleId: 1 }, { unique: true });
PosSaleSchema.index({ soldAtUtc: -1, deviceId: 1 });

export default mongoose.models.PosSale || mongoose.model("PosSale", PosSaleSchema);
