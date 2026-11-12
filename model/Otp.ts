import mongoose, { Schema, model, Document } from "mongoose";

interface IOtp extends Document {
  mobile: string;
  otp: string;
  referralCode?: string;
  signupIntentId?: string;
  verifiedAt?: Date;
  registrationTokenHash?: string;
  registrationTokenExpiresAt?: Date;
  loginTokenHash?: string;
  loginTokenExpiresAt?: Date;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>({
  mobile: { type: String, required: true },
  otp: { type: String, required: true },
  referralCode: { type: String, maxlength: 32 },
  signupIntentId: { type: String, maxlength: 64 },
  verifiedAt: Date,
  registrationTokenHash: String,
  registrationTokenExpiresAt: Date,
  loginTokenHash: { type: String, index: true, sparse: true },
  loginTokenExpiresAt: Date,
  createdAt: { type: Date, default: Date.now },
});

// TTL index برای حذف خودکار بعد از 2 دقیقه
OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 120 });

// Next.js development hot reload can keep the model from before the signup fields were added.
if (mongoose.models.Otp && process.env.NODE_ENV === "development" &&
    !mongoose.models.Otp.schema.path("registrationTokenHash")) {
  mongoose.deleteModel("Otp");
}

const Otp = mongoose.models.Otp || model<IOtp>("Otp", OtpSchema);
export default Otp;
