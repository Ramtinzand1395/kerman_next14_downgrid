import mongoose, { Schema, model } from "mongoose";

export const POS_DEVICE_SCOPES = [
  "catalog:read",
  "inventory:write",
  "sync:read",
] as const;

const posDeviceSchema = new Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
      unique: true,
      index: true,
    },
    credential: {
      publicKey: {
        type: String,
        required: true,
      },
      algorithm: {
        type: String,
        required: true,
        enum: ["Ed25519", "ES256"],
      },
      keyId: {
        type: String,
        required: true,
        trim: true,
        maxlength: 128,
      },
    },
    status: {
      type: String,
      enum: ["active", "disabled", "revoked"],
      required: true,
      default: "active",
      index: true,
    },
    scopes: {
      type: [
        {
          type: String,
          enum: POS_DEVICE_SCOPES,
        },
      ],
      required: true,
      validate: {
        validator: (scopes: string[]) =>
          scopes.length > 0 && new Set(scopes).size === scopes.length,
        message: "At least one unique POS scope is required",
      },
    },
    environment: {
      type: String,
      enum: ["test", "staging", "production"],
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
  },
);

posDeviceSchema.pre("validate", function validateRevocationState() {
  const device = this as any;
  if (
    (device.status === "active" || device.status === "disabled") &&
    device.revokedAt !== null
  ) {
    device.invalidate(
      "revokedAt",
      "Non-revoked POS device cannot have a revocation timestamp",
    );
  }
  if (device.status === "revoked" && device.revokedAt === null) {
    device.invalidate(
      "revokedAt",
      "Revoked POS device requires a revocation timestamp",
    );
  }
});

posDeviceSchema.index({ environment: 1, status: 1 });

export default mongoose.models.PosDevice || model("PosDevice", posDeviceSchema);
