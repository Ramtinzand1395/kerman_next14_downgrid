import { createPublicKey } from "node:crypto";

import { POS_DEVICE_SCOPES } from "../../model/PosDevice.ts";
import type { PosEnvironment } from "./auth.ts";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export type PosDeviceEnrollmentInput = {
  deviceId: string;
  publicKey: string;
  keyId: string;
  scopes: readonly string[];
  environment: PosEnvironment;
};

export function preparePosDeviceEnrollment(input: PosDeviceEnrollmentInput) {
  if (
    !IDENTIFIER_PATTERN.test(input.deviceId) ||
    !IDENTIFIER_PATTERN.test(input.keyId) ||
    input.publicKey.length === 0 ||
    input.publicKey.length > 8192 ||
    (input.environment !== "test" &&
      input.environment !== "staging" &&
      input.environment !== "production") ||
    input.scopes.length === 0 ||
    new Set(input.scopes).size !== input.scopes.length ||
    !input.scopes.every((scope) =>
      (POS_DEVICE_SCOPES as readonly string[]).includes(scope),
    )
  ) {
    throw new Error("Invalid POS device enrollment metadata");
  }

  const publicKey = createPublicKey(input.publicKey);
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new Error("POS device keys must use Ed25519");
  }

  return {
    deviceId: input.deviceId,
    credential: {
      publicKey: input.publicKey.trim(),
      algorithm: "Ed25519" as const,
      keyId: input.keyId,
    },
    status: "active" as const,
    scopes: [...input.scopes],
    environment: input.environment,
    revokedAt: null,
    lastSeenAt: null,
  };
}
