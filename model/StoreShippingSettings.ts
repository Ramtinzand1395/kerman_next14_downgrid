import mongoose from "mongoose";
import { DEFAULT_SHIPPING_SETTINGS } from "@/lib/shipping";

const StoreShippingSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "global" },
    version: { type: Number, default: 1 },
    localDelivery: {
      enabled: { type: Boolean, default: true },
      feeToman: { type: Number, default: 150_000, min: 1 },
      title: { type: String, default: DEFAULT_SHIPPING_SETTINGS.localDelivery.title },
      description: {
        type: String,
        default: DEFAULT_SHIPPING_SETTINGS.localDelivery.description,
      },
    },
    nationalCollect: {
      enabled: { type: Boolean, default: true },
      availableForLocalAddresses: { type: Boolean, default: true },
      title: { type: String, default: DEFAULT_SHIPPING_SETTINGS.nationalCollect.title },
      description: {
        type: String,
        default: DEFAULT_SHIPPING_SETTINGS.nationalCollect.description,
      },
    },
    tipax: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: DEFAULT_SHIPPING_SETTINGS.tipax.title },
      description: { type: String, default: DEFAULT_SHIPPING_SETTINGS.tipax.description },
    },
    postPishtaz: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: DEFAULT_SHIPPING_SETTINGS.postPishtaz.title },
      description: { type: String, default: DEFAULT_SHIPPING_SETTINGS.postPishtaz.description },
    },
    coverage: {
      province: { type: String, default: "کرمان" },
      cities: { type: [String], default: ["کرمان"] },
      postalCodePrefixes: { type: [String], default: [] },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export default mongoose.models.StoreShippingSettings ||
  mongoose.model("StoreShippingSettings", StoreShippingSettingsSchema);
