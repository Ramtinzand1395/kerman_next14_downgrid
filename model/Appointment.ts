import mongoose, { Schema } from "mongoose";
import { APPOINTMENT_STATUSES } from "@/lib/appointments/policy";

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
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    slotKey: { type: String, required: true, index: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "pending", index: true },
    reservationFinalizedAt: { type: Date, default: null },
    selectedReward: { type: Schema.Types.ObjectId, ref: "VisitReward", default: null },
    pricing: {
      known: { type: Boolean, default: false },
      baseAmount: { type: Number, default: null, min: 0 },
      discountAmount: { type: Number, default: 0, min: 0 },
      finalAmount: { type: Number, default: null, min: 0 },
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

export default mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema);

