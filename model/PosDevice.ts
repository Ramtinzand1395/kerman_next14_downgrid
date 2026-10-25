import mongoose, { Schema, model } from "mongoose";
import { POS_SCOPES, type PosScope } from "@/lib/pos/constants";

export type PosDeviceDocument = mongoose.Document & {
  deviceId: string;
  name: string;
  tokenHash: string;
  tokenVersion: number;
  scopes: PosScope[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastSeenAt?: Date | null;
  lastRotatedAt?: Date | null;
  deactivatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const PosDeviceSchema = new Schema<PosDeviceDocument>(
  {
    deviceId: { type: String, required: true, unique: true, immutable: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    tokenVersion: { type: Number, required: true, default: 1, min: 1 },
    scopes: {
      type: [{ type: String, enum: POS_SCOPES }],
      required: true,
      default: [],
    },
    isActive: { type: Boolean, required: true, default: true, index: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    lastSeenAt: { type: Date, default: null },
    lastRotatedAt: { type: Date, default: null },
    deactivatedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, returned) => {
        delete (returned as { tokenHash?: string }).tokenHash;
        return returned;
      },
    },
  },
);

PosDeviceSchema.index({ createdAt: -1 });

export default mongoose.models.PosDevice ||
  model<PosDeviceDocument>("PosDevice", PosDeviceSchema);
