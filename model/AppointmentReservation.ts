import mongoose, { Schema } from "mongoose";

const AppointmentReservationSchema = new Schema(
  {
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    slotKey: { type: String, required: true },
    seat: { type: Number, required: true, min: 1 },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 10 * 60_000) },
    finalizedAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

AppointmentReservationSchema.index({ slotKey: 1, seat: 1 }, { unique: true, partialFilterExpression: { releasedAt: null } });
AppointmentReservationSchema.index({ appointment: 1, slotKey: 1, releasedAt: 1 });
AppointmentReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.AppointmentReservation || mongoose.model("AppointmentReservation", AppointmentReservationSchema);
