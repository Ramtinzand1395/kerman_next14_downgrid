import mongoose, { Schema, model } from "mongoose";
import {
  PRINTER_SCOPES,
  type PrinterScope,
} from "@/lib/printer/constants";

export type PrinterDeviceDocument = mongoose.Document & {
  deviceId: string;
  name: string;
  tokenHash: string;
  tokenVersion: number;
  scopes: PrinterScope[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastSeenAt?: Date | null;
  lastRotatedAt?: Date | null;
  deactivatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const PrinterDeviceSchema = new Schema<PrinterDeviceDocument>(
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
      type: [{ type: String, enum: PRINTER_SCOPES }],
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

PrinterDeviceSchema.index({ createdAt: -1 });

export default mongoose.models.PrinterDevice ||
  model<PrinterDeviceDocument>("PrinterDevice", PrinterDeviceSchema);
