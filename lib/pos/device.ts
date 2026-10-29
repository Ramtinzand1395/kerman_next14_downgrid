import type { PosScope } from "./constants";

export type SafePosDevice = {
  deviceId: string;
  name: string;
  scopes: PosScope[];
  isActive: boolean;
  tokenVersion: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastSeenAt?: Date | string | null;
  lastRotatedAt?: Date | string | null;
  deactivatedAt?: Date | string | null;
};

type PosDeviceLike = SafePosDevice & Record<string, unknown>;

export function serializePosDevice(device: PosDeviceLike): SafePosDevice {
  return {
    deviceId: String(device.deviceId),
    name: String(device.name),
    scopes: [...device.scopes],
    isActive: Boolean(device.isActive),
    tokenVersion: Number(device.tokenVersion),
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
    lastSeenAt: device.lastSeenAt ?? null,
    lastRotatedAt: device.lastRotatedAt ?? null,
    deactivatedAt: device.deactivatedAt ?? null,
  };
}
