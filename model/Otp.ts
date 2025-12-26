import mongoose, { Schema, model, Document } from "mongoose";

export interface IOtp extends Document {
  mobile: string;
  otp: string;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>({
  mobile: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL index برای حذف خودکار بعد از 2 دقیقه
OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 120 });

const Otp = mongoose.models.Otp || model<IOtp>("Otp", OtpSchema);
export default Otp;
