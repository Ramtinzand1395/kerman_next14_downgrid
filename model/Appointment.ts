import mongoose, { Schema } from "mongoose";
import { APPOINTMENT_STATUSES, COURIER_STATUSES } from "@/lib/appointments/policy";

const HistorySchema = new Schema(
  {
    from: String,
    to: { type: String, required: true },
    actorType: { type: String, enum: ["user", "admin", "system"], required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String, maxlength: 500, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const CourierAddressSnapshotSchema = new Schema(
  {
    title: { type: String, trim: true, default: "" },
    province: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    plaque: { type: String, default: "" },
    unit: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    recipientName: { type: String, required: true, trim: true },
    recipientPhone: { type: String, required: true, trim: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  { _id: false },
);

const CourierSchema = new Schema(
  {
    addressId: { type: Schema.Types.ObjectId, ref: "Address", default: null },
    addressSnapshot: { type: CourierAddressSnapshotSchema, required: true },
    regionId: { type: String, trim: true, default: "" },
    regionTitle: { type: String, trim: true, default: "" },
    pickupDate: { type: Date, required: true },
    pickupWindow: {
      start: { type: String, required: true },
      end: { type: String, required: true },
    },
    status: {
      type: String,
      enum: COURIER_STATUSES,
      default: "pending",
      index: true,
    },
    pickupShippingCost: { type: Number, default: 0, min: 0 },
    returnShippingCost: { type: Number, default: 0, min: 0 },
    totalShippingCost: { type: Number, default: 0, min: 0 },
    freeShippingDiscount: { type: Number, default: 0, min: 0 },
    finalShippingCost: { type: Number, default: 0, min: 0 },
    pickupAt: { type: Date, default: null },
    arrivedAtStoreAt: { type: Date, default: null },
    returnStartedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { _id: false },
);

const AppointmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    trackingCode: { type: String, required: true, unique: true, index: true },
    clientRequestKey: { type: String, required: true, maxlength: 128 },
    requestHash: { type: String, required: true, maxlength: 64 },
    serviceType: { type: String, enum: ["game_install", "repair"], required: true },
    device: { type: String, required: true, maxlength: 60 },
    installationType: { type: String, enum: ["account", "copy", "", null], default: null },
    repairIssue: { type: String, enum: ["power", "display", "controller", "sound", "overheating", "other", "", null], default: null },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    customerName: { type: String, trim: true, minlength: 2, maxlength: 100, required: true },
    phone: { type: String, match: /^09\d{9}$/, required: true },
    fulfillment: {
      type: String,
      enum: ["in_store", "courier"],
      default: "in_store",
      required: true,
      index: true,
    },
    courier: {
      type: CourierSchema,
      default: null,
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    slotKey: { type: String, required: true, index: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "pending", index: true },
    reservationFinalizedAt: { type: Date, default: null },
    selectedReward: { type: Schema.Types.ObjectId, ref: "VisitReward", default: null },
    pricing: {
      known: { type: Boolean, default: false },
      serviceBaseAmount: { type: Number, default: null, min: 0 },
      serviceDiscountAmount: { type: Number, default: 0, min: 0 },
      serviceFinalAmount: { type: Number, default: null, min: 0 },
      shippingBaseAmount: { type: Number, default: 0, min: 0 },
      shippingDiscountAmount: { type: Number, default: 0, min: 0 },
      shippingFinalAmount: { type: Number, default: 0, min: 0 },
      totalDiscountAmount: { type: Number, default: 0, min: 0 },
      finalAmount: { type: Number, default: null, min: 0 },
      // Backward compatibility aliases
      baseAmount: { type: Number, default: null, min: 0 },
      discountAmount: { type: Number, default: 0, min: 0 },
    },
    completedAt: { type: Date, default: null },
    visitCountedAt: { type: Date, default: null },
    rewardProcessingState: { type: String, enum: ["pending", "processing", "done", "failed", null], default: null },
    history: { type: [HistorySchema], default: [] },
  },
  { timestamps: true },
);

AppointmentSchema.index({ user: 1, clientRequestKey: 1 }, { unique: true });
AppointmentSchema.index({ serviceType: 1, startsAt: 1, status: 1 });
AppointmentSchema.index({ fulfillment: 1, status: 1 });
AppointmentSchema.index({ "courier.status": 1 });

export default mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema);

